/* patch37 - some joints are not built quite right, and every joint works
 * loose with use.
 *
 * Jeff: "i like the idea that the bolts could become loose over time or that
 * some arent built quite right." How many does a child get wrong? "One or
 * two" of the sixty-six joints the first model had. Should a badly built
 * machine wear out sooner? "yes". By how much: a bad joint wears about twice
 * as fast as a good one - the severe-application figure patch34 uses for
 * hard ground - and its wear is shared with the rest of the machine's
 * working joints: Jeff chose "Spread over the machine" over the weakest
 * joint deciding. One bad joint in the forty-three that carry the work is a
 * life about two percent shorter.
 *
 * WHAT IS IN THE WORLD (the simulation):
 *   err   - how carefully this machine was built: the chance of any one joint
 *           being done wrong. The first machines get ERR0 = 1.5/66. A child
 *           takes the average of its parents in log-odds, and a little
 *           either way, exactly as it takes its size (patch29): log-odds so
 *           that a chance never passes nought or one and nothing has to stop
 *           it.
 *   seed  - 24 bits, drawn when it is made. WHICH joints were done wrong is
 *           jointBad(seed, err, j): a fact about this machine, decided once.
 *   weak  - how many of its working joints (chassis and arm) are wrong. A
 *           body strip done wrong rattles; it wears nothing out.
 *   Saved: MFIELDS 31. A machine from an older save is given ERR0 and a seed
 *   when it is loaded - its build is decided then.
 *
 * WHAT IS IN THE PICTURE: the same jointBad, word for word, asked of the same
 * numbers, which come over the wire (patch37.server.js, j=1, 26 bytes) or
 * from the worker (16 floats). Three real things, all bounded by the parts:
 *   - a bolt in the wrong hole: the part sits out by exactly one pitch;
 *   - one bolt where there should be two: the part swings on it as it wears,
 *     until its free end has dropped one pitch, which is where it would rest;
 *   - and every joint, good or bad, works loose with use, by as much as a
 *     bolt can move in its hole - the hole's clearance.
 * "As it wears" is the machine's own damage, the same number that ends its
 * life. The shadow moves with the parts: the depth pass does the same.
 *
 * The joints are numbered in the order the model is put together - chassis,
 * body, boom, inner section, bucket - and there are 92. Both halves hold that
 * number; the page warns if the model it actually built disagrees.
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){ console.error("usage: node patch37.js index.html"); process.exit(1); }
let s=fs.readFileSync(f,"utf8");
const JB=
`function jointBad(seed,err,j){
  var x=Math.imul((seed|0)^0x9E3779B9,0x85EBCA6B)^Math.imul(j+1,0xC2B2AE35);
  x^=x>>>16; x=Math.imul(x,0x7FEB352D); x^=x>>>15; x=Math.imul(x,0x846CA68B); x^=x>>>16;
  return (x>>>0)/4294967296<err;
}`;
const E=[];

/* ================= the simulation ================= */
E.push(["before the machine is defined",
`function Machine(role,atGate,px,pz,size){`,
`/* ---- how well it was put together. See patch37. ----
   A machine is a Meccano model, and a child built it. Jeff: "i like the idea
   that the bolts could become loose over time or that some arent built quite
   right". How many does a child get wrong? "One or two" of the sixty-six
   joints the first model had: ERR0 is that, as a chance per joint.

   Which joints are wrong is decided when the machine is made and never
   changes. It is a fact about this machine, so it lives here in the world,
   and the picture asks the same question of the same numbers: jointBad is
   word for word the same function in the page, and must stay so.

   JOINTS is how many there are, in the order the model is put together:
   chassis, body, boom, inner section, bucket. The page checks the number
   against the model it actually builds. */
var JOINTS=92, JOINTS_UNDER=12, JOINTS_BODY=49;
var JOINTS_WORKING=JOINTS-JOINTS_BODY;
var ERR0=1.5/66;
`+JB+`
/* the joints that carry the work: the chassis and the arm. A body strip done
   wrong rattles; it wears nothing out. */
function weakJoints(seed,err){
  var n=0;
  for(var j=0;j<JOINTS;j++){
    if(j>=JOINTS_UNDER && j<JOINTS_UNDER+JOINTS_BODY) continue;
    if(jointBad(seed,err,j)) n++;
  }
  return n;
}
function Machine(role,atGate,px,pz,size,err,seed){`]);
E.push(["what it is born with",
`  this.cut=CUT_MAX*this.size;`,
`  this.cut=CUT_MAX*this.size;
  /* and how carefully it was put together, which is also decided once.
     See patch37. */
  this.err=(err>0&&err<1)?err:ERR0;
  this.seed=(seed>=0)?(seed|0):((rnd()*16777216)|0);
  this.weak=weakJoints(this.seed,this.err);`]);
