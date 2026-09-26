/* patch24 - the lamps were hanging off the bucket.
 *
 * Jeff, looking at the live page the night it went out: "the light looks
 * really good but we get these mysterious floating spots. what are they."
 * Pairs of bright squares hanging in the sky with nothing underneath.
 *
 * They are the lamps, and they are on the bucket.
 *
 *   var mH=joint(_mA,mU,0,0,0,0,0);      <- mH IS _mA, not a copy of it
 *   var mS=joint(_mA,mBo,st,0,0,0,0);    <- _mA overwritten: mH is now the stick
 *   _mA.copy(mK);                        <- and now it is the bucket
 *   ... sixty lines later ...
 *   LAMPS.setMatrixAt(i,mH);             <- so this is the bucket's place
 *
 * `joint` returns the scratch matrix it was handed. Naming it mH does not
 * make it the house's; it stays a pointer at a pad that the next two lines
 * write over. So the lamp boxes have been drawn at the end of the arm since
 * the day they were added, rising into the air whenever a machine lifts its
 * boom. Nobody saw it because the forty-two-metre painted disc on the sand
 * was what the eye went to, and two small specks somewhere near a machine
 * looked like lamps on a machine.
 *
 * patch17 then hung the actual light off the same mH, so this morning the
 * beams started coming out of the bucket too - and with the disc gone, the
 * lamps became the only thing to look at and the fault became the picture.
 *
 * The house gets its own matrix. Nothing else writes to it, so it is still
 * the house sixty lines later, which is the only property that was wanted.
 *
 * Usage: node patch24.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch24.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("a matrix of the house's own",
`var _m4=new THREE.Matrix4(), _mA=new THREE.Matrix4(), _mB=new THREE.Matrix4(), _mC=new THREE.Matrix4(),`,
`/* _mHouse is NOT scratch. The arm is solved with _mA and _mB handed back and
   forth, so anything that has to survive to the end of the loop - and the
   lamps do - needs a matrix nobody else writes to. */
var _mHouse=new THREE.Matrix4();
var _m4=new THREE.Matrix4(), _mA=new THREE.Matrix4(), _mB=new THREE.Matrix4(), _mC=new THREE.Matrix4(),`);

e("keep the house where it was",
`    var mH=joint(_mA,mU,0,0,0,0,0);                 RIG.house.setMatrixAt(i,mH);`,
`    var mH=joint(_mA,mU,0,0,0,0,0);                 RIG.house.setMatrixAt(i,mH);
    _mHouse.copy(mH);   /* because mH is about to become the stick, then the bucket */`);

e("the lamp boxes go on the cab",
`      LAMPS.setMatrixAt(i,mH);`,
`      LAMPS.setMatrixAt(i,_mHouse);`);

e("and so does the light",
`      _lampPos.set(LAMP_X,LAMP_Y,(LAMP_Z1+LAMP_Z2)*0.5).applyMatrix4(mH);
      _lampAim.set(1.0,-0.34,0.0).transformDirection(mH).normalize();`,
`      _lampPos.set(LAMP_X,LAMP_Y,(LAMP_Z1+LAMP_Z2)*0.5).applyMatrix4(_mHouse);
      _lampAim.set(1.0,-0.34,0.0).transformDirection(_mHouse).normalize();`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["house has its own matrix", back.includes("var _mHouse=new THREE.Matrix4();")],
  ["it is copied while still the house", back.includes("_mHouse.copy(mH);")],
  ["boxes use it", back.includes("LAMPS.setMatrixAt(i,_mHouse);")],
  ["light uses it", back.includes(".applyMatrix4(_mHouse);")],
  ["nothing still uses the clobbered one", !back.includes("LAMPS.setMatrixAt(i,mH);")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
