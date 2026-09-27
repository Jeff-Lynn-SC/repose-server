/* patch26 - the shadow follows the eye, and stops being pushed metres off.
 *
 * Two faults, and between them they are why a machine looks pasted onto the
 * sand rather than standing on it.
 *
 * These are MEASURED off the running page, not read off the source. Read off
 * the source they are wrong: the start-up code sets the box to HALF*1.72,
 * 1720 m wide, and measurePopulation then quietly resets it a second later.
 * What actually runs is the second one.
 *
 * ONE. The shadow picture is 2048 dots across a box 359 m wide - popR*1.5,
 * floored at 30 machine lengths, which is what it sits at with eight machines
 * in a kilometre. One dot is 17.5 cm. A tyre is 56 cm, so a tyre is three
 * dots; a bucket lip is one. And the box does not move with the camera, so
 * putting the camera close in buys nothing - and the director spends most of
 * its time within twenty or thirty metres of a machine.
 *
 * The box only has to hold what can be SEEN. Sized to the shot, the same 2048
 * dots over a 96 m box give 4.7 cm, and it widens again when the camera pulls
 * back. A grand shot gets what it always got.
 *
 * TWO, and this is the one that mattered. sun.shadow.normalBias was 0.5*CS.
 * CS is the simulation's cell, 5.6 m, so that is 2.79 METRES of shadow pushed
 * away from whatever casts it - sixteen times the dot it is supposed to be a
 * fraction of, and taller than the machine. Nothing could hold a shadow
 * against its own feet. It is the recurring fault of this file exactly: a
 * length scaled to something unrelated, quietly meaning metres. A normal bias
 * is a property of ONE DOT of the shadow picture - the only length a shadow
 * map has - so that is what it is now, and it moves with the box: 7.5 cm
 * close in, 25 cm over the pit.
 *
 * And the thing that makes a following shadow box possible at all: the box
 * is snapped to whole dots along the light's own axes. Without that, every
 * fraction of a dot the camera drifts redraws every shadow edge somewhere
 * else, and the whole pit crawls. That is why this is not simply "make the
 * box smaller".
 *
 * Usage: node patch26.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch26.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("the shadow rig follows the shot",
`var sunDir=new THREE.Vector3(0,1,0), sunDist=300, sunTargetX=0, sunTargetZ=0;`,
`var sunDir=new THREE.Vector3(0,1,0), sunDist=300, sunTargetX=0, sunTargetZ=0;

/* ---- the shadow covers what can be seen, not the whole kilometre ----
   See patch26. Called every frame, after the camera has been placed and
   before anything is drawn. */
var _shF=new THREE.Vector3(), _shFwd=new THREE.Vector3(), _shR=new THREE.Vector3(),
    _shU=new THREE.Vector3(), _shWorldUp=new THREE.Vector3(0,1,0);
