/* patch30 - the size gets out of the simulation: saved, sent, and drawn.
 *
 * patch29 gave each machine a size and made every part of its own behaviour
 * read it. This carries that number to the two places it has to survive:
 * the world the server writes down when it restarts, and the picture.
 *
 * THE SAVED WORLD. packMachines/unpackMachines are what the server uses to
 * put the pit back after a restart, so a size that is not in there is a size
 * that dies every time Render cycles the instance - and an inherited trait
 * that resets to one overnight is not inherited at all. MFIELDS goes 28 to
 * 29, and because worlds saved under the old format already exist, the array
 * now starts with a negative marker: a role is 0 or 1 and can never be
 * negative, so an array beginning with a negative number is unambiguously
 * the new format and anything else is the old one, read at 28 with every
 * machine the size the world was built at. That is a migration rather than a
 * break, and it stays correct forever.
 *
 * THE PICTURE. The worker packed twelve floats a machine; it now packs
 * thirteen. The page no longer assumes twelve - it works the stride out from
 * the length of what it was handed, so a page talking to a server that has
 * not been redeployed yet still draws, just with every machine the same size.
 *
 * AND THE DRAWING ITSELF is almost free, because every machine is already
 * drawn from its own matrix. ML - the length the whole rig is built from -
 * simply becomes this machine's length instead of the world's, and the
 * wheels, the ground under each corner, the tilt, the lamp housings and the
 * sky the machine blocks all follow it without being touched.
 *
 * NOT YET: the binary packet the shared world sends over the network. That is
 * a separate format built by server.js, and page and server deploy at
 * different moments, so it needs its own compatible handover. Until then a
 * page fed by the shared world draws every machine the same size, which is
 * exactly what it does today.
 *
 * Usage: node patch30.js <index.html>     (after patch29)
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch30.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

/* ---- 1. the saved world ---- */
e("one more field, and a marker",
`var MFIELDS=28, MODES=["scoop","dump","toPush","push"];`,
`/* 29 since patch30: the last one is the size a machine was born with. The
   array written out starts with -MFIELDS, which an array written under the
   old format never can, because its first number is a role and a role is 0
   or 1. So an old world still loads, at 28 fields, every machine the size
   the world was built at. */
var MFIELDS=29, MODES=["scoop","dump","toPush","push"];`);

e("write the size down",
`function packMachines(){
  var n=machines.length, f=new Float32Array(n*MFIELDS), u;
  for(var i=0;i<n;i++){
    var a=machines[i], p=i*MFIELDS;`,
`function packMachines(){
  var n=machines.length, f=new Float32Array(1+n*MFIELDS), u;
  f[0]=-MFIELDS;                       /* see patch30: a role is never negative */
  for(var i=0;i<n;i++){
    var a=machines[i], p=1+i*MFIELDS;`);

e("and the size itself",
`    f[p+24]=a.boom; f[p+25]=a.stick; f[p+26]=a.buck; f[p+27]=a.slew;
  }
  return f;
}`,
`    f[p+24]=a.boom; f[p+25]=a.stick; f[p+26]=a.buck; f[p+27]=a.slew;
    f[p+28]=a.size;                    /* what it was born with */
  }
  return f;
}`);

e("read it back, old world or new",
`function unpackMachines(f){
  machines.length=0;
  if(!f||!f.length) return;
  var n=(f.length/MFIELDS)|0;
  for(var i=0;i<n;i++){
    var p=i*MFIELDS, a=new Machine(f[p]|0,false,f[p+1],f[p+2]);`,
`function unpackMachines(f){
  machines.length=0;
  if(!f||!f.length) return;
  /* a negative first number is patch30's marker and says how wide the rows
     are; anything else is a world saved before machines had sizes */
  var W=28, off=0;
  if(f[0]<0){ W=(-f[0])|0; off=1; }
  var n=((f.length-off)/W)|0;
  for(var i=0;i<n;i++){
    var p=off+i*W;
    var a=new Machine(f[p]|0,false,f[p+1],f[p+2],(W>28)?f[p+28]:1);`);

/* ---- 2. the wire to the picture ---- */
e("thirteen floats a machine",
`  var ag=grab(n*12);
  for(var i=0;i<n;i++){
    var a=machines[i], p=i*12;`,
`  /* thirteen since patch30, the last one the machine's size. The page works
     the stride out from the length rather than being told, so an older page
     or an older server does not break on it. */
  var ag=grab(n*13);
  for(var i=0;i<n;i++){
    var a=machines[i], p=i*13;`);

e("send the size",
`    ag[p+10]=(a.role===RAISE)?a.sx:a.hx; ag[p+11]=(a.role===RAISE)?a.sz:a.hz;`,
`    ag[p+10]=(a.role===RAISE)?a.sx:a.hx; ag[p+11]=(a.role===RAISE)?a.sz:a.hz;
    ag[p+12]=a.size;`);

