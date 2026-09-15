/* patch12 - the bucket made real.
 *
 * The body became a JCB 540-170 on 13 September and the bucket did not. It
 * stayed 2.83 m wide holding 3.6 m3 - about five and a half tonnes of sand
 * on a machine rated to lift four - and once the body around it shrank to
 * life size it read as bigger than the cab.
 *
 * A 540-170 takes a general-purpose shovel 2.29 m wide holding about a
 * cubic metre heaped. That is the bucket now. Everything the bucket decides
 * - what it holds, how deep a pass cuts, and the angle it is carried at -
 * is already worked out from the four numbers that describe its section, so
 * those four are all that change in the simulation.
 *
 * On the drawing side the four are written once and every part of the
 * bucket, the sand in it, and the wedge it shoves are fractions of them.
 * They were seven typed answers to a question nobody had written down, and
 * that is the same disease as the travel pose and the boom length.
 *
 * Usage: node patch12.js <file.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch12.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const edits=[];
function E(name,old,neu){ edits.push({name,old,neu}); }

/* ---- the simulation's four numbers ---- */
E("bucket section",
`var BK_BACK=0.041, BK_TOP=0.055, BK_WIDE=0.472;   /* machine lengths */`,
`var BK_BACK=0.029, BK_TOP=0.023, BK_WIDE=0.381;   /* machine lengths */
/* A real general-purpose shovel for a 540-170: 2.29 m wide, 0.98 m from the
   back plate to the cutting edge, 0.76 m in the mouth. It holds 0.85 m3
   struck, which is the cubic metre such a bucket is sold as once the sand
   above the rim is counted, and 1.4 tonnes of sand against the machine's
   four-tonne payload.

   It was 2.83 m wide and 3.6 m3 - five and a half tonnes - because it was
   drawn for a body half again too big in every direction and was never
   redrawn when the body was made real.

   Nothing else is touched by this. What the bucket holds, how deep a pass
   cuts and the angle it is carried at are all worked out from these four
   numbers and the cutting edge below, further down this file. */`);

E("cutting edge",
`var TOOTH_X=0.275, TOOTH_Y=-0.249;     /* the cutting edge, in the bucket's own frame */`,
`var TOOTH_X=0.192, TOOTH_Y=-0.104;     /* the cutting edge, in the bucket's own frame */`);

E("blade width",
`var PUSH_RES=0.55, PUSH_SPILL=0.004, BLADE_W=0.52;`,
`var PUSH_RES=0.55, PUSH_SPILL=0.004, BLADE_W=0.397;   /* over the side plates: 2.38 m */`);

/* ---- the drawing ---- */
E("bucket geometry",
`var BW=.52;
var GEO_BUCKET=mergeParts([
  boxPart(.050,.300,BW,   .016,-.095,  0, DK[0],DK[1],DK[2],  .05),        /* back plate */
  boxPart(.110,.046,BW,   .060,-.196,  0, DK[0],DK[1],DK[2], -.82),        /* throat */
  boxPart(.195,.046,BW,   .185,-.246,  0, DK[0],DK[1],DK[2], -.05),        /* floor */
  boxPart(.320,.300,.024, .140,-.100, BW*.5, DK[0],DK[1],DK[2]),           /* side plate */
  boxPart(.320,.300,.024, .140,-.100,-BW*.5, DK[0],DK[1],DK[2]),
  boxPart(.070,.055,.19,  .026, .075,  0, DK[0],DK[1],DK[2]),              /* pivot ear */
  surf(boxPart(.075,.028,BW*.98, .275,-.249, 0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])  /* cutting edge */
],true);`,
`/* The section, this side of the worker boundary. The simulation holds the
   same four numbers as BK_BACK, BK_TOP, TOOTH_X and TOOTH_Y and works out
   what the bucket holds and how deep a pass cuts from them; they are typed
   twice because the simulation is a separate script, and they must agree.

   Everything below is a fraction of them, so redrawing the bucket is
   changing these four and nothing else. Seven of the numbers that used to
   be here were answers to a question nobody had written down, which is how
   a bucket ends up the wrong size and stays that way through a rebuild. */
var BKX0=.029, BKY1=.023, BKX1=.192, BKY0=-.104;
var BKD=BKX1-BKX0, BKH=BKY1-BKY0;      /* 0.98 m deep, 0.76 m in the mouth */
var BW=.397;                           /* 2.38 m over the side plates */
var BKW=BW*.96;                        /* and 2.29 m between them */
var GEO_BUCKET=mergeParts([
  boxPart(.020,BKH*.80,BW,  BKX0+.004,BKY0+BKH*.62, 0, DK[0],DK[1],DK[2],  .05),  /* back plate */
  boxPart(BKD*.28,.018,BW,  BKX0+BKD*.15,BKY0+BKH*.12, 0, DK[0],DK[1],DK[2], -.70), /* throat */
  boxPart(BKD*.78,.018,BW,  BKX0+BKD*.60,BKY0+.010, 0, DK[0],DK[1],DK[2], -.03),  /* floor */
  boxPart(BKD*1.06,BKH*1.10,.016, BKX0+BKD*.50,BKY0+BKH*.50, BW*.5, DK[0],DK[1],DK[2]),  /* side plate */
  boxPart(BKD*1.06,BKH*1.10,.016, BKX0+BKD*.50,BKY0+BKH*.50,-BW*.5, DK[0],DK[1],DK[2]),
  boxPart(.050,.040,BW*.38, BKX0-.010,BKY1+.018, 0, DK[0],DK[1],DK[2]),           /* pivot ear */
  surf(boxPart(.055,.020,BW*.98, BKX1,BKY0, 0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])  /* cutting edge */
],true);`);

