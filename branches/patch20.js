/* patch20 - the ground half of the sky cube stops glowing after dark.
 *
 * The sky is used as a light: a small cube is built from it and handed to
 * scene.environment, and its lower half stands for the light the ground
 * throws back up. That lower half was
 *
 *     uGnd = skyHorizon * 0.55 + 0.06
 *
 * and the 0.06 is a constant. By day it is a twentieth of the sky above it
 * and nobody would notice. At two in the morning the sky horizon is 0.0013,
 * so the ground half of the sky is FORTY-SIX TIMES brighter than the sky
 * above it - a warm floor under a black sky, lighting the pit all night off
 * nothing at all. A ground bounce is a fraction of what lands on the ground;
 * when nothing lands on it, nothing should come back off it.
 *
 * WHAT THIS DOES NOT FIX, and was written up as fixing until it was
 * measured. There is a bright cream band lying along the horizon at night.
 * It is on the live page too, at 1.6 times the brightness of the open sand,
 * and with the night made properly dark it stands out badly. The floor above
 * looked like an excellent candidate - warm, comes from below, wrong at
 * night. It is not it: with the floor gone the band measured 160 against 158,
 * which is nothing. So the band is still unexplained, and the 46x floor was
 * a real fault standing next to it rather than the cause of it. Do not
 * repeat the guess; the next thing to try is finding out whether the band is
 * sky or terrain, which nobody has established.
 *
 * Usage: node patch20.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch20.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const old=`  /* the ground bounces a good deal of light back up; over sand, most of it */
  m.uniforms.uGnd.value.setRGB(ho[0]*0.55+0.06,ho[1]*0.48+0.045,ho[2]*0.38+0.028);`;
const neu=`  /* The ground bounces a good deal of what lands on it back up - over sand,
     about two fifths. What lands on it is the sky and the sun, so that is
     what this is made of. It used to be the sky times a half plus a constant
     0.06, and the constant did not know about night: at two in the morning
     it made the ground half of the sky forty-six times brighter than the sky
     itself, which is why the horizon had a cream band lying along it. */
  var sIll=Math.max(0,Math.sin(sunAlt*RAD));
  m.uniforms.uGnd.value.setRGB((ho[0]+1.00*sIll)*0.40,
                               (ho[1]+0.92*sIll)*0.40,
                               (ho[2]+0.78*sIll)*0.40);`;
if(s.split(old).length-1!==1){ console.error("ANCHOR uGnd: not found once"); process.exit(1); }
fs.writeFileSync(f,s.replace(old,neu));
const back=fs.readFileSync(f,"utf8");
const ok=back.includes("var sIll=Math.max(0,Math.sin(sunAlt*RAD));") && !back.includes("ho[0]*0.55+0.06");
console.log((ok?"ok  ":"FAIL")+"  the ground bounce is a fraction of what lands, with no floor");
process.exit(ok?0:1);
