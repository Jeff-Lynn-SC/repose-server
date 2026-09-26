/* patch22 - put the lamps on the cab, and make the light come out of them.
 * RUN AFTER patch17.js.
 *
 * Two faults, one of them mine from an hour ago.
 *
 * The lamp boxes are drawn at x=.34, y=.33, z=-.225 and -.065. The cab they
 * are supposed to be bolted to has its roof spanning x -.146 to .180 and z
 * -.195 to -.012, with the top of the roof at y=.449. So one lamp is hanging
 * a metre in front of the machine and outside it, and the other is a metre in
 * front and floating at window height. They have been in mid-air since the
 * machine was made real on 13 September - the same leftover as the bucket and
 * the boom, in a part nobody had reason to look at because at night two
 * bright specks in roughly the right place look like two bright specks in
 * exactly the right place.
 *
 * And when I gave them light this morning I typed a THIRD position,
 * (0.30, 0.45, -0.10), which is near neither of them. So the glow, the light
 * and the cab were three different opinions about where a lamp is.
 *
 * Now: four numbers say where the lamps are. The boxes you can see are built
 * from them and the light comes out of the middle of them. Move a lamp and
 * everything moves with it, which is the only arrangement that cannot drift.
 *
 * Usage: node patch22.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch22.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("the lamps go on the roof",
`var GEO_LAMPS=mergeParts([
  boxPart(.06,.06,.06,  .34,.33,-.225, 1,1,1),
  boxPart(.06,.06,.06,  .34,.33,-.065, 1,1,1)
]);`,
`/* ---- where a work lamp is ----
   On the leading edge of the cab roof, one at each side, which is where a
   Loadall carries them. The roof's front edge is x=.180 and its top is
   y=.449, so these sit just inboard and just proud of it. The boxes below
   are built from these numbers and so is the light, three hundred lines up,
   so the thing you can see and the thing doing the lighting are the same
   lamp. They used to be two different lamps and neither was on the machine.
   0.03 of a machine length is 18 cm, which is a work lamp. */
var LAMP_X=.168, LAMP_Y=.463, LAMP_Z1=-.175, LAMP_Z2=-.032;
var GEO_LAMPS=mergeParts([
  boxPart(.03,.03,.03,  LAMP_X,LAMP_Y,LAMP_Z1, 1,1,1),
  boxPart(.03,.03,.03,  LAMP_X,LAMP_Y,LAMP_Z2, 1,1,1)
]);`);

e("the light comes out of them",
`      _lampPos.set(0.30,0.45,-0.10).applyMatrix4(mH);`,
`      _lampPos.set(LAMP_X,LAMP_Y,(LAMP_Z1+LAMP_Z2)*0.5).applyMatrix4(mH);`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["one set of numbers", back.includes("var LAMP_X=.168, LAMP_Y=.463, LAMP_Z1=-.175, LAMP_Z2=-.032;")],
  ["boxes built from them", back.includes("boxPart(.03,.03,.03,  LAMP_X,LAMP_Y,LAMP_Z1, 1,1,1)")],
  ["light built from them", back.includes("_lampPos.set(LAMP_X,LAMP_Y,(LAMP_Z1+LAMP_Z2)*0.5)")],
  ["the typed third position is gone", !back.includes("_lampPos.set(0.30,0.45,-0.10)")],
  ["the floating boxes are gone", !back.includes("boxPart(.06,.06,.06,  .34,.33,-.225, 1,1,1)")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
