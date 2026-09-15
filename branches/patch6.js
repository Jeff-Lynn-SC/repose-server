/* Patch 6 — the machine's proportions, from a real JCB 540-170.
 *
 * Every number is the published dimension in metres divided by 6.0, which is
 * what one unit is. Sources: JCB 540-170 static dimensions — overall height
 * 2.69, width over tyres 2.44, length to front tyres 5.08, to front carriage
 * 6.36, wheelbase 2.75, ground clearance 0.40, tyres 15.5/80-24 (1.24 across).
 * The boom pivot height is not published; 1.85 m is taken from where the boom
 * has to sit to lie under a 2.69 m roof, and is the one judged number here.
 *
 * This is a drawing change AND a simulation change: the wheel radius is the
 * ride height and the body carries the boom pivot, which toothWorld digs by.
 * Proves every anchor before it writes anything.
 */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch6.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

/* ---- 1. the wheels and the frame they hang on ---- */
const WR_OLD = `var WR=.128, WW=.093, AX=.215;                 /* wheel radius, tyre width, frame height.
   WR was carrying a diameter: .215*machLen is 1.29 m, which is what a 460/70 R24
   measures across, not out from the middle. The wheel centre sits at WR, so the
   tyre stands on the ground; the frame stays at AX, because the body and the boom
   pivot are built off it and the pivot is a simulation constant. */`;
const WR_NEW = `/* ---- a real JCB 540-170, to the published dimensions ----
   One unit is 6.0 m. Everything below is the real measurement divided by that:
   overall height 2.69, width over tyres 2.44, length to the carriage 6.36,
   wheelbase 2.75, ground clearance 0.40, tyres 15.5/80-24 which measure 1.24
   across and about 0.40 wide.

   What was here before was a real machine's length with a toy's everything
   else: the roof stood at 4.92 m against 2.69, the wheelbase was 4.08 against
   2.75, it was 3.50 m over the tyres against 2.44, and the boom pivoted at
   4.20 m against about 1.85. Only the ground clearance was right. That is
   exactly why it read as a toy — toys are chunky.

   The wheel centre sits at WR so the tyre stands on the ground, and the frame
   sits at AX, which is now the same height: on a real machine the axles run
   through the depth of the chassis, they do not hang below it. */
var WR=.1033, WW=.0667, AX=.1033;   /* 0.62 m radius, 0.40 m wide, axle at 0.62 m */
var WBX=.2292, WBZ=.1700;           /* half the wheelbase (1.375 m), half the track (1.02 m) */`;

/* ---- 2. the chassis ---- */
const UNDER_OLD = `var UNDER=[
  boxPart(1.14,.115,.40, -.01,AX,   0,  DK[0],DK[1],DK[2]),                 /* main frame */
  boxPart(.22,.150,.40,  -.34,WR+.012,0, DK[0],DK[1],DK[2]),                /* rear axle */
  boxPart(.22,.150,.40,   .34,WR+.012,0, DK[0],DK[1],DK[2]),                /* front axle */
  boxPart(.30,.10,.34,   -.54,AX+.02,0, DK[0],DK[1],DK[2],0,.88)            /* rear counterweight */
];`;
const UNDER_NEW = `var UNDER=[
  boxPart(.858,.070,.367,-.079,AX,   0,  DK[0],DK[1],DK[2]),                /* main frame, 5.15 x 0.42 x 2.20 m */
  boxPart(.150,.058,.390,-.229,AX,   0,  DK[0],DK[1],DK[2]),                /* rear axle */
  boxPart(.150,.058,.390, .229,AX,   0,  DK[0],DK[1],DK[2]),                /* front axle */
  boxPart(.100,.090,.300,-.455,AX+.008,0, DK[0],DK[1],DK[2],0,.88)          /* rear counterweight */
];`;

