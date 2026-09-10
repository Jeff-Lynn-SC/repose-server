#!/usr/bin/env python3
"""fillfix.py <sim.node.js> — a filler is for hollows, so hollows are what it
weighs, and it does not fill a hole with its own rim. Proves every anchor
before it writes anything."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()

old = """    var r2=(1.2+rnd()*rnd()*10)*machLen, a2=rnd()*6.2832;
    var hx=ux+Math.cos(a2)*r2, hz=uz+Math.sin(a2)*r2;"""
new = """    /* Far enough away to be different ground. Relief is measured against
       what stands 38 m out, so two places nearer than that to each other
       share their surroundings and moving sand between them barely changes
       either one's relief. This used to start at seven metres and lean
       hard towards the short end, so a machine took the rim of a hollow and
       put it in the middle - which widens a hole rather than filling it,
       and is why a quarter of everything moved came back out of a hollow.
       It is not a rule about slopes or distances; it is the width of the
       measure the machine is already using. */
    var r2=(6.8+rnd()*rnd()*12)*machLen, a2=rnd()*6.2832;
    var hx=ux+Math.cos(a2)*r2, hz=uz+Math.sin(a2)*r2;"""

old2 = """    var gain=Math.min(this.cap,(reliefAt(ux,uz)-reliefAt(hx,hz))*0.5);
    if(gain<=0) continue;               /* neither a hump taken down nor a hollow filled */"""
new2 = """    /* WHAT A FILLER IS ACTUALLY FOR.

       This weighed a pair by how much unevenness one bucket closes, capped
       at one bucket - which is honest, because one bucket cannot close more
       than one bucket's worth. It is also why the machine stopped caring. A
       hollow two metres deep and a dish a hand deep both take one bucket, so
       both scored the same; and with the score saturated the only thing left
       to choose on was how quickly it could get there. So it took the
       nearest faint dip, every time, and never had a reason to drive to a
       real hole.

       Measured, eight machines, twenty minutes: they moved 1,596 m3 and put
       16% of it into hollows while taking 15% back out of them. The net gain
       to every hollow in the pit was seven cubic metres. It was not shaving
       humps either - 2% came off high ground. It was shuffling flat sand.

       So the far end has to be a hollow, or filling it is not the purpose
       and it does not score at all; and how deep that hollow is multiplies
       what the bucket closes, so a two-metre hole is worth ten of a
       fifth-of-a-metre dish and is worth driving to.

       Tried instead of depth: how much unevenness lies between the two ends.
       It is prettier, because it makes a hump the best place to take from
       without a rule saying so, and it measured worse than doing nothing -
       the net into hollows went to minus eight. It rewards a big difference,
       and the biggest differences going are across the rim of a hole. */
    var rh=reliefAt(hx,hz);
    if(rh>=0) continue;                 /* not a hollow: not what a filler is for */
    var closed=Math.min(this.cap,(reliefAt(ux,uz)-rh)*0.5);
    if(closed<=0) continue;             /* it would not close anything */
    var gain=closed*(-rh);"""

old3 = """  return (reliefAt(this.ux,this.uz)-reliefAt(this.hx,this.hz))>0;"""
new3 = """  var rh=reliefAt(this.hx,this.hz);
  return rh<0 && (reliefAt(this.ux,this.uz)-rh)>0;"""

for name, o in (("reach", old), ("gain", old2), ("jobPays", old3)):
    if s.count(o) != 1:
        print("ANCHOR FAILED %s: found %d" % (name, s.count(o))); sys.exit(1)

s = s.replace(old, new).replace(old2, new2).replace(old3, new3)
open(p, "w", encoding="utf-8").write(s)
b = open(p, encoding="utf-8").read()
for name, n in (("reach", new), ("gain", new2), ("jobPays", new3)):
    if b.count(n) != 1:
        print("CHECK FAILED", name); sys.exit(1)
print("fillfix applied to %s: %d chars" % (p, len(b)))
