#!/usr/bin/env python3
"""cabcorrect.py <HANDOVER.md> — Jeff looked at the live page and the cab view
is good. The handover said it was wrong, on the strength of a headless
screenshot. Correcting that, and recording why the screenshot lied. Proves
every anchor before it writes anything."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()
edits = []

edits.append(("the pointer", """the machine is about to work. It has a button as of 12 September — and the
view itself is wrong; both are below.""",
"""the machine is about to work. It has a button as of 12 September, and Jeff
looked at it on the live page and said it is good."""))

edits.append(("the finding that was not one", """**And the view it reaches is wrong.** The eye is placed by three typed numbers
— 0.31 machine-lengths forward, 0.62 up, 0.155 to the cab side — and the boom
swings through that spot. Headless screenshots on 12 September: at rest you
are outside the windscreen with the boom filling the right of the frame, which
is right; with the boom up you are inside the bodywork and the frame is a flat
yellow wall. `branches/cabshot.js` takes the pictures. The fix is to put the
eye where the machine's own parts say the seat is — cab floor at `y=.400`,
roof at `.760`, glass at `.602`, front post at `x=.275`, seat at
`(.02,.500,-.150)` — rather than to adjust the three numbers until it looks
better.""",
"""**And a warning about the fault it nearly acquired.** Headless screenshots on
12 September showed the eye buried in the machine's own bodywork, a flat
yellow wall filling the frame, and it looked like a plain fault; it was
written up here as one. Jeff then looked at the live page: *"the cab view is
good."*

The harness was the fault, not the shot. **Software GL renders this page at
about one frame a second, and at `?dev` the local worker runs about seventy
times real time.** So the drawn machine teleports between frames while the
camera eases toward it at `dt*6.0` — the picture catches the camera where the
machine used to be, which is inside where it now is. `branches/cabshot.js`
takes those pictures and cannot be trusted for anything that moves. Stop the
world before aiming, as the top of this file says, and which I did not.

Twice in a week now a confident wrong section has gone into this file off a
short run. **A screenshot of a moving thing at one frame a second is not
evidence. Ask Jeff to look before writing a fault down.**

What is still true, and is small: the eye is placed by three typed numbers —
0.31 machine-lengths forward, 0.62 up, 0.155 to the cab side — rather than
derived from the machine's own parts (cab floor `y=.400`, roof `.760`, glass
`.602`, front post `x=.275`, seat `(.02,.500,-.150)`). Nobody has complained
about where it sits. Leave it alone until the body is rebuilt, and derive it
then."""))

edits.append(("the look list", """* **The cab view is inside the bodywork.** Above.
""", ""))

bad = ["%s: found %d" % (n, s.count(o)) for n, o, x in edits if s.count(o) != 1]
if bad:
    print("ANCHORS FAILED:\n  " + "\n  ".join(bad)); sys.exit(1)
for n, o, x in edits:
    s = s.replace(o, x)
open(p, "w", encoding="utf-8").write(s)
b = open(p, encoding="utf-8").read()
for n, o, x in edits:
    if x and b.count(x) != 1:
        print("CHECK FAILED:", n); sys.exit(1)
if "the view itself is wrong" in b or "The cab view is inside the bodywork" in b:
    print("CHECK FAILED: the old claim is still in there"); sys.exit(1)
print("cabcorrect applied to %s: %d chars" % (p, len(b)))
