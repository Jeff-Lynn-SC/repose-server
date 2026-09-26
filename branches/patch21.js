/* patch21 - the fog colour has never once been set.
 *
 * Measured at two in the morning, read off the running page: the fog colour
 * is (0.239, 0.204, 0.157). That is 0x3d3428 - the value it was constructed
 * with. The night sky's horizon is (0.0013, 0.0025, 0.0089). So distant sand,
 * which at a kilometre is 84% fog, is being painted a warm brown a hundred
 * and eighty times brighter than the sky it is supposed to be blending into.
 * That is the cream band lying along the horizon.
 *
 * Why it never updated, and it is a good one:
 *
 *     if(Math.abs(sunAlt-lastSkyAlt)>0.35){
 *       lastSkyAlt=sunAlt; buildSkyTexture(sunAlt);
 *       if(fogRef) fogRef.color.setRGB(...);      <-- only if the fog exists
 *     }
 *
 * The frame loop calls updateSun on its first frame, long before the world
 * arrives and therefore long before the fog is made. That call finds fogRef
 * null, does nothing to it - and sets lastSkyAlt. When the world does arrive
 * and updateSun runs again, the sun has not moved, so the gate is shut and
 * the fog is never coloured. One early call with nothing to colour, and the
 * fog keeps its factory brown for the life of the page.
 *
 * It is on the live page and has been all along. By day it is a brown that
 * happens to be darker than the horizon, so it reads as haze and nobody
 * looked twice. At night it is the brightest thing in the frame.
 *
 * The fix is not to widen the gate. It is that the fog's colour is not
 * expensive and has no business behind a gate at all: it is three numbers
 * off a lookup, and it is set every time the sun is, whether the sky texture
 * needed rebuilding or not. A thing that must stay in step with something
 * else does not get to be cached. That lesson is already in HANDOVER.md,
 * about the summit cell.
 *
 * Usage: node patch21.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch21.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const old=`  if(Math.abs(sunAlt-lastSkyAlt)>0.35){ lastSkyAlt=sunAlt; var s=buildSkyTexture(sunAlt);
    if(fogRef) fogRef.color.setRGB(Math.pow(s.hor[0]/255,2.2),Math.pow(s.hor[1]/255,2.2),Math.pow(s.hor[2]/255,2.2));
  }`;
const neu=`  if(Math.abs(sunAlt-lastSkyAlt)>0.35){ lastSkyAlt=sunAlt; buildSkyTexture(sunAlt); }
  /* The fog is the sky you are looking through, so it is whatever the sky's
     horizon is now. This used to live inside the gate above, and the gate
     shuts after the first frame - which happens before the world arrives and
     therefore before the fog exists, so the fog was never coloured at all and
     kept the brown it was constructed with. Rebuilding the sky texture is
     worth gating. Three numbers off a lookup is not. */
  if(fogRef){
    var sf=skyAt(sunAlt);
    fogRef.color.setRGB(Math.pow(sf.hor[0]/255,2.2),
                        Math.pow(sf.hor[1]/255,2.2),
                        Math.pow(sf.hor[2]/255,2.2));
  }`;
if(s.split(old).length-1!==1){ console.error("ANCHOR fog colour: not found once"); process.exit(1); }
fs.writeFileSync(f,s.replace(old,neu));
const back=fs.readFileSync(f,"utf8");
const ok=back.includes("var sf=skyAt(sunAlt);") && !back.includes("if(fogRef) fogRef.color.setRGB(");
console.log((ok?"ok  ":"FAIL")+"  the fog takes its colour from the sky, every time");
process.exit(ok?0:1);
