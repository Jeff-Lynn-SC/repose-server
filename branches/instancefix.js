/* Patch 1 — send the card the machines that exist, not the room for 3,000.
   Proves every anchor before it writes anything, and writes once at the end. */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch1.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

const HELPER_ANCHOR =
`/* ---- machines, drawn from the interpolated snapshot ---- */`;

const HELPER = `/* ---- machines, drawn from the interpolated snapshot ---- */
/* The instance buffers have room for MAXI machines and three.js sends the
   whole of that room unless it is told which part of it changed. At three
   machines in the world that was 2.28 MB of empty slots on the wire to the
   card, every frame, next to 1.17 MB of actual ground. It forgets the range
   after each upload, so this is said again every frame. */
function sendInstances(attr,count,item){
  if(!attr||count<=0) return;
  attr.updateRange.offset=0;
  attr.updateRange.count=count*item;
  attr.needsUpdate=true;
}`;

const RIG_OLD =
`      var m=RIGLIST[k]; m.count=(m===RIG.wheel)?n*4:n; m.instanceMatrix.needsUpdate=true;
      if(m.instanceColor) m.instanceColor.needsUpdate=true;`;

const RIG_NEW =
`      var m=RIGLIST[k], cnt=(m===RIG.wheel)?n*4:n; m.count=cnt;
      sendInstances(m.instanceMatrix,cnt,16);
      sendInstances(m.instanceColor,cnt,3);`;

const BLOB_OLD =
`    BLOB.count=n; BLOB.instanceMatrix.needsUpdate=true;
    if(BLOB.instanceColor) BLOB.instanceColor.needsUpdate=true;`;

const BLOB_NEW =
`    BLOB.count=n;
    sendInstances(BLOB.instanceMatrix,n,16);
    sendInstances(BLOB.instanceColor,n,3);`;

const LAMP_OLD =
`  if(on){
    LAMPS.instanceMatrix.needsUpdate=true;
    POOLS.instanceMatrix.needsUpdate=true;
  }`;

const LAMP_NEW =
`  if(on){
    sendInstances(LAMPS.instanceMatrix,n,16);
    sendInstances(POOLS.instanceMatrix,n,16);
  }`;

const edits = [
  ['helper', HELPER_ANCHOR, HELPER],
  ['rigs', RIG_OLD, RIG_NEW],
  ['blob', BLOB_OLD, BLOB_NEW],
  ['lamps', LAMP_OLD, LAMP_NEW],
];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('function sendInstances')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);

fs.writeFileSync(FILE, src);

/* prove it landed */
const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['helper present', back.includes('function sendInstances(attr,count,item)')],
  ['rigs changed', back.includes('sendInstances(m.instanceMatrix,cnt,16)')],
  ['blob changed', back.includes('sendInstances(BLOB.instanceMatrix,n,16)')],
  ['lamps changed', back.includes('sendInstances(LAMPS.instanceMatrix,n,16)')],
  ['old rig line gone', !back.includes('m.instanceMatrix.needsUpdate=true')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 1 written' : 'patch 1 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
