/* Patch 5 — ask again the moment the last answer lands, instead of waiting for
   the next turn of the clock. Proves its anchors before writing anything. */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch5.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

const OK_OLD = `      netFail=0; netEver=true; netAsking=false;
      netNextAt=netSentAt+(tickEst||TICK_GUESS);
    })`;
const OK_NEW = `      netFail=0; netEver=true; netAsking=false;
      netNextAt=netSentAt+(tickEst||TICK_GUESS);
      /* and ask again as soon as that floor has passed, rather than waiting
         for the next turn of the clock below. The clock runs every 50 ms, so
         leaving it to do the asking threw away up to 50 ms of every cycle —
         a sixth of the round trip, for nothing. The clock stays as the thing
         that notices when this has not happened. */
      var due=netNextAt-performance.now();
      setTimeout(netPoll,due>0?due:0);
    })`;

const FAIL_OLD = `      netAsking=false; netFail++;
      netNextAt=performance.now()+netFail*(tickEst||TICK_GUESS);
      if(!netEver&&netFail>=6){
        netOn=false;
        console.warn("the world has never answered; computing one here instead");
        startLocal();
      }
    });`;
const FAIL_NEW = `      netAsking=false; netFail++;
      var back=netFail*(tickEst||TICK_GUESS);
      netNextAt=performance.now()+back;
      if(!netEver&&netFail>=6){
        netOn=false;
        console.warn("the world has never answered; computing one here instead");
        startLocal();
        return;
      }
      setTimeout(netPoll,back);
    });`;

const edits = [['answered', OK_OLD, OK_NEW], ['failed', FAIL_OLD, FAIL_NEW]];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('var due=netNextAt-performance.now();')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['asks on arrival', back.includes('var due=netNextAt-performance.now();')],
  ['backs off on failure', back.includes('setTimeout(netPoll,back);')],
  ['fallback still guarded', back.includes('if(!netEver&&netFail>=6){')],
  ['clock still there', back.includes('setInterval(netTick,50);')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 5 written' : 'patch 5 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
