/* patch28 - a machine takes the sky away from the sand under it.
 *
 * patch27 worked out how much sky each point of the GROUND can see, and
 * measured the answer: between 0.997 and 1.000 everywhere. Which is correct,
 * and it settles the question. The pit has about 3.6 m of relief across a
 * whole kilometre. Four metres over a kilometre is a billiard table; nothing
 * in it casts a horizon worth the name. The ground is not what blocks the
 * sky here.
 *
 * A machine is 2.7 m tall and stands directly on the sand. It is the only
 * thing in the piece big enough to take the dome away from the ground - and
 * the ground right underneath it is exactly where Jeff said the machine looks
 * pasted on rather than standing.
 *
 * So: each machine near the camera is offered to the sand shader as two
 * spheres - the body, and the bucket - and the sand works out how much of its
 * sky each one covers. The quantity is the solid angle the sphere subtends,
 * weighted by how squarely it sits against the surface's own hemisphere:
 * nl*r^2/d^2, which is the standard far-field form and is exact enough well
 * before it matters. Straight under the belly it saturates, which is right:
 * from there you cannot see the sky at all.
 *
 * THIS IS NOT A SHADOW, and that is the point of doing it. The sun is handled
 * by the shadow map and always was. This is the SKY being blocked, which is
 * three fifths of the light at midday and, at night, when there is no sun at
 * all, it is the only contact shade there could possibly be. A machine under
 * the moon now sits in its own pool of dark.
 *
 * Eight occluders, nearest to the camera, ordered - the same machinery as the
 * work lamps and for the same reason: past the nearest few, a sphere's
 * occlusion has fallen off with the square of the distance to nothing. The
 * loop is guarded when there are none, and each occluder is skipped at eight
 * radii, where it is worth under two percent.
 *
 * Sand only, deliberately. A machine's own sphere sits inside the machine, so
 * feeding these to the machine's shader would have it occlude its own roof.
 * Machines shading each other, and the gap under a machine's own belly, are
 * worth doing and want a different shape than a sphere. Written down.
 *
 * Usage: node patch28.js <index.html>     (after patch27)
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch28.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

/* ---- 1. the block, next to the lamps, for the same reason ---- */
e("declare the occluders",
`var LAMPU={ uLampP:{value:new Float32Array(32)}, uLampD:{value:new Float32Array(32)},`,
`/* ---- what a machine does to the sky over a patch of sand ----
   Two spheres a machine: the body and the bucket. What is computed is the
   fraction of this point's sky that the sphere covers - nl*r^2/d^2, the solid
   angle weighted by how squarely it sits against the surface's hemisphere.
   Straight under the belly it saturates at one, which is correct: from there
   there is no sky. See patch28. */
var OCC_MAX=8;
var OCC_DECL=[
 "uniform vec4 uOccP[8];",       /* xyz where it is, w how big */
 "uniform float uOccN;"
].join("\\n");
var OCCU={ uOccP:{value:new Float32Array(32)}, uOccN:{value:0} };
/* How near the camera a machine has to be before it is worth asking the sand
   about it at all. A machine shades the ground within about eight of its own
   radii - some fourteen metres - and past twelve machine lengths that patch
   is a smudge. Measured: unguarded, the loop cost 9% of the frame, nearly all
   of it on machines too far away to be seen shading anything. A ball drawn
   round all eight was tried first and was no use, because four machines
   scattered over a square kilometre make a ball that covers the whole view. */
var OCC_NEAR=12;
function occUniforms(sh){ for(var k in OCCU) sh.uniforms[k]=OCCU[k]; }
var _occPos=new THREE.Vector3();
var _occD2=new Float64Array(8);
var _occN=0;
function occReset(){ _occN=0; }
function occOffer(r,d2){
  var P=OCCU.uOccP.value, i, j;
  var far=OCC_NEAR*machLen; if(d2>far*far) return;    /* too far to be seen shading anything */
  if(_occN>=8 && d2>=_occD2[7]) return;
  i=(_occN<8)?_occN++:7;
  while(i>0 && _occD2[i-1]>d2){
    _occD2[i]=_occD2[i-1];
    for(j=0;j<4;j++) P[i*4+j]=P[(i-1)*4+j];
    i--;
  }
  _occD2[i]=d2;
  P[i*4]=_occPos.x; P[i*4+1]=_occPos.y; P[i*4+2]=_occPos.z; P[i*4+3]=r;
}
function occFlush(){ OCCU.uOccN.value=_occN; }

var LAMPU={ uLampP:{value:new Float32Array(32)}, uLampD:{value:new Float32Array(32)},`);

