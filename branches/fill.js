/* fill.js — does a filler fill hollows, or does it shave humps?

   node fill.js [minutes] [pop] [seed]

   The relief of the whole field cannot answer that. Two reasons. Relief is
   measured against the ground around a place, so what stands above always
   equals what lies below and the two move together by construction. And
   most of what the field does in the first few minutes is the sand settling
   and the wind working, not the machines: a run with eight machines touched
   thirteen thousand cells, which is far more ground than eight machines go
   near.

   So this asks the machines instead. Every time a bucket's worth of sand
   leaves or enters a machine, it records how far the ground it was taken
   from, or given to, stood above or below what surrounds it — at that
   moment. Nothing the wind does gets counted, and nothing that settles.

   A machine whose purpose is that hollows get filled should be delivering
   its sand into ground that lies below its surroundings. */
const sim = require("../sim.node.js");
const MINS = +(process.argv[2] || 20);
const POP  = +(process.argv[3] || 8);
const SEED = +(process.argv[4] || 12345);
const DT = 1 / 40, STEPS = Math.round(MINS * 60 / DT);

sim.seedRNG(SEED);
sim.applyScale({ ix: 0, N: 180, width: 1000, pop: POP, vis: 0.233 }, null, true);
/* A fifth argument: what share of the machines raise. Zero — all fillers —
   is the clean measurement of a filler, and it is also a world with no humps
   in it, which may be the whole story: a filler can only reduce unevenness by
   taking from ground that stands high, and in a pit of nothing but fillers
   there is no such ground to take from. Give it some raisers and there is. */
const RAISE_SHARE = +(process.argv[5] || 0);
sim.mixRaise = RAISE_SHARE;
const FILLERS = [];
for (const a of sim.machines) {
  a.role = (Math.random() < RAISE_SHARE) ? 0 : 1;
  if (a.role === 0) { a.sx = a.x; a.sz = a.z; a.ring = Math.random() * 6.2832;
                      a.best = 0; a.lastH = 0; a.check = 0; delete a.dgx; a.pickScoop(); }
  else { a.newJob(); FILLERS.push(a); }
}

const N = sim.N, CS = sim.CS, HALF = sim.HALF, h = sim.h;
function cell(x, z) {
  const cx = Math.round((x + HALF) / CS), cz = Math.round((z + HALF) / CS);
  if (cx < 0 || cx >= N || cz < 0 || cz >= N) return -1;
  return cz * N + cx;
}
/* the same eight points at the same 38 m the machine itself uses */
function reliefAt(x, z) {
  const i = cell(x, z); if (i < 0) return 0;
  let s = 0, n = 0;
  for (let a = 0; a < 8; a++) {
    const j = cell(x + COS[a], z + SIN[a]);
    if (j < 0) continue; s += h[j]; n++;
  }
  return n ? h[i] - s / n : 0;
}

/* THE MACHINE'S OWN EYES.

   The fixed-38 m relief above is kept as a steady yardstick so that runs from
   different weeks compare. But it stopped being the machine's definition on
   11 September, and measuring a machine by a constant it no longer uses is
   the same mistake as judging a raiser by the relief of a whole kilometre.
   So this is the machine's own scan, replicated: walk out ring by ring and
   stop where the ground stops climbing. Both are reported. Where they
   disagree, this one is the truth about what the machine was trying to do,
   and the other is the truth about what a fixed yardstick can see. */
const ML = sim.machLen;
function ringMean(x, z, r) {
  let sum = 0, n = 0;
  for (let a = 0; a < 8; a++) {
    const j = cell(x + Math.cos(a * 0.7853982) * r, z + Math.sin(a * 0.7853982) * r);
    if (j < 0) continue; sum += h[j]; n++;
  }
  return n ? sum / n : NaN;
}
function seenRelief(x, z) {
  const i = cell(x, z); if (i < 0) return 0;
  const here = h[i];
  let prev = ringMean(x, z, ML);
  if (prev !== prev) return 0;
  const up = prev > here;
  for (let r = ML * 1.6; r < HALF; r *= 1.6) {
    const m = ringMean(x, z, r);
    if (m !== m) break;
    if (up ? (m <= prev) : (m >= prev)) break;
    prev = m;
  }
  return here - prev;
}
const seenGot = { hollow: 0, flat: 0, hump: 0, vol: 0, wsum: 0 };
const seenTook = { hollow: 0, flat: 0, hump: 0, vol: 0, wsum: 0 };

