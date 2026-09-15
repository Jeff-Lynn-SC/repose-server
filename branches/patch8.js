/* Patch 8 — the drawing's own copies of the machine's layout.
 *
 * drawMachines keeps its own numbers for where the wheels sit and where the
 * boom is bolted on, separate from the geometry that was rebuilt in patch 6
 * and the simulation constants in patch 7. Three copies of the same fact, and
 * missing one of them would have drawn a real body with the old machine's
 * wheels under it and the boom hanging off where the roof used to be.
 * They point at the single constants now, so the next person cannot miss one.
 *
 * Proves every anchor before it writes anything.
 */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch8.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

/* where the boom is bolted on, in the drawing */
const PIV_OLD = `    var mBo=joint(_mB,mH,-0.50,0.700, 0.140,bm,0);  RIG.boom.setMatrixAt(i,mBo);`;
const PIV_NEW = `    var mBo=joint(_mB,mH,-0.408,0.308,0.092,bm,0);  RIG.boom.setMatrixAt(i,mBo);`;

/* where the wheels sit */
const WH_OLD = `      var wx=(w<2)?0.34:-0.34, wz=(w&1)?0.245:-0.245;`;
const WH_NEW = `      var wx=(w<2)?WBX:-WBX, wz=(w&1)?WBZ:-WBZ;`;

/* and the two bands a machine leaves behind it: half the track, and the tyre */
const TRK_OLD = `  var half=0.245*machLen, rad=0.78*0.093*machLen+trkPx*0.60;`;
const TRK_NEW = `  var half=WBZ*machLen, rad=0.78*WW*machLen+trkPx*0.60;`;

const edits = [
  ['boom pivot in the drawing', PIV_OLD, PIV_NEW],
  ['wheel positions', WH_OLD, WH_NEW],
  ['track width', TRK_OLD, TRK_NEW],
];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('var wx=(w<2)?WBX:-WBX')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['pivot drawn where it is', back.includes('joint(_mB,mH,-0.408,0.308,0.092,bm,0)')],
  ['wheels follow the constants', back.includes('var wx=(w<2)?WBX:-WBX, wz=(w&1)?WBZ:-WBZ;')],
  ['tracks follow the tyre', back.includes('var half=WBZ*machLen, rad=0.78*WW*machLen+trkPx*0.60;')],
  ['old wheel literals gone', !back.includes('var wx=(w<2)?0.34:-0.34')],
  ['old pivot literal gone', !back.includes('joint(_mB,mH,-0.50,0.700, 0.140,bm,0)')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 8 written' : 'patch 8 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
