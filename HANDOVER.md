# Repose — where things stand, and what comes next

Read this at the start of a new session — it is in the Repose folder and you
can read it yourself. Written 12 September 2026, replacing the version of
6 September.

**Where Jeff has got to.** On 12 September he said the functional side is
where he wants it, and that the next two things are *the glitchy video* and
*making the whole thing look real*. The brief for that is under "What comes
next: the look". Everything before it is what the piece already is.

**Updated the afternoon of 12 September.** The glitchy video was measured
and fixed — two separate faults, both of them real, and the page now runs at
38 frames a second on his Mac where it ran at 9. The look is untouched, and
the machine is still the wrong shape. `branches/perf.js` is the measurement
kit; use it before believing anything about a frame.

## What Repose is

A fixed square kilometre of sand. Machines work it. Each has one of two
purposes, assigned at birth:

* **Raise** — get my own ground higher.
* **Fill** — get hollows filled in.

Neither knows the other exists. Neither is competing. Their actions are
nonetheless in direct opposition, because there is one quantity of sand and no
more: nothing enters the world and nothing leaves it.

It is an analogy for people competing for limited resources to feed their
egos, and it should be allowed to be as bleak as that implies.

Live at `jeff-lynn-sc.github.io/Repose/` — one shared world for everyone, each
viewer with their own camera. Named for the angle of repose: the steepest face
loose sand will hold before it fails.

## The governing principle

The purposes are goals, not procedures. High is good, no matter how. Level is
good, no matter how. How a machine achieves its goal should be discovered, not
specified.

There is no height limit and none should be added. If a mound goes unstable
and slumps, that is the sand refusing, which is the piece, not a designer
refusing.

`DECISIONS.md` lists every choice still being made for the machines that they
could make themselves, ranked, and now also lists what pushing added as well as
what it deleted. Read it before adding anything.

## READ THIS FIRST: you can see, and you can stop time

`index.html` has three.js inlined, and when the live server is unreachable the
page falls back to computing a world itself in its own worker. The sandbox
cannot reach Render — so the page always falls back. Therefore:

```
python3 -m http.server 8099
# then drive Chromium via Playwright at
# http://127.0.0.1:8099/test.html?dev&pop=2
```

Playwright is installed and Chromium is preinstalled at `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`
(do not run `playwright install`; launch with
`args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']`).
Give it about forty-five seconds to boot the world, then screenshot.

`branches/mktest.sh` builds `test.html` from `index.html` with a hook exposing
the camera and a way to stop the world. `branches/blade.js` and
`branches/cab.js` are worked examples: wait for a machine to be doing the
thing, stop the world, aim, shoot, start it again. Never push `test.html`.

Four things that cost hours to learn:

* **Stop the world before aiming.** At `?dev` the local worker runs about
  seventy times real time, so a machine moves eighty metres between aiming the
  camera and taking the picture. The hook can post `{type:"set",key:"running",
  value:false}` to the worker. Everything got easy after this.
* **Expose things as getters, not values.** The hook first captured `BASE` and
  `machLen` by value at page load, when they were still 1, so the camera aimed
  sixteen metres underground and every frame came back a flat grey. That
  looked exactly like a broken renderer for half an hour.
* **When something does not appear, check where it actually is before
  reasoning about why.** The wedge of sand in front of the blade was drawn
  correctly and buried under the ground, twice, and both times the arithmetic
  said it should have been visible. Measuring the composed matrix took two
  minutes; deriving it wrongly took an hour. In the end it is placed by
  measurement against the bucket's own load, which is a known-good fixed point.
* **Diagnose with colour.** Making the load mesh bright red in `test.html` only
  settled in one frame a question that guessing could not.

Rendering geometry alone is faster than booting a world when you only want to
judge a model in isolation.

## The machine

A JCB Loadall telehandler. Four wheels that turn and steer, a chassis, the
engine bay down the boom side and the cab a glasshouse on the other, a boom
that pivots at the back and telescopes, and a wide flat loading bucket with a
straight cutting edge and the sand heaped visibly in it.

One machine type for both purposes. The only difference between a raiser and a
filler is the goal, and you must not be able to tell which is which by looking.

The kinematics are simpler than the jointed arm they replaced. A telescopic
boom solves exactly — pitch is one arctangent, extension is one distance. In
the code `stick` is a length rather than an angle. There is no elbow, so an arm
folding through itself cannot be expressed at all. With no slewing house the
machine turns its whole body to face its work.

Constants, all in `toothWorld`: `L_BASE=1.30`, `E_MAX=0.90`, pitch limited to
`[-0.80, 1.15]`, boom pivot at `(-0.50, 0.700, 0.140)`, cutting edge at
`(0.275, -0.249)` in the bucket's frame.

**It was built mirrored until 5 September.** A Loadall carries its boom down
the right-hand side with the operator beside it; this one had it on the left,
and had done since the machine was made. Nobody could tell from outside,
because a lopsided machine looks lopsided either way. It became obvious the
moment there was a way to sit in the cab and look out. Forward is +X and up is
+Y, so the machine's right is +Z: the boom is there and the cab on −Z, in the
drawing and in the simulation both.

Wheels: spin and steer are derived by the renderer from how far the machine
moved and how fast it turned. The simulation is never asked.

## Pushing — added 5 September

A machine can move sand two ways. It can dig a bucket, carry it and tip it. Or
it can put the bucket on the ground and drive, which fills the blade as it goes
and leaves the load where the machine stops. Both purposes have both, which
keeps the rule that only the goal differs.

