/* patch29 - machines born unequal: every machine carries a size, and it is
 * inherited.
 *
 * Jeff: "in life my chances of economic success are higher if my parents are
 * lawyers and business people than if they are cleaners; I will have a better
 * chance of being a world class basketball player if they are both over two
 * metres. These are advantages and disadvantages built in at birth."
 *
 * Half of that was already here. A machine is not delivered to the pit: it
 * appears two to six machine lengths from a parent, on whatever ground that
 * parent has made, and takes its purpose from that parent and its nearest
 * neighbour - and the parent is chosen by sampling six and keeping the least
 * damaged and least hemmed-in. The piece already bred from success and already
 * handed down a place to stand. What it did not hand down was a body.
 *
 * WHAT WAS FOUND, auditing all forty-seven uses of machLen in the simulation:
 * forty of them already mean THIS MACHINE'S OWN LENGTH. Only six mean the
 * world's unit. Nobody planned that; the file simply happened to be written
 * as though machines could differ, and they were all handed the same number.
 * That is why this is a fortnight rather than a rewrite.
 *
 * ONE NUMBER, and everything else follows from it rather than being chosen:
 *   len = machLen * size          a length
 *   cut = CUT_MAX * size          a depth, so a length
 *   cap = BUCKET  * size^3 / CS^2 a volume
 * Nothing else is set. The blade width, the pass length, the dig ring, where
 * the teeth are, how close counts as arrived, the size of its dust - all of
 * them were already written in machine lengths and now get this machine's.
 *
 * AND THE COST OF BEING BIG IS ALREADY IN THE FILE. PASS is in machine
 * lengths but DRAG is 0.60 METRES A SECOND - a real speed, the same for
 * everyone. So a big machine's pass is longer and takes proportionally
 * longer. Bucket goes as the cube, cycle time as the length, so sand moved
 * per hour goes as the SQUARE of size. Big wins, and wins hard. What stops it
 * is room: see patch30.
 *
 * THE TRAP, and it would have ruined the whole idea quietly. Machines find
 * their neighbours through a grid whose cell is 3.0*machLen, and each one
 * only ever checks the nine cells around itself. Leave that on one shared
 * number and a big machine's awareness radius grows past its own cell and it
 * stops noticing the machines standing beside it. Being knocked about is the
 * ONLY thing that kills a machine here. Giants would not have become strong;
 * the piece would simply have stopped being able to see them getting hit.
 * GCELL is now built from the longest machine in the pit.
 *
 * LEFT ON THE WORLD'S UNIT, deliberately: reliefScan, which measures the
 * shape of the ground when a machine goes looking for work. A hollow is the
 * shape it is whoever happens to be standing in it. Also popR and frontier,
 * which are about where the population is, not about any one machine.
 *
 * HOW IT IS DONE. Not forty hand-written anchors - that is how a file like
 * this gets a number that means something other than what it says. Each of
 * the machine's own methods is found by matching its braces, and machLen and
 * CUT_MAX are replaced only inside it, with the count reported per method so
 * it can be checked against the audit. Anything outside a method is named
 * explicitly below.
 *
 * Usage: node patch29.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch29.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");

/* ---- the audit, written down so the patch checks itself against it ---- */
const EXPECT={
  pickScoop:{machLen:2,CUT_MAX:1},          /* the dig ring, and the fill distance */
  relocate:{machLen:1,CUT_MAX:0},           /* how far it goes looking */
  reckon:{machLen:2,CUT_MAX:1},             /* shove distance, and what a shove fills */
  stillWorthShoving:{machLen:1,CUT_MAX:1},
  jobPays:{machLen:0,CUT_MAX:0},
  newJob:{machLen:1,CUT_MAX:0},
  bladePose:{machLen:1,CUT_MAX:0},          /* the blade's height, in machine lengths */
  step:{machLen:25,CUT_MAX:2}               /* every one of them read and checked */
};

function body(src,head){
  const i=src.indexOf(head);
  if(i<0) return null;
  let j=src.indexOf("{",i+head.length-1);
  j=src.indexOf("{",i);
  let depth=0,k=j;
  for(;k<src.length;k++){
    const c=src[k];
    if(c==="{") depth++;
    else if(c==="}"){ depth--; if(depth===0){ k++; break; } }
  }
  return {start:i,open:j,end:k};
}