E.push(["what wears it out",
`  this.dmg+=dt*WEAR*(IDLE+(1-IDLE)*duty);`,
`  /* A joint done wrong wears about twice as fast as a good one - the same
     severe-application figure as hard ground - and its wear is shared by
     the machine's working joints. Jeff chose that over the weakest joint
     deciding: "Spread over the machine". One bad joint in the forty-three
     that carry the work is a life about two percent shorter. patch37. */
  this.dmg+=dt*WEAR*(IDLE+(1-IDLE)*duty)*(1+this.weak/JOINTS_WORKING);`]);
E.push(["what a child inherits",
`  machines.push(new Machine(inheritRole(pa,pb),false,px,pz,sz));`,
`  /* and how carefully it was built, the same way: the average of its parents
     and a little either way. In log-odds, because a chance cannot pass nought
     or one, and in log-odds nothing has to stop it. See patch37. */
  var lgt=function(e){ return Math.log(e/(1-e)); };
  var pe=pb?(lgt(pa.err)+lgt(pb.err))*0.5:lgt(pa.err);
  var er=1/(1+Math.exp(-(pe+(rnd()+rnd()+rnd()-1.5)*0.04)));
  machines.push(new Machine(inheritRole(pa,pb),false,px,pz,sz,er));`]);
E.push(["the saved row",
`   the world was built at. */
var MFIELDS=29, MODES=["scoop","dump","toPush","push"];`,
`   the world was built at.
   31 since patch37: how carefully it was built, and the seed that says which
   joints went wrong. A row narrower than that is a machine from before, and
   it is given ERR0 and a seed as it loads. */
var MFIELDS=31, MODES=["scoop","dump","toPush","push"];`]);
E.push(["writing it",
`f[p+28]=a.size;`,
`f[p+28]=a.size;
    f[p+29]=a.err; f[p+30]=a.seed;     /* patch37: a 24-bit seed is exact in a float */`]);
E.push(["reading it",
`    var a=new Machine(f[p]|0,false,f[p+1],f[p+2],(W>28)?f[p+28]:1);`,
`    var a=new Machine(f[p]|0,false,f[p+1],f[p+2],(W>28)?f[p+28]:1,
                      (W>30)?f[p+29]:0,(W>30)?f[p+30]:-1);`]);
E.push(["the snapshot's width",
`  /* thirteen since patch30, the last one the machine's size. The page works
     the stride out from the length rather than being told, so an older page
     or an older server does not break on it. */
  var ag=grab(n*13);
  for(var i=0;i<n;i++){
    var a=machines[i], p=i*13;`,
`  /* thirteen since patch30, the last one the machine's size; sixteen since
     patch37, adding the seed, how carefully it was built, and how worn it
     is. The page works the stride out from the length rather than being
     told, so an older page or an older server does not break on it. */
  var ag=grab(n*16);
  for(var i=0;i<n;i++){
    var a=machines[i], p=i*16;`]);
E.push(["the snapshot's new fields",
`ag[p+12]=a.size;`,
`ag[p+12]=a.size;
    ag[p+13]=a.seed; ag[p+14]=a.err; ag[p+15]=a.dmg;`]);

