/* patch17 - the lamps get chosen, aimed and sent; the painted disc goes.
 * RUN AFTER patch16.js.
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch17.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
if(!s.includes("var LAMP_DECL=[")){ console.error("REFUSED: run patch16.js first"); process.exit(1); }
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

/* the disc goes */
e("delete the painted pool",
`var poolTex=(function(){
  var c=document.createElement("canvas"); c.width=64; c.height=64;
  var x=c.getContext("2d"), g=x.createRadialGradient(32,32,2,32,32,31);
  g.addColorStop(0,"rgba(255,236,200,0.85)");
  g.addColorStop(0.45,"rgba(255,222,170,0.30)");
  g.addColorStop(1,"rgba(255,210,150,0)");
  x.fillStyle=g; x.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
})();
var poolMat=new THREE.MeshBasicMaterial({map:poolTex,transparent:true,opacity:0,
  depthWrite:false,blending:THREE.AdditiveBlending});
var poolGeo=new THREE.PlaneGeometry(1,1);
poolGeo.rotateX(-Math.PI/2);
var POOLS=new THREE.InstancedMesh(poolGeo,poolMat,MAXI);
POOLS.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
POOLS.frustumCulled=false; POOLS.count=0; POOLS.renderOrder=3; scene.add(POOLS);

var _lq=new THREE.Quaternion(), _lu=new THREE.Vector3(0,1,0);
function lightsUp(n){
  var lit=nightFactor;
  lampMat.opacity=lit;
  poolMat.opacity=lit*0.9;
  var on=lit>0.02;
  LAMPS.visible=on; POOLS.visible=on;
  LAMPS.count=on?n:0; POOLS.count=on?n:0;
  if(on){
    sendInstances(LAMPS.instanceMatrix,n,16);
    sendInstances(POOLS.instanceMatrix,n,16);
  }
}`,
`/* ---- choosing which lamps the shaders get told about ----
   Every machine carries one. A shader cannot be handed four hundred, so it
   is handed the eight nearest the camera, which are the only eight that can
   put a visible amount of light on anything in the frame. Past those, a
   lamp's contribution has fallen off with the square of the distance to
   something under a thousandth of what the nearest one is delivering.

   Where the lamp is and where it points both come from the machine's own
   house matrix, so a machine tilted nose-down on a dune aims its light into
   the sand in front of it, which is what actually happens. */
var _lampPos=new THREE.Vector3(), _lampAim=new THREE.Vector3();
var _lampD2=new Float64Array(8);
var _lampN=0;
function lampReset(){ _lampN=0; }
function lampOffer(d2){
  var P=LAMPU.uLampP.value, D=LAMPU.uLampD.value, i, j;
  if(_lampN>=8 && d2>=_lampD2[7]) return;             /* further than all eight */
  i=(_lampN<8)?_lampN++:7;
  while(i>0 && _lampD2[i-1]>d2){                      /* keep them in order */
    _lampD2[i]=_lampD2[i-1];
    for(j=0;j<4;j++){ P[i*4+j]=P[(i-1)*4+j]; D[i*4+j]=D[(i-1)*4+j]; }
    i--;
  }
  _lampD2[i]=d2;
  P[i*4]=_lampPos.x; P[i*4+1]=_lampPos.y; P[i*4+2]=_lampPos.z; P[i*4+3]=0;
  D[i*4]=_lampAim.x; D[i*4+1]=_lampAim.y; D[i*4+2]=_lampAim.z; D[i*4+3]=0;
}
/* a work lamp's power, over the square of how far its light had to travel.
   LAMP_POWER is the one number here and it is the lamp, not the look: turn it
   up and every lamp in the pit gets brighter together. */
var LAMP_POWER=45.0;
function lampFlush(){
  LAMPU.uLampN.value=_lampN;
  var k=LAMP_POWER*nightFactor;
  LAMPU.uLampC.value.set(1.00*k,0.86*k,0.62*k);
}

function lightsUp(n){
  var lit=nightFactor;
  lampMat.opacity=lit;
  var on=lit>0.02;
  LAMPS.visible=on;
  LAMPS.count=on?n:0;
  if(on) sendInstances(LAMPS.instanceMatrix,n,16);
}`);

/* the lamp is placed where the lamp is */
e("aim the lamp off the machine itself",
`    if(typeof LAMPS!=="undefined" && nightFactor>0.02){
      LAMPS.setMatrixAt(i,mH);
      /* the pool falls on the sand ahead of it, flat, whatever the machine is doing */
      var px=x+Math.cos(ang)*2.4*machLen, pz=z+Math.sin(ang)*2.4*machLen;
      _lq.setFromAxisAngle(_lu,-ang);
      _pv.set(px,hAt(px,pz)+0.06*machLen,pz);
      _sc.set(7*machLen,1,7*machLen);
      _mC.compose(_pv,_lq,_sc);
      LAMPS.setMatrixAt(i,mH); POOLS.setMatrixAt(i,_mC);
    }`,
`    if(typeof LAMPS!=="undefined" && nightFactor>0.02){
      LAMPS.setMatrixAt(i,mH);
      /* on the cab roof, between the two boxes that are drawn there, and
         pointed where the machine is pointed with the downward tilt a work
         light is hung at. Both go through the machine's own matrix, so the
         beam tilts with the body rather than staying level with the world. */
      _lampPos.set(0.30,0.45,-0.10).applyMatrix4(mH);
      _lampAim.set(1.0,-0.34,0.0).transformDirection(mH).normalize();
      lampOffer(_lampPos.distanceToSquared(camera.position));
    }`);

/* reset before the loop, send after it */
e("reset the list each frame",
`  if(!agA||!agB) return;
  var n=Math.min(nA,nB), i;`,
`  if(!agA||!agB) return;
  lampReset();
  var n=Math.min(nA,nB), i;`);

e("send the list once the loop is done",
`  if(articulate){
    for(var k=0;k<RIGLIST.length;k++){
      var m=RIGLIST[k], cnt=(m===RIG.wheel)?n*4:n; m.count=cnt;`,
`  lampFlush();
  if(articulate){
    for(var k=0;k<RIGLIST.length;k++){
      var m=RIGLIST[k], cnt=(m===RIG.wheel)?n*4:n; m.count=cnt;`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["the painted disc is gone", !back.includes("var POOLS=") && !back.includes("poolMat")],
  ["lamps are chosen", back.includes("function lampOffer(d2){")],
  ["lamps are aimed off the machine", back.includes("_lampAim.set(1.0,-0.34,0.0).transformDirection(mH)")],
  ["list reset", back.includes("  lampReset();")],
  ["list sent", back.includes("  lampFlush();")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