The choice between them is not a threshold. It is the same reckoning the filler
already used to pick a job — sand moved per second — run twice, once for each
way. Sand on the blade is dead weight the machine shoves along the ground and
it eats the machine's grip exactly as a slope does, so a push up anything steep
takes so long that the arithmetic refuses it. There is no rule about slopes
anywhere in it. Pushing wins under about twenty-five metres on the flat; that
distance collapses as the ground tilts; near eighteen degrees it goes below the
length of the machine and pushing stops being possible at all. Those numbers
are consequences, and changing the angle of repose changes them.

How deep the blade cuts is the ceiling times whatever grip is left over, so the
cut thins as the blade fills and stops on a bank. Nothing charges the machine
for cutting: what it cuts becomes load, and load is what eats its grip.

Mid-shove, once a second, it asks whether shoving on still beats picking the
bucket up and driving. Shoving is slower over the ground but still gathering;
lifting is quicker and gathers nothing. So it shoves while the blade is filling
and lifts once it is full — unless the far end is nearer than a blade takes to
fill, in which case it shoves the whole way, which is the short haul into a
hollow.

Three new constants, and the honest ledger is in `DECISIONS.md`: `PUSH_RES`
(0.55, how much grip a full blade eats — machine build, like `DRIVE`),
`CUT_MAX` (0.70 m, the deepest cut, which is a bucket spread over four blade
widths and is now shared with digging), and `PUSH_SPILL` (0.004 per metre, what
rolls off the ends of the blade — the one number here with no argument behind
it beyond being the right order, and the reason nobody shoves sand across the
pit).

Measured, eight machines, thirty minutes, same world, against the code before
it: fillers move nine per cent more sand and stand about a quarter less, and
level very slightly worse — a shove leaks along its route and leaves a scrape.
Raisers barely shove at all, but reach the same height on a quarter less
digging, because `pickScoop` now chooses its ring by reckoning (the old cone
distance, or the distance a blade needs to fill, whichever pays) rather than by
the cone alone.

The renderer draws a shoved load where it actually is — a wedge on the ground
in front of the cutting edge, wider than the bucket and low — rather than
inside the bucket. The sign of the load field on the wire says which; over the
network it is the top bit of the fullness byte, so nothing grew.

## A driver's view — added 5 September

`SHOT.CAB`, in the director's bag like any other shot, or `?shot=cab`. It sits
where the operator sits, just outside the windscreen because the seat is inside
a box whose inside faces are not drawn, and looks along the boom at the ground
the machine is about to work. It has a button as of 12 September, and Jeff
looked at it on the live page and said it is good.

## The dig made honest — 6 September

Jeff answered the three questions above with one sentence, twice: *the same
rule as always, match reality.*

**The bucket holds what the bucket holds.** It was 26 cubic metres and the
bucket drawn on the screen holds about a seventh of that: the machine you
watched and the machine that moved the sand were not the same machine. A
loader bucket is a triangle in section — back plate, floor, and the opening
running from the top of the back plate down to the teeth — and those numbers
are in `BK_BACK`, `BK_TOP`, `BK_WIDE` and the cutting edge, set to match
`GEO_BUCKET` in the page and required to stay that way. It comes out at
**3.6 m³**. Redraw the bucket and everything follows.

**The depth of cut follows from it.** A loading shovel fills its bucket in one
pass, so the cut is the bucket over the width of the bucket and the length of
a pass — half a metre. Digging and dozing now share one `CUT_MAX` where they
had two.

**A pass is a sweep, not a clock.** The seven-second stroke, the 4.6-second
tip, `cap*0.17` a second, "full is two thirds", "empty is a tenth" and the
fourteen-second give-up are gone. What comes up is width × depth × how far the
teeth were dragged. A pass that comes up empty is the whole of how a machine
learns this ground is finished. The tip is the bucket rolling at the speed its
ram moves it, letting go of whatever it can no longer hold.

**A hill coming down is the sand refusing.** `relax` is the only thing that
lowers ground without a machine doing it. Each raiser notes where its summit
stood, the sand settles, and whatever `relax` took out of it is a slump. What
counts as failing is the machine's own bucket. There is no constant in it.

Measured, eight machines, forty minutes: a raiser's summit reaches +1.66 m
above the ground around it and is still climbing, on 2,740 m³. The old code
reached +3.42 m on 15,263 m³ and had begun falling back at half an hour. Half
the height, a fifth of the sand, two and a half times as much hill per cubic
metre. Fillers: relief −0.0072 against −0.0048 on a quarter of the sand.

Collapses are now rare and real. Zero in forty minutes where the old code
counted 135, because the old ones were bucket-sized noise and the new summits
have not yet reached an angle the sand will refuse. When one happens it will
be a hill.

## The wheels made real — 10 September

They were twice the size they should be, and nobody could say so from a
description. `WR` is a radius and it was carrying a diameter: `.215*machLen`
is 1.29 m, which is what a 460/70 R24 measures across, not out from the
middle. Same for `WW`. Tyres are now **1.53 m across and 0.56 m wide** on a
**4.07 m wheelbase**, and the rim and the hub no longer stand wider than the
tyre they sit in.

The tread was nine blocks a metre apart, each a third of a metre thick and
standing 9 cm proud, which is a cog and not a tyre. It is sixteen blocks
30 cm apart standing 4 cm proud.

**The body did not move, and that was a decision.** A machine's ride height
*is* its wheel radius — `AX` equalled `WR`, so shrinking the wheels drops the
body, and the body carries the boom pivot at `y=0.700`, which is a constant
in `toothWorld` and therefore in the simulation. Moving it moves the teeth
and the dig has to be measured again. So `AX` stayed where it was and only
the axles and the wheel centres came down.

