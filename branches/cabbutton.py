#!/usr/bin/env python3
"""cabbutton.py <index.html> — the driver's seat, from the button as well as
the URL. Renderer only: the simulation is not touched. Proves every anchor
before it writes anything."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()
edits = []

edits.append(("the cycle itself", """function nextMachine(){""",
"""/* THE CAMERA BUTTON.

   It used to be a switch with two positions: the director, or your own hands.
   The driver's seat has existed since 5 September and could only be reached by
   typing `&shot=cab` on the end of the URL, which is no use at all to somebody
   holding a phone - and the driver's seat is the only place in the piece where
   you see the work from inside it rather than watching it.

   So it is a three-stop cycle now - director, cab, free - and the button says
   which stop it is on rather than what it might do next, because the camera
   can also be taken off the director by dragging the picture, and a label that
   guessed would be lying half the time. It reads the state every frame and
   only touches the page when the answer changes. */
var camBtn=null, camWas="";
function camState(){ return man.on?"free":(forceType===SHOT.CAB?"cab":"camera"); }
function camLabel(){
  var t=camState();
  if(t===camWas) return;
  if(!camBtn) camBtn=document.querySelector('#pad button[data-k="space"]');
  if(!camBtn) return;
  camWas=t; camBtn.textContent=t;
}
function cycleCamera(){
  if(man.on){ man.on=false; forceType=-1; shotEnd=0; }   /* hand it back */
  else if(forceType===SHOT.CAB){ grabCamera(); }         /* out of the cab, into your hands */
  else { forceType=SHOT.CAB; shotEnd=0; }                /* get in, and cut to it now */
  camLabel();
}
function nextMachine(){"""))

edits.append(("the button", """      if(k==="space"){ man.on=!man.on; if(man.on) grabCamera(); }""",
"""      if(k==="space"){ cycleCamera(); }"""))

edits.append(("the key", """  if(k===" "){ man.on=!man.on; if(man.on) manualOn(popX,BASE,popZ,Math.max(popR*2.5,60*machLen)); return; }""",
"""  if(k===" "){ cycleCamera(); return; }"""))

edits.append(("the label follows", """  driveCamera(now,dt);""",
"""  driveCamera(now,dt);
  camLabel();"""))

# Measured: tap the camera button, then press the space bar, and the camera
# moved two stops. A button keeps the focus after it is tapped, and a focused
# button is worked by the space bar as well - so the browser pressed it again
# underneath the key handler. It has always been true of every button on the
# pad; it only became visible when the button had three stops instead of two.
# Letting go of the focus once the tap has been dealt with is the whole fix.
edits.append(("let go of the button", """      var k=this.getAttribute("data-k");""",
"""      var k=this.getAttribute("data-k");
      this.blur();"""))

bad = ["%s: found %d" % (n, s.count(o)) for n, o, x in edits if s.count(o) != 1]
if bad:
    print("ANCHORS FAILED:\n  " + "\n  ".join(bad)); sys.exit(1)
for n, o, x in edits:
    s = s.replace(o, x)
open(p, "w", encoding="utf-8").write(s)
b = open(p, encoding="utf-8").read()
for n, o, x in edits:
    if b.count(x) != 1:
        print("CHECK FAILED:", n); sys.exit(1)
print("cabbutton applied to %s: %d edits, %d chars" % (p, len(edits), len(b)))