/* ================= the wire ================= */
E.push(["asking for the packet",
`  fetch(WORLD_URL+"/state?since="+netSince+"&m=2",opt)`,
`  /* j=1 also asks for how each machine was built and how worn it is
     (patch37). It is a second flag rather than m=3 so that a server from
     before - which only knows m=2 - still sends the sizes; the page goes
     live a minute or two before the server does. */
  fetch(WORLD_URL+"/state?since="+netSince+"&m=2&j=1",opt)`]);
E.push(["telling the packets apart",
`  var per=(body===count*19+changed*8)?19:((body===count*17+changed*8)?17:0);`,
`  var per=(body===count*26+changed*8)?26:((body===count*19+changed*8)?19:
          ((body===count*17+changed*8)?17:0));`]);
E.push(["the machines' width from the wire",
`  if(AGF!==13){ AGF=13; agA=null; nA=0; }
  var ag=new Float32Array(count*13), P=Math.PI/32767;
  for(var i=0;i<count;i++){
    var p=i*13;`,
`  if(AGF!==16){ AGF=16; agA=null; nA=0; }
  var ag=new Float32Array(count*16), P=Math.PI/32767;
  for(var i=0;i<count;i++){
    var p=i*16;`]);
E.push(["the size, and after it",
`    ag[p+12]=(per===19)?Math.pow(2,(d.getUint16(o,true)-32768)/4096):1;
    if(per===19) o+=2;`,
`    ag[p+12]=(per>=19)?Math.pow(2,(d.getUint16(o,true)-32768)/4096):1;
    if(per>=19) o+=2;
    /* how it was built and how worn it is: patch37. Without them a machine
       is drawn as built perfectly and new, which is what an old server
       knows about it. */
    if(per>=26){
      ag[p+13]=d.getUint16(o,true)+d.getUint8(o+2)*65536; o+=3;
      ag[p+14]=1/(1+Math.exp(-d.getInt16(o,true)/1024)); o+=2;
      ag[p+15]=d.getUint16(o,true)/65535; o+=2;
    }else{ ag[p+13]=0; ag[p+14]=0; ag[p+15]=0; }`]);

/* ================= the picture ================= */
E.push(["the Meccano parts' attributes",
`  G.setAttribute("surf",new THREE.BufferAttribute(S,2));
  G.setAttribute("perf",new THREE.BufferAttribute(M,4));
  G.setAttribute("perfo",new THREE.BufferAttribute(O,2));
  G.setAttribute("mc",new THREE.BufferAttribute(MC,4));
  G.setAttribute("md",new THREE.BufferAttribute(MD,4));
  G.setAttribute("mid",new THREE.BufferAttribute(MI,1));`,
`  /* Packed four to an attribute. A vertex may have sixteen, the instance
     matrix alone takes four, and with which joints are wrong and how worn
     the machine is there were seventeen - the shader would not link. So the
     hole offset shares with roughness and metalness, and the axis a part's
     bolts run along is carried as the length of the vector its length runs
     along, which leaves room for which member it is. See patch37. */
  var PS=new Float32Array(vc*4), MD2=new Float32Array(vc*4);
  for(var v2=0;v2<vc;v2++){
    PS[v2*4]=O[v2*2]; PS[v2*4+1]=O[v2*2+1]; PS[v2*4+2]=S[v2*2]; PS[v2*4+3]=S[v2*2+1];
    var bf=MD[v2*4+3];
    MD2[v2*4]=MD[v2*4]*bf; MD2[v2*4+1]=MD[v2*4+1]*bf; MD2[v2*4+2]=MD[v2*4+2]*bf;
    MD2[v2*4+3]=MI[v2];
  }
  G.setAttribute("perf",new THREE.BufferAttribute(M,4));
  G.setAttribute("ps",new THREE.BufferAttribute(PS,4));
  G.setAttribute("mc",new THREE.BufferAttribute(MC,4));
  G.setAttribute("md",new THREE.BufferAttribute(MD2,4));`]);
