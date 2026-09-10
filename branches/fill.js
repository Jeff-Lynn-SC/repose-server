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
sim.mixRaise = 0;
for (const a of sim.machines) { a.role = 1; a.newJob(); }

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

const TOL = 0.15;                       /* about one bucket spread over one cell */
const COS = [], SIN = [];
for (let a = 0; a < 8; a++) { COS.push(Math.cos(a * 0.7853982) * 38); SIN.push(Math.sin(a * 0.7853982) * 38); }
const M = sim.machines.slice();
const st = M.map(a => ({ a, last: a.load }));
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
const r0 = (v) => +v.toFixed(0), r3 = (v) => +v.toFixed(3);
function line(at) {
  console.log(JSON.stringify({
    at,
    putIn:   { m3: r0(got.vol),  intoHollows: r0(got.hollow),  ontoFlat: r0(got.flat),  ontoHumps: r0(got.hump),
               shareIntoHollows: got.vol ? r3(got.hollow / got.vol) : 0,
               meanRelief: got.vol ? r3(got.wsum / got.vol) : 0 },
    tookFrom:{ m3: r0(took.vol), offHumps: r0(took.hump), offFlat: r0(took.flat), outOfHollows: r0(took.hollow),
               shareOffHumps: took.vol ? r3(took.hump / took.vol) : 0,
               meanRelief: took.vol ? r3(took.wsum / took.vol) : 0 }
  }));
}

const every = Math.round(Math.max(1, Math.min(5, MINS / 4)) * 60 / DT);
for (let s = 1; s <= STEPS; s++) {
  sim.substep(DT); sim.evN = 0; sim.dustN = 0;
  for (const r of st) {
    const a = r.a, d = a.load - r.last;
    if (d > 1e-6) bin(took, reliefAt(a.x, a.z), d);          /* it is standing at its cut */
    else if (d < -1e-6) bin(got, reliefAt(a.x, a.z), -d);    /* and at its tip */
    r.last = a.load;
  }
  if (s % every === 0) line(+(s * DT / 60).toFixed(0));
}
