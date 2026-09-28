/* patch32 - succeeding at your purpose is what gets your children born.
 *
 * Jeff: "for a raiser, height is its measure of success."
 *
 * Until now it was not a measure of anything. The pit chose parents by
 * sampling six machines and keeping the least battered and least hemmed-in.
 * Nothing about what a machine had actually DONE entered into it. A raiser
 * standing on the highest hill in the pit had exactly the same chance of a
 * child as one standing in a four-metre hole it had dug itself - and that
 * hole is not hypothetical: measured over four worlds, a small raiser ends
 * the day an average of a metre BELOW the ground around it.
 *
 * So the whole apparatus of patch29 - a size, inherited, that makes a large
 * and real difference to what a machine achieves - was hanging in the air,
 * because achievement bought nothing. This is the line that connects them.
 *
 * WHAT COUNTS AS DOING WELL. The ground the machine is answerable for,
 * measured against the average of the pit, in the direction its purpose
 * wants it moved.
 *
 *   A raiser is answerable for its summit, and wants it high. Its standing
 *   is how far that summit stands above the pit's average. Jeff's sentence,
 *   unchanged.
 *
 *   A filler is answerable for the hollow it is filling, and wants it gone.
 *   Its standing is how far that hollow still lies below the average -
 *   negative until it is filled, nought when it is. It is judged on the hole
 *   in front of it until it has dealt with the hole in front of it.
 *
 * AND EACH IS JUDGED AGAINST OTHERS DOING THE SAME JOB. A raiser's standing
 * can be positive and a filler's never can, so comparing them directly would
 * simply mean raisers out-bred fillers everywhere and for ever - and the
 * balance of the two purposes is the era's to decide, not this function's.
 * So a machine is set against the average standing of its own role. This is
 * not a nicety: without it, this patch would quietly delete one half of the
 * piece.
 *
 * HOW MUCH IT IS WORTH is not a number anybody chose. Standing is a length,
 * and the length in this world is a machine. A machine standing one machine's
 * length proud of the average counts for 1, against a damage figure that runs
 * 0 to 1 over a machine's whole life. So a hill a machine tall is worth about
 * as much as being newly built rather than finished - which sounds like a lot,
 * and is meant to. Jeff asked for advantage that compounds.
 *
 * WHAT THIS PROBABLY DOES. Being born big is worth about a metre of extra
 * height at a raiser's summit, so this should push the pit towards bigger
 * machines, and it may not stop. That is the analogy doing what analogies of
 * this kind do, and it was asked for with that understood. It has to be run
 * and watched rather than predicted.
 *
 * Usage: node patch32.js <index.html>     (after patch29, 30, 31)
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch32.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("what doing well means",
`function beget(){`,
`/* ---- how well a machine is doing at the thing it exists for ----
   The ground it is answerable for, against the pit's average, in the
   direction its purpose wants it moved. See patch32. */
function standing(m){
  if(m.role===RAISE) return hAt(m.sx,m.sz)-meanH;
  /* a filler is answerable for the hollow it is filling: below the average
     until it has filled it, and nought once it has. Filling past the average
     is not better, it is just somebody else's job. */
  var hx=(m.hx===undefined)?m.x:m.hx, hz=(m.hz===undefined)?m.z:m.hz;
  var d=hAt(hx,hz)-meanH;
  return d<0?d:0;
}
function beget(){`);

e("and success is what breeds",
`  /* the parent is one that is not being knocked about: the frontier breeds */
  var best=-1, bs=1e9;
  for(var k=0;k<6;k++){
    var i=(rnd()*machines.length)|0, m=machines[i];
    var sc=m.dmg+m.crowd*0.6+rnd()*0.15;
    if(sc<bs){ bs=sc; best=i; }
  }`,
`  /* The parent is one that is not being knocked about, is not hemmed in, and
     HAS GOT SOMETHING DONE. The last of those is new: see patch32.

     Each machine is set against the average standing of machines doing its
     own job, because a raiser's standing can be positive and a filler's
     cannot, and left unnormalised this would simply breed fillers out of the
     pit. The weight is one machine length, which is the length this world is
     built in: a hill a machine tall counts for as much as the difference
     between a new machine and a finished one. */
  var sumR=0, nR=0, sumF=0, nF=0, q;
  for(q=0;q<machines.length;q++){
    var mq=machines[q], st=standing(mq);
    if(mq.role===RAISE){ sumR+=st; nR++; } else { sumF+=st; nF++; }
  }
  var muR=nR?sumR/nR:0, muF=nF?sumF/nF:0;
  var best=-1, bs=1e9;
  for(var k=0;k<6;k++){
    var i=(rnd()*machines.length)|0, m=machines[i];
    var did=(standing(m)-(m.role===RAISE?muR:muF))/machLen;
    var sc=m.dmg+m.crowd*0.6+rnd()*0.15-did;
    if(sc<bs){ bs=sc; best=i; }
  }`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["doing well is defined",      back.includes("function standing(m){")],
  ["a raiser is its summit",     back.includes("if(m.role===RAISE) return hAt(m.sx,m.sz)-meanH;")],
  ["a filler is its hollow",     back.includes("return d<0?d:0;")],
  ["judged against its own job", back.includes("var muR=nR?sumR/nR:0, muF=nF?sumF/nF:0;")],
  ["and it counts in breeding",  back.includes("var sc=m.dmg+m.crowd*0.6+rnd()*0.15-did;")],
  ["weighed in machine lengths", back.includes("/machLen;")],
  ["the old rule is gone",       !back.includes("var sc=m.dmg+m.crowd*0.6+rnd()*0.15;")],
  ["the sim is not duplicated",  back.split("function standing(m){").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
