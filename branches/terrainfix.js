/* Patch 2 — rebuild the ground that moved, not all of it.
   Proves every anchor before it writes anything, and writes once at the end. */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch2.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

/* ---- 1. the moving-ground bookkeeping, declared beside the other terrain arrays ---- */
const DECL_OLD = `var pos=null,nor=null,col=null,geo=null,terrain=null,pit=[];`;
const DECL_NEW = `var pos=null,nor=null,col=null,geo=null,terrain=null,pit=[];
/* ---- which ground is actually moving ----
   Between two snapshots only the cells the world said had changed differ
   between hA and hB. Every other vertex comes out the same at every alpha, so
   rebuilding all 32,400 of them every frame is work that produces the number
   it produced last time — and it was 62% of the frame's JavaScript. The four
   neighbours of a moving cell go in too, because a vertex takes its normal and
   its shading from them. Wear and rock are not interpolated, but the wind
   scrubs them without moving any sand, so they are compared as well. */
var zone=null, zoneN=0, zoneWas=null, zoneWasN=0, zoneMark=null, zoneStamp=0,
    wearWas=null, rockWas=null, terrainAll=true;
function markMoved(){
  var len=(N*N)|0;
  if(!hA||!hB||!len||hA.length!==len||hB.length!==len){ terrainAll=true; return; }
  if(!zone||zone.length!==len){
    zone=new Int32Array(len); zoneWas=new Int32Array(len); zoneMark=new Int32Array(len);
    wearWas=new Float32Array(len); rockWas=new Float32Array(len);
    zoneStamp=0; zoneN=0; zoneWasN=0; terrainAll=true;
  }
  /* what was moving last time has stopped, and has to be written where it stopped */
  var sw=zoneWas; zoneWas=zone; zone=sw; zoneWasN=zoneN; zoneN=0;
  zoneStamp++;
  var i,j,x,z,cnt=0;
  for(j=0;j<zoneWasN;j++){ i=zoneWas[j];
    if(zoneMark[i]!==zoneStamp){ zoneMark[i]=zoneStamp; zone[cnt++]=i; } }
  for(i=0;i<len;i++){
    var moved=(hA[i]!==hB[i]);
    if(!moved&&wearB&&wearB[i]!==wearWas[i]) moved=true;
    if(!moved&&rockB&&rockB[i]!==rockWas[i]) moved=true;
    if(!moved) continue;
    x=i%N; z=(i-x)/N;
    if(zoneMark[i]!==zoneStamp){ zoneMark[i]=zoneStamp; zone[cnt++]=i; }
    if(x>0&&zoneMark[i-1]!==zoneStamp){ zoneMark[i-1]=zoneStamp; zone[cnt++]=i-1; }
    if(x<N-1&&zoneMark[i+1]!==zoneStamp){ zoneMark[i+1]=zoneStamp; zone[cnt++]=i+1; }
    if(z>0&&zoneMark[i-N]!==zoneStamp){ zoneMark[i-N]=zoneStamp; zone[cnt++]=i-N; }
    if(z<N-1&&zoneMark[i+N]!==zoneStamp){ zoneMark[i+N]=zoneStamp; zone[cnt++]=i+N; }
  }
  zoneN=cnt;
  if(wearB&&wearB.length>=len) wearWas.set(wearB.subarray(0,len));
  if(rockB&&rockB.length>=len) rockWas.set(rockB.subarray(0,len));
}`;

/* ---- 2. a fresh terrain means everything is new ---- */
const BUILD_OLD = `  pos=new Float32Array(N*N*3); nor=new Float32Array(N*N*3); col=new Float32Array(N*N*3);
  hCur=new Float32Array(N*N);`;
const BUILD_NEW = `  pos=new Float32Array(N*N*3); nor=new Float32Array(N*N*3); col=new Float32Array(N*N*3);
  hCur=new Float32Array(N*N);
  zone=null; zoneN=0; zoneWasN=0; terrainAll=true;`;

