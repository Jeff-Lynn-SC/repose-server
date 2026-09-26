/* patch23 - the picture does not have to catch up after a cut.
 * RUN AFTER patch10.js and patch15.js.
 *
 * The exposure eases toward what the frame asks for, the way an eye does
 * walking into a dark room. That is right while a shot is running: the
 * camera moves, the ground under it changes, and an eye would take a second
 * or two over it.
 *
 * It is wrong across a cut. When the director drops one shot and picks up
 * another somewhere else in the pit, the picture does not travel - it is
 * simply elsewhere. Easing through that is the exposure "catching up" over a
 * second and a half at forty frames a second, which is the wrong thing
 * twice: no eye did that journey, and no camera would have been left on the
 * old setting. Cut from a machine's lamp pool to open sand and you would
 * watch the whole frame drift.
 *
 * So the exposure settles at once on a cut, and eases within a shot. The
 * director already says when it cuts; it just was not telling anybody.
 *
 * Usage: node patch23.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch23.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
if(!s.includes("var MID_GREY=")){ console.error("REFUSED: run patch10.js and patch15.js first"); process.exit(1); }
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("a flag the director can set",
`var MID_GREY=0.30;`,
`/* set when the director cuts: the next reading the meter takes is used as
   it stands rather than eased toward. Cleared once it has been used, so a
   cut that happens between readings is still honoured. */
var expoCut=false;
var MID_GREY=0.30;`);

e("settle at once on a cut",
`  /* an eye takes a second or two to come round, and so does this */
  var edt=Math.min(0.1,(now-(meter._t||now))/1000); meter._t=now;
  expo+=(expoWant-expo)*Math.min(1,edt*0.8);`,
`  /* an eye takes a second or two to come round within a shot, and so does
     this. Across a cut it does not: nothing travelled, so there is nothing
     to come round from. */
  if(expoCut && meter._lum!==undefined){ expo=expoWant; expoCut=false; meter._t=now; return; }
  var edt=Math.min(0.1,(now-(meter._t||now))/1000); meter._t=now;
  expo+=(expoWant-expo)*Math.min(1,edt*0.8);`);

e("the director says when it cuts",
`function chooseShot(){
  var now=performance.now();`,
`function chooseShot(){
  /* a cut is not a journey - see the exposure, above */
  if(typeof expoCut!=="undefined") expoCut=true;
  var now=performance.now();`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["flag exists", back.includes("var expoCut=false;")],
  ["meter honours it", back.includes("if(expoCut && meter._lum!==undefined){ expo=expoWant; expoCut=false;")],
  ["director sets it", back.includes('if(typeof expoCut!=="undefined") expoCut=true;')]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