/* ---- 3. the body ---- */
const HOUSE_OLD_HEAD = `var GEO_HOUSE=mergeParts([`;
const HOUSE_OLD_TAIL = `],true);

/* ---- the boom: one straight member that telescopes, not a jointed arm ----`;
const HOUSE_NEW = `var GEO_HOUSE=mergeParts([
  boxPart(.767,.017,.383, -.050,.147,   0,  DK[0],DK[1],DK[2]),             /* deck over the frame */
  /* engine bay, boom side (+Z). Low and long, and it does not reach the roof:
     on a Loadall only the cab does. */
  boxPart(.433,.142,.158, -.150,.227,  .100, YEL[0],YEL[1],YEL[2],0,.93),
  boxPart(.417,.013,.150, -.150,.297,  .100, YLD[0],YLD[1],YLD[2]),         /* hood seam */
  surf(boxPart(.017,.058,.017, .050,.325, .100, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1]),  /* exhaust */
  /* the boom pivots at the back, under the roof line, not above it */
  boxPart(.167,.217,.167, -.425,.242,  .087, DK[0],DK[1],DK[2],0,.90),
  surf(boxPart(.020,.030,.045, -.408,.308, .092, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1]), /* pivot boss */
  /* cab, the other side (-Z): a glasshouse, floor at 1.00 m, roof at 2.69 m */
  boxPart(.317,.017,.175,  .017,.167, -.103, YEL[0],YEL[1],YEL[2]),         /* cab floor */
  boxPart(.325,.013,.183,  .017,.442, -.103, DK[0],DK[1],DK[2],0,.95),      /* roof */
  boxPart(.018,.275,.175,  .175,.304, -.103, YEL[0],YEL[1],YEL[2]),         /* front post */
  boxPart(.018,.275,.175, -.142,.304, -.103, YEL[0],YEL[1],YEL[2]),         /* rear post */
  boxPart(.018,.275,.018,  .175,.304, -.191, YEL[0],YEL[1],YEL[2]),         /* outer front post */
  boxPart(.018,.275,.018, -.142,.304, -.191, YEL[0],YEL[1],YEL[2]),         /* outer rear post */
  boxPart(.317,.017,.018,  .017,.183, -.191, YEL[0],YEL[1],YEL[2]),         /* sill */
  surf(boxPart(.292,.242,.010, .017,.308,-.191, GLS[0],GLS[1],GLS[2]),GLASSY[0],GLASSY[1]),
  surf(boxPart(.010,.242,.175, .172,.308,-.103, GLS[0],GLS[1],GLS[2]),GLASSY[0],GLASSY[1]),
  surf(boxPart(.010,.242,.175,-.139,.308,-.103, GLS[0],GLS[1],GLS[2]),GLASSY[0],GLASSY[1]),
  boxPart(.300,.230,.165,  .017,.300, -.100, BLK[0],BLK[1],BLK[2]),         /* the dark inside */
  boxPart(.080,.090,.090, -.010,.217, -.100, DK[0],DK[1],DK[2]),            /* seat */
  boxPart(.070,.012,.090,  .140,.100, -.180, DK[0],DK[1],DK[2]),            /* step */
  surf(boxPart(.020,.027,.020,-.130,.453,-.103, CRM[0],CRM[1],CRM[2]),STEELY[0],STEELY[1])   /* beacon */
],true);

/* ---- the boom: one straight member that telescopes, not a jointed arm ----`;

/* ---- 4. the boom, so that retracted it ends at the carriage rather than
   two metres past the front of the machine. The total reach from the pivot is
   unchanged at 2.20 units — 13.2 m — so the far end of the dig is where it
   was; only the split between the fixed section and the sliding one moves. */
const BL_OLD = `var BL=1.30;`;
const BL_NEW = `var BL=.961;   /* 5.77 m: pivot at -2.45 m to the carriage at +3.32 m */`;

/* ---- 5. the stand-in, seen from far enough away that an arm is a pixel ---- */
const BLOB_OLD = `  surf(boxPart(.92,WR*2,WW,  0,WR, .245, BLK[0],BLK[1],BLK[2]),RUBBER[0],RUBBER[1]),
  surf(boxPart(.92,WR*2,WW,  0,WR,-.245, BLK[0],BLK[1],BLK[2]),RUBBER[0],RUBBER[1]),`;
const BLOB_NEW = `  surf(boxPart(.86,WR*2,WW,  0,WR, WBZ, BLK[0],BLK[1],BLK[2]),RUBBER[0],RUBBER[1]),
  surf(boxPart(.86,WR*2,WW,  0,WR,-WBZ, BLK[0],BLK[1],BLK[2]),RUBBER[0],RUBBER[1]),`;

const edits = [
  ['wheel constants', WR_OLD, WR_NEW],
  ['chassis', UNDER_OLD, UNDER_NEW],
  ['boom length', BL_OLD, BL_NEW],
  ['blob', BLOB_OLD, BLOB_NEW],
];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
const hs = src.indexOf(HOUSE_OLD_HEAD), he = src.indexOf(HOUSE_OLD_TAIL);
console.log(`  anchor house head: ${src.split(HOUSE_OLD_HEAD).length - 1}, tail: ${src.split(HOUSE_OLD_TAIL).length - 1}`);
if (src.split(HOUSE_OLD_HEAD).length - 1 !== 1 || src.split(HOUSE_OLD_TAIL).length - 1 !== 1 || he < hs) bad++;
if (src.includes('var WBX=')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

src = src.slice(0, hs) + HOUSE_NEW + src.slice(he + '],true);\n\n/* ---- the boom: one straight member that telescopes, not a jointed arm ----'.length);
for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['real wheel radius', back.includes('var WR=.1033, WW=.0667, AX=.1033;')],
  ['wheelbase constants', back.includes('var WBX=.2292, WBZ=.1700;')],
  ['chassis rebuilt', back.includes('5.15 x 0.42 x 2.20 m')],
  ['cab roof at 2.69', back.includes('floor at 1.00 m, roof at 2.69 m')],
  ['boom shortened', back.includes('var BL=.961;')],
  ['old wheel constants gone', !back.includes('var WR=.128, WW=.093, AX=.215;')],
  ['old chassis gone', !back.includes('boxPart(1.14,.115,.40,')],
  ['boom section intact', back.includes('var GEO_BOOM=mergeParts([')],
  ['bucket intact', back.includes('var GEO_BUCKET=mergeParts([')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 6 written' : 'patch 6 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
