# Repose — where things stand, and what comes next

Paste this at the start of a new session. Written 6 September 2026, replacing
the version of 5 September.

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
the machine is about to work. There is no button for it yet.

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

## What to build next

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

* Night looks flat. Sun below the horizon means flat ambient. Needs a moon,
  work lights that illuminate rather than glow, and adaptive exposure. `?hour=2`.
* Ageing. Damage is carried and entirely invisible. Paint fade, rust, dust.
  Needs a byte per machine on the wire.
* A globe. Small planet you could walk round, or Earth-sized.
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

Render does not reliably auto-deploy. Always Manual Deploy → Deploy latest
commit and confirm before debugging anything else.

Check the two build lines agree before believing anything you are told about
what the world looks like. The readout shows `page` and `world` dates; if they
disagree, that is the only thing to fix.

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