let bad=0, report=[];
for(const name of Object.keys(EXPECT)){
  const head="Machine.prototype."+name+"=function(";
  if(s.split(head).length!==2){ console.error("METHOD "+name+": not found once"); bad++; continue; }
  const r=body(s,head);
  if(!r){ console.error("METHOD "+name+": no body"); bad++; continue; }
  const src=s.slice(r.open,r.end);
  const nL=(src.match(/\bmachLen\b/g)||[]).length;
  const nC=(src.match(/\bCUT_MAX\b/g)||[]).length;
  const e=EXPECT[name];
  if(nL!==e.machLen||nC!==e.CUT_MAX){
    console.error("METHOD "+name+": found machLen "+nL+" (expected "+e.machLen+"), CUT_MAX "+nC+" (expected "+e.CUT_MAX+")");
    bad++; continue;
  }
  report.push([name,nL,nC]);
  if(nL===0&&nC===0) continue;
  let out=src.replace(/\bmachLen\b/g,"len").replace(/\bCUT_MAX\b/g,"cut");
  /* the two locals, right at the top of the method, named for what they are */
  out=out.replace("{","{\n  var len=this.len, cut=this.cut;   /* this machine's own, not the world's. patch29 */",1);
  s=s.slice(0,r.open)+out+s.slice(r.end);
}
if(bad){ console.error("nothing written"); process.exit(1); }

const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

/* ---- what a machine is born with ---- */
e("born with a size",
`function Machine(role,atGate,px,pz){
  this.role=role; this.dmg=0; this.crowd=0;`,
`function Machine(role,atGate,px,pz,size){
  this.role=role; this.dmg=0; this.crowd=0;
  /* ---- the one number it is born with ----
     Everything physical about this machine follows from it and nothing else
     is chosen. len is a length, cut is a depth so also a length, and cap is
     a volume so it goes as the cube. A machine made with no size given is
     the size the world was built at, which is what the first one in an empty
     pit gets. See patch29. */
  this.size=(size>0)?size:1;
  this.len=machLen*this.size;
  this.cut=CUT_MAX*this.size;`);

e("its bucket is a volume",
`  this.load=0; this.got=0; this.idle=0; this.cap=BUCKET/(CS*CS); this.state="go"; this.mode="scoop"; this.flash=0;`,
`  this.load=0; this.got=0; this.idle=0;
  this.cap=BUCKET*this.size*this.size*this.size/(CS*CS);
  this.state="go"; this.mode="scoop"; this.flash=0;`);

/* ---- and what it hands on ---- */
e("a child takes after its parents",
`  var pa=machines[best], pb=nearestTo(pa,best);
  var ang=rnd()*6.2832, r=(2.2+rnd()*3.4)*machLen;
  var px=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,pa.x+Math.cos(ang)*r));
  var pz=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,pa.z+Math.sin(ang)*r));
  machines.push(new Machine(inheritRole(pa,pb),false,px,pz));`,
`  var pa=machines[best], pb=nearestTo(pa,best);
  /* it appears a few of ITS PARENT'S lengths away, so a big machine's child
     starts further out - on the ground its parent has been working */
  var ang=rnd()*6.2832, r=(2.2+rnd()*3.4)*pa.len;
  var px=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,pa.x+Math.cos(ang)*r));
  var pz=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,pa.z+Math.sin(ang)*r));
  /* ---- what it inherits ----
     The average of its two parents, and then a few percent either way. Three
     draws added together rather than one, because one flat draw makes runts
     and giants as likely as ordinary children and that is not how anything
     is inherited; three gives the familiar bunched-up middle. The spread is
     two percent, which is slow: a hundred generations of pure chance would
     wander about twenty percent. Anything faster than that is the population
     being SELECTED rather than drifting, which is the whole point - there is
     no ceiling and no floor anywhere in this, so where the pit ends up is
     decided by which machines live long enough to breed and nothing else.

     There may be only one parent - the second is the nearest machine to the
     first, and early on there is nobody else in the pit. Then it takes after
     the one it has, which is what inheritRole already does with purpose. */
  var psz=pb?(pa.size+pb.size)*0.5:pa.size;
  var sz=psz*(1+(rnd()+rnd()+rnd()-1.5)*0.04);
  machines.push(new Machine(inheritRole(pa,pb),false,px,pz,sz));`);

/* ---- the free functions that were using the world's number for a machine ---- */
e("a pass belongs to the machine making it",
`function perPass(){ return BLADE_W*machLen*CUT_MAX*(PASS*machLen)/(CS*CS); }`,
`function perPass(len,cut){ return BLADE_W*len*cut*(PASS*len)/(CS*CS); }`);