The cost is visible from above: the body is 3.34 m wide and the tyres now
reach 3.49 m, so the wheels barely show. **The body is about 1.4× too wide
and the cab roof stands at 4.55 m against a real Loadall's 2.49 m.** That is
the next thing, and it is a simulation change, not a drawing change.

## The pour, the buttons and the filler — 10 September

**The sand left the bucket in one lump.** Jeff saw it; the arithmetic was
innocent. A bucket already lets go over about 1.8 seconds, which is right for
a loading shovel. Two things in the drawing were not. The curtain of grains
emitted *one grain per simulation step*, which is a rate set by the step
rather than by the sand — the same thin scatter whether a full bucket was
emptying or a last handful. It now sheds in proportion to how much sand is
actually leaving, about 150 across a bucket, most in the first half. And the
heap was scaled about the bucket's own origin, which is the back plate, so
as it emptied the last of it *retreated away from the cutting edge it was
supposed to be leaving by*. It slides forward and down now.

**The + buttons did nothing and said nothing.** They need `&key=` on the URL,
and without it `addMachines` returned in silence and warned into a console
nobody on a phone can open. The buttons that talk to the server now dim
themselves when there is no key, and say `needs &key=` if you tap one.

**The filler was not filling.** Jeff: "good at lowering the highest peak but
not at filling the deepest hole." Measured with the new `branches/fill.js`,
eight machines, twenty minutes: it moved 1,596 m3 and put 16% into hollows
while taking 15% back out of them. **The net gain to every hollow in the pit
was seven cubic metres.** It was not shaving humps either — 2% came off high
ground. It was shuffling flat sand about.

Two causes, and the second is the interesting one.

* The score — how much unevenness one bucket closes — **is capped at one
  bucket**, honestly, because one bucket cannot close more. So a two-metre
  hollow and a dish a hand deep scored the same, and with the score
  saturated the only thing left to choose on was how quickly it could get
  there. Depth now multiplies it.
* **It dug within 7 to 60 m of where it tipped, and relief is measured
  against the ground 38 m out.** So the sand it dug and the hole it filled
  were usually the same piece of ground: it took the rim of a hollow and put
  it in the middle, which widens a hole rather than filling it. That is why
  it took out almost exactly what it put in. It now reaches past its own
  measure — not a rule about distances, the width of the instrument it was
  already using.

Measured, same world, same seed, twenty minutes:

| | before | depth | between | **landed** |
|---|---|---|---|---|
| moved | 1,596 m3 | 1,225 | 1,150 | **479** |
| into hollows | 255 | 351 | 244 | **144** |
| out of hollows | 248 | 294 | 252 | **93** |
| **net into hollows** | **+7** | +57 | −8 | **+51** |
| net / moved | 0.4% | 4.7% | −0.7% | **10.6%** |
| mean relief where it tips | −0.044 | −0.093 | −0.060 | **−0.101** |

"Between" — weighting by how much unevenness lies between the two ends — is
prettier, because it makes a hump the best place to dig without a rule
saying so, and it measured **worse than doing nothing**. It rewards a big
difference, and the biggest differences in a pit are across the rim of a
hole. Kept here because it lost.

The cost is real and visible: it moves a third as much sand, because every
job is now a proper haul. Ten times as much of it counts.

## The 38 metres, gone — 11 September

Jeff: *"why is there a 40 m patch? Everything should be as natural as
possible. Only the goals and the natural laws are fixed."* He was right, and
it was already written down as his objection in `DECISIONS.md`, and I had
walked past it that morning and added a second constant to prop up the first.

`reliefAt` averaged the ground at a fixed 38 metres — the scale at which
ground counted as low. So every machine's idea of a hollow was a number
somebody typed, and the pit could grow shapes larger than its machines could
see. It now walks outward ring by ring and **stops where the ground stops
climbing**. That stall is the rim, and the rim is the size of that piece of
ground. It grows as the pit's shapes grow.

It also answered a question I had been faking: **how far away is different
ground?** The hollow's own rim is that distance, so a filler digs outside the
hole it is filling because the hole told it where its edge was.

What is left is how you look rather than what you decide: eight bearings,
rings growing by three fifths, and a smallest ring of one machine length,
because nothing shorter than a machine is a piece of ground to it.

**Got it wrong once, instructively.** The comment said "stop where the ground
stops climbing" and the code said "stop where the drop from the middle stops
deepening". Those are different sentences. A ring average taken further and
further out keeps rising all the way across whatever a hollow sits in, so
every hole reported itself as the whole basin around it and the machines went
off to the broadest, shallowest ground in the pit: net into hollows +20
against +51 for the constant it replaced. Comparing each ring with the one
before it finds the hole's own rim. **Write the sentence, then check the code
is that sentence.**

Measured, eight machines, twenty minutes, same world:

| | before this week | fixed 38 m | **landed** |
|---|---|---|---|
| moved | 1,596 m3 | 479 | 1,377 |
| net into hollows | +7 | +51 | +17 |
| taken off high ground | 39 (2%) | 0 | **166 (12%)** |
| mean relief where it digs | −0.034 | −0.063 | **+0.002** |

It is the only version that digs off high ground, and the only one that takes
its sand from ground standing *above* its surroundings rather than out of
other hollows. It scores worse on "net into hollows" and that column is not
to be trusted here: `branches/fill.js` still defines a hollow at 38 m, so it
is measuring this machine with the constant that was just deleted. **The
instrument now needs to ask the machines what they thought they were
filling.** That is the first job for whoever picks this up.

## The peak and the deepest hole — what they actually do

**A correction to what was written here on 11 September.** That section said
nobody ever goes near either of them. It was true of twenty-minute runs with
eight machines and it is false, and it was in here for a day.

