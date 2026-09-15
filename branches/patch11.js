/* Patch 11 — a machine carries its bucket, it does not drag it.
 *
 * The pose a machine travels in was three angles typed into four places:
 * boom -0.30, no extension, bucket +0.30. On the old machine, whose boom
 * pivoted 4.20 m up, that happened to put the teeth about forty centimetres
 * off the ground. The pivot is now 1.85 m, where a real one is, and the same
 * three angles put the arm a metre into the sand. Measured over eight
 * simulated minutes with eight machines: below the sand 88% of the time
 * against 13.8% before, typically 1.08 m under, 3.71 m at the worst.
 *
 * The three angles were never wrong. They were an answer to a question
 * nobody had written down, and the machine underneath them changed.
 *
 * So the question gets written down and the angles fall out of it:
 *
 *   the bucket is racked back until its opening is level - less and sand
 *   runs out over the teeth, more and it holds no more than it already
 *   does - and it is carried as low as the machine's own belly, because
 *   anything that would catch the bucket has already caught the machine.
 *
 * Both of those are the machine's own shape. Nothing is typed but the
 * ground clearance, which is a published dimension of a 540-170.
 *
 * Proves every anchor before it writes anything.
 */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch11.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

/* ---- 1. the one dimension this needs, beside the others it sits with ---- */
const DIM_OLD = `var P_BOOMX=-0.408, P_BOOMY=0.308, P_BOOMZ=0.092;   /* the boom is on the machine's right, as every Loadall's is */`;
const DIM_NEW = `var P_BOOMX=-0.408, P_BOOMY=0.308, P_BOOMZ=0.092;   /* the boom is on the machine's right, as every Loadall's is */
/* What a 540-170 clears underneath: 0.40 m off the published dimensions, in
   machine lengths. It is what decides how low a loaded bucket can be carried,
   because a bucket held lower than the machine's own belly is caught by
   ground the machine was going to be stopped by anyway. */
var CLEAR_Y=0.0667;`;

/* ---- 2. the pose, worked out once, after the solver it is worked out with ---- */
const ARM_OLD = `  _ik.b=p; _ik.s=d-L_BASE;
  return _ik;
}`;
const ARM_NEW = `  _ik.b=p; _ik.s=d-L_BASE;
  return _ik;
}

/* ---- the pose a machine travels in ----

   This used to be three angles typed into four places. They were tuned when
   the boom pivoted at 4.20 m and they happened to hold the teeth forty
   centimetres up; on a machine whose pivot is 1.85 m the same three angles
   put the arm a metre into the sand. An answer with its question thrown
   away, which is the same mistake as a length in machine lengths that
   quietly meant metres.

   The question, written down, is two constraints and nothing else.

   The bucket is racked back until its opening is level. Roll it back less
   and sand runs out over the teeth; roll it back more and it holds no more
   than it already does. That angle is the bucket's own section - the same
   two distances its capacity is worked out from, three hundred lines up.

   And the load is carried as low as the machine's own belly, because
   anything low enough to catch the bucket has already caught the machine.
   Whichever corner of the bucket ends up lowest once it is racked back sits
   at the ground clearance.

   The boom is right in, so its tip lies on the circle of the retracted
   length and the height alone decides the pitch. armTo does the rest, the
   same way every other pose in this file is solved. Change the bucket and
   this changes with it; there is nothing here to re-tune. */
var K_CARRY=Math.atan2(BK_TOP-TOOTH_Y,TOOTH_X-BK_BACK);
var CARRY_B,CARRY_S,CARRY_K;
(function(){
  var cr=Math.cos(K_CARRY), sr=Math.sin(K_CARRY), lo=1e9, i, y;
  /* the three corners of the section: the heel, the top of the back plate,
     and the teeth. Which of them hangs lowest depends on the roll, so it is
     asked rather than assumed */
  var P=[BK_BACK,TOOTH_Y, BK_BACK,BK_TOP, TOOTH_X,TOOTH_Y];
  for(i=0;i<6;i+=2){ y=P[i]*sr+P[i+1]*cr; if(y<lo) lo=y; }
  var ty=CLEAR_Y-lo-P_BOOMY;                            /* where that leaves the end of the boom */
  var tx=Math.sqrt(Math.max(0,L_BASE*L_BASE-ty*ty));    /* fully in, so the tip is on that circle */
  var k=armTo(tx,ty);
  CARRY_B=k.b; CARRY_S=k.s; CARRY_K=K_CARRY-k.b;
})();`;

/* ---- 3. the four places that used to type it ---- */
const INIT_OLD = `  this.boom=-0.30; this.stick=0; this.buck=0.30; this.slew=0; this.stroke=rnd()*2;`;
const INIT_NEW = `  this.boom=CARRY_B; this.stick=CARRY_S; this.buck=CARRY_K; this.slew=0; this.stroke=rnd()*2;`;

const TRAVEL_OLD = `this.tbA=-0.30; this.tsA=0; this.tkA=0.30; this.slewT=0;`;
const TRAVEL_NEW = `this.tbA=CARRY_B; this.tsA=CARRY_S; this.tkA=CARRY_K; this.slewT=0;`;

const SQUARE_OLD = `      this.tbA=-0.30; this.tsA=0; this.tkA=0.30;
      this.digging=0; this.tipping=0;`;
const SQUARE_NEW = `      this.tbA=CARRY_B; this.tsA=CARRY_S; this.tkA=CARRY_K;
      this.digging=0; this.tipping=0;`;

const IDLE_OLD = `if(this.idle){ this.tbA=-0.30; this.tsA=0; this.tkA=0.30; }`;
const IDLE_NEW = `if(this.idle){ this.tbA=CARRY_B; this.tsA=CARRY_S; this.tkA=CARRY_K; }`;

/* the long anchor contains the short one, so it goes first */
const edits = [
  ['clearance', DIM_OLD, DIM_NEW, 1],
  ['the pose', ARM_OLD, ARM_NEW, 1],
  ['built holding it', INIT_OLD, INIT_NEW, 1],
  ['travelling and stopped', TRAVEL_OLD, TRAVEL_NEW, 2],
  ['squaring up', SQUARE_OLD, SQUARE_NEW, 1],
  ['waiting', IDLE_OLD, IDLE_NEW, 1],
];

let bad = 0;
for (const [name, from, , want] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n} (want ${want})`);
  if (n !== want) bad++;
}
if (src.includes('var K_CARRY=')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['carry angle derived from the bucket', back.includes('var K_CARRY=Math.atan2(BK_TOP-TOOTH_Y,TOOTH_X-BK_BACK);')],
  ['lowest corner asked for', back.includes('for(i=0;i<6;i+=2){ y=P[i]*sr+P[i+1]*cr; if(y<lo) lo=y; }')],
  ['solved through armTo', back.includes('CARRY_B=k.b; CARRY_S=k.s; CARRY_K=K_CARRY-k.b;')],
  ['ground clearance named', back.includes('var CLEAR_Y=0.0667;')],
  ['no typed travel angles left', !back.includes('this.tkA=0.30')],
  ['no typed travel angles left at build', !back.includes('this.boom=-0.30')],
  ['four places use it', (back.split('this.tkA=CARRY_K').length - 1) === 4],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 11 written' : 'patch 11 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
