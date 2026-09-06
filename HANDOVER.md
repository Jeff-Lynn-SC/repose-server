# Repose — where things stand, and what comes next

Paste this at the start of a new session. Written 5 September 2026, replacing
the version of 7 September.

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

Playwright and Chromium are installed (`/home/claude/.npm-global/lib/node_modules/playwright`;
launch with `args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']`).
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

## The three things waiting on Jeff

These are asked and unanswered, and everything else is downstream of them.

**1. The bucket.** A pass of the teeth physically cuts about 5.5 m³ — three
metres of bucket, seven tenths of a metre of bite, two and a half metres of
drag. The bucket is set to 26. So the pass is not filling the bucket: `cap*0.17`
a second is, a rate with no connection to the geometry, and the seven-second
stroke exists to give that rate time to work. Either the bucket stays at 26 and
takes five passes, or it becomes what one pass cuts. Measured, both, in
`branches/NOTES.md`. The small bucket is better at both purposes on a third of
the sand.

**2. The collapse event.** `now < this.best - 0.55` is a bare number, and one
tip of the bucket puts 0.46 m onto a cell. Measured over eight raisers and half
an hour: 85 collapses, median 0.56 m, largest 1.06 m, seventy-seven of the
eighty-five between 0.50 and 0.75. Not one of them was a hill coming down. The
piece's most dramatic event is mostly counting the size of a bucket. `relax`
already knows how much sand it moved and there is already an event for a face
actually failing; that is where the raiser's sense of it should come from.

**3. Whether to land the honest dig at all.** Built and measured on both
branches, not wired in.

## What to build next, after those

1. **The honest dig**, per above.
2. **Wrecks persist.** Machines accumulate damage and break down. A wreck stays
   where it fell, becomes an obstacle, and is buried or built on.
3. **Goal-seeking proper for the raiser.** It still digs around a ring rather
   than considering standing on a hill someone else built, or taking a summit
   already occupied. The ring is now chosen rather than derived, which is a
   start.
4. **Accidental or otherwise.** Nothing lets one machine act on another. Not
   aggression: if a raiser pursues height without regard, burying a stranded
   machine is the consequence of not caring.
5. **Repose from the sand's history.** Removes the piece's central constant.
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

Pushing to GitHub can be done for him, but not from the sandbox: the proxy
blocks `github.com/login/device` and refuses to inject credentials for these
repositories. The Mac's shell has full GitHub access and git installed, so run
the whole thing there:

```
# in device_bash, on the Mac
curl -s -X POST https://github.com/login/device/code \
  -H "Accept: application/json" \
  -d "client_id=178c6fc778ccc68e1d6a&scope=public_repo"
```

Show Jeff the eight-character code for `github.com/login/device`, poll for the
token, write it to a file that is never printed, and use it through
`git -c credential.helper=...` so it never lands in a config file. Clone both
repositories into the Mac's scratch (outside `mnt/`), copy the files across,
commit, push. A device code lasts fourteen minutes and Jeff will often need a
fresh one — issue it and start polling in the same call.

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

Beware anything that must contain a grid cell. Any code that gathers cells
within a distance needs a fallback for gathering none.

Take Jeff's descriptions seriously even when a headless test says otherwise —
it means the test is missing something. But look for yourself first, because
you can.

Test headlessly wherever possible. `sim.node.js` runs in node. Reproduce his
exact conditions, not a convenient population — two machines on a kilometre
behaves nothing like forty. Do not run the simulation through `eval` or `vm`;
V8 cannot optimise it and it goes about a hundred times slower.

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