e("and so does a dig cycle",
`function digCycle(cap){
  var v=perPass();
  var passes=(v>0)?Math.max(1,cap/v):1;
  return passes*(PASS*machLen/(DRAG*rateMul))+tipTime();
}`,
`function digCycle(cap,len,cut){
  var v=perPass(len,cut);
  var passes=(v>0)?Math.max(1,cap/v):1;
  /* the passes come out the same number whatever size the machine is - the
     bucket and the pass both go as the cube - but each one is longer, and
     DRAG is 0.60 m/s for everybody. Which is where the cost of being big
     comes from, and it was already written here. */
  return passes*(PASS*len/(DRAG*rateMul))+tipTime();
}`);

e("its teeth are its own",
`  _tw.x=a.x+machLen*(lx*ca-lz*sa);
  _tw.z=a.z+machLen*(lx*sa+lz*ca);`,
`  _tw.x=a.x+a.len*(lx*ca-lz*sa);
  _tw.z=a.z+a.len*(lx*sa+lz*ca);`);

e("so are its tracks",
`  var half=0.26*machLen;`,
`  var half=0.26*a.len;`);

/* ---- the trap ---- */
e("the grid is built from the longest machine in the pit",
`function buildGrid(){
  GCELL=Math.max(CS*0.5, 3.0*machLen);`,
`function buildGrid(){
  /* THE LONGEST machine, not the world's unit. Every machine checks only the
     nine cells around itself, so a cell smaller than the biggest machine's
     reach means that machine stops seeing the ones beside it - and being
     knocked about is the only thing that kills a machine here. Giants would
     have gone immortal without ever being strong. See patch29. */
  var _gml=machLen;
  for(var _gi=0;_gi<machines.length;_gi++) if(machines[_gi].len>_gml) _gml=machines[_gi].len;
  GCELL=Math.max(CS*0.5, 3.0*_gml);`);

let miss=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); miss++; } }
if(miss){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);

/* ---- the calls that now have to hand over the machine's own numbers ---- */
const CALLS=[
  ["digCycle(this.cap)","digCycle(this.cap,len,cut)",1],
  ["perPass()","perPass(len,cut)",1]
];
for(const [o,x,want] of CALLS){
  const c=s.split(o).length-1;
  if(c!==want){ console.error("CALL "+o+": found "+c+" (expected "+want+")"); process.exit(1); }
  s=s.split(o).join(x);
}

fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["a machine has a size",        back.includes("this.size=(size>0)?size:1;")],
  ["and a length of its own",     back.includes("this.len=machLen*this.size;")],
  ["and a cut of its own",        back.includes("this.cut=CUT_MAX*this.size;")],
  ["its bucket goes as the cube", back.includes("this.cap=BUCKET*this.size*this.size*this.size/(CS*CS);")],
  ["a child averages its parents",back.includes("var psz=pb?(pa.size+pb.size)*0.5:pa.size;")],
  ["with a few percent either way",back.includes("var sz=psz*(1+(rnd()+rnd()+rnd()-1.5)*0.04);")],
  ["born at its parent's scale",  back.includes("var ang=rnd()*6.2832, r=(2.2+rnd()*3.4)*pa.len;")],
  ["a pass takes a machine",      back.includes("function perPass(len,cut){")],
  ["a cycle takes a machine",     back.includes("function digCycle(cap,len,cut){")],
  ["teeth are the machine's own", back.includes("_tw.x=a.x+a.len*(lx*ca-lz*sa);")],
  ["tracks are too",              back.includes("var half=0.26*a.len;")],
  ["the grid uses the longest",   back.includes("GCELL=Math.max(CS*0.5, 3.0*_gml);")],
  ["the sim is not duplicated",   back.split("this.size=(size>0)?size:1;").length===2]
];
/* and the real check: no method of a machine may still be reading the world's
   numbers where it means its own */
for(const name of Object.keys(EXPECT)){
  const r=body(back,"Machine.prototype."+name+"=function(");
  const src=back.slice(r.open,r.end);
  const left=(src.match(/\bmachLen\b/g)||[]).length+(src.match(/\bCUT_MAX\b/g)||[]).length;
  checks.push([name+" reads its own size only", left===0]);
}
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
console.log("");
for(const [n,a,b] of report) console.log("      "+n+": machLen "+a+", CUT_MAX "+b+" -> this machine's");
process.exit(fail?1:0);