E.push(["the shaders' declarations",
`var PERF_V="attribute vec4 perf;\\nattribute vec2 perfo;\\nvarying vec4 vPerf;\\nvarying vec2 vPerfO;\\n"+
           "varying vec3 vLoc;\\nvarying vec3 vLocN;\\n";`,
`/* ---- THE JOINTS. See patch37. ----
   Each part knows its own frame (mc: centre and how far its end holes are
   from it; md: the way its length runs and the axis its bolts go through)
   and which member it is (mid). Per machine: iJoint is which of its joints
   were done wrong, one bit each, twenty-four to a number because that is
   what a float holds exactly; iWear is how far through its life it is, and
   its seed, which picks which way each thing goes.

   Three things, all bounded by the parts themselves. Every joint works
   loose with use, by what a bolt can move in its hole. A bolt in the wrong
   hole puts the part out by one pitch. One bolt where there should be two
   lets the part swing on it as it wears, until its free end has dropped a
   pitch and rests. */
var SLACK_V=[
"attribute vec4 mc; attribute vec4 md;",
"attribute vec4 iJoint; attribute vec2 iWear;",
"uniform float uP;",
"float h_(float n){ return fract(sin(n)*43758.5453123); }",
"vec3 rotA(vec3 p, vec3 a, float t){ float cs=cos(t), sn=sin(t);",
"  return p*cs+cross(a,p)*sn+a*dot(a,p)*(1.0-cs); }",
"bool jointWrong(float m){",
"  float j=m-1.0, w=floor(j/24.0), b=j-w*24.0;",
"  float word=(w<0.5)?iJoint.x:((w<1.5)?iJoint.y:((w<2.5)?iJoint.z:iJoint.w));",
"  return mod(floor(word/exp2(b)),2.0)>0.5;",
"}",
"void slack(out vec3 piv, out vec3 ax, out float th, out vec3 sh){",
"  piv=vec3(0.0); ax=vec3(0.0,0.0,1.0); th=0.0; sh=vec3(0.0);",
"  float bf=floor(length(md.xyz)+0.5);",
"  if(bf<0.5) return;",
"  float mid=md.w; vec3 dir=md.xyz/bf;",
"  float wear=iWear.x;",
"  float k=mid*1.6180339+iWear.y*7.31;",
"  float h2=h_(k*78.233), h3=h_(k*39.425), h4=h_(k*93.989);",
"  bool bad=jointWrong(mid);",
"  vec3 c=mc.xyz; float ha=mc.w;",
"  piv=c+((h3<0.5)?-1.0:1.0)*ha*dir;                 /* the end it is held at */",
"  ax=(bf<1.5)?vec3(1.0,0.0,0.0):((bf<2.5)?vec3(0.0,1.0,0.0):vec3(0.0,0.0,1.0));",
"  th=(h4*2.0-1.0)*0.016*wear;                       /* the hole's clearance */",
"  if(bad && h2>=0.5 && ha>0.0){                      /* one bolt */",
"    float lim=atan(uP/(2.0*ha));",
"    float s;",
"    if(abs(ax.y)>0.5) s=(h4<0.5)?-1.0:1.0;          /* lying flat: no down to fall to */",
"    else s=(cross(ax,c-piv).y>0.0)?-1.0:1.0;        /* otherwise the free end goes down */",
"    th=s*lim*wear;",
"  }",
"  if(bad && h2<0.5) sh=dir*uP*((h4<0.5)?-1.0:1.0); /* the wrong hole */",
"}",
""].join("\\n");
var SLACK_DO="\\n  vec3 sPiv, sAx, sSh; float sTh; slack(sPiv,sAx,sTh,sSh);";
var SLACK_MOVE="\\n  transformed=sPiv+rotA(transformed-sPiv,sAx,sTh)+sSh;";
var PERF_V="attribute vec4 perf;\\nattribute vec4 ps;\\nvarying vec4 vPerf;\\nvarying vec2 vPerfO;\\n"+
           "varying vec3 vLoc;\\nvarying vec3 vLocN;\\n"+SLACK_V;
var PERF_SET="\\n  vPerf=perf;\\n  vPerfO=ps.xy;\\n  vLoc=position;\\n  vLocN=normal;";`]);
E.push(["where the hole offset is read",
`var PERF_SET="\\n  vPerf=perf;\\n  vPerfO=perfo;\\n  vLoc=position;\\n  vLocN=normal;";`,
``]);
E.push(["the material's own program",
`mecMat.customProgramCacheKey=function(){ return "mec-perf"; };`,
`mecMat.customProgramCacheKey=function(){ return "mec-perf-slack"; };`]);
E.push(["the material moves the parts",
`    sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\\n  vSurf=surf;"+PERF_SET+"\\n"+`,
`    sh.vertexShader.replace("#include <beginnormal_vertex>",
      "#include <beginnormal_vertex>"+SLACK_DO+"\\n  objectNormal=rotA(objectNormal,sAx,sTh);")
    .replace("#include <begin_vertex>",
      "#include <begin_vertex>"+SLACK_MOVE+"\\n  vSurf=ps.zw;"+PERF_SET+"\\n"+`]);