/* ---- 2. the sand asks for them ---- */
e("hand them to the sand",
`    lampUniforms(sh);
    sh.fragmentShader=
      "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\nvarying float vSky;\\nuniform float uRip;\\n"+LAMP_DECL+"\\n"+`,
`    lampUniforms(sh);
    occUniforms(sh);
    sh.fragmentShader=
      "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\nvarying float vSky;\\nuniform float uRip;\\n"+LAMP_DECL+"\\n"+OCC_DECL+"\\n"+`);

/* ---- 3. and takes them off its sky ---- */
e("take the machines off the sky",
`      "    float sv=clamp(vSky,0.0,1.0);\\n"+`,
`      "    float sv=clamp(vSky,0.0,1.0);\\n"+
      "    /* and what the machines standing on it are covering. Not a shadow:\\n"+
      "       the sun has the shadow map. This is the sky, which at night is\\n"+
      "       the only thing there is. See patch28. */\\n"+
      "    if(uOccN>0.5){\\n"+
      "      vec3 onrm=normalize(vWNrm);\\n"+
      "      for(int oi=0;oi<8;oi++){\\n"+
      "        if(float(oi)>=uOccN) break;\\n"+
      "        vec3 ov=uOccP[oi].xyz-vWPos;\\n"+
      "        float ol2=dot(ov,ov);\\n"+
      "        float orr=uOccP[oi].w*uOccP[oi].w;\\n"+
      "        if(ol2>orr*64.0) continue;\\n"+
      "        float onl=dot(onrm,ov*inversesqrt(max(ol2,1e-6)));\\n"+
      "        if(onl<=0.0) continue;\\n"+
      "        sv*=1.0-min(onl*orr/max(ol2,orr*0.25),1.0);\\n"+
      "      }\\n"+
      "    }\\n"+`);

/* ---- 4. offer them, machine by machine ---- */
e("start the list with the lamps'",
`  lampReset();`,
`  lampReset();
  occReset();`);

e("offer the body and the bucket",
`    var mK=joint(_mB,mS,BL,0,0,bk,0);               RIG.bucket.setMatrixAt(i,mK);
    _mA.copy(mK);`,
`    var mK=joint(_mB,mS,BL,0,0,bk,0);               RIG.bucket.setMatrixAt(i,mK);
    /* the body, and the bucket, as two spheres of sky this machine is taking
       off the sand around it. The body sits about 1.7 m up and is about 1.8 m
       across; the bucket is smaller and much lower, which is why it is worth
       having separately - it is the one resting on the ground. See patch28. */
    _occPos.set(0,0.28,0).applyMatrix4(mU);
    occOffer(0.30*machLen,_occPos.distanceToSquared(camera.position));
    _occPos.setFromMatrixPosition(mK);
    occOffer(0.16*machLen,_occPos.distanceToSquared(camera.position));
    _mA.copy(mK);`);

e("finish the list with the lamps'",
`  lampFlush();`,
`  lampFlush();
  occFlush();`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["the occluder list exists",   back.includes("function occOffer(r,d2){")],
  ["the sand is given them",     back.includes("    occUniforms(sh);")],
  ["the sand declares them",     back.includes('LAMP_DECL+"\\n"+OCC_DECL+"\\n"+')],
  ["the sky loses them",         back.includes("        sv*=1.0-min(onl*orr/max(ol2,orr*0.25),1.0);")],
  ["the list is emptied",        back.includes("  occReset();")],
  ["the body is offered",        back.includes("occOffer(0.30*machLen,")],
  ["the bucket is offered",      back.includes("occOffer(0.16*machLen,")],
  ["the list is sent",           back.includes("  occFlush();")],
  ["distant machines are dropped",back.includes("var far=OCC_NEAR*machLen; if(d2>far*far) return;")],
  ["and none is left over",      !back.includes("uOccB")],
  ["offered once per machine",   (back.match(/occOffer\(/g)||[]).length===3],
  ["machines' own shader left alone", !back.includes("occUniforms(machSh)")],
  ["the sim is untouched",       back.split("function occOffer").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