var _shSpan=-1;
function shadowFollow(){
  if(!sun.castShadow||!sun.shadow||!sun.shadow.camera||!machLen) return;
  /* what the viewer is actually looking at */
  if(man.on) _shF.set(man.tx,man.ty,man.tz); else _shF.copy(camT0);
  var dist=camera.position.distanceTo(_shF);

  /* How wide the box has to be. At this camera's 38 degrees, what is visible
     around the point being looked at is about four fifths of the distance to
     it; a few machine lengths of margin covers what is nearer than the
     subject and still in frame. Clamped at the top by the pit itself, so a
     grand shot gets exactly what it used to. */
  var dmax=HALF*1.72, dmin=8*machLen;
  var d=dist*0.85+3*machLen;
  if(d>dmax) d=dmax; else if(d<dmin) d=dmin;
  var texel=2*d/quality.shadow;

  /* Snap the box to whole dots along the light's own axes. Without this the
     box slides continuously and every shadow edge in the pit redraws itself
     a fraction of a dot to one side each frame, which crawls. */
  _shFwd.copy(sunDir).negate();
  if(_shFwd.lengthSq()<1e-9) _shFwd.set(0,-1,0);
  _shFwd.normalize();
  _shR.crossVectors(_shWorldUp,_shFwd);
  if(_shR.lengthSq()<1e-9) _shR.set(1,0,0);
  _shR.normalize();
  _shU.crossVectors(_shFwd,_shR).normalize();
  var a=Math.round(_shF.dot(_shR)/texel)*texel;
  var bb=Math.round(_shF.dot(_shU)/texel)*texel;
  var cc=_shF.dot(_shFwd);
  _shF.set(0,0,0).addScaledVector(_shR,a).addScaledVector(_shU,bb).addScaledVector(_shFwd,cc);

  sunTargetX=_shF.x; sunTargetZ=_shF.z;
  /* Far enough back that the box is entirely in front of the light, and no
     further. This used to read Math.max(sunDist||300,d*3) - but sunDist is
     set for the whole crowd, so a close shot got a 700 m deep box and a
     depth bias derived from it that meant nothing. The light's distance is
     a property of the box, like everything else here. */
  var sd=Math.max(200, d*3);
  sun.position.set(_shF.x+sunDir.x*sd, sunDir.y*sd, _shF.z+sunDir.z*sd);
  sun.target.position.set(_shF.x,0,_shF.z);
  sun.target.updateMatrixWorld();

  var sc=sun.shadow.camera;
  if(Math.abs(_shSpan-d)>0.001){
    sc.left=-d; sc.right=d; sc.top=d; sc.bottom=-d;
    sc.near=1; sc.far=sd*2+d*2;
    sc.updateProjectionMatrix();
    _shSpan=d;
  }
  /* both of these are a property of one dot of the shadow picture, which is
     the only length a shadow map has. normalBias was 0.5*CS - 2.8 m. */
  sun.shadow.normalBias=1.6*texel;
  sun.shadow.bias=-0.9*texel/(sc.far-sc.near);
}`);

e("stop sizing the box to the whole world",
`  var d=HALF*1.72, sc=sun.shadow.camera;
  sc.left=-d; sc.right=d; sc.top=d; sc.bottom=-d; sc.near=HALF*0.2; sc.far=HALF*4.5;
  sc.updateProjectionMatrix();
  sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.5*CS;`,
`  /* the box, its near and far, its bias and its normal bias are all set by
     shadowFollow every frame from the shot in front of you. What used to be
     here sized the box to the whole kilometre - though measurePopulation
     reset it to 359 m a second later, so the kilometre never ran - and set a
     normal bias of 0.5*CS, which is 2.79 m against a 17.5 cm shadow dot.
     See patch26. */
  _shSpan=-1;`);

e("stop the crowd resizing the box behind the shot's back",
`  /* the sun only needs to cast where anyone is standing */
  if(sun.shadow&&sun.shadow.camera){
    var d2=Math.max(popR*1.5,30*machLen);
    var sc=sun.shadow.camera;
    if(Math.abs(sc.right-d2)>d2*0.15){
      sc.left=-d2; sc.right=d2; sc.top=d2; sc.bottom=-d2; sc.updateProjectionMatrix();
    }
    sunTargetX=popX; sunTargetZ=popZ; sunDist=Math.max(d2*2.2,200);
  }
}`,
`  /* This used to size the shadow box to the whole crowd and aim the light at
     its centre, on every stats message from the worker. shadowFollow now owns
     the box, the light's aim and the light's distance, and it sets them from
     the shot. Left in, the two fought: shadowFollow set the box once, this
     put it back to a hundred and eighty metres a moment later, and the bias -
     still worked out from the box shadowFollow thought it had - was then too
     small for the box actually in use. Which is this file's recurring fault
     again, and this time it was mine. See patch26.
     popX, popZ and popR are still wanted: the camera uses them. */
}`);

e("call it once the camera is placed",
`  driveCamera(now,dt);
  camLabel();
  present(now);`,
`  driveCamera(now,dt);
  shadowFollow();          /* after the camera is placed, before anything is drawn */
  camLabel();
  present(now);`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["shadowFollow exists", back.includes("function shadowFollow(){")],
  ["it is called each frame", back.includes("  shadowFollow();          /* after the camera is placed")],
  ["the 2.8 m normal bias is gone", !back.includes("sun.shadow.normalBias=0.5*CS")],
  ["bias comes from the texel", back.includes("sun.shadow.bias=-0.9*texel/(sc.far-sc.near);")],
  ["box no longer fixed to the world", !back.includes("sc.left=-d; sc.right=d; sc.top=d; sc.bottom=-d; sc.near=HALF*0.2;")],
  ["the crowd no longer resizes the box", !back.includes("sunDist=Math.max(d2*2.2,200);")],
  ["nothing else writes the shadow box", (back.match(/sc\.left=-d/g)||[]).length===1],
  ["popX still tracked for the camera", back.includes("popX+=(cx-popX)*0.08;")],
  ["light distance no longer from sunDist", back.includes("var sd=Math.max(200, d*3);")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