An hour, forty machines, three in ten raising, with `branches/fill.js`:

| | moved | deepest | peak |
|---|---|---|---|
| 0 min | — | −1.84 | +1.81 |
| 25 | 3,435 m3 | −2.46 | +3.33 |
| 30 | 4,041 | **−3.53** | **+3.60** |
| 45 | 5,985 | −2.57 | +3.59 |
| 60 | 9,475 | −2.19 | +2.14 |

Both ends swing about 1.7 m and come back. **The deepest hole is a working
face**: it opens while a machine is quarrying it and closes when the machine
moves on. That is exactly what Jeff watched on the live page — −1.9 m going to
−2.7 m — and it is a machine at work, not a filler wrecking the pit. The
raisers put up a 3.6 m hill over half an hour and then lost most of it.

Why it looked frozen to him: one machine in the world, and the free server
sleeps whenever nobody has the page open. The world does all of this; it needs
machines in it and somebody watching.

**Twenty minutes is not long enough to see anything**, and eight machines on a
square kilometre is not enough to move anything. 1,400 m3 spread over a
square kilometre is a millimetre and a half. Run an hour, run forty machines.

Where a filler looks for work is still a shape somebody chose, and it stays on
the `DECISIONS.md` list — but deleting it outright was tried on 12 September
and measured worse. `branches/NOTES.md` has the numbers.

## The wind made real — 12 September

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

**And a warning about the fault it nearly acquired.** Headless screenshots on
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
then.

## The link to the world — 12 September

Two faults in how a browser talks to the pit, both found while chasing the
stutter and neither of them asked for.

**It asked faster than the world could answer.** `netPoll` fired every 200 ms
whatever was happening, and an answer takes about 400 ms from here, so there
were always two questions in the air: the server packed the world twice, the
network carried it twice, and the second answer was usually a version the page
already held. It keeps one question in the air now and asks the next as soon as
the last is answered — exactly as fast as the world can answer and no faster —
with a floor of one of the world's own ticks, because asking twice inside one
tick can only be told the same thing twice. Measured in the harness: **one
request in flight where there had been two, for the same freshness.**

**It gave up on the shared world after 1.2 seconds.** Six failed polls in a row
and the browser abandoned the pit everybody is in and started computing its own
— silently, permanently, saying so only in a readout nobody has open. It
happened twice in an hour on 12 September to a page left open. A page that has
reached the world now keeps asking, waiting one tick longer after each failure
so a struggling server is not shouted at, and comes back the moment it answers.
A page that has *never* reached the world still falls back, because that is
what the fallback was for: a sandboxed frame, a strict policy, no world there
at all.

`branches/netfail.js` is the test, and the test is the point of the change. It
starts a world, lets a page reach it, kills the world, and watches. Before:
`worker` within two seconds, for ever. After: `world 69 updates  waiting (12)`
— still the shared world, still asking — and then `world 113 updates` when the
world came back, with no reload and nobody touching anything.

**One consequence is deliberate.** A first viewer arriving while the free
instance is asleep now waits the minute it takes to wake, instead of being
handed a pit of their own and never knowing. Repose works when it is watched.

**And the half-second was the server drowning, not the distance.** This
paragraph said the opposite for three hours on 12 September. The correction is
written here rather than tidied away, because how it was got wrong is the
useful part.

What was measured was right: `/join`, which does no work at all, came back no
faster than `/state`, which walks 32,400 cells twice and gzips — and the whole
257 KB world came back in 277 ms, faster than a 400-byte diff. What was
concluded from it was wrong: that the time must be the distance to the origin.
The origin is in Frankfurt and always has been, which Jeff said in five words.

The question nobody asked was **is the world keeping up with its own clock?**
It was not. `setInterval(advance, TICK_MS)` is meant to version the world ten
times a second. On the free instance at `TIME_MUL` 2.4 it managed **2.45** —
each tick overrunning its 100 ms about fourfold — and every request that
arrived mid-tick waited behind it on the event loop. That is exactly why a
request that does nothing cost the same as one that does everything: neither
was doing any work, both were queueing. When the loop was free a reply came
back in **83 ms**, which is what Frankfurt looks like. The same code on an
ordinary processor runs at **9.99** ticks a second with eight machines and the
server's own `load` reading 47–71%.

Measured on the live server, four settings, 12 September:

| `TIME_MUL` | ticks a second, of 10 | world pace | reply |
|---|---|---|---|
| 2.4 | 2.45 | 0.74× | 300–490 ms |
| 0.7 | 4.9 | 0.70× | ~220 ms |
| **0.6** | **9.2** | **0.55×** | **82 ms** |
| 0.45 | 9.95 | 0.45× | ~80 ms |

**It was never running at 2.4.** It ran at 0.74 and jammed itself to do it.
0.6 costs about a quarter of the pace it was really achieving and makes it five
times more responsive — and `TIME_MUL` is an environment variable that
`README.md` has said to lower on a slow machine since the day it was written.
Jeff set it to 0.6 in Render's environment on 12 September and chose to stay on
the free instance for now.

Everything downstream improves with it. At 82 ms a page gets a fresh snapshot
about every tenth of a second instead of every four-tenths, so the picture
stands about 0.15 s behind the world instead of 0.46 — which is more than
anything else tried today would have bought.

`server.js` now sends `Timing-Allow-Origin: *` as well, which costs nothing and
lets a page read its own connect, TLS and time-to-first-byte. Without it the
browser zeroes all of that for a cross-origin server, and an hour went into
answering with curl and a proxy what the page could have said itself.

## What comes next: the look — 12 September

