/* ===================================================================
   REPOSE — the world

   One simulation, running here, for good. Browsers do not compute the
   sand; they ask what it is now and draw it themselves. Each one
   points its own camera, so everybody is looking at the same world
   and nobody is looking at the same thing.

   No dependencies. Node 18 or later.
     node server.js            (listens on PORT, default 8080)
   =================================================================== */
const http = require("http");
const zlib = require("zlib");
const fs   = require("fs");
const path = require("path");

const PORT      = process.env.PORT || 8080;
const STATE     = process.env.STATE_FILE || path.join(__dirname, "world.json");

/* ---- where the world is kept ----
   A free host gives you no disk that survives a restart, so the world lives in
   the repository instead: durable, free, and every version of it is kept, which
   means the whole history of the place can be read back later.
   Set GH_TOKEN, GH_REPO ("owner/name") and optionally GH_PATH. */
const GH_TOKEN = process.env.GH_TOKEN || "";
const GH_REPO  = process.env.GH_REPO  || "";
const GH_PATH  = process.env.GH_PATH  || "world.json";
const GH_EVERY = parseInt(process.env.GH_EVERY || "300000", 10);   /* five minutes */
/* Set RESET_KEY to be able to wipe the world from a URL. Leave it unset and
   the endpoint does not exist. */
const RESET_KEY = process.env.RESET_KEY || "";
/* so you can tell at a glance which simulation is actually running */
const BUILD = "2026-09-05 · it works a face · a British bucket with the sand showing in it";
let ghSha=null, ghDirty=false, ghLast=0;
const TICK_MS   = 100;              /* how often the world is versioned */
const SIM_HZ    = 40;               /* the simulation's own fixed step */
const TIME_MUL  = parseFloat(process.env.TIME_MUL || "2.4");  /* lower it on a slow machine */
let speed = TIME_MUL;

/* ---- load the simulation, the same file the browser used to run ---- */
const ctx = require("./sim.node.js");

/* ---- the world ---- */
const WORLD = 1000, WORLDN = 180;
let visitors = 0, seen = Object.create(null), born = Date.now();

async function ghGet(){
  if(!GH_TOKEN||!GH_REPO) return null;
  const r=await fetch("https://api.github.com/repos/"+GH_REPO+"/contents/"+GH_PATH,
    {headers:{Authorization:"Bearer "+GH_TOKEN,"User-Agent":"repose",
              Accept:"application/vnd.github+json"}});
  if(r.status===404){ console.log("no world in the repository yet"); return null; }
  if(!r.ok){ console.log("could not read the world:", r.status); return null; }
  const j=await r.json();
  ghSha=j.sha;
  return JSON.parse(Buffer.from(j.content,"base64").toString("utf8"));
}
async function ghPut(obj){
  if(!GH_TOKEN||!GH_REPO) return;
  const body={ message:"the world at "+new Date().toISOString().slice(0,16).replace("T"," ")+
                       " \u2014 "+visitors+" visitors, "+ctx.machines.length+" machines",
               content:Buffer.from(JSON.stringify(obj)).toString("base64") };
  if(ghSha) body.sha=ghSha;
  const r=await fetch("https://api.github.com/repos/"+GH_REPO+"/contents/"+GH_PATH,
    {method:"PUT",headers:{Authorization:"Bearer "+GH_TOKEN,"User-Agent":"repose",
      Accept:"application/vnd.github+json","Content-Type":"application/json"},
     body:JSON.stringify(body)});
  if(r.ok){ const j=await r.json(); ghSha=j.content.sha; ghDirty=false; }
  else console.log("could not write the world:", r.status, (await r.text()).slice(0,140));
}
/* ---- the whole world, written down and read back ----

   Stopping the world for want of visitors and starting it again must not
   be the same thing as ending it. Everything that cannot be worked out
   again goes in: the sand, the rock, the ground as it was before anybody
   touched it, every machine, and the state of the world's own luck. It is
   one gzipped block, which comes out smaller than the sand used to on its
   own, because sand compresses well.

   Format 1 — sand only — is still read, so an old world is not lost; it
   simply starts its machines again the one last time. */
