/* timingfix.js — let a browser see its own network timing against this world.
 *
 * A page can measure how long its own requests took, but for a cross-origin
 * server the browser zeroes everything useful — connect, TLS, time to first
 * byte, transfer size — unless the server says it may look. On 12 September an
 * hour went into working out whether the world's half-second was the network
 * or the server, using curl from a shell behind a proxy, when the page itself
 * could have said so from performance.getEntriesByType("resource").
 *
 * One header. It exposes nothing but how long the browser's own request took.
 *
 *   node branches/timingfix.js server.js
 */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node timingfix.js <server.js>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

const OLD = `  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","no-store");`;
const NEW = `  res.setHeader("Access-Control-Allow-Origin","*");
  /* so a page can time its own requests: without this the browser zeroes
     connect, TLS and time-to-first-byte for a cross-origin server, and the
     only way to tell the network from the machine is a shell and a guess */
  res.setHeader("Timing-Allow-Origin","*");
  res.setHeader("Cache-Control","no-store");`;

const n = src.split(OLD).length - 1;
console.log('  anchor headers: ' + n);
if (n !== 1) { console.error('ABORTED, nothing written'); process.exit(2); }
if (src.includes('Timing-Allow-Origin')) { console.log('  already patched'); process.exit(2); }

src = src.split(OLD).join(NEW);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const ok = back.includes('res.setHeader("Timing-Allow-Origin","*");')
        && back.includes('res.setHeader("Access-Control-Allow-Origin","*");');
console.log(ok ? 'timing header added' : 'FAILED to verify');
process.exit(ok ? 0 : 3);