Jeff, pausing on 12 September: *"I am now happy with the functional aspects. I
want to look next at fixing the glitchy video and making the whole thing look
real."*

Two jobs. The first was a measurement and is done — what it found and what
was changed is below. The second is a list and is where to pick up.

### 1. The video is glitchy — measured and fixed, 12 September

Jeff, asked the one question first: **the whole picture stutters**, everything
freezing together and then catching up, watching in Chrome on the Mac.

**The first suspect was right, and worse than the arithmetic above assumed.**
Snapshots do not arrive every 200 ms. Measured on the live page on his machine,
they arrive every **398 ms** — 550 at the ninth decile, 2.6 s at worst. With
`LAG=48` the renderer had 48 ms of future to walk and then 350 ms of nothing:

* predicted still frames, (398 − 48) / 398 = **88.0%**
* measured still frames = **88.2%**

That fraction is set by the ratio of the lag to the gap and not by the frame
rate, so it was the same number in every browser. The picture moved for 48 ms
in every 400 and then jumped a third of a second when a packet landed.

**And there was a second fault nobody had looked for. The frame itself cost
41 ms of JavaScript** — only 2.7 ms of which was talking to the card. The page
ran at **9 frames a second** on Jeff's MacBook Air. Even with a perfect
network, 41 ms of JavaScript caps it at about 24. Where it went, measured with
`branches/perf.js steps`:

* **`updateTerrain` was 62% of the frame's JavaScript.** It rebuilt all 32,400
  vertices every frame — a square root and two trigonometry calls each —
  including on the 88% of frames where nothing had changed.
* **3.47 MB of geometry went to the card every frame.** 1.17 MB of it was the
  ground. **2.28 MB of it was machines that do not exist**: the instance
  buffers have room for `MAXI` = 3,000 and three.js sends the whole of that
  room unless it is told which part changed. There were three machines.

Three changes. Each is kept in `branches/` as the script that made it —
`instancefix.js`, `terrainfix.js`, `playoutfix.js` — so what was done to the
page is legible without diffing 800 KB.

1. **Tell the card how many machines there are.** `sendInstances` sets
   `updateRange` before each upload, every frame, because three.js forgets it
   after each one. 2.28 MB a frame became 2.3 KB.
2. **Rebuild the ground that moved, not all of it.** `markMoved` builds the
   list of cells where `hA` and `hB` differ — which is exactly what the world
   said had changed — plus the four neighbours of each, because a vertex takes
   its normal and its shading from them, plus whatever was moving last time and
   has now stopped and must be written where it stopped. Live, with three
   machines, that is about **1,000 cells out of 32,400**. Wear and rock are
   compared as well: the wind scrubs them without moving any sand.
3. **Delete the 48 and put nothing in its place.** A snapshot covers a stretch
   of the world's own clock — the server versions the world on a fixed tick and
   that version is already on the wire — and the renderer walks that stretch
   while the next snapshot is on its way. So it stands exactly one snapshot
   behind, whatever a snapshot is worth today. A packet that arrives slowly no
   longer makes every machine on screen move slowly, because the distance
   between two states now comes from the world rather than from the network.
   The length of the tick is not typed either: it is whatever the versions and
   the arrivals say it is. A packet carrying a version the page already holds
   is ignored rather than treated as a new state with no world time in it.

Measured on Jeff's Mac, live world, 400 frames, before and after:

| | before | after |
|---|---|---|
| frames a second | 9.3 | **38.5** |
| JavaScript in one frame | 40.9 ms | **2.6 ms** |
| geometry to the card per frame | 3.47 MB | **0.25 MB** |
| longest frame | 957 ms | 86 ms |

And in the sandbox against a real server, where the picture's own motion can be
watched: the world advanced at 22% of real time on a typical frame before and
**96%** after; frames with nothing left to show, 45% → 3.7%.

**The terrain change is exact, not an approximation, and there is a test that
says so.** `node branches/perf.js terrain <url>` runs the incremental path and
then rebuilds the whole grid in the same frame and compares. Position, normal
and colour, 26 checks, on both the worker and the network path: **worst
difference zero.** Run it again after touching anything in `updateTerrain` or
`markMoved`.

**What is left in the frame.** 2.6 ms of JavaScript, 0.25 MB of geometry, and
the track texture: a full megabyte re-uploaded whenever 150 ms has passed,
which at 38 fps is one frame in six and cost about 8 ms when it landed.
`trackFade` only touches a sixteenth of it and `trackDab` a few square metres,
so nearly all of that upload is unchanged bytes. The rows-that-changed version
has not been done.

### 2. Making it look real

Known and written down already, roughly in order of how much they cost the
illusion:

* **"The rendering is a bit weird on iPhone" — 12 September, undiagnosed and
  deliberately not chased.** Jeff, on an iPhone over LTE at 18:26 local, after
  the speed work: *"The speed is ok on iPhone but the rendering is a bit weird.
  Don't fix this at this stage."* What is in his screenshot, described rather
  than interpreted, so the next session is not guessing:
  - Two machines very close together on the flank of a dune, overlapping in
    the picture. It is not clear whether they are two machines drawn near each
    other or two machines standing in the same place. Machines are supposed to
    avoid each other and take damage from contact, so it is worth asking the
    simulation where they actually were before blaming the drawing.
  - They read as near-black and charcoal with yellow panels. On the Mac at
    midday the same machine reads as a yellow machine with dark parts. Low sun
    at 18:26 would darken it, but not obviously this much.
  - A hard, straight-edged step runs across the sand below them, much crisper
    than the dune shapes around it. It may be a shadow edge and it may not.
  - The bloom runs at an eighth of the frame below 820 px wide against a
    quarter above it (`makeTargets`), so a phone is not rendering the same
    picture as the laptop and never has been.

  **None of this is from the 12 September speed work.** The terrain change is
  proven bit-identical to a full rebuild by `perf.js terrain`, and the instance
  change alters only how many instances are uploaded, not what any of them look
  like. Say so, but check it again rather than repeating it on trust.

