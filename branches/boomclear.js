/* boomclear.js — is the boom in the sand, and how often?
 *
 * The renderer draws a straight member from the pivot on the machine's back to
 * the teeth. Nothing anywhere checks whether the ground between those two
 * points is higher than the line joining them. On a flat pit it never was. The
 * pivot has just come down from 4.20 m to 1.85 m, and the world has grown real
 * dunes, so it is worth knowing rather than guessing.
 *
 *   node boomclear.js [minutes] [pop]
 *
 * Reports, per machine-second: how often any point along the boom is below the
 * sand, and by how much at the worst.
 */
const sim = require('./sim.node.js');

const MINS = +(process.argv[2] || 5), POP = +(process.argv[3] || 8);
const DT = 1 / 40, STEPS = Math.round(MINS * 60 / DT);

/* the constants this build digs by, read off the file rather than assumed */
const src = require('fs').readFileSync('./sim.node.js', 'utf8');
const num = (re) => { const m = src.match(re); if (!m) throw new Error('not found: ' + re); return parseFloat(m[1]); };
const P_BOOMX = num(/P_BOOMX=(-?[\d.]+)/), P_BOOMY = num(/P_BOOMY=(-?[\d.]+)/), P_BOOMZ = num(/P_BOOMZ=(-?[\d.]+)/);
const L_BASE = num(/L_BASE=([\d.]+)/), TOOTH_X = num(/TOOTH_X=([\d.]+)/), TOOTH_Y = num(/TOOTH_Y=(-?[\d.]+)/);

sim.seedRNG(777);
sim.applyScale({ ix: 0, N: 180, width: 1000, pop: POP, vis: 0.233 }, null, true);

const N = sim.N, CS = sim.CS, HALF = sim.HALF, ML = sim.machLen;
function hAt(x, z) {
  const gx = ((x + HALF) / CS) | 0, gz = ((z + HALF) / CS) | 0;
  return (gx < 0 || gz < 0 || gx >= N || gz >= N) ? 0 : sim.h[gz * N + gx];
}
/* the same two points the renderer draws between */
function boomLine(a) {
  const d1 = a.boom, d3 = d1 + a.buck, L = L_BASE + a.stick;
  const ca = Math.cos(a.ang), sa = Math.sin(a.ang);
  const toW = (lx, ly, lz) => ({
    x: a.x + ML * (lx * ca - lz * sa),
    z: a.z + ML * (lx * sa + lz * ca),
    y: hAt(a.x, a.z) + ML * ly,
  });
  const pivot = toW(P_BOOMX, P_BOOMY, P_BOOMZ);
  let px = P_BOOMX + L * Math.cos(d1), py = P_BOOMY + L * Math.sin(d1);
  px += TOOTH_X * Math.cos(d3) - TOOTH_Y * Math.sin(d3);
  py += TOOTH_X * Math.sin(d3) + TOOTH_Y * Math.cos(d3);
  return [pivot, toW(px, py, P_BOOMZ)];
}

let seconds = 0, buried = 0, worst = 0, depths = [], tipBuried = 0;
const SAMPLES = 12;
for (let s = 0; s < STEPS; s++) {
  sim.substep(DT);
  if (s % 40) continue;
  for (const a of sim.machines) {
    const [p, t] = boomLine(a);
    seconds++;
    let low = 0;
    for (let k = 1; k <= SAMPLES; k++) {
      const f = k / (SAMPLES + 1);
      const y = p.y + (t.y - p.y) * f;
      const g = hAt(p.x + (t.x - p.x) * f, p.z + (t.z - p.z) * f);
      const c = y - g;
      if (c < low) low = c;
    }
    if (low < -0.05) { buried++; depths.push(-low); if (-low > worst) worst = -low; }
    if (t.y - hAt(t.x, t.z) < -0.6) tipBuried++;
  }
}
depths.sort((a, b) => a - b);
const pct = (q) => depths.length ? +depths[Math.min(depths.length - 1, Math.round(q * (depths.length - 1)))].toFixed(2) : 0;
console.log(JSON.stringify({
  pivotHeight_m: +(P_BOOMY * ML).toFixed(2),
  machineSeconds: seconds,
  boomInTheSand_pct: +(100 * buried / seconds).toFixed(1),
  depth_m: { median: pct(0.5), p90: pct(0.9), worst: +worst.toFixed(2) },
  teethMoreThan0_6mUnder_pct: +(100 * tipBuried / seconds).toFixed(1),
}));