const MF=28;
function snapshot(){
  const N=ctx.N, n=N*N;
  const head=Buffer.alloc(8);
  head.writeUInt32LE(N,0);
  const mf=ctx.packMachines();
  head.writeUInt32LE((mf.length/MF)|0,4);
  const sand=Buffer.from(new Uint8Array(ctx.h.buffer,ctx.h.byteOffset,n*4));
  const was=Buffer.alloc(n*2);
  for(let i=0;i<n;i++) was.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(ctx.h0[i]*100))),i*2);
  const rk=Buffer.alloc(n);
  for(let i=0;i<n;i++) rk[i]=Math.max(0,Math.min(255,Math.round(ctx.rock[i]*255)));
  const mb=Buffer.from(new Uint8Array(mf.buffer,mf.byteOffset,mf.length*4));
  const blob=zlib.gzipSync(Buffer.concat([head,sand,was,rk,mb]),{level:6});
  return { v:2, visitors, seen, born, simTime: ctx.simTime, rng: ctx.rng,
           machines: ctx.machines.length, world: blob.toString("base64") };
}
function applySaved(j){
  visitors = j.visitors|0; seen = j.seen || Object.create(null); born = j.born || Date.now();
  /* built empty: what was here is about to be put back, not made again */
  ctx.applyScale({ix:0,N:WORLDN,width:WORLD,pop:0,vis:0.233},null,true);
  if(j.simTime) ctx.simTime=j.simTime;
  if(j.rng!==undefined && j.rng!==null) ctx.seedRNG(j.rng);
  let ok=false;
  if(j.v>=2 && j.world){
    try{
      const b=zlib.gunzipSync(Buffer.from(j.world,"base64"));
      const N=b.readUInt32LE(0), nm=b.readUInt32LE(4), n=N*N;
      if(N===ctx.N && b.length>=8+n*7+nm*MF*4){
        let o=8;
        for(let i=0;i<n;i++) ctx.h[i]=b.readFloatLE(o+i*4);        o+=n*4;
        for(let i=0;i<n;i++) ctx.h0[i]=b.readInt16LE(o+i*2)/100;   o+=n*2;
        for(let i=0;i<n;i++) ctx.rock[i]=b[o+i]/255;               o+=n;
        if(nm>0){
          const mf=new Float32Array(nm*MF);
          for(let i=0;i<mf.length;i++) mf[i]=b.readFloatLE(o+i*4);
          ctx.unpackMachines(mf);
        }
        ok=true;
      } else console.log("saved world is a different size; starting again");
    }catch(e){ console.log("could not read the saved world:", e.message); }
  } else if(j.h){
    const raw=Buffer.from(j.h,"base64");
    const h=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
    if(h.length===ctx.h.length){ ctx.h.set(h); ctx.h0.set(h); ok=true; }
  }
  ctx.targetPop=Math.max(0,visitors);
  ctx.measurePopulation(); ctx.stats();
  console.log("world restored:", visitors, "visitors,", ctx.machines.length, "machines,",
    (ctx.simTime/86400).toFixed(2), "world days"+(ok?"":"  (nothing readable: new ground)"));
}
function loadState(){
  try{ applySaved(JSON.parse(fs.readFileSync(STATE,"utf8"))); }
  catch(e){
    ctx.applyScale({ix:0,N:WORLDN,width:WORLD,pop:0,vis:0.233},null,true);
    console.log("new world");
  }
}
function saveState(){
  try{ fs.writeFileSync(STATE, JSON.stringify(snapshot())); }
  catch(e){ console.error("could not save:", e.message); }
}
loadState();                 /* something to be going on with */
if(GH_TOKEN&&GH_REPO){
  ghGet().then(j=>{ if(j) applySaved(j); }).catch(e=>console.log("repository unreachable:",e.message));
}
setInterval(()=>{
  if(GH_TOKEN&&GH_REPO){
    /* only when something has happened, and never faster than GH_EVERY */
    if(ghDirty && Date.now()-ghLast>GH_EVERY){ ghLast=Date.now(); ghPut(snapshot()).catch(()=>{}); }
  } else saveState();
}, 30000);
async function goodbye(){
  try{ if(GH_TOKEN&&GH_REPO&&ghDirty) await ghPut(snapshot()); else saveState(); }catch(e){}
  process.exit(0);
}
process.on("SIGTERM", goodbye);
process.on("SIGINT",  goodbye);