* **The machine is the wrong shape.** The body is about 1.4x too wide and the
  cab roof stands at 4.55 m against a real Loadall's 2.49 m. This is a
  simulation change, not a drawing change: `AX` equals `WR`, the body carries
  the boom pivot at `y=0.700`, and `toothWorld` is built on it, so the dig has
  to be measured again afterwards. It is the biggest single thing.
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

1. **Wrecks persist.** Machines accumulate damage and break down. A wreck stays
   where it fell, becomes an obstacle, and is buried or built on.
2. **Goal-seeking proper for the raiser.** It still digs around a ring rather
   than considering standing on a hill someone else built, or taking a summit
   already occupied. The ring is now chosen rather than derived, which is a
   start.
3. **Accidental or otherwise.** Nothing lets one machine act on another. Not
   aggression: if a raiser pursues height without regard, burying a stranded
   machine is the consequence of not caring.
4. **Repose from the sand's history.** Removes the piece's central constant.
   Freshly tipped sand stands shallow, settled sand stands steeper, sand that
   has just avalanched is loose again, driven-over sand is packed — which is
   already modelled as `wear`. Then there is no angle of repose anywhere in the
   file, only sand with a history.

`IDEAS.md` holds Jeff's own thinking. The central idea: the bigger goal is
something human — happiness, or self-worth — and raising or filling is only a
machine's theory about how to get it. Success confirms the theory, failure
erodes it, enough failure abandons it. Three things settled there: worth is
measured against the ground rather than against other machines; abandoning a
purpose is contagion rather than reasoning; and settling into a hopeless
comfortable homeostasis is a real outcome. The bleakness is not that you cannot
escape your purpose — it is that the second act is real, available, and changes
nothing, because there is one quantity of sand.

## Also outstanding

* **The world costs more than the free instance has.** At `TIME_MUL` 0.6 it
  keeps up with room to spare and answers in 82 ms; at the 2.4 the piece is
  tuned for it delivers 0.74× real time and jams itself doing it. The pace the
  piece was written for needs a processor, and on Render that is the Starter
  instance at seven dollars a month. Nothing in the code is the problem: the
  same simulation runs at 9.99 ticks a second on an ordinary machine at 47–71%
  load. This is the ceiling on the world getting bigger, too.
* **`pack(since)` walks all 32,400 cells twice on every request from every
  viewer.** Nothing can measure it costing anything today. It is the same shape
  as the `MAXI` bug — work sized by the whole world rather than by what
  actually changed — and it is the first thing to reach for when the world
  grows.
* **Server push was considered and rejected on 12 September, and the reasoning
  is worth keeping because it looked obvious.** The idea was to have the server
  hold a request open until the world moved. It would do nothing: the page now
  asks again the instant it is answered, so there is never a moment when news
  sits waiting for a question. To get news sooner the server has to speak
  unasked — one open connection, a tick at a time — which is about four times
  the data, because every tick would carry its own copy of every machine and
  could not be gzipped the way a reply is. One person watching all day would
  spend about a fifth of the free monthly bandwidth. What it buys is lag, and
  nothing in Repose can feel lag.
* **The buttons that need the key are dead on a phone.** They dim without
  `&key=` and the explanation is a `title` tooltip, which a phone cannot show;
  tapping says `needs &key=`. Jeff hit this on 12 September trying to add a
  filler, and said not to fix it yet. Typing a key into a URL is exactly the
  keyboard-thing he has said he does not want. Remembering the key once it has
  been seen to work is the obvious fix.
* **Pushing restarts the world.** Render picked up a push to `repose-server` on
  12 September and redeployed by itself, so the pit reloaded from its last
  save. A tool dropped into `branches/` is enough to cause it, because
  `push.sh` sweeps the whole folder into that repository. The old note that
  Render does not reliably auto-deploy is half the story: it does not always,
  and it sometimes does.
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
  has not been answered — only worked around.
* Every reset begins in the same weather. `/reset` sets the clock to zero, so a
  fresh world always starts at day 0: raise share 0.25, repose 36°, wind 0.27.

## How it is put together

Two repositories.

* `Jeff-Lynn-SC/Repose` — `index.html`, one self-contained file, about 768 KB
  with three.js r128 inlined (no CDN: this is meant to last ten years). Served
  by GitHub Pages. `world.json` also lands here, written by the server every
  five minutes, so the commit log is the history of the world.
* `Jeff-Lynn-SC/repose-server` — `server.js`, `sim.node.js`, `bench.js`,
  `IDEAS.md`, `README.md`. Deployed on Render's free tier at
  `https://repose-qd2m.onrender.com`.

The simulation exists twice and the two copies must stay byte-identical.
`sim.node.js` is the file `index.html` inlines as its worker. `branches/sync.js`
is the only thing allowed to write one from the other; it proves every anchor
before writing anything and checks afterwards.

The server owns the world, about 4.5 ms a step, no GPU. Browsers ask what the
sand is now and draw it themselves. Every cell remembers the version at which
it last moved, so a browser says what it last saw and receives exactly what it
missed. The whole world is saved in one gzipped block, machines included.

The free instance sleeps after fifteen minutes with nobody there and takes a
minute to wake. That is the rule, not a fault: Repose works when it is watched.

