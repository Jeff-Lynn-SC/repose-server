/* Patch 7 — the simulation follows the body.
 *
 * The boom pivot is a constant the machine digs by, and the body it is bolted
 * to has just been rebuilt to a real JCB 540-170. The pivot was at 4.20 m,
 * above a cab roof that stood at 4.92 m. The roof is now 2.69 m and the pivot
 * has to be under it.
 *
 * The total reach from the pivot is deliberately unchanged at 2.20 units —
 * 13.2 m — so the far end of the dig is exactly where it was; only the split
 * between the fixed section and the sliding one moves, so that retracted the
 * boom ends at the carriage instead of two metres past the front of the
 * machine.
 *
 * Proves every anchor before it writes anything.
 */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch7.js <sim.node.js>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

const ARM_OLD = `var L_BASE=1.30, E_MAX=0.90, PITCH_LO=-0.80, PITCH_HI=1.15;`;
const ARM_NEW = `var L_BASE=0.961, E_MAX=1.239, PITCH_LO=-0.80, PITCH_HI=1.15;`;

const PIV_OLD = `/* The boom pivots high on this machine - level with the top of the cab -
   so reaching the ground in front of it wants a good deal of down-pitch.
   A limit of a quarter-turn was not enough and the teeth spent a third of
   every dig in the air. */
var P_BOOMX=-0.50, P_BOOMY=0.700, P_BOOMZ=0.140;   /* the boom is on the machine's right, as every Loadall's is */`;
const PIV_NEW = `/* Where the boom is bolted to the machine, in machine lengths. These are the
   real thing now: a JCB 540-170 stands 2.69 m to the cab roof and the boom
   pivots under it, at about 1.85 m, half a metre to the right of the centre
   line. It used to pivot at 4.20 m, above a roof that stood at 4.92 m, on a
   machine half as big again as a real one in every direction but length.

   Dropping the pivot means less down-pitch is needed to put the teeth on the
   ground - about 19 degrees where it used to want 33 - so the old note about
   a quarter-turn not being enough no longer applies, and the limits below are
   now what the machine can do rather than what it needs.

   It also reaches about a metre further along the ground, because less of the
   boom is spent on height. That is a consequence of the geometry, not a
   decision. */
var P_BOOMX=-0.408, P_BOOMY=0.308, P_BOOMZ=0.092;   /* the boom is on the machine's right, as every Loadall's is */`;

const edits = [['arm lengths', ARM_OLD, ARM_NEW], ['pivot', PIV_OLD, PIV_NEW]];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('P_BOOMY=0.308')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const reach = 0.961 + 1.239;
const checks = [
  ['pivot moved', back.includes('var P_BOOMX=-0.408, P_BOOMY=0.308, P_BOOMZ=0.092;')],
  ['boom split changed', back.includes('var L_BASE=0.961, E_MAX=1.239,')],
  ['total reach unchanged', Math.abs(reach - 2.20) < 1e-9],
  ['old pivot gone', !back.includes('P_BOOMY=0.700')],
  ['old lengths gone', !back.includes('L_BASE=1.30')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 7 written' : 'patch 7 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