E.push(["the material's own declarations",
`  lampUniforms(sh); perfUniforms(sh);
  sh.vertexShader="attribute vec2 surf;\\nvarying vec2 vSurf;\\n"+`,
`  lampUniforms(sh); perfUniforms(sh);
  sh.vertexShader="varying vec2 vSurf;\\n"+`]);
E.push(["and so does its shadow",
`mecDepth.customProgramCacheKey=function(){ return "mec-perf-depth"; };`,
`mecDepth.customProgramCacheKey=function(){ return "mec-perf-slack-depth"; };`]);
E.push(["the shadow's vertex shader",
`  sh.vertexShader=PERF_V+sh.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>"+PERF_SET);`,
`  sh.vertexShader=PERF_V+sh.vertexShader.replace("#include <begin_vertex>",
    "#include <begin_vertex>"+SLACK_DO+SLACK_MOVE+PERF_SET);`]);
E.push(["the per-machine numbers",
`function mkInst(g,mult,mat,depth){`,
`/* Which joints, and how worn: one set of numbers per machine, shared by its
   five assemblies, filled in drawMachines. The wheels have no joints, but
   their shader asks, so they are given numbers that say none. patch37. */
`+JB+`
var JNT=new THREE.InstancedBufferAttribute(new Float32Array(MAXI*4),4);
var JWR=new THREE.InstancedBufferAttribute(new Float32Array(MAXI*2),2);
JNT.setUsage(THREE.DynamicDrawUsage); JWR.setUsage(THREE.DynamicDrawUsage);
[MEC.UNDER,MEC.HOUSE,MEC.BOOM,MEC.STICK,MEC.BUCKET].forEach(function(g){
  g.setAttribute("iJoint",JNT); g.setAttribute("iWear",JWR);
});
MEC.WHEEL.setAttribute("iJoint",new THREE.InstancedBufferAttribute(new Float32Array(MAXI*16),4));
MEC.WHEEL.setAttribute("iWear",new THREE.InstancedBufferAttribute(new Float32Array(MAXI*8),2));
/* the simulation numbers its joints in the order the model is built: if the
   model has changed and the simulation has not been told, say so */
if(MEC.MEMBERS!==92 && window.console) console.warn("the model has "+MEC.MEMBERS+" joints and the simulation counts 92");
var _jSeed=new Float64Array(MAXI), _jErr=new Float64Array(MAXI);
for(var _j=0;_j<MAXI;_j++) _jSeed[_j]=-1;
function jointsOf(i,seed,err,wear){
  var A=JNT.array, k=i*4, j;
  if(_jSeed[i]!==seed||_jErr[i]!==err){
    _jSeed[i]=seed; _jErr[i]=err;
    A[k]=0; A[k+1]=0; A[k+2]=0; A[k+3]=0;
    for(j=0;j<MEC.MEMBERS&&j<96;j++) if(jointBad(seed,err,j)) A[k+((j/24)|0)]+=Math.pow(2,j%24);
  }
  JWR.array[i*2]=wear<0?0:(wear>1?1:wear);
  JWR.array[i*2+1]=seed/16777216;
}
function mkInst(g,mult,mat,depth){`]);
E.push(["reading them in the drawing loop",
`    var msz=(AGF>12)?agB[p+12]:1; if(!(msz>0)) msz=1;`,
`    var msz=(AGF>12)?agB[p+12]:1; if(!(msz>0)) msz=1;
    /* how it was built and how worn, from the newer frame: they are not
       things to blend. patch37 */
    var jsd=(AGF>15)?agB[p+13]:0, jer=(AGF>15)?agB[p+14]:0, jdm=(AGF>15)?agB[p+15]:0;`]);