Endpoints (write ones need `key=` matching `RESET_KEY` in the Render
environment): `/join?id=`, `/state?since=`, `/stats`, `/add?key=&n=&role=`,
`/remove?key=&n=&role=`, `/reset?key=&pop=`, `/speed?key=&x=`.

Deep time: the pit's disposition is a function of the date — five slow walks
with periods that do not divide into each other. Share of raisers, angle the
sand will hold, working rate, wind. `rateMul` runs between 0.55 and 1.60, which
means the dig-and-tip cycle already swings between about seven seconds and
twenty-one with the calendar — and that swing lands squarely on the push-or-
carry decision, so Repose already has dozing eras and carrying eras. Nobody
built that. The sun is real: solar position for 48.05°N, 10.88°E at the real
time now.

Other rules already in. Births happen beside existing machines. Purpose is
inherited, roughly three parts heredity to one part era, except the very first
birth which is always the opposite. Crowded machines look further afield.
Ground worked repeatedly hardens to rock. Wind moves sand and scrubs tracks.
Machines avoid each other and take damage from contact.

## Controls

Three taps in the top-left corner cycles the overlay: nothing → figures →
figures and buttons. Or `?dev`.

Buttons: camera, purpose, world, find, next machine, +1/−1 raiser, +1/−1
filler, pause, +10, +200, sky, bare, restart. Adding, removing and pausing need
`&key=YOURWORD`.

Moving the camera: drag to orbit, wheel or pinch to zoom, two fingers to slide
over the ground, W/A/S/D and Q/E on a keyboard. Any of those takes the camera
off the director.

Flags: `?dev` `?key=` `?hour=21` `?shot=cab` `?pop=800` `?time=6` `?fresh`
`?nosave`. `?v=anything` busts the cache — use it after every deploy, and check
the two build lines agree before judging anything.

## Getting changes live

Files live in `/Users/jefflynn/Library/CloudStorage/Dropbox/Personal Jeff/Art/Repose`.
Ask for access at the start of a session and write finished files straight in —
Jeff does not want downloads.

**Pushing needs nothing from Jeff any more, and must not.** A fine-grained
personal access token — scoped to these two repositories, contents write, no
expiry — lives in `repose-keys.txt` in the Repose folder as `GITHUB_TOKEN=`.

```
# on the Mac, from anywhere
sh branches/push.sh "the commit message"
```

It stamps `BUILT` in `index.html` with the moment the page goes out, and only
when the page has really changed, so a run that changes nothing does not
manufacture a commit. Do not stamp it by hand.

That script reads the token, never prints it, passes it through a credential
helper so it never lands in a config file, clones both repositories into the
Mac's scratch outside `mnt/`, copies the folder across and pushes. It sweeps
the whole of `branches/` so a new tool is never left behind, and it never
names `repose-keys.txt`.

The sandbox cannot do this. The proxy refuses to inject a credential for these
repositories — tested again on 10 September, and `git clone` works from there
while `push` does not.

**Do not go back to the device flow.** It asked Jeff for a six-character code
that expired in fifteen minutes, and every code issued while he was away from
the keyboard lapsed unused; three in a row did on 10 September. If the token
is missing or has been revoked, ask him to make a new one at
`github.com/settings/personal-access-tokens/new` — only select repositories,
`Repose` and `repose-server`, Contents: read and write — and to paste it into
`repose-keys.txt` himself rather than into the chat. Do not delete the token
after a push. Deleting it is what made him type a code twice in one day.

Do not use client id `Iv1.b507a08c87ecfe98` — that is the GitHub CLI's App and
its token has no scopes.

Deploying and resetting cannot be done for him. The sandbox refuses
`api.render.com` and `*.onrender.com` from every shell. So: you push, Jeff
deploys. `repose-keys.txt` holds an unusable deploy hook and reset key and can
be blanked.

## Hard-won lessons — please read these

**Ask whether the world is keeping its own clock before blaming the network.**
Every request looked slow; a request that did no work looked as slow as one
that did all of it; and the conclusion drawn was that the server must be far
away. It was in Frankfurt. It was simply overrunning its own tick fourfold and
every request was queueing behind it on the event loop. The tick rate is
visible from outside in one line — read `version` twice, fifteen seconds apart,
and divide — and it would have been the first thing checked by anyone thinking
of the server as a thing with a clock rather than a thing that answers
questions.

**And Jeff corrected it in five words.** *"the original one already is in
frankfurt."* Three hours of careful measurement had produced a coherent,
confident, wrong account, and it had already been written into this file. Take
his corrections as evidence. And when a diagnosis rests on something nobody has
checked — where the machine is, what it is doing between requests — go and
check it before writing it down.

**A tab in a window behind another window is hidden, and a hidden tab gets no
frames at all.** Chrome opened the extension's tab in a background window on
12 September and `document.visibilityState` was `hidden`: no
`requestAnimationFrame` ever ran, `setInterval` was throttled to about once a
minute, and script injection timed out because the page looked busy. Half an
hour went into "the page is broken" before anyone asked the page whether it was
visible. Ask first, before believing any frame measurement.

**Count the bytes that actually go to the card, not the array you handed over.**
On WebGL2 three.js uploads with `bufferSubData(target, offset, array,
srcOffset, length)`: the array is the whole attribute and the range is the
whole point. Measuring `array.byteLength` said a fix that worked perfectly had
changed nothing at all, and nearly got it thrown away.

**The recurring bug class has a second half: quantities sized by a maximum.**
Alongside constants scaled to cell or machine size, look for buffers, loops and
uploads sized by the most there could ever be rather than by how many there
are. `MAXI` = 3,000 instance slots sent in full for three machines was 2.28 MB
a frame. `pack(since)` walking all 32,400 cells on every request from every
viewer is the same shape, and has not been fixed.

