/* patch13 - the boom and its inner section, to the size of the machine.
 *
 * patch6 shortened the boom from 1.30 machine lengths to 0.961 and left its
 * section alone, so the outer boom is still 1.20 m deep and 1.14 m wide on a
 * machine 2.44 m across with a 2.69 m roof. From the side it reads as one
 * yellow slab the length of the machine, which is most of why the thing still
 * looks chunky now the body is right. The inner section is 0.95 x 0.90 m and
 * does not fit inside the outer one at all.
 *
 * A boom carrying four tonnes at seventeen metres is about 0.45 m wide and
 * 0.55 m deep. That number is read off the machine's own proportions rather
 * than published, like the 1.85 m pivot height, and it is the only soft one
 * here. The ram diameters and the headstock follow from it.
 *
 * Nothing in the simulation is touched: the boom's length, its pivot and the
 * bucket's hinge are all elsewhere. This is what the boom looks like, not
 * where it is.
 *
 * Usage: node patch13.js <file.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch13.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const edits=[];
function E(name,old,neu){ edits.push({name,old,neu}); }

E("outer boom",
`var GEO_BOOM=mergeParts([
  boxPart(BL,.20,.19,  BL*.5,0,0, YEL[0],YEL[1],YEL[2],0,.94),
  boxPart(.10,.225,.215, .05,0,0, DK[0],DK[1],DK[2]),                       /* pivot yoke */
  boxPart(BL*.62,.022,.20, BL*.34,.104,0, YLD[0],YLD[1],YLD[2]),            /* wear strip */
  surf(boxPart(.44,.075,.075, .30,-.145,0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])     /* lift ram */
],true);`,
`/* 0.55 m deep and 0.45 m wide. It was 1.20 x 1.14 m - a boom thicker than
   the cab is tall - because patch6 shortened it and left its section at the
   size it was drawn for a machine half again too big. */
var BMH=.092, BMW=.075;
var GEO_BOOM=mergeParts([
  boxPart(BL,BMH,BMW,  BL*.5,0,0, YEL[0],YEL[1],YEL[2],0,.94),
  boxPart(.058,BMH*1.14,BMW*1.22, .035,0,0, DK[0],DK[1],DK[2]),             /* pivot yoke */
  boxPart(BL*.62,.012,BMW*.88, BL*.34,BMH*.52,0, YLD[0],YLD[1],YLD[2]),     /* wear strip */
  surf(boxPart(.44,.038,.038, .30,-.066,0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])     /* lift ram */
],true);`);

E("inner section",
`var GEO_STICK=mergeParts([
  boxPart(BL*.98,.158,.15, BL*.49,0,0, DUS[0],DUS[1],DUS[2],0,.94),
  boxPart(.10,.185,.175, BL*.97,0,0, DK[0],DK[1],DK[2]),                    /* headstock */
  surf(boxPart(.20,.055,.055, BL*.86,-.10,0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])   /* tilt ram */
],true);`,
`/* It slides inside the outer one, so it has to be smaller than it - which
   at 0.95 x 0.90 m against 1.20 x 1.14 m it only just was, and looked it.
   The headstock is wider than either, because it carries the bucket. */
var GEO_STICK=mergeParts([
  boxPart(BL*.98,BMH*.76,BMW*.75, BL*.49,0,0, DUS[0],DUS[1],DUS[2],0,.94),
  boxPart(.058,BMH*.96,BMW*1.40, BL*.97,0,0, DK[0],DK[1],DK[2]),            /* headstock */
  surf(boxPart(.20,.030,.030, BL*.86,-.048,0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])  /* tilt ram */
],true);`);

let bad=0;
for(const e of edits){ const n=s.split(e.old).length-1;
  if(n!==1){ console.error("ANCHOR "+e.name+": found "+n+", expected 1"); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const e of edits) s=s.replace(e.old,e.neu);
fs.writeFileSync(f,s);

const back=fs.readFileSync(f,"utf8");
const checks=[
  ["boom section", back.includes("var BMH=.092, BMW=.075;")],
  ["no fat boom", !back.includes("boxPart(BL,.20,.19,")],
  ["no fat stick", !back.includes("boxPart(BL*.98,.158,.15,")],
  ["stick inside boom", back.includes("boxPart(BL*.98,BMH*.76,BMW*.75,")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