/* ---- 3. the head of the loop: walk the moving ground, not the whole grid ---- */
const HEAD_OLD = `  var p=1,c=0,i,x,z, band=1.15*CS, top=7.5*CS;
  var rip=1.9, ripAmp=0.075;
  for(i=0;i<hCur.length;i++) hCur[i]=hA[i]+(hB[i]-hA[i])*alpha;
  for(z=0;z<N;z++)for(x=0;x<N;x++){
    i=z*N+x;
    var hv=hCur[i]; if(hv<0) hv=0;
    pos[p]=hv; p+=3;`;
const HEAD_NEW = `  var p,c,i,x,z,kk, band=1.15*CS, top=7.5*CS;
  var rip=1.9, ripAmp=0.075;
  var list=(terrainAll||!zone)?null:zone, count=list?zoneN:N*N;
  if(!count){ terrainAll=false; return; }
  var lo=N*N, hi=-1, zz;
  if(list){ for(kk=0;kk<count;kk++){ zz=list[kk]; hCur[zz]=hA[zz]+(hB[zz]-hA[zz])*alpha; } }
  else{ for(kk=0;kk<hCur.length;kk++) hCur[kk]=hA[kk]+(hB[kk]-hA[kk])*alpha; }
  for(kk=0;kk<count;kk++){
    i=list?list[kk]:kk;
    x=i%N; z=(i-x)/N;
    c=i*3; p=c+1;
    if(i<lo)lo=i; if(i>hi)hi=i;
    var hv=hCur[i]; if(hv<0) hv=0;
    pos[p]=hv;`;

/* ---- 4. the tail: send only the span that changed ---- */
const TAIL_OLD = `    col[c]=r*k; col[c+1]=g*k; col[c+2]=b*k; c+=3;
  }
  geo.attributes.position.needsUpdate=true;
  geo.attributes.normal.needsUpdate=true;
  geo.attributes.color.needsUpdate=true;`;
const TAIL_NEW = `    col[c]=r*k; col[c+1]=g*k; col[c+2]=b*k;
  }
  /* and only the span of it goes to the card */
  var aP=geo.attributes.position, aN=geo.attributes.normal, aC=geo.attributes.color;
  if(list&&hi>=lo){
    var off=lo*3, run=(hi-lo+1)*3;
    aP.updateRange.offset=off; aP.updateRange.count=run;
    aN.updateRange.offset=off; aN.updateRange.count=run;
    aC.updateRange.offset=off; aC.updateRange.count=run;
  }else{
    aP.updateRange.count=-1; aN.updateRange.count=-1; aC.updateRange.count=-1;
  }
  aP.needsUpdate=true; aN.needsUpdate=true; aC.needsUpdate=true;
  terrainAll=false;`;

/* ---- 5. say so whenever a new pair of snapshots lands ---- */
const NET_OLD = `  hB=new Float32Array(netH); agB=ag; nB=count; wearB=netW; rockB=netR;
  tB=performance.now();`;
const NET_NEW = `  hB=new Float32Array(netH); agB=ag; nB=count; wearB=netW; rockB=netR;
  tB=performance.now();
  markMoved();`;

const SIM_OLD = `    if(!hA){ hA=new Float32Array(hB); agA=new Float32Array(agB); nA=nB; tA=tB-33; }`;
const SIM_NEW = `    if(!hA){ hA=new Float32Array(hB); agA=new Float32Array(agB); nA=nB; tA=tB-33; }
    markMoved();`;

const edits = [
  ['declarations', DECL_OLD, DECL_NEW],
  ['buildTerrain', BUILD_OLD, BUILD_NEW],
  ['loop head', HEAD_OLD, HEAD_NEW],
  ['loop tail', TAIL_OLD, TAIL_NEW],
  ['netApply', NET_OLD, NET_NEW],
  ['onSim', SIM_OLD, SIM_NEW],
];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('function markMoved')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['markMoved present', back.includes('function markMoved()')],
  ['loop walks the zone', back.includes('i=list?list[kk]:kk;')],
  ['span sent', back.includes('aP.updateRange.offset=off;')],
  ['netApply marks', back.split('  markMoved();').length - 1 >= 1],
  ['onSim marks', back.includes('    markMoved();')],
  ['old full loop gone', !back.includes('for(z=0;z<N;z++)for(x=0;x<N;x++){\n    i=z*N+x;')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 2 written' : 'patch 2 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