/* ---- what has changed, and when ----
   Every cell remembers the version at which it last moved. A browser
   says which version it last saw and gets exactly what it has missed,
   however long it has been away. */
let version = 1;
const changedAt = new Int32Array(ctx.N*ctx.N);
const lastQ     = new Int16Array(ctx.N*ctx.N);
const lastW     = new Uint8Array(ctx.N*ctx.N);
const lastR     = new Uint8Array(ctx.N*ctx.N);
const CM = 100;                                   /* heights to the centimetre */
for(let i=0;i<ctx.h.length;i++){
  lastQ[i]=Math.round(ctx.h[i]*CM); lastW[i]=ctx.wear[i]*255; lastR[i]=ctx.rock[i]*255;
}

let acc=0, last=Date.now();
function advance(){
  const now=Date.now();
  acc += Math.min(0.25,(now-last)/1000)*speed; last=now;
  /* never try to make up more than a tick's worth: falling behind must not
     turn into falling further behind */
  let guard=0, budget=Math.ceil(TICK_MS/1000*SIM_HZ*Math.max(1,speed))+2;
  while(acc >= 1/SIM_HZ && guard<budget){ ctx.substep(1/SIM_HZ); ctx.evN=0; ctx.dustN=0; acc-=1/SIM_HZ; guard++; }
  if(acc > 1) acc = 0;
  version++;
  ghDirty=true;
  for(let i=0;i<ctx.h.length;i++){
    const q=Math.round(ctx.h[i]*CM), w=(ctx.wear[i]*255)|0, r=(ctx.rock[i]*255)|0;
    if(q!==lastQ[i]||w!==lastW[i]||r!==lastR[i]){
      lastQ[i]=q; lastW[i]=w; lastR[i]=r; changedAt[i]=version;
    }
  }
}
let busy=0, ticks=0;
setInterval(()=>{
  const t0=Date.now(); advance(); busy+=Date.now()-t0; ticks++;
}, TICK_MS);
/* if it cannot keep up it does not stall: the world simply advances slower,
   and this says so once a minute */
setInterval(()=>{
  if(!ticks) return;
  const load=busy/(ticks*TICK_MS);
  console.log(new Date().toISOString().slice(0,19)+"  "+ctx.machines.length+" machines, "+
    visitors+" visitors, load "+(load*100).toFixed(0)+"%"+(load>0.85?"  (running behind)":""));
  busy=0; ticks=0;
}, 60000);
setInterval(()=>{ ctx.stats(); }, 2000);