/* ---- 3. the page stops assuming twelve ---- */
e("how wide a machine's row is",
`var hA=null, hB=null, wearB=null, rockB=null, era=null, agA=null, agB=null, nA=0, nB=0, tA=0, tB=0, hCur=null;`,
`var hA=null, hB=null, wearB=null, rockB=null, era=null, agA=null, agB=null, nA=0, nB=0, tA=0, tB=0, hCur=null;
/* How many floats there are to a machine. Twelve before patch30, thirteen
   from the worker after it, and still twelve from a shared world whose server
   has not been redeployed. Worked out from what arrives, never assumed. */
var AGF=12;`);

e("work it out from what arrived",
`    hA=hB; agA=agB; nA=nB; tA=tB;
    hB=d.h; agB=d.agents; nB=d.n; wearB=d.wear; rockB=d.rock; era=d.era; tB=performance.now();`,
`    hA=hB; agA=agB; nA=nB; tA=tB;
    hB=d.h; agB=d.agents; nB=d.n; wearB=d.wear; rockB=d.rock; era=d.era; tB=performance.now();
    var agf=(d.n>0)?Math.round(d.agents.length/d.n):AGF;
    /* if the stride changed under us - falling back from the shared world to
       the worker in here - the older frame cannot be read alongside the newer
       one, so it is dropped rather than misread */
    if(agf!==AGF){ AGF=agf; agA=null; nA=0; }`);

e("the shared world still sends twelve",
`  hB=new Float32Array(netH); agB=ag; nB=count; wearB=netW; rockB=netR;`,
`  if(AGF!==12){ AGF=12; agA=null; nA=0; }
  hB=new Float32Array(netH); agB=ag; nB=count; wearB=netW; rockB=netR;`);

e("the draw loop asks how wide",
`    var p=i*12;          /* the worker packs twelve floats per machine */`,
`    var p=i*AGF;         /* twelve, or thirteen with the size. See patch30. */
    var msz=(AGF>12)?agB[p+12]:1; if(!(msz>0)) msz=1;`);

e("and the camera does too",
`  for(i=0;i<nB;i++){ cx+=agB[i*12]; cz+=agB[i*12+1]; }`,
`  for(i=0;i<nB;i++){ cx+=agB[i*AGF]; cz+=agB[i*AGF+1]; }`);

e("and again",
`    var dx=agB[i*12]-cx, dz=agB[i*12+1]-cz;`,
`    var dx=agB[i*AGF]-cx, dz=agB[i*AGF+1]-cz;`);

/* ---- 4. drawn the size it is ---- */
e("built at its own length",
`    var ca=Math.cos(ang), sa=Math.sin(ang), ML=machLen;`,
`    /* THIS machine's length. Everything below is built from ML - where the
       four corners sit on the ground, how the body tilts, the scale the whole
       rig is drawn at, the wheels, the lamps, the sky it blocks - so this one
       line is the whole of drawing a machine the size it actually is. */
    var ca=Math.cos(ang), sa=Math.sin(ang), ML=machLen*msz;`);

e("its wheels are its own",
`      if(dd>0.5*machLen) dd=0;                     /* it was reassigned, not travelling */`,
`      if(dd>0.5*ML) dd=0;                          /* it was reassigned, not travelling */`);

e("and turn at its own size",
`      wPh[i]+=fwd*dd/(WR*machLen);`,
`      wPh[i]+=fwd*dd/(WR*ML);`);

e("it blocks sky at its own size",
`    occOffer(0.30*machLen,_occPos.distanceToSquared(camera.position));`,
`    occOffer(0.30*ML,_occPos.distanceToSquared(camera.position));`);

e("bucket too",
`    occOffer(0.16*machLen,_occPos.distanceToSquared(camera.position));`,
`    occOffer(0.16*ML,_occPos.distanceToSquared(camera.position));`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["the saved row is 29 wide",   back.includes("var MFIELDS=29, MODES=")],
  ["and starts with a marker",   back.includes("f[0]=-MFIELDS;")],
  ["the size is written down",   back.includes("f[p+28]=a.size;")],
  ["an old world still loads",   back.includes("if(f[0]<0){ W=(-f[0])|0; off=1; }")],
  ["restored with its size",     back.includes("(W>28)?f[p+28]:1);")],
  ["the wire carries it",        back.includes("ag[p+12]=a.size;")],
  ["thirteen floats now",        back.includes("var ag=grab(n*13);")],
  ["the page works the stride out", back.includes("var agf=(d.n>0)?Math.round(d.agents.length/d.n):AGF;")],
  ["and drops a stale frame",    back.includes("if(agf!==AGF){ AGF=agf; agA=null; nA=0; }")],
  ["drawn at its own length",    back.includes("var ca=Math.cos(ang), sa=Math.sin(ang), ML=machLen*msz;")],
  ["nothing in the loop still assumes twelve", !back.includes("var p=i*12;          /* the worker packs")],
  ["no machLen left in the rig", (back.match(/machLen\*msz/g)||[]).length===1]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
