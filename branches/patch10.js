/* Patch 10 — the exposure follows the picture, and the sky stops flooding it.
 *
 * Measured on 13 September, three times of day, the same fixed exposure of 1.15:
 *
 *   midday    the whole picture inside 80 values of 255, nothing near black,
 *             nothing near white, 78% of it in two bins. Milky and flat.
 *   evening   a third of the frame crushed to black, range 177.
 *   midnight  82% of the frame inside one bin. A single grey.
 *
 * One number cannot serve a day that runs from noon to midnight. So the frame
 * is metered — a log-encoded 8x8 reading of the blurred scene — and the
 * exposure eases toward what the picture asks for, the way an eye does.
 *
 * And midday had no shadows in it because skylight was set at two thirds of
 * sunlight. On a flat surface at noon the real sky delivers something nearer a
 * sixth. With the exposure now adapting, only that ratio matters.
 *
 * Proves every anchor before it writes anything.
 */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch10.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

/* ---- 1. the meter ---- */
const METER_OLD = `function makeTargets(w,h){`;
const METER_NEW = `/* =========================================================
   THE EXPOSURE THE PICTURE ASKS FOR

   A fixed exposure cannot serve a day. Measured over three
   times of day it gave a midday picture using eighty values
   of 255 with no black and no white in it, an evening with a
   third of the frame crushed, and a midnight that was one
   flat grey.

   So the frame meters itself. The blurred scene is reduced to
   eight by eight, each texel carrying the log of its own
   luminance so a single byte can hold the range between noon
   and starlight, and the exposure eases toward what that
   reading asks for. The 0.18 is the grey a photographer
   meters for. Everything else is measured off the picture.
   ========================================================= */
var lumaMat=new THREE.ShaderMaterial({
  uniforms:{ tSrc:{value:null}, uTexel:{value:new THREE.Vector2(1,1)} },
  vertexShader:bloomMat.vertexShader,
  fragmentShader:[
    "uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;",
    "void main(){",
    "  vec3 s=vec3(0.0);",
    "  for(int y=-1;y<=1;y++){ for(int x=-1;x<=1;x++){",
    "    s+=texture2D(tSrc,vUv+vec2(float(x),float(y))*uTexel*6.0).rgb; } }",
    "  float l=dot(s/9.0,vec3(0.2126,0.7152,0.0722));",
    "  float v=clamp((log2(max(l,1e-5))+10.0)/20.0,0.0,1.0);",
    "  gl_FragColor=vec4(v,v,v,1.0);",
    "}"].join("\\n")
});
var rtL=null, lumaBuf=new Uint8Array(8*8*4), lastMeter=-1e9;
var MID_GREY=0.18;                 /* the grey a light meter aims at */
var expo=1.15, expoWant=1.15;
function meter(now){
  if(!rtL||!rtB) return;
  if(now-lastMeter>330){
    lastMeter=now;
    lumaMat.uniforms.tSrc.value=rtB.texture;
    pass(lumaMat,rtL);
    try{
      renderer.readRenderTargetPixels(rtL,0,0,8,8,lumaBuf);
      var s=0,i;
      for(i=0;i<64;i++) s+=lumaBuf[i*4];
      var lum=Math.pow(2,(s/64)/255*20-10);
      var want=MID_GREY/Math.max(1e-5,lum);
      /* a guard, not a preference: a frame that is entirely black would
         otherwise ask for an infinite exposure and blind the next one */
      expoWant=want<0.05?0.05:(want>40?40:want);
    }catch(err){}
  }
  /* an eye takes a second or two to come round, and so does this */
  var edt=Math.min(0.1,(now-(meter._t||now))/1000); meter._t=now;
  expo+=(expoWant-expo)*Math.min(1,edt*0.8);
}

function makeTargets(w,h){`;

/* ---- 2. the small target it meters into ---- */
const TARGETS_OLD = `  bloomMat.uniforms.uTexel.value.set(1/bw,1/bh);
  blurMat.uniforms.uTexel.value.set(1/bw,1/bh);
}`;
const TARGETS_NEW = `  bloomMat.uniforms.uTexel.value.set(1/bw,1/bh);
  blurMat.uniforms.uTexel.value.set(1/bw,1/bh);
  lumaMat.uniforms.uTexel.value.set(1/bw,1/bh);
  /* eight by eight, plain bytes, because a half-float target cannot be read
     back into a byte array and this only has to carry one number */
  if(rtL) rtL.dispose();
  rtL=new THREE.WebGLRenderTarget(8,8,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,
       format:THREE.RGBAFormat,type:THREE.UnsignedByteType,encoding:THREE.LinearEncoding});
}`;

/* ---- 3. metering happens between the blur and the composite ---- */
const PRESENT_OLD = `  compMat.uniforms.tScene.value=rtScene.texture;
  compMat.uniforms.tBloom.value=rtB.texture;
  compMat.uniforms.uTime.value=now*0.001;`;
const PRESENT_NEW = `  meter(now);
  compMat.uniforms.tScene.value=rtScene.texture;
  compMat.uniforms.tBloom.value=rtB.texture;
  compMat.uniforms.uExposure.value=expo;
  compMat.uniforms.uTime.value=now*0.001;`;

/* ---- 4. the sky stops out-shouting the sun ---- */
const HEMI_OLD = `  hemi.intensity=0.10+0.85*Math.max(0,Math.min(1,(sunAlt+8)/22));`;
const HEMI_NEW = `  /* skylight against sunlight. This gave the sky two thirds of what the sun
     delivers, which is why midday had no shadow in it - measured, the whole
     picture sat inside eighty values out of 255. On a flat surface at noon the
     real sky is nearer a sixth. The overall level is the exposure's job now,
     so only this ratio matters. */
  hemi.intensity=0.10+0.22*Math.max(0,Math.min(1,(sunAlt+8)/22));`;

const edits = [
  ['meter', METER_OLD, METER_NEW],
  ['targets', TARGETS_OLD, TARGETS_NEW],
  ['present', PRESENT_OLD, PRESENT_NEW],
  ['skylight', HEMI_OLD, HEMI_NEW],
];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('var MID_GREY=')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['meter built', back.includes('function meter(now){')],
  ['small target made', back.includes('rtL=new THREE.WebGLRenderTarget(8,8,')],
  ['exposure fed to the composite', back.includes('compMat.uniforms.uExposure.value=expo;')],
  ['skylight rebalanced', back.includes('hemi.intensity=0.10+0.22*')],
  ['old skylight gone', !back.includes('hemi.intensity=0.10+0.85*')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 10 written' : 'patch 10 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
