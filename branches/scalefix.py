#!/usr/bin/env python3
"""scalefix.py <sim.node.js> — the sand says how big a hollow is, not a
constant. Proves every anchor before it writes anything."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()

OLD_RELIEF = """function reliefAt(x,z){
  var r=38, s=0, n=0;                  /* metres, about as far as a bucket is worth carrying */
  for(var a=0;a<8;a++){
    var th=a*0.7853982, px=x+Math.cos(th)*r, pz=z+Math.sin(th)*r;
    if(px<-HALF||px>HALF||pz<-HALF||pz>HALF) continue;
    s+=hAt(px,pz); n++;
  }
  return n?hAt(x,z)-s/n:0;
}"""

NEW_RELIEF = """/* HOW BIG IS A HOLLOW.

   This averaged the ground at a fixed 38 metres, and that number was the last
   designer's decision left in the reckoning. It set the scale at which ground
   counts as low, so every machine's idea of a hollow was something somebody
   typed rather than anything about the sand - and it meant the pit could grow
   shapes larger than its machines were able to see.

   A hollow is ground lying below what surrounds it. Where "around" ends is
   not a distance to be chosen: it is where the ground stops climbing as you
   walk outward. So walk out, ring by ring, while the drop keeps deepening,
   and stop at the first ring where it does not. That distance is the size of
   the landform itself, and it grows as the pit's shapes grow.

   Two things in here are how you look rather than what you decide: eight
   bearings, and rings that grow by three fifths each time. The smallest ring
   is the machine's own length, because nothing shorter than a machine is a
   piece of ground to it. Everything that matters - how deep, and how wide -
   comes from the sand.

   `_rel.r` is how far out the answer was found. It is the only honest
   statement of how far away *different* ground is, and the filler uses it so
   that it cannot fill a hole with that hole's own rim. */