E("bucket load",
`var GEO_LOAD=mergeParts([
  heapPart(.125,.118,.115, .150,-.168, 0, 1.0, 1.95, SND[0],SND[1],SND[2]),
  heapPart(.112,.075,.085, .150,-.070, 0, 1.0, 1.80, SND[0],SND[1],SND[2]),
  heapPart(.068,.010,.060, .150, .002, 0, 1.0, 1.55, SND[0],SND[1],SND[2])
]);`,
`/* Each ring as a fraction of the bucket's own section rather than seven more
   numbers to re-tune whenever the bucket changes: how wide it lies across the
   floor, how thick it is, and how far up the mouth it sits. */
function bkHeap(fr,ft,fh,fy,fz){
  return heapPart(BKD*fr,BKD*ft,BKH*fh, BKX0+BKD*.466,BKY0+BKH*fy, 0,
                  1.0, (BKW*fz)/(BKD*fr), SND[0],SND[1],SND[2]);
}
var GEO_LOAD=mergeParts([
  bkHeap(.534,.504,.378,.266,.517),
  bkHeap(.479,.321,.280,.589,.428),
  bkHeap(.291,.043,.197,.826,.223)
]);`);

E("shove wedge placement",
`      _mC.setPosition(0.17+0.07*kw, 0.046, 0);`,
`      _mC.setPosition(BKD*(0.73+0.30*kw), BKH*0.15, 0);`);

E("emptying slide",
`    _mC.setPosition(0.150*slide,-0.055*slide,0);`,
`    _mC.setPosition(BKD*0.64*slide,-BKH*0.18*slide,0);`);

/* ---- prove every anchor before writing anything ---- */
let bad=0;
for(const e of edits){
  const n=s.split(e.old).length-1;
  if(n!==1){ console.error("ANCHOR "+e.name+": found "+n+", expected 1"); bad++; }
}
if(bad){ console.error("nothing written"); process.exit(1); }
for(const e of edits) s=s.replace(e.old,e.neu);
fs.writeFileSync(f,s);

/* ---- and check it afterwards ---- */
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["section in the simulation", back.includes("var BK_BACK=0.029, BK_TOP=0.023, BK_WIDE=0.381;")],
  ["cutting edge", back.includes("var TOOTH_X=0.192, TOOTH_Y=-0.104;")],
  ["blade width", back.includes("BLADE_W=0.397;")],
  ["section in the drawing", back.includes("var BKX0=.029, BKY1=.023, BKX1=.192, BKY0=-.104;")],
  ["no old bucket width", !back.includes("var BW=.52;")],
  ["no old cutting edge in the drawing", !back.includes(".275,-.249, 0, STL")],
  ["heap derived", back.includes("function bkHeap(")],
  ["wedge derived", back.includes("_mC.setPosition(BKD*(0.73+0.30*kw)")],
  ["slide derived", back.includes("_mC.setPosition(BKD*0.64*slide")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
