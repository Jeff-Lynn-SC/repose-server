#!/usr/bin/env python3
"""pourfix.py — the sand has to be seen to leave.

  pourfix.py sim  sim.node.js     the curtain: as many grains as sand leaving
  pourfix.py page index.html      the heap slides to the cutting edge

Proves every anchor before it writes anything.
"""
import sys

which, p = sys.argv[1], sys.argv[2]
s = open(p, encoding="utf-8").read()

if which == "sim":
    old = """      if(this.load>keep){
        this.load-=giveTo(t.x,t.z,0.55*CS,this.load-keep);
        this.tipping=1;
        /* A curtain of grains off the cutting edge, not a puff at the
           bucket. They come out across the whole width of the edge, fall
           fast, and are gone before they can bloom into anything cloudlike
           - which is the difference between sand pouring and steam. */
        if(rnd()<80*dt*dustGate){
          var fy=t.y*machLen+here;
          var across=(rnd()-0.5)*0.52*machLen;
          puff(t.x-Math.sin(this.ang)*across, fy, t.z+Math.cos(this.ang)*across,
               (rnd()-0.5)*0.04*CS, -(0.95+rnd()*0.45)*CS, (rnd()-0.5)*0.04*CS,
               0.030*machLen, 0.095*machLen, 0.45+rnd()*0.35, 0.46);
        }
      } else this.tipping=0;"""
    new = """      if(this.load>keep){
        var shed=this.load-keep;                    /* cubic metres leaving now */
        this.load-=giveTo(t.x,t.z,0.55*CS,shed);
        this.tipping=1;
        /* A curtain of grains off the cutting edge, not a puff at the
           bucket. They come out across the whole width of the edge, fall
           fast, and are gone before they can bloom into anything cloudlike
           - which is the difference between sand pouring and steam.

           How many is how much sand is leaving, not one a step. One a step
           is a rate set by the step rather than by the sand: it drew the
           same thin scatter whether a full bucket was emptying or a last
           handful was, and it meant three and a half cubic metres crossed
           the gap between the bucket and the ground with almost nothing
           drawn in between. That is why a bucket appeared to empty in one
           lump. A whole bucket now sheds about a hundred and fifty, most
           of them in the first half, because that is where most of the
           sand goes. */
        var rate=shed/this.cap*150*dustGate, nG=Math.floor(rate);
        if(nG>6) nG=6;
        if(nG<1 && rnd()<rate) nG=1;
        for(var gI=0;gI<nG;gI++){
          var fy=t.y*machLen+here;
          var across=(rnd()-0.5)*0.52*machLen;
          puff(t.x-Math.sin(this.ang)*across, fy, t.z+Math.cos(this.ang)*across,
               (rnd()-0.5)*0.04*CS, -(1.10+rnd()*0.50)*CS, (rnd()-0.5)*0.04*CS,
               0.022*machLen, 0.070*machLen, 0.34+rnd()*0.24, 0.55);
        }
      } else this.tipping=0;"""

elif which == "page":
    old = """    var sv=k>0.02?(0.55+0.45*k):0.0001;
    _mC.makeScale(sv,k>0.02?k:0.0001,sv);
    RIG.load.setMatrixAt(i,_mA.multiply(_mC));"""
    new = """    /* As a bucket empties, the sand left in it slides down the floor towards
       the cutting edge and goes over it. Scaling alone shrank the heap towards
       the bucket's own origin, which is the back plate, so the last of it
       retreated away from the edge it was supposed to be leaving by - and a
       bucket looked as though it emptied by evaporation. */
    var sv=k>0.02?(0.55+0.45*k):0.0001;
    var slide=1-lf; if(slide<0) slide=0; else if(slide>1) slide=1;
    _mC.makeScale(sv,k>0.02?k:0.0001,sv);
    _mC.setPosition(0.150*slide,-0.055*slide,0);
    RIG.load.setMatrixAt(i,_mA.multiply(_mC));"""
else:
    print("sim or page"); sys.exit(1)

n = s.count(old)
if n != 1:
    print("ANCHOR FAILED: found %d" % n); sys.exit(1)
open(p, "w", encoding="utf-8").write(s.replace(old, new))
b = open(p, encoding="utf-8").read()
if b.count(new) != 1:
    print("CHECK FAILED"); sys.exit(1)
print("pourfix %s applied to %s: %d chars" % (which, p, len(b)))