Render does not reliably auto-deploy. Always Manual Deploy → Deploy latest
commit and confirm before debugging anything else.

**The two build lines are facts now, and they were not.** `page` was a
timestamp stamped into `index.html` by hand, so two different pages went out
under one stamp on 10 September. `world` was a *sentence someone typed* in
`server.js` — `const BUILD = "2026-09-07 - the wheels turn and steer ..."` —
which nothing updated, so it read the same through every deploy for a week and
described work from the 5th while claiming the 7th. The old rule here said to
check the two agreed; they were never the same kind of thing and could not
agree, and following that rule cost an afternoon of telling Jeff he had not
deployed when he had. `page` is now stamped by `branches/push.sh` at the
moment the file goes out, and `world` is Render's own `RENDER_GIT_COMMIT` plus
how long the server has been up. Both can be believed.

Do not trust a read taken just after a push or a deploy. Both
`raw.githubusercontent.com` and the live server serve stale copies for minutes.

**And do not trust a write into the folder either.** It is a Dropbox folder.
A file written into it and reported as written came back a version behind
about half an hour later, having silently lost the driver's view while
keeping everything else. Nothing announced it. After writing anything into
the folder, read it back and grep for something you know you just added —
size and modification time are not enough, because Dropbox's own sync moves
both.

A shallow clone rebased over the server's own commits will silently no-op.
Fetch, `reset --hard origin/main`, re-apply the file, commit, push, retry on
rejection.

Patches that assert before writing lose their work silently. Write every change
as one script that proves every anchor in every file first and writes only at
the end. When an anchor is a substring of another anchor, the count comes out as
two — include the preceding line.

**The recurring bug class: quantities scaled to cell or machine size, and bare
constants compared against heights.** A cell is 5.6 m and a machine is 6 m, so
anything tied to either silently became metres. Found so far: the bucket moving
1,395 m³ a scoop; the wind removing a fraction of any raised ground forty times
a second; rutting trenching a metre a second; drive speed at 35 km/h; the slide
rate throwing a machine two hundred metres a second; a bite depth of nearly two
metres; a 1.7 m fudge holding the teeth clear of the sand; dust sprites ten
metres across; and now the collapse test at 0.55 m, which is the size of one
tip. Anything still expressed in `CS` or `machLen` is suspect, and so is any
comparison of `h[...]` or a height against a small constant.

Check your own arithmetic before reporting a number. Derive units explicitly.

**A picture of the field cannot answer a question about the machines.** The
relief of the whole kilometre moves mostly because the sand settles and the
wind works: a twenty-minute run with eight machines "touched" thirteen
thousand cells, which is far more ground than eight machines go near. Ask
the machines what they did instead — `branches/fill.js` does.

**A comment beside a constant is not the constant.** `var BUILT=1788622677212`
carried the comment `/* 2026-09-07 15:37 UTC */`. The value is 2026-09-05
15:37. A whole session was spent believing there was a 7 September to deploy;
there was not, and nothing had been pushed since the 6th. Decode the number.

Beware anything that must contain a grid cell. Any code that gathers cells
within a distance needs a fallback for gathering none.

Take Jeff's descriptions seriously even when a headless test says otherwise —
it means the test is missing something. But look for yourself first, because
you can.

Test headlessly wherever possible. `sim.node.js` runs in node. Reproduce his
exact conditions, not a convenient population — two machines on a kilometre
behaves nothing like forty. Do not run the simulation through `eval` or `vm`;
V8 cannot optimise it and it goes about a hundred times slower.

**Measure the thing the machine is trying to do, where it is trying to do it.**
For most of a session the raisers were judged by the relief of a whole square
kilometre, which one machine working a thirty-metre patch cannot move. By that
figure the live code fails too — a control run is what showed it. What a raiser
wants is its own summit standing higher above the ground around it, which is
what it computes for itself, and measured that way the answer was the opposite.

**A pass, a stroke or a cycle needs a way to end that does not depend on it
succeeding.** Making the dig end when the bucket stopped taking sand left a
raiser standing in one place for a whole thirty-minute run, because it had dug
the ground away below its own reach and nothing was left to tell it so. The
arm moving is what finishes a pass; sand arriving is only what fills it.

**Do not cache what has to stay in step with something else.** The summit cell
was remembered rather than looked up, to save two divides, and the first time
a summit was set somewhere that did not also set the cache the collapse stopped
happening at all — silently, and the run still looked plausible.

**Run long enough.** Thirty minutes said the small bucket stopped raisers
raising. An hour said the opposite, and that the big bucket builds a hill and
then loses it. Half an hour would have led Jeff to the wrong decision.

**Measure the purpose, not the effort.** Bucketloads moved says almost nothing.
The relief of the whole field — how far ground stands above or below what
surrounds it — is what a filler is trying to reduce and a raiser to increase,
and it repeatedly disagreed with throughput.

Twenty simulated minutes takes about six minutes of wall clock on two cores,
and four runs at once take four times that. Start pairs in the background and
poll; say something to Jeff while they run.

## How Jeff works

Direct, plain English, one step at a time. No enthusiasm, no filler. Give him
one thing to do, not three. He has been finding faults by watching carefully and
describing precisely — treat those descriptions as evidence.

He is on an iPhone much of the time, so anything needing a keyboard needs a
button too.

He does not want an artificial limit on anything. If it breaks, it breaks. He
wants everything as real as possible, and said so in those words — which is why
the dig was rebuilt and why the bucket is now a question.

If you have been working a long time without saying anything, say something.
He will ask if you are still there, and he should not have to.
