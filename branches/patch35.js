/* patch35 - the boom comes to rest on the front axle.
 *
 * Found while building the Meccano machine. A checker was written that
 * treats every part of the model as a solid box and the wheels as solid
 * tyres, and puts the arm through every pose a working pit actually uses -
 * 5,760 of them, from an hour of eight machines. One in eleven had the
 * boom down through the machine's own front axle, and the lowest of them
 * on through the platform behind it.
 *
 * The cause is one number. PITCH_LO was -0.80 - forty-six degrees below
 * level - which is not a limit at all: it is lower than the body lets the
 * boom go. A telehandler's boom pivots at the back and the front axle runs
 * right across underneath it, so lowered far enough it rests on the axle,
 * and that is where it stops.
 *
 * Jeff, asked whether the arm should stop on the axle: "yes".
 *
 * So the limit is worked out from where the axle is - the front wheels' own
 * position and radius of rod - and how deep the boom is below its own
 * centreline, which is one hole-pitch, and the pitch is a ninth of the
 * wheelbase because the axles go through holes. These are the model's own
 * dimensions and the picture is built from the same ones. It comes to
 * -0.2152, about twelve degrees down.
 *
 * Nothing else is touched. The pose a loaded machine travels in is
 * -0.1853, above the limit, so it does not change. armTo already clamps to
 * PITCH_LO, and a pass whose teeth cannot reach the ground already comes up
 * barren and sends the machine to look elsewhere - that is how the piece
 * has always learned that ground is out of reach. MEASURED below.
 *
 * Applied to the page; sim.node.js is rebuilt from it with mksim.
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){ console.error("usage: node patch35.js index.html"); process.exit(1); }
let s=fs.readFileSync(f,"utf8");
const E=[];
E.push(["the pivot line, where the limit goes after",
`var P_BOOMX=-0.408, P_BOOMY=0.308, P_BOOMZ=0.092;   /* the boom is on the machine's right, as every Loadall's is */
`,
`var P_BOOMX=-0.408, P_BOOMY=0.308, P_BOOMZ=0.092;   /* the boom is on the machine's right, as every Loadall's is */
/* How low the boom can come. It pivots at the back of the machine and the
   front axle runs right across underneath it, so lowered far enough it comes
   to rest on the axle and can go no further. This used to be -0.80, which
   limited nothing: measured over an hour of a working pit, one arm position
   in eleven had the boom down through the machine's own front axle, and the
   lowest of them on through the platform behind it. See patch35.

   The axle is where the front wheels are, AXLE_R round. The boom is two
   strips deep and a strip is one hole-pitch wide, so its underside is one
   pitch below its centreline - and the pitch is a ninth of the wheelbase,
   because the axles go through holes. The model's own dimensions, which the
   picture is built from too. The underside meets the top of the axle where
   the axle's centre lies AXLE_R+BOOM_UNDER below the boom's centreline. */
var AXLE_X=0.2292, AXLE_Y=0.1033, AXLE_R=0.013, BOOM_UNDER=2*AXLE_X/9;
PITCH_LO=(function(){
  var dx=AXLE_X-P_BOOMX, dy=AXLE_Y-P_BOOMY;
  return Math.atan2(dy,dx)+Math.asin((AXLE_R+BOOM_UNDER)/Math.sqrt(dx*dx+dy*dy));
})();
`]);
let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(!s.includes("var L_BASE=0.961, E_MAX=1.239, PITCH_LO=-0.80, PITCH_HI=1.15;")){ console.error("ANCHOR the old limit: not found"); bad++; }
if(s.includes("var AXLE_X=")){ console.error("already applied"); bad++; }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const sim=(back.match(/<script id="simsrc"[^>]*>([\s\S]*?)<\/script>/)||[])[1]||"";
const checks=[
  ["the limit is worked out from the axle", sim.includes("var AXLE_X=0.2292, AXLE_Y=0.1033, AXLE_R=0.013, BOOM_UNDER=2*AXLE_X/9;")],
  ["after the pivot it depends on",         sim.indexOf("PITCH_LO=(function(){")>sim.indexOf("var P_BOOMX=-0.408")],
  ["and before the travel pose is solved",  sim.indexOf("PITCH_LO=(function(){")<sim.indexOf("var K_CARRY=")],
  ["inside the simulation",                 sim.includes("PITCH_LO=(function(){")],
  ["not applied twice",                     back.split("var AXLE_X=0.2292").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
/* and the number it comes to */
try{ const v=(new Function(sim.slice(sim.indexOf("var L_BASE="),sim.indexOf("var CLEAR_Y="))+"\nreturn PITCH_LO;"))();
  console.log("PITCH_LO = "+v.toFixed(4)); if(!(v>-0.23&&v<-0.20)){ console.log("FAIL  the limit is not where the axle is"); fail++; } }
catch(e){ console.log("FAIL  could not evaluate: "+e.message); fail++; }
process.exit(fail?1:0);
