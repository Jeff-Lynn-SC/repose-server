#!/usr/bin/env python3
"""handover12.py <HANDOVER.md> — brings the handover up to 12 September and
turns it round to face the next job: the look. Proves every anchor before it
writes anything."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()
edits = []

edits.append(("the date", """Paste this at the start of a new session. Written 6 September 2026, replacing
the version of 5 September.""",
"""Read this at the start of a new session — it is in the Repose folder and you
can read it yourself. Written 12 September 2026, replacing the version of
6 September.

**Where Jeff has got to.** On 12 September he said the functional side is
where he wants it, and that the next two things are *the glitchy video* and
*making the whole thing look real*. The brief for that is under "What comes
next: the look". Everything before it is what the piece already is."""))

edits.append(("the button that did not exist", """`SHOT.CAB`, in the director's bag like any other shot, or `?shot=cab`. It sits
where the operator sits, just outside the windscreen because the seat is inside
a box whose inside faces are not drawn, and looks along the boom at the ground
the machine is about to work. There is no button for it yet.""",
"""`SHOT.CAB`, in the director's bag like any other shot, or `?shot=cab`. It sits
where the operator sits, just outside the windscreen because the seat is inside
a box whose inside faces are not drawn, and looks along the boom at the ground
the machine is about to work. It has a button as of 12 September — and the
view itself is wrong; both are below."""))

NEXT = """## The wind made real — 12 September

Jeff had never asked for wind. He found it in the figures and asked how it was
operating, then: *"The wind will erase the tracks and I want that done as the
real wind would erase real tracks. Diggers traversing the same sand will
eventually compress that sand. And you have the wind as a constant — can we
make it variable across time and geography?"*

What it was: one strength for the whole pit, taken from deep time, moving sand
only off cells that already stood above their neighbours and scrubbing `wear`
only on those same cells. So **a track on flat ground was never touched by
wind at all**, and the lee of a hill blew as hard as its crest.

What it is now, and every part of it is how sand actually moves:

* **A threshold.** Below a certain wind nothing lifts; above it the amount
  carried climbs with the cube of the excess — Bagnold. A quiet week leaves
  the ground alone entirely and a gale rearranges it, instead of everything
  creeping all the time. `WIND_T`.
* **Packed sand resists.** Ground that has been driven over needs a harder
  wind to lift it, so a used track outlives the loose sand beside it. That is
  why old desert tracks last for decades and sometimes end up standing proud.
  `WIND_PACK`. History, written by the wind refusing to take it.
* **The wind has a shape, and the shape is the ground.** It runs quicker up a
  windward face and over a crest and slackens in the lee and in hollows, which
  is exactly where what it is carrying gets dropped. There is no wind map: the
  local wind is the prevailing wind and the slope it is crossing. Costs nothing
  to store and nothing on the wire, and dunes walk downwind because of it
  rather than because anyone said so.
* **Gusts.** Deep time still gives the prevailing wind — what the season is
  doing. Two faster walks on the same clock give it a six-minute gust and a
  few degrees of swing, so nothing is stored and two people opening the page
  at the same moment are in the same weather.

`WIND_T` and `WIND_PACK` are material, like the angle of repose. `windGust` is
weather and rides on the wire in `era`.

**Calibrated twice.** The first attempt flattened the field and destroyed all
packing within minutes. `branches/wind.js` is the harness — mass drift,
roughness, a packed strip and a loose ridge, measured against a still world.

## Tracks — 12 September

Jeff: *"I would like the bots to leave visible realistic looking tracks. That's
part of the art piece — that the tracks themselves create an ever changing
pattern."* And, when I justified it by legibility at a kilometre: *"I haven't
said that I want them legible when viewing the whole world. I have consistently
said that I want everything realistic. A real digger moving across sand will
leave tyre tracks."*

`wear` was already on the wire and already tinted the ground — but into the
terrain's own vertices, and **a cell is 5.6 m while a tyre is 0.56 m wide**. A
two-metre-wide pair of tracks was smeared across eleven metres and read as a
cloud shadow. Seventy-five machines could cross the pit all day and leave a
surface that looked untouched.

Tracks now have a surface of their own: one byte a texel, 1024 across the
kilometre, about a metre to the texel, sampled by the sand shader. A machine
lays two bands where its wheels actually are, packed sand is darker and greyer
and holds no ripples — which is the whole of what a track looks like — and the
wind rubs them out a slice at a time so no frame pays for a square kilometre.

**It is a picture of a rut, not a rut.** The grid cannot hold a rut: the
simulation's cell is ten times wider than a tyre, and the shared world is what
`wear` is for. So the coarse `wear` tint stays underneath as the shared,
historical ground that everyone sees the same, and the fine lines are each
viewer's own, from the moment they arrived. That division is deliberate and it
is the honest compromise; making the rut real means a finer grid, which is the
memory question Jeff raised and has not been answered.

## The camera button, and the seat it reaches — 12 September

The driver's seat had existed since 5 September and could only be reached by
typing `&shot=cab` on the end of the URL, which is no use to somebody holding
a phone. The camera button is a three-stop cycle now — **camera → cab → free**
— and it says which stop it is on rather than what it might do next, because
dragging the picture also takes the camera off the director and a label that
guessed would be lying half the time. It reads the state every frame and
touches the page only when the answer changes. The space bar does the same.

On the way: **a tapped button kept the focus, and a focused button is worked
by the space bar too**, so after tapping the camera button the space bar moved
the camera two stops. True of every button on the pad since there was a pad;
only visible once the button had three stops. It lets go of the focus now.

**And the view it reaches is wrong.** The eye is placed by three typed numbers
— 0.31 machine-lengths forward, 0.62 up, 0.155 to the cab side — and the boom
swings through that spot. Headless screenshots on 12 September: at rest you
are outside the windscreen with the boom filling the right of the frame, which
is right; with the boom up you are inside the bodywork and the frame is a flat
yellow wall. `branches/cabshot.js` takes the pictures. The fix is to put the
eye where the machine's own parts say the seat is — cab floor at `y=.400`,
roof at `.760`, glass at `.602`, front post at `x=.275`, seat at
`(.02,.500,-.150)` — rather than to adjust the three numbers until it looks
better.

## What comes next: the look — 12 September

Jeff, pausing on 12 September: *"I am now happy with the functional aspects. I
want to look next at fixing the glitchy video and making the whole thing look
real."*

Two jobs. The first is a measurement, the second is a list.

### 1. The video is glitchy

**Ask him one question first: what is glitching?** A whole-scene stutter, the
machines jumping and stalling, or the ground popping, are three different
faults with three different causes, and the word covers all three. One
question, and then measure — do not start guessing at the list below.

Suspects, in the order the arithmetic makes them likely. **None of these has
been measured. They are leads, not findings.**

* **The playout buffer is shorter than the gap between snapshots.** `LAG=48`
  milliseconds, and `netPoll` runs on `setInterval(...,200)`. The frame draws
  at `alpha=(now-LAG-tA)/span` with `span=max(16,tB-tA)`, and `alpha` is
  clamped to 1. If snapshots are 200 ms apart and the renderer is only 48 ms
  behind, it runs out of future to interpolate into, holds still, and then
  jumps when the next one lands. That is a stall-and-jump at about 5 Hz and it
  would look exactly like glitchy video. A playout buffer has to be longer
  than one interval plus the jitter.
* **`tB=performance.now()` is when the packet arrived, not when the world was
  at that state.** So every wobble in the network or in the worker's
  scheduling becomes a change in the speed of everything on screen. The server
  owns a step clock; the renderer should interpolate against that and smooth
  its own estimate of it, not against arrival times.
* **`updateTerrain` walks 180x180 vertices and their normals every frame**, and
  `drawMachines` runs beside it. Check the frame-time trace before assuming
  this is free.
* **The track texture is 1 MB and `needsUpdate` fires every 150 ms.** That is a
  full re-upload of a megabyte on whichever frame it lands on. Uploading only
  the slice that changed, or doing it less often, is cheap to try.
* **The free Render instance sleeps** and takes a minute to wake, and `?dev`
  runs the local worker at about seventy times real time. Make sure you are
  measuring the thing he is watching.

Measure it properly: record `performance.now()` deltas per frame and the
arrival times of snapshots, on the live page, and look at the distribution
rather than the average. A 60 fps average with one 300 ms hitch a second is
the complaint.

### 2. Making it look real

Known and written down already, roughly in order of how much they cost the
illusion:

* **The machine is the wrong shape.** The body is about 1.4x too wide and the
  cab roof stands at 4.55 m against a real Loadall's 2.49 m. This is a
  simulation change, not a drawing change: `AX` equals `WR`, the body carries
  the boom pivot at `y=0.700`, and `toothWorld` is built on it, so the dig has
  to be measured again afterwards. It is the biggest single thing.
* **The cab view is inside the bodywork.** Above.
* **Night is flat.** Sun below the horizon means flat ambient. Needs a moon,
  work lights that illuminate rather than glow, and adaptive exposure. `?hour=2`.
* **Nothing ages.** Damage is carried and entirely invisible: no paint fade, no
  rust, no dust on the machine. Needs a byte per machine on the wire.
* **The sand.** Ripples are a shader flourish laid over a 5.6 m grid. What the
  wind does now has a direction and a strength; the ripples do not know about
  either.
* **Tracks are a picture of a rut.** Above. Real ruts need a finer grid, which
  is the memory question.

## What to build next — behaviour, when the look is done
"""

