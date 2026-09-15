/* mksim.js — lift the simulation out of a page and make it a node module.
 *
 *   node mksim.js index.candidate.html run/after/sim.node.js
 *
 * The simulation exists twice on purpose: once in the page and once on the
 * server. The page is the original. This only ever reads from the page and
 * writes the node copy, never the other way round, so the two cannot drift
 * apart in the direction that matters.
 */
const fs = require('fs');
const [, , SRC, OUT] = process.argv;
if (!SRC || !OUT) { console.error('usage: node mksim.js <index.html> <sim.node.js>'); process.exit(1); }

const page = fs.readFileSync(SRC, 'utf8');
const m = page.match(/<script id="simsrc"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.error('no <script id="simsrc"> in ' + SRC); process.exit(2); }

const head = fs.readFileSync(__dirname + '/simwrap.head.txt', 'utf8');
const tail = fs.readFileSync(__dirname + '/simwrap.tail.txt', 'utf8');
fs.writeFileSync(OUT, head + m[1] + tail);

/* it has to load, or it is not a copy of anything */
delete require.cache[require.resolve(require('path').resolve(OUT))];
const sim = require(require('path').resolve(OUT));
console.log(SRC + ' -> ' + OUT + '  ' + (head + m[1] + tail).length + ' bytes, loads, machLen=' + sim.machLen.toFixed(3));