E.push(["filling them in",
`    RIG.under.setMatrixAt(i,mU);`,
`    RIG.under.setMatrixAt(i,mU);
    jointsOf(i,jsd,jer,jdm);`]);
E.push(["sending them",
`    BLOB.count=0;`,
`    sendInstances(JNT,n,4); sendInstances(JWR,n,2);
    BLOB.count=0;`]);

let bad=0;
if(s.includes("var JOINTS=92")){ console.error("already applied"); bad++; }
if(!s.includes("var MEC=(function(){")){ console.error("patch36 is not in this page"); bad++; }
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const sim=(back.match(/<script id="simsrc"[^>]*>([\s\S]*?)<\/script>/)||[])[1]||"";
const page=back.replace(sim,"");
const checks=[
  ["the simulation decides which joints",   sim.includes("var JOINTS=92, JOINTS_UNDER=12, JOINTS_BODY=49;") && sim.includes(JB)],
  ["the picture asks the same function",    page.includes(JB)],
  ["word for word, once each",              sim.split(JB).length===2 && page.split(JB).length===2],
  ["the page knows the same count",         page.includes("MEC.MEMBERS!==92")],
  ["built in at birth",                     sim.includes("this.weak=weakJoints(this.seed,this.err);")],
  ["inherited like size",                   sim.includes("machines.push(new Machine(inheritRole(pa,pb),false,px,pz,sz,er));")],
  ["bad joints wear the machine",           sim.includes("*(1+this.weak/JOINTS_WORKING);")],
  ["saved",                                 sim.includes("var MFIELDS=31,") && sim.includes("f[p+29]=a.err; f[p+30]=a.seed;")],
  ["and read back, older rows too",         sim.includes("(W>30)?f[p+29]:0,(W>30)?f[p+30]:-1);")],
  ["handed to the page",                    sim.includes("var ag=grab(n*16);") && sim.includes("ag[p+13]=a.seed; ag[p+14]=a.err; ag[p+15]=a.dmg;")],
  ["asked for over the wire",               page.includes('"/state?since="+netSince+"&m=2&j=1"')],
  ["three packets told apart",              page.includes("(body===count*26+changed*8)?26:")],
  ["the parts move",                        page.includes("objectNormal=rotA(objectNormal,sAx,sTh);") && page.includes("+SLACK_MOVE+")],
  ["and their shadows",                     page.includes('"#include <begin_vertex>"+SLACK_DO+SLACK_MOVE+PERF_SET);')],
  ["filled and sent every frame",           page.includes("jointsOf(i,jsd,jer,jdm);") && page.includes("sendInstances(JNT,n,4); sendInstances(JWR,n,2);")],
  ["seventeen attributes down to fourteen", page.includes('G.setAttribute("ps",new THREE.BufferAttribute(PS,4));') && !page.includes('G.setAttribute("mid",')],
  ["the simulation still parses",           (()=>{ try{ new Function(sim); return true; }catch(e){ console.log("   "+e.message); return false; } })()],
  ["not applied twice",                     back.split("var JOINTS=92").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
