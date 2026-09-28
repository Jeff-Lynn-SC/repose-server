/* patch31 - room, and who gives way.
 *
 * This is where being big starts to cost something, and none of it is
 * imposed. Three things follow from one fact - that a machine has a size and
 * therefore a mass - and the piece can then be left alone to find out what
 * that does.
 *
 * HOW MUCH ROOM TWO MACHINES NEED is the sum of their half-widths, which for
 * two bodies of the same shape is the average of their lengths. It was
 * 1.30*machLen, one number for everybody. Two big machines now need more
 * room from each other than two small ones do, and a big and a small need
 * what is between.
 *
 * HOW FAR EACH NEEDS TO SEE is its own length: a big machine notices more of
 * what is around it, so its sense of being hemmed in is its own, and it goes
 * further to find work when it is.
 *
 * WHO GIVES WAY is mass, which goes as the cube of the length. Each machine
 * runs this for itself and moves only itself, so the share is the OTHER
 * one's mass over the two together: a small machine meeting a big one is
 * shoved almost the whole way, and a big one meeting a small one barely
 * notices. Written as 2*share so that two equal machines get exactly what
 * they got before - one each, the sum unchanged - and the asymmetry is the
 * only thing added. Being knocked about is scaled the same way, because the
 * shove IS the impact: what moves you is what damages you.
 *
 * WHICH WAY THIS GOES, I do not know, and that is the point of it. A big
 * machine needs more room, so it collides more often; but it takes less of
 * each collision, because it is heavier. More knocks, each cheaper. Whether
 * the pit fills with giants or grinds them down is not something anybody has
 * decided here - it now has to be found out by running it.
 *
 * Remember that being knocked about is the ONLY thing that kills a machine.
 * This is the whole of natural selection in the piece.
 *
 * Usage: node patch31.js <index.html>     (after patch29, patch30)
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch31.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("it sees as far as it is long",
`  var R=2.9*machLen, R2=R*R, minS=1.30*machLen;`,
`  /* as far as THIS machine is long, not the world's unit: a big machine is
     aware of more, and is hemmed in sooner. See patch31. */
  var R=2.9*a.len, R2=R*R;
  /* how heavy it is. Same shape, so mass goes as the cube of the length. */
  var ma=a.len*a.len*a.len;`);

e("room, and who gives way",
`      var d=Math.sqrt(d2), w=1-d/R, ux=dx/d, uz=dz/d;`,
`      /* the room these two need is the sum of their half-widths, which for
         one shape at two sizes is the average of their lengths */
      var minS=1.30*(a.len+b.len)*0.5;
      /* and who moves is mass: the other one's share of the two. Two equal
         machines get 1.0 each, exactly what everybody got before. */
      var mb=b.len*b.len*b.len;
      var give=2*mb/(ma+mb);
      var d=Math.sqrt(d2), w=1-d/R, ux=dx/d, uz=dz/d;`);

e("shoved, and hurt, in proportion",
`      if(d<minS){
        var push=(minS-d)*0.75; a.x+=ux*push; a.z+=uz*push;
        _avKnock+=(minS-d)/minS;          /* what it costs to be in the way */
      }`,
`      if(d<minS){
        /* the total the two of them give each other is unchanged - each
           runs this for itself and the two shares add to two - but a small
           machine meeting a big one is moved nearly all of it */
        var push=(minS-d)*0.75*give; a.x+=ux*push; a.z+=uz*push;
        /* and the shove is the impact: what moves you is what damages you */
        _avKnock+=(minS-d)/minS*give;     /* what it costs to be in the way */
      }`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["it sees its own length",    back.includes("var R=2.9*a.len, R2=R*R;")],
  ["its mass is its cube",      back.includes("var ma=a.len*a.len*a.len;")],
  ["room is the average",       back.includes("var minS=1.30*(a.len+b.len)*0.5;")],
  ["and the other's mass too",  back.includes("var mb=b.len*b.len*b.len;")],
  ["who gives way is mass",     back.includes("var give=2*mb/(ma+mb);")],
  ["the shove is shared",       back.includes("var push=(minS-d)*0.75*give;")],
  ["and so is the damage",      back.includes("_avKnock+=(minS-d)/minS*give;")],
  ["nothing left on one number",!back.includes("minS=1.30*machLen")],
  ["avoid no longer reads the world", !/function avoid\(a,self\)\{[\s\S]{0,2200}?machLen/.test(back)],
  ["the sim is not duplicated", back.split("var give=2*mb/(ma+mb);").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
