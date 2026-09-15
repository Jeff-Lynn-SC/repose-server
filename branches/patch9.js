/* Patch 9 — a machine stands on its wheels.
 *
 * It used to take the ground under the machine's centre, tilt to the gradient
 * at that one point, and then sink the whole thing by 0.05 machine-lengths.
 * That is thirty centimetres, typed, and it was tuned when the body was 4.9 m
 * tall with nearly a metre of clearance under it. The real body has forty
 * centimetres, so the same thirty buried it to the axles and drove the boom
 * into the sand. One more of the bug class this file keeps finding: a quantity
 * scaled to machLen, quietly meaning metres.
 *
 * The ground is now read under each of the four wheels. The body sits at their
 * mean and tilts by the difference front-to-back and side-to-side, and each
 * wheel then sits on its own ground. Nothing is typed: where a machine stands
 * is where its wheels are. It also stops a six-metre machine balancing on one
 * point of a grid whose squares are 5.6 m across.
 *
 * Proves every anchor before it writes anything.
 */
const fs = require('fs');
const FILE = process.argv[2];
if (!FILE) { console.error('usage: node patch9.js <index.html>'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');

const STAND_OLD = `    trackLay(i,x,z,ang);
    var y=hAt(x,z), g=gradAt(x,z);
    _up.set(-g.x,1,-g.z).normalize();
    _fw.set(Math.cos(ang),0,Math.sin(ang));
    _rt.crossVectors(_fw,_up).normalize();
    _fw.crossVectors(_up,_rt).normalize();
    _m4.makeBasis(_fw,_up,_rt);
    _q.setFromRotationMatrix(_m4);
    _pv.set(x,y-0.05*machLen,z); _sc.set(machLen,machLen,machLen);
    var mU=_m4.compose(_pv,_q,_sc);`;

const STAND_NEW = `    trackLay(i,x,z,ang);
    /* ---- where a machine actually stands ----
       The ground under each of its four wheels. The body sits at the mean of
       those four and tilts by the difference front-to-back and side-to-side.
       It used to take one reading under the centre, tilt to the gradient at
       that single point, and then sink the whole machine by 0.05 machine
       lengths - thirty centimetres, typed, and tuned when the body stood
       4.9 m tall with nearly a metre of clearance. The real body has forty
       centimetres and the same thirty buried it to the axles.
       Four readings also stop a six-metre machine balancing on one point of a
       grid whose squares are 5.6 m across. Machine right is +Z, so local
       (lx,lz) goes to world (lx*ca - lz*sa, lx*sa + lz*ca). */
    var ca=Math.cos(ang), sa=Math.sin(ang), ML=machLen;
    var wfr=hAt(x+ML*( WBX*ca-WBZ*sa), z+ML*( WBX*sa+WBZ*ca));
    var wfl=hAt(x+ML*( WBX*ca+WBZ*sa), z+ML*( WBX*sa-WBZ*ca));
    var wrr=hAt(x+ML*(-WBX*ca-WBZ*sa), z+ML*(-WBX*sa+WBZ*ca));
    var wrl=hAt(x+ML*(-WBX*ca+WBZ*sa), z+ML*(-WBX*sa-WBZ*ca));
    var y=(wfr+wfl+wrr+wrl)*0.25;
    var sFwd=((wfr+wfl)-(wrr+wrl))/(4*WBX*ML);      /* rise per metre along it */
    var sRt =((wfr+wrr)-(wfl+wrl))/(4*WBZ*ML);      /* and across it */
    _fw.set(ca,0,sa);
    _rt.set(-sa,0,ca);
    _up.set(0,1,0).addScaledVector(_fw,-sFwd).addScaledVector(_rt,-sRt).normalize();
    _rt.crossVectors(_fw,_up).normalize();
    _fw.crossVectors(_up,_rt).normalize();
    _m4.makeBasis(_fw,_up,_rt);
    _q.setFromRotationMatrix(_m4);
    _pv.set(x,y,z); _sc.set(ML,ML,ML);
    var mU=_m4.compose(_pv,_q,_sc);`;

const WHEEL_OLD = `      var wx=(w<2)?WBX:-WBX, wz=(w&1)?WBZ:-WBZ;
      var mW=joint(_mB,mU,wx,WR,wz,-wPh[i],(w<2)?wSt[i]:0);`;

const WHEEL_NEW = `      var wx=(w<2)?WBX:-WBX, wz=(w&1)?WBZ:-WBZ;
      /* and each wheel on its own ground, so a machine on rough sand does not
         float one corner and bury another */
      var gw=(w<2)?((w&1)?wfr:wfl):((w&1)?wrr:wrl);
      var sit=(gw-(y+(wx*sFwd+wz*sRt)*ML))/ML;
      var mW=joint(_mB,mU,wx,WR+sit,wz,-wPh[i],(w<2)?wSt[i]:0);`;

const edits = [['standing', STAND_OLD, STAND_NEW], ['wheels', WHEEL_OLD, WHEEL_NEW]];

let bad = 0;
for (const [name, from] of edits) {
  const n = src.split(from).length - 1;
  console.log(`  anchor ${name}: ${n}`);
  if (n !== 1) bad++;
}
if (src.includes('var wfr=hAt(')) { console.log('  already patched'); bad++; }
if (bad) { console.error('ABORTED, nothing written'); process.exit(2); }

for (const [, from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);

const back = fs.readFileSync(FILE, 'utf8');
const checks = [
  ['four wheels read', back.includes('var wfr=hAt(') && back.includes('var wrl=hAt(')],
  ['tilts from the wheelbase', back.includes('var sFwd=((wfr+wfl)-(wrr+wrl))/(4*WBX*ML);')],
  ['each wheel on its own ground', back.includes('var sit=(gw-(y+(wx*sFwd+wz*sRt)*ML))/ML;')],
  ['typed sink gone', !back.includes('y-0.05*machLen')],
  ['no longer tilts off one point', !back.includes('var y=hAt(x,z), g=gradAt(x,z);')],
];
let ok = true;
for (const [n, v] of checks) { console.log(`  ${v ? 'ok' : 'FAILED'}  ${n}`); if (!v) ok = false; }
console.log(ok ? 'patch 9 written' : 'patch 9 WROTE BUT DID NOT VERIFY');
process.exit(ok ? 0 : 3);
