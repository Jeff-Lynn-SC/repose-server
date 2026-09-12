/* Patch 3 — stand one snapshot behind, and take the length of a snapshot from
   the world's own clock instead of from when the packets happened to land.
   Proves every anchor before it writes anything, and writes once at the end. */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch3.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

const DECL_OLD = `var LAG=48, stats=null, ready=false, reveal=false;`;
const DECL_NEW = `var stats=null, ready=false, reveal=false;
/* ---- where the renderer stands in time ----
   It used to stand a typed 48 milliseconds behind the newest state it held.
   Snapshots arrive about every 400, so it ran out of future 48 ms after each
   one and then held perfectly still until the next landed: measured, the
   picture was frozen for 88% of frames and moved a third of a second in one.

   There is nothing to type. A snapshot covers a stretch of world time, and
   the renderer walks that stretch while the next one is on its way — so it
   stands exactly one snapshot behind, whatever a snapshot happens to be
   worth today. If a packet is late the picture holds, but only for as long
   as the packet is actually late.

   How long a stretch is comes from the world's own clock rather than from
   the network. The server versions the world on a fixed tick and that number
   is already on the wire, so two states stand a knowable distance apart
   however slowly either of them arrived — before this, a packet that came
   slowly made every machine on screen move slowly. The length of that tick
   is not typed either: it is whatever the versions and the arrivals say. */
var verA=0, verB=0, tickEst=0;
function noteArrival(v){
  if(v===undefined) return;
  var gap=tB-tA, wasA=verB;
  verA=verB; verB=v;
  if(wasA>0&&verB>verA&&gap>0&&gap<10000){
    var t1=gap/(verB-verA);
    tickEst=tickEst?tickEst+(t1-tickEst)*0.05:t1;
  }
}`;

/* a packet carrying a version we already hold is not a new state */
const VER_OLD = `  var version=d.getUint32(o,true); o+=4;`;
const VER_NEW = `  var version=d.getUint32(o,true); o+=4;
  /* the same version is the same world; taking it as a new snapshot would put
     a stretch of no world time at all in front of the renderer */
  if(hB&&version===verB) return;`;

const NET_OLD = `  tB=performance.now();
  markMoved();`;
const NET_NEW = `  tB=performance.now();
  noteArrival(version);
  markMoved();`;

const FRAME_OLD = `    var span=Math.max(16,tB-tA);
    var alpha=(now-LAG-tA)/span; alpha=alpha<0?0:(alpha>1?1:alpha);`;
const FRAME_NEW = `    var span=Math.max(16,(tickEst&&verB>verA)?(verB-verA)*tickEst:(tB-tA));
    var alpha=(now-tB)/span; alpha=alpha<0?0:(alpha>1?1:alpha);`;

const edits = [
  ['declarations', DECL_OLD, DECL_NEW],
  ['same version', VER_OLD, VER_NEW],
  ['netApply notes', NET_OLD, NET_NEW],
  ['frame', FRAME_OLD, FRAME_NEW],
];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('function noteArrival')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['noteArrival present', back.includes('function noteArrival(v)')],
  ['LAG gone', !/\bLAG\b/.test(back)],
  ['span from the world clock', back.includes('(verB-verA)*tickEst')],
  ['one snapshot behind', back.includes('var alpha=(now-tB)/span;')],
  ['duplicate version skipped', back.includes('if(hB&&version===verB) return;')],
  ['netApply notes', back.includes('noteArrival(version);')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 3 written' : 'patch 3 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