edits.append(("the next-work section", """## What to build next
""", NEXT))

edits.append(("the outstanding list", """## Also outstanding

* Night looks flat. Sun below the horizon means flat ambient. Needs a moon,
  work lights that illuminate rather than glow, and adaptive exposure. `?hour=2`.
* Ageing. Damage is carried and entirely invisible. Paint fade, rust, dust.
  Needs a byte per machine on the wire.
* A globe. Small planet you could walk round, or Earth-sized.""",
"""## Also outstanding

* **`branches/probe.js` still holds the starting cohort.** Machines die and are
  replaced, so its ledger goes blind as that first cohort is killed off — it
  looks exactly like the whole pit downing tools. `branches/fill.js` was fixed;
  `probe.js` was not.
* **`branches/fill.js` measures with a yardstick the machines no longer use.**
  Its 38 m relief was the machines' definition until 11 September and is not
  any more. The machine's own scan was added beside it as `asTheMachineSees`,
  and the two columns still do not answer quite the same question.
* **Where a filler looks for work is still a chosen shape** — the largest
  designer's decision left in the reckoning. Deleting it outright was tried on
  12 September and measured worse: 501 m3 against 1,377. `branches/NOTES.md`.
* A globe. Small planet you could walk round, or Earth-sized. Jeff: *"eventually
  the world will be Earth-sized. It's not meant to be a quarry, it is an
  analogy of the real world. Keep it at 1 km square until everything else
  reflects my idea."* The world size is hard-coded in two places:
  `const WORLD = 1000, WORLDN = 180;` in `server.js`.
* **Memory.** Jeff: *"I'm concerned that memory limits limit my vision."* It is
  the real constraint behind real ruts, a finer grid and a bigger world, and it
  has not been answered — only worked around."""))

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
print("handover12 applied to %s: %d edits, %d chars" % (p, len(edits), len(b)))
