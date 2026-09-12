/* Patch 4 — one question in the air at a time, and never invent a private
   world once the real one has answered.
   Proves every anchor before it writes anything, and writes once at the end. */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch4.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

const POLL_OLD = `function netPoll(){
  if(!netOn) return;
  fetch(WORLD_URL+"/state?since="+netSince,{cache:"no-store"})
    .then(function(r){ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(function(buf){ netApply(new DataView(buf)); netFail=0; })
    .catch(function(){
      if(++netFail===6){ netOn=false; console.warn("the world is not answering; computing one here instead");
        startLocal(); }
    });
}`;

const POLL_NEW = `/* ---- asking the world what it is now ----
   This used to fire every 200 ms whatever was happening, and an answer takes
   about 400 ms from here. Measured on 12 September: a request to /join, which
   does no work at all, comes back no faster than one to /state, which packs
   the world — and the whole 257 KB world came back faster than a 400-byte
   diff. The time is the distance to the machine, not the machine. So there
   were always two questions in the air, the server packed the world twice,
   the network carried it twice, and the second answer was usually a version
   the page already held.

   It keeps one question in the air now and asks the next as soon as the last
   is answered — exactly as fast as the world can answer and no faster. The
   floor is one of the world's own ticks, because asking twice inside one tick
   can only be told the same thing twice.

   And it no longer gives up. Six failures in a row — 1.2 seconds — used to
   make the browser abandon the shared world and quietly start computing its
   own, for ever, saying so only in a readout nobody has open. The piece is one
   square kilometre that everybody is in; a viewer moved into a private copy of
   it without being told is worse than a viewer waiting. A page that has never
   reached the world still falls back, because that is what the fallback was
   for — a sandboxed frame, a strict policy, no world there at all. A page that
   has been there keeps asking, waiting one tick longer after each failure so a
   struggling server is not shouted at, and comes back the moment it answers.

   The consequence, and it is the right one: a first viewer arriving while the
   free instance is asleep now waits the minute it takes to wake instead of
   being handed a pit of their own. Repose works when it is watched. */
var netEver=false, netAsking=false, netSentAt=0, netNextAt=0, netCtl=null, rttWorst=0;
var TICK_GUESS=200;      /* stands in for the world's tick until it is measured */
function netPoll(){
  if(!netOn||netAsking) return;
  netAsking=true; netSentAt=performance.now();
  var opt={cache:"no-store"};
  try{ netCtl=new AbortController(); opt.signal=netCtl.signal; }catch(err){ netCtl=null; }
  fetch(WORLD_URL+"/state?since="+netSince,opt)
    .then(function(r){ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(function(buf){
      var rtt=performance.now()-netSentAt;
      rttWorst=Math.max(rtt,rttWorst*0.98);
      netApply(new DataView(buf));
      netFail=0; netEver=true; netAsking=false;
      netNextAt=netSentAt+(tickEst||TICK_GUESS);
    })
    .catch(function(){
      netAsking=false; netFail++;
      netNextAt=performance.now()+netFail*(tickEst||TICK_GUESS);
      if(!netEver&&netFail>=6){
        netOn=false;
        console.warn("the world has never answered; computing one here instead");
        startLocal();
      }
    });
}
/* The clock that keeps it going. It also drops a reply that has taken twice as
   long as the slowest one that ever came back — that reply is not coming, and
   waiting for the browser to give up on it takes minutes. It only does that
   once the world has answered at least once, because until then there is no
   such thing as how long a reply takes, and a sleeping instance deserves the
   minute it needs. */
function netTick(){
  if(!netOn) return;
  var now=performance.now();
  if(netAsking){
    if(netEver&&netCtl&&now-netSentAt>2*(rttWorst||TICK_GUESS)){
      try{ netCtl.abort(); }catch(err){}
    }
    return;
  }
  if(now>=netNextAt) netPoll();
}`;

const LINK_OLD = `  netJoin();
  netPoll();
  setInterval(netPoll,200);`;
const LINK_NEW = `  netJoin();
  netPoll();
  setInterval(netTick,50);`;

const DEV_OLD = `      (netOn?("world "+netPolls+" updates, "+
              (netKB/Math.max(1,(Date.now()-startedAt)/1000)).toFixed(1)+" KB/s")
            :(INLINE?"inline":"worker")+" "+snapCount)+`;
const DEV_NEW = `      (netOn?("world "+netPolls+" updates, "+
              (netKB/Math.max(1,(Date.now()-startedAt)/1000)).toFixed(1)+" KB/s"+
              (netFail?"  waiting ("+netFail+")":""))
            :(INLINE?"inline":"worker")+" "+snapCount)+`;

const edits = [
  ['netPoll', POLL_OLD, POLL_NEW],
  ['startWorldLink', LINK_OLD, LINK_NEW],
  ['readout', DEV_OLD, DEV_NEW],
];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('var netEver=false')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['one in flight', back.includes('if(!netOn||netAsking) return;')],
  ['never abandons a world it reached', back.includes('if(!netEver&&netFail>=6){')],
  ['clock installed', back.includes('setInterval(netTick,50);')],
  ['old 200 ms poll gone', !back.includes('setInterval(netPoll,200);')],
  ['old give-up gone', !back.includes('if(++netFail===6)')],
  ['readout says waiting', back.includes('"  waiting ("+netFail+")"')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 4 written' : 'patch 4 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