const TOL = 0.15;                       /* about one bucket spread over one cell */
const COS = [], SIN = [];
for (let a = 0; a < 8; a++) { COS.push(Math.cos(a * 0.7853982) * 38); SIN.push(Math.sin(a * 0.7853982) * 38); }
/* Machines die, and are replaced. Holding the machines that existed at the
   start - which is what this did, and what probe.js still does - means the
   ledger goes blind as that first cohort is killed off. It looked exactly
   like the whole pit downing tools: forty machines, and "sand moved" froze
   at fifty minutes and never rose again. Nothing had stopped; the instrument
   had. So the roll is taken every step, and a machine born into the world
   joins it. */
const seen = new Map();
for (const a of FILLERS) seen.set(a, a.load);
function roll() {
  for (const a of sim.machines) {
    if (a.role !== 1) continue;
    if (!seen.has(a)) seen.set(a, a.load);
  }
  for (const a of seen.keys()) if (sim.machines.indexOf(a) < 0) seen.delete(a);
}
const got = { hollow: 0, flat: 0, hump: 0, vol: 0, wsum: 0 };   /* where sand was PUT */
const took = { hollow: 0, flat: 0, hump: 0, vol: 0, wsum: 0 };  /* where it came FROM */

/* load is not cubic metres: it is the height one bucket adds to one cell,
   so a bucket reads as 0.115 rather than 3.6. Cell area converts it, and
   this is the same trap as everything else in here. */
const M3 = CS * CS;
function bin(t, r, v0) {
  const v = v0 * M3;
  t.vol += v; t.wsum += r * v;
  if (r < -TOL) t.hollow += v; else if (r > TOL) t.hump += v; else t.flat += v;
}
/* And the thing Jeff actually watches: the deepest hole and the highest
   peak, against the mean. Those are single cells out of thirty-two thousand,
   so the mean of the lowest and highest half-percent is reported beside them
   - same question, robust enough to move. */
function extremes() {
  const a = Array.from(h); a.sort((x, y) => x - y);
  const mean = a.reduce((x, y) => x + y, 0) / a.length;
  const k = Math.max(1, Math.round(a.length * 0.005));
  let lo = 0, hi = 0;
  for (let i = 0; i < k; i++) { lo += a[i]; hi += a[a.length - 1 - i]; }
  return { deepest: a[0] - mean, peak: a[a.length - 1] - mean,
           lowest: lo / k - mean, highest: hi / k - mean };
}
const r0 = (v) => +v.toFixed(0), r3 = (v) => +v.toFixed(3);
function line(at) {
  console.log(JSON.stringify({
    at, fillers: seen.size, machines: sim.machines.length,
    putIn:   { m3: r0(got.vol),  intoHollows: r0(got.hollow),  ontoFlat: r0(got.flat),  ontoHumps: r0(got.hump),
               shareIntoHollows: got.vol ? r3(got.hollow / got.vol) : 0,
               meanRelief: got.vol ? r3(got.wsum / got.vol) : 0 },
    tookFrom:{ m3: r0(took.vol), offHumps: r0(took.hump), offFlat: r0(took.flat), outOfHollows: r0(took.hollow),
               shareOffHumps: took.vol ? r3(took.hump / took.vol) : 0,
               meanRelief: took.vol ? r3(took.wsum / took.vol) : 0 },
    asTheMachineSees: {
      putIn:   { intoHollows: r0(seenGot.hollow), ontoFlat: r0(seenGot.flat), ontoHumps: r0(seenGot.hump),
                 shareIntoHollows: seenGot.vol ? r3(seenGot.hollow / seenGot.vol) : 0,
                 meanRelief: seenGot.vol ? r3(seenGot.wsum / seenGot.vol) : 0 },
      tookFrom:{ offHumps: r0(seenTook.hump), offFlat: r0(seenTook.flat), outOfHollows: r0(seenTook.hollow),
                 shareOffHumps: seenTook.vol ? r3(seenTook.hump / seenTook.vol) : 0,
                 meanRelief: seenTook.vol ? r3(seenTook.wsum / seenTook.vol) : 0 }
    },
    field: (() => { const e = extremes();
      return { deepest: r3(e.deepest), peak: r3(e.peak),
               lowest: r3(e.lowest), highest: r3(e.highest) }; })()
  }));
}

line(0);
const every = Math.round(Math.max(1, Math.min(5, MINS / 4)) * 60 / DT);
for (let s = 1; s <= STEPS; s++) {
  sim.substep(DT); sim.evN = 0; sim.dustN = 0;
  if (s % 40 === 0) roll();
  for (const a of seen.keys()) {
    const d = a.load - seen.get(a);
    if (d > 1e-6) { bin(took, reliefAt(a.x, a.z), d); bin(seenTook, seenRelief(a.x, a.z), d); }
    else if (d < -1e-6) { bin(got, reliefAt(a.x, a.z), -d); bin(seenGot, seenRelief(a.x, a.z), -d); }
    seen.set(a, a.load);
  }
  if (s % every === 0) line(+(s * DT / 60).toFixed(0));
}