var _rel={d:0,r:0};
var _relC=[], _relS=[];
for(var _ra=0;_ra<8;_ra++){ _relC.push(Math.cos(_ra*0.7853982)); _relS.push(Math.sin(_ra*0.7853982)); }
function reliefScan(x,z){
  var here=hAt(x,z), bd=0, br=machLen, r, a, d;
  for(r=machLen;r<HALF;r*=1.6){
    var sum=0, n=0;
    for(a=0;a<8;a++){
      var px=x+_relC[a]*r, pz=z+_relS[a]*r;
      if(px<-HALF||px>HALF||pz<-HALF||pz>HALF) continue;
      sum+=hAt(px,pz); n++;
    }
    if(!n) break;
    d=here-sum/n;
    if((d<0?-d:d)<=(bd<0?-bd:bd)) break;   /* stopped deepening: the far side of it */
    bd=d; br=r;
  }
  _rel.d=bd; _rel.r=br;
  return _rel;
}
function reliefAt(x,z){ return reliefScan(x,z).d; }"""

if s.count(OLD_RELIEF) != 1:
    print("ANCHOR FAILED relief: %d" % s.count(OLD_RELIEF)); sys.exit(1)

i = s.find("    var R=(rnd()<0.03)?frontier():(3+this.crowd*12)*machLen*(0.5+rnd()*rnd()*6);")
j = s.find("    if(sc>best){ best=sc; bhx=hx; bhz=hz; bux=ux; buz=uz; bpush=rk.push; }")
if i < 0 or j < 0:
    print("ANCHOR FAILED search block", i, j); sys.exit(1)
j += len("    if(sc>best){ best=sc; bhx=hx; bhz=hz; bux=ux; buz=uz; bpush=rk.push; }")
OLD_BLOCK = s[i:j]
if s.count(OLD_BLOCK) != 1:
    print("ANCHOR FAILED block unique: %d" % s.count(OLD_BLOCK)); sys.exit(1)

NEW_BLOCK = """    /* THE HOLLOW FIRST.

       This looked for sand first and then for somewhere lower to put it,
       which is a machine looking for a slope rather than for a hole. The
       hollow is the purpose, so the hollow is what it looks for; and only
       the hollow can say how far away different ground is.

       There was a rule here once that a filler would not take sand from
       ground already below the datum. It was a fence rather than a purpose
       and it is long deleted: ground lying below what surrounds it is
       exactly what a hollow is, so relief already refuses what the rule
       refused. */
    var R=(rnd()<0.03)?frontier():(3+this.crowd*12)*machLen*(0.5+rnd()*rnd()*6);
    var fillx=this.x+(rnd()*2-1)*R, fillz=this.z+(rnd()*2-1)*R;
    if(fillx<-lim||fillx>lim||fillz<-lim||fillz>lim) continue;
    var iF=cellAt(fillx,fillz); if(iF<0) continue;
    var rs=reliefScan(fillx,fillz), rFill=rs.d, span=rs.r;
    if(rFill>=0) continue;              /* not a hollow: not what a filler is for */

    /* and the sand comes from outside it, at a distance the hollow itself
       gave. Nearer than that and the ground being dug is part of the same
       hollow, so taking its rim and putting it in the middle widens a hole
       rather than filling one - which is why a quarter of everything this
       machine moved used to come back out of a hollow. */
    var r2=span*(1.0+rnd()*rnd()*1.6), a2=rnd()*6.2832;
    var digx=fillx+Math.cos(a2)*r2, digz=fillz+Math.sin(a2)*r2;
    if(digx<-lim||digx>lim||digz<-lim||digz>lim) continue;
    var iD=cellAt(digx,digz); if(iD<0) continue;
    if(h[iD]-h[iF]<=0) continue;        /* that way is uphill: not levelling */

    /* WHAT A FILLER IS ACTUALLY FOR.

       A pair used to be weighed by how much unevenness one bucket closes,
       capped at one bucket - honest, because one bucket cannot close more
       than one bucket's worth, and exactly why the machine stopped caring.
       A hollow two metres deep and a dish a hand deep both take one bucket,
       so both scored the same; and with the score saturated the only thing
       left to choose on was how quickly it could get there. So it took the
       nearest faint dip, every time, and never had a reason to drive to a
       real hole.

       Measured, eight machines, twenty minutes: 1,596 m3 moved, 16% put into
       hollows and 15% taken back out of them. The net gain to every hollow
       in the pit was seven cubic metres. It was not shaving humps either -
       2% came off high ground. It was shuffling flat sand about.

       So how deep the hollow is multiplies what the bucket closes, and a
       two-metre hole is worth ten of a fifth-of-a-metre dish, which is worth
       driving to. Tried instead: weighting by how much unevenness lies
       between the two ends. Prettier, because it makes a hump the best place
       to dig without a rule saying so, and it measured worse than doing
       nothing - net into hollows went to minus eight. It rewards a big
       difference, and the biggest differences in a pit are across the rim of
       a hole. */
    var closed=Math.min(this.cap,(reliefAt(digx,digz)-rFill)*0.5);
    if(closed<=0) continue;             /* it would not close anything */
    var gain=closed*(-rFill);
    var rk=this.reckon(digx,digz,fillx,fillz,gain);
    var sc=rk.rate-densAt(digx,digz)*this.crowd*0.0003*CS;   /* and not shoulder to shoulder */
    if(sc>best){ best=sc; bhx=fillx; bhz=fillz; bux=digx; buz=digz; bpush=rk.push; }"""

s = s.replace(OLD_RELIEF, NEW_RELIEF).replace(OLD_BLOCK, NEW_BLOCK)
open(p, "w", encoding="utf-8").write(s)
b = open(p, encoding="utf-8").read()
for name, txt in (("relief", NEW_RELIEF), ("block", NEW_BLOCK)):
    if b.count(txt) != 1:
        print("CHECK FAILED:", name); sys.exit(1)
if "var r=38" in b:
    print("CHECK FAILED: 38 still there"); sys.exit(1)
print("scalefix applied to %s: %d chars" % (p, len(b)))
