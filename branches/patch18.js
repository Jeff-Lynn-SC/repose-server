/* patch18 - the grain was blinding the night.
 *
 * The composite added a fixed +/-0.015 of noise to the picture BEFORE the
 * gamma encode. At midday the frame sits around 0.4 to 0.7, so that is a
 * fiftieth of the signal and reads as a pleasant tooth. At night the frame
 * sits around 0.02, so the same noise is most of the signal - and then
 * pow(x,1/2.2) takes a speck of 0.015 and renders it at 16% grey. What that
 * looks like is a snowstorm, and it is what has been standing in for a night
 * sky: those were not stars.
 *
 * Grain belongs in display space, after the encode, where a given amount of
 * it means the same to the eye whatever the picture is doing. Same figure,
 * applied where it means what it says.
 *
 * Usage: node patch18.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch18.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const old=`    "  float g=hash(vUv*vec2(1024.0,768.0)+uTime)-0.5;",
    "  c+=g*0.030;",                               // grain, so it is not glassy
    "  c*= (1.0-uDip);",
    "  gl_FragColor=vec4(pow(max(c,0.0),vec3(1.0/2.2)),1.0);",`;
const neu=`    "  c*= (1.0-uDip);",
    "  vec3 o=pow(max(c,0.0),vec3(1.0/2.2));",
    /* grain after the encode, not before it. Before it, a fixed amount of
       noise is a fiftieth of a midday frame and most of a midnight one, and
       the gamma curve then lifts a speck of 0.015 to 16% grey. */
    "  float g=hash(vUv*vec2(1024.0,768.0)+uTime)-0.5;",
    "  o+=g*0.030;",                               // grain, so it is not glassy
    "  gl_FragColor=vec4(o,1.0);",`;
if(s.split(old).length-1!==1){ console.error("ANCHOR grain: not found once"); process.exit(1); }
fs.writeFileSync(f,s.replace(old,neu));
const back=fs.readFileSync(f,"utf8");
const ok=back.includes('"  o+=g*0.030;"') && !back.includes('"  c+=g*0.030;"');
console.log((ok?"ok  ":"FAIL")+"  grain moved into display space");
process.exit(ok?0:1);