/* ---- the world, packed ---- */
function clamp16(v){ return v<-32768?-32768:(v>32767?32767:v); }
function pack(since){
  const m = ctx.machines, n = m.length;
  let count=0;
  for(let i=0;i<changedAt.length;i++) if(changedAt[i]>since) count++;
  /* header: version u32, N u16, machines u16, then seven floats
     (cell, half, base, machine length, raise share, repose, wind),
     then visitors u32 and changed-cell count u32 = 44 bytes */
  const head = 44, mach = n*17, cells = count*8;
  const b = Buffer.alloc(head+mach+cells);
  let o=0;
  b.writeUInt32LE(version,o); o+=4;
  b.writeUInt16LE(ctx.N,o); o+=2;
  b.writeUInt16LE(n,o); o+=2;
  b.writeFloatLE(ctx.CS,o); o+=4;
  b.writeFloatLE(ctx.HALF,o); o+=4;
  b.writeFloatLE(ctx.BASE,o); o+=4;
  b.writeFloatLE(ctx.machLen,o); o+=4;
  b.writeFloatLE(ctx.mixRaise,o); o+=4;
  b.writeFloatLE(ctx.reposeDeg,o); o+=4;
  b.writeFloatLE(ctx.windStr,o); o+=4;
  b.writeUInt32LE(visitors,o); o+=4;
  b.writeUInt32LE(count,o); o+=4;
  const TAU=Math.PI*2;
  const ang=a=>{ let x=a%TAU; if(x>Math.PI)x-=TAU; if(x<-Math.PI)x+=TAU; return clamp16(Math.round(x/Math.PI*32767)); };
  for(let i=0;i<n;i++){
    const a=m[i];
    b.writeInt16LE(clamp16(Math.round(a.x/ctx.HALF*32767)),o); o+=2;
    b.writeInt16LE(clamp16(Math.round(a.z/ctx.HALF*32767)),o); o+=2;
    b.writeInt16LE(ang(a.ang),o); o+=2;
    b.writeInt16LE(ang(a.boom),o); o+=2;
    b.writeInt16LE(ang(a.stick),o); o+=2;
    b.writeInt16LE(ang(a.buck),o); o+=2;
    b.writeInt16LE(ang(a.slew),o); o+=2;
    b.writeUInt8(Math.max(0,Math.min(255,Math.round(a.load/a.cap*255))),o); o+=1;
    b.writeUInt8(a.role,o); o+=1;
    b.writeUInt8(Math.max(0,Math.min(255,Math.round(a.flash*255))),o); o+=1;
  }
  for(let i=0;i<changedAt.length;i++){
    if(changedAt[i]<=since) continue;
    b.writeUInt32LE(i,o); o+=4;
    b.writeInt16LE(clamp16(lastQ[i]),o); o+=2;
    b.writeUInt8(lastW[i],o); o+=1;
    b.writeUInt8(lastR[i],o); o+=1;
  }
  return b;
}

/* ---- one machine per person, once ---- */
function admit(id){
  if(!id || seen[id]) return false;
  seen[id]=1; visitors++; ghDirty=true;
  ctx.targetPop = visitors;
  if(typeof ctx.beget==="function") ctx.beget();
  return true;
}

