#!/usr/bin/env python3
"""wheelfix.py <index.html> — the wheels at a real size, with tread that reads
as rubber. Proves every anchor before it writes anything."""
import sys, time, datetime

p = sys.argv[1]
s = open(p, encoding="utf-8").read()
orig = s
edits = []   # (name, old, new)

# 1. the constants. WR was a radius carrying a diameter's value: 0.215*machLen
#    is 1.29 m, which is a Loadall's tyre diameter, not its radius. AX stays
#    where it is - it is the frame height, and the body and the boom pivot
#    (a simulation constant) hang off it. The wheel centre now uses WR.
edits.append(("constants",
"var WR=.215, WW=.155, AX=.215;                 /* wheel radius, width, axle height */",
"var WR=.128, WW=.093, AX=.215;                 /* wheel radius, tyre width, frame height.\n"
"   WR was carrying a diameter: .215*machLen is 1.29 m, which is what a 460/70 R24\n"
"   measures across, not out from the middle. The wheel centre sits at WR, so the\n"
"   tyre stands on the ground; the frame stays at AX, because the body and the boom\n"
"   pivot are built off it and the pivot is a simulation constant. */"))

# 2. the axles drop to the new wheel centres and reach from hub to hub, so
#    there is something between the frame and the wheels rather than daylight.
edits.append(("axles",
"""  boxPart(.26,.10,.50,   -.38,AX,   0,  DK[0],DK[1],DK[2]),                 /* rear axle */
  boxPart(.26,.10,.50,    .38,AX,   0,  DK[0],DK[1],DK[2]),                 /* front axle */""",
"""  boxPart(.22,.150,.40,  -.34,WR+.012,0, DK[0],DK[1],DK[2]),                /* rear axle */
  boxPart(.22,.150,.40,   .34,WR+.012,0, DK[0],DK[1],DK[2]),                /* front axle */"""))

# 3. the rim and the hub were wider than the tyre they sit in.
edits.append(("rim and hub",
"""  surf(cylPart(WR*.55,WW*1.12,0,0,0,YEL[0],YEL[1],YEL[2],14),STEELY[0],STEELY[1]), /* rim */
  surf(cylPart(WR*.24,WW*1.20,0,0,0,STL[0],STL[1],STL[2],10),STEELY[0],STEELY[1])  /* hub */""",
"""  surf(cylPart(WR*.55,WW*0.92,0,0,0,YEL[0],YEL[1],YEL[2],14),STEELY[0],STEELY[1]), /* rim */
  surf(cylPart(WR*.24,WW*1.06,0,0,0,STL[0],STL[1],STL[2],10),STEELY[0],STEELY[1])  /* hub */"""))

# 4. the tread. Nine blocks a metre apart, each a third of a metre thick and
#    standing 9 cm proud, is a cog. Sixteen, 30 cm apart, standing 4 cm proud,
#    is a tyre.
edits.append(("tread",
"""  for(var t=0;t<9;t++){                                                    /* tread blocks */
    var a=t/9*6.2832;
    WHEEL.push(surf(boxPart(.055,.045,WW*1.04, Math.cos(a)*WR*.94, Math.sin(a)*WR*.94, 0,
                            BLK[0],BLK[1],BLK[2],a),RUBBER[0],RUBBER[1]));
  }""",
"""  for(var t=0;t<16;t++){                                                   /* tread blocks */
    var a=t/16*6.2832;
    WHEEL.push(surf(boxPart(.018,.030,WW*1.02, Math.cos(a)*WR*.99, Math.sin(a)*WR*.99, 0,
                            BLK[0],BLK[1],BLK[2],a),RUBBER[0],RUBBER[1]));
  }"""))

# 5. the wheels hang at WR, not AX, and the wheelbase comes in with them.
edits.append(("wheel placement",
"""      var wx=(w<2)?0.38:-0.38, wz=(w&1)?0.245:-0.245;
      var mW=joint(_mB,mU,wx,AX,wz,-wPh[i],(w<2)?wSt[i]:0);""",
"""      var wx=(w<2)?0.34:-0.34, wz=(w&1)?0.245:-0.245;
      var mW=joint(_mB,mU,wx,WR,wz,-wPh[i],(w<2)?wSt[i]:0);"""))

# 6. the build stamp. The value said 5 September; the comment beside it said
#    the 7th, and the comment is what got read.
old_built = "var BUILT=1788622677212  /* 2026-09-07 15:37 UTC */;                 /* stamped in when this file was made */"
now_ms = int(time.time() * 1000)
now_txt = datetime.datetime.utcfromtimestamp(now_ms / 1000).strftime("%Y-%m-%d %H:%M")
edits.append(("build stamp", old_built,
"var BUILT=%d  /* %s UTC */;                 /* stamped in when this file was made */" % (now_ms, now_txt)))

# --- prove every anchor before writing anything ---
bad = []
for name, old, new in edits:
    n = s.count(old)
    if n != 1:
        bad.append("%s: found %d" % (name, n))
if bad:
    print("ANCHORS FAILED:\n  " + "\n  ".join(bad))
    sys.exit(1)

for name, old, new in edits:
    s = s.replace(old, new)

open(p, "w", encoding="utf-8").write(s)

# --- and check afterwards ---
back = open(p, encoding="utf-8").read()
for name, old, new in edits:
    if back.count(new) != 1 or back.count(old) != 0:
        print("CHECK FAILED:", name)
        sys.exit(1)
print("wheelfix applied to %s: %d edits, %d -> %d bytes, BUILT %s UTC"
      % (p, len(edits), len(orig), len(back), now_txt))