const server = http.createServer((req,res)=>{
  if(process.env.TRACE) console.log("  <- "+req.method+" "+req.url);
  const u = new URL(req.url,"http://x");
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","no-store");
  if(u.pathname==="/join"){
    const id=u.searchParams.get("id")||"";
    const added=admit(id);
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({visitors,added,machines:ctx.machines.length,
      world:WORLD,since:born,build:BUILD,speed}));
    return;
  }
  if(u.pathname==="/add"){
    /* for looking at it: puts machines in without waiting for visitors */
    if(!RESET_KEY || u.searchParams.get("key")!==RESET_KEY){
      res.statusCode=403; res.end("no"); return;
    }
    const n=Math.max(0,Math.min(500,parseInt(u.searchParams.get("n")||"1",10)||0));
    const want=u.searchParams.get("role");     /* "raise", "fill", or nothing */
    visitors+=n; ctx.targetPop=visitors;
    for(let i=0;i<n;i++){
      ctx.beget();
      if(want==="raise"||want==="fill"){
        /* purpose is inherited from whoever is standing near by, so asking for
           one of a kind means setting it afterwards and starting it off */
        const m=ctx.machines[ctx.machines.length-1];
        if(m){
          if(want==="raise"){
            m.role=0; m.sx=m.x; m.sz=m.z; m.best=ctx.BASE; m.mark=undefined;
            m.load=0; m.mode="scoop"; m.idle=0; m.pickScoop();
          }else{
            m.role=1; m.load=0; m.mode="scoop"; m.newJob();
          }
        }
      }
    }
    ghDirty=true;
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({visitors,machines:ctx.machines.length}));
    return;
  }
  if(u.pathname==="/stats"){
    /* the binary packet carries sand and machines only, so the figures on the
       readout come from here. Small, and nobody has to be trusted for it. */
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify(ctx.figures));
    return;
  }
  if(u.pathname==="/remove"){
    /* for looking at it: take machines out again, so that one can be watched
       on its own. The opposite of /add, and it lowers the wanted number too,
       or the pit would simply give birth to a replacement. */
    if(!RESET_KEY || u.searchParams.get("key")!==RESET_KEY){
      res.statusCode=403; res.end("no"); return;
    }
    const n=Math.max(0,Math.min(500,parseInt(u.searchParams.get("n")||"1",10)||0));
    const want=u.searchParams.get("role");     /* "raise", "fill", or nothing */
    const role=(want==="raise")?0:((want==="fill")?1:-1);
    let gone=0;
    for(let k=0;k<n;k++){
      let ix=-1;
      for(let i=ctx.machines.length-1;i>=0;i--){
        if(role<0||ctx.machines[i].role===role){ ix=i; break; }
      }
      if(ix<0) break;
      ctx.machines.splice(ix,1); gone++;
    }
    visitors=Math.max(0,visitors-gone); ctx.targetPop=visitors;
    ghDirty=true;
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({visitors,machines:ctx.machines.length,removed:gone}));
    return;
  }
  if(u.pathname==="/speed"){
    /* 0 stops the world where it stands, which is the only way to look at it
       properly. 1 is real time; the piece normally runs at 2.4. */
    if(!RESET_KEY || u.searchParams.get("key")!==RESET_KEY){
      res.statusCode=403; res.end("no"); return;
    }
    const x=parseFloat(u.searchParams.get("x"));
    if(isFinite(x)) { speed=Math.max(0,Math.min(12,x)); acc=0; last=Date.now(); }
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({speed}));
    return;
  }
  if(u.pathname==="/reset"){
    if(!RESET_KEY || u.searchParams.get("key")!==RESET_KEY){
      res.statusCode=403; res.end("no"); return;
    }
    /* begin again: empty sand, nobody has been, and whatever population was
       asked for so there is something to watch straight away */
    const pop=Math.max(0,parseInt(u.searchParams.get("pop")||"0",10)||0);
    visitors=pop; seen=Object.create(null); born=Date.now();
    ctx.seedRNG((Date.now()&0x7fffffff)|1);
    ctx.simTime=0;
    ctx.applyScale({ix:0,N:WORLDN,width:WORLD,pop:pop,vis:0.233},null,true);
    ctx.simTime=0;
    /* every cell counts as changed, so anyone watching is sent the new world */
    version++;
    for(let i=0;i<ctx.h.length;i++){
      lastQ[i]=Math.round(ctx.h[i]*CM); lastW[i]=(ctx.wear[i]*255)|0; lastR[i]=(ctx.rock[i]*255)|0;
      changedAt[i]=version;
    }
    acc=0; last=Date.now(); ghDirty=true; ghLast=0;
    console.log("world reset — "+pop+" machines");
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({reset:true,visitors,machines:ctx.machines.length}));
    return;
  }
  if(u.pathname==="/state"){
    const since=parseInt(u.searchParams.get("since")||"0",10)||0;
    const body=pack(since);
    const accept=req.headers["accept-encoding"]||"";
    res.setHeader("Content-Type","application/octet-stream");
    if(/gzip/.test(accept)){
      res.setHeader("Content-Encoding","gzip");
      res.end(zlib.gzipSync(body,{level:5}));
    } else res.end(body);
    return;
  }
  res.statusCode=404; res.end("repose");
});
server.listen(PORT,()=>console.log("repose listening on "+PORT));
