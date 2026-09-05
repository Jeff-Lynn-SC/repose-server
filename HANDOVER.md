# Repose — where things stand, and what comes next

Paste this at the start of a new session. Written 7 September 2026,
replacing the version of 3 September.

## What Repose is

A fixed square kilometre of sand. Machines work it. Each has one of two
purposes, assigned at birth:

* **Raise** — get my own ground higher.
* **Fill** — get hollows filled in.

Neither knows the other exists. Neither is competing. Their actions are
nonetheless in direct opposition, because there is one quantity of sand and no
more: nothing enters the world and nothing leaves it.

It is an analogy for people competing for limited resources to feed their egos,
and it should be allowed to be as bleak as that implies.

Live at `jeff-lynn-sc.github.io/Repose/` — one shared world for everyone, each
viewer with their own camera. Named for the angle of repose: the steepest face
loose sand will hold before it fails.

## The governing principle

The purposes are goals, not procedures. High is good, no matter how. Level is
good, no matter how. How a machine achieves its goal should be discovered, not
specified.

There is no height limit and none should be added. If a mound goes unstable and
slumps, that is the sand refusing, which is the piece, not a designer refusing.

`DECISIONS.md` in the project folder lists every choice still being made *for*
the machines that they could make themselves, ranked. Read it before adding
anything. One rule listed there has already been deleted on that argument (the
datum rule, below).

---

## READ THIS FIRST: you can see now

The old handover said "I cannot see anything. No GPU, no browser, no
screenshots unless Jeff sends them." **That is no longer true, and it changes
how everything gets done.**

`index.html` has three.js inlined, and when the live server is unreachable the
page falls back to computing a world itself in its own worker. The sandbox
cannot reach Render — so the page always falls back. Therefore:

    python3 -m http.server 8099          # serve the folder
    # then drive Chromium via Playwright at
    # http://127.0.0.1:8099/index.html?dev&pop=2

Playwright and Chromium are already installed
(`/home/claude/.npm-global/lib/node_modules/playwright`; launch with
`args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']`).
Give it about 30 seconds to boot the world, then screenshot.

**Use it before changing anything visual, and use it to check afterwards.**
Three separate visual complaints of Jeff's were diagnosed in one frame each
after days of guessing.

Two practical notes:

* The page's whole script is inside an IIFE, so nothing is global. To drive the
  camera, copy `index.html` to `test.html` and inject a hook before the final
  `})();` exposing `man`, `manualOn`, and the machine array `agB`. **Never push
  the hook.**
* The machines move, so aim the camera immediately before each screenshot or
  the subject drives out of frame.
* Rendering geometry alone (no simulation) is faster: extract the three.js
  block and the geometry section into two files and build a tiny page that
  draws the rig at chosen joint angles. Good for judging a model in isolation.

---

## What was wrong, and was fixed on 3–7 September

All of it found by measurement or by Jeff watching. The same faults recur in
the same shapes.

**A filler stood still for sixteen minutes at a time.** Three faults at once:
`armTo` positioned the bucket *pivot* while the *teeth* were what dug and hung
a quarter of a length off it; the elbow had only the bare geometric limit so a
close target folded the arm through its own boom; and the give-up test counted
every grain taken since arriving, so one spoonful excused a machine from ever
giving up. Eight loads in twenty minutes became fifty-eight.

**It buried the whole arm.** The depth of cut was a fraction of a machine
length — nearly two metres — so the boom had to follow its own teeth down.

**It never filled anything.** It weighed the drop between two points, which any
slope provides, so it shaved high ground onto slightly lower ground. Measured,
it was digging in places 0.28 m *below* their own surroundings and tipping onto
places only 0.15 m below theirs — the reverse of its purpose. It now weighs
**relief**: how far a place stands above or below the ground around it, at both
ends of the job.

**It changed its mind after every single bucket.** After emptying it chose an
entirely new cut and a new place to tip. It now returns to the same cut while
the pair still pays.

**The datum rule.** Jeff asked that a filler never take sand from below the
datum. Measured, it fired on 9 of 14 job changes, because the world's mean
ground *is* the datum and one load takes half a metre out of a cell. Deleted at
Jeff's word: relief already refuses what the rule refused.

**The machines are JCB Loadalls now**, not tracked excavators — see below.

**The dust was a whiteout, and I caused it.** Trying to make tipping visible, I
raised the sprites to nearly ten metres across at thirty a second. They stacked
into opaque white fog wider than the machine and hid everything inside it,
including the thing they were meant to show. Cut to a fifth the size and half
the opacity.

**It emptied while still turning.** Facing its work by swinging the whole body
meant up to eighty degrees of swing *during* a tip, laying the load down in an
arc across two cells at 0.31 m instead of into one at 0.56 m. It squares up
first now and does not dig or tip until it is pointing at the job.

**The bucket never looked like it drained.** The sand in it was drawn at a
third of its height however little was left, then vanished at three percent.

**The wheels never turned.** They were baked into the chassis as one merged
mesh.

## The machine

A JCB Loadall telehandler. Four wheels that turn and steer, a chassis, the
engine bay down the boom side and the cab a glasshouse on the other, a boom
that pivots at the back and telescopes, and a wide flat loading bucket with a
straight cutting edge and the sand heaped visibly in it.

**One machine type for both purposes.** Jeff considered two and ruled it out:
the only difference between a raiser and a filler is the goal, and you must not
be able to tell which is which by looking.

The kinematics are *simpler* than the jointed arm they replaced. A telescopic
boom solves exactly — pitch is one arctangent, extension is one distance. In
the code `stick` is now a length rather than an angle, which keeps the wire and
save formats unchanged. There is no elbow, so an arm folding through itself
cannot be expressed at all. With no slewing house the machine turns its whole
body to face its work.

Constants, all in `toothWorld`: `L_BASE=1.30`, `E_MAX=0.90`, pitch limited to
`[-0.80, 1.15]`, boom pivot at `(-0.50, 0.700, -0.140)`, cutting edge at
`(0.275, -0.249)` in the bucket's frame. **The boom pivots high on this machine
— level with the cab roof — so it needs a lot of down-pitch to reach the
ground. The first limit was too tight and the raiser stalled for 197 seconds at
a stretch.**

Wheels: spin and steer are both derived by the renderer from how far the
machine moved and how fast it turned. The simulation is never asked.

## What it does, measured

One machine alone, twenty simulated minutes, on the ordinary smooth field:

* filler: 53 loads, longest stationary 14 s, teeth in the sand 85% of digging
* raiser: 62 loads, longest stationary 15 s, teeth in the sand 64%
* bucket pivot buried 0%, boom buried 0%, mass conserved exactly

One tip lands in a single cell and raises it 0.55 m. A bucket is 26 m³ and a
load is 17.3 of them.

## What to build next

**1. Pushing as well as lifting — Jeff's, and the next thing to do.** In his
words: *"it makes more sense for the filler to push sand from a raised area
into a depression most of the time and only lift the sand bucket by bucket when
the raised area is far from the hole."*

Both purposes get the same two abilities and the goal picks between them —
which keeps the rule that only the goal differs. What falls out for free:

* A raiser starts by shoving sand up a shallow mound and **has to** switch to
  lifting as the mound grows too steep to push up. Nobody writes that
  transition; the angle of repose decides it. The shallow scrape it leaves
  behind while dozing is where the sand came from.
* A filler will mostly push, because a hollow is by definition downhill of the
  sand beside it. So the two purposes end up *looking* different without being
  different.

Pushing means: drive forward with the bucket down, accumulate a blade load in
front, deposit it where you stop. Choosing between push and carry should be the
same economics the filler already uses to pick a job — not a threshold.

**2. A driver's view.** Asked for twice. The camera has six shot types and none
is inside the cab. Small: the cab position is known, so the camera goes there
looking along the boom.

**3. Wrecks persist.** Machines accumulate damage and break down. A wreck stays
where it fell, becomes an obstacle, and is buried or built on.

**4. Goal-seeking proper for the raiser.** It still digs around a ring rather
than considering standing on a hill someone else built, or taking a summit
already occupied.

**5. Accidental or otherwise.** Nothing lets one machine act on another. Not
aggression: if a raiser pursues height without regard, burying a stranded
machine is the consequence of not caring.

`IDEAS.md` holds Jeff's own thinking, and it has grown a great deal. The
central idea now: **the bigger goal is something human — happiness, or
self-worth — and raising or filling is only a machine's theory about how to get
it.** Success confirms the theory, failure erodes it, enough failure abandons
it. Three things settled there: worth is measured against the ground rather
than against other machines (so the founding rule survives); abandoning a
purpose is contagion rather than reasoning; and settling into a hopeless
comfortable homeostasis is a real outcome, not a failure of the idea. The
bleakness is not that you cannot escape your purpose — it is that the second
act is real, available, and changes nothing, because there is one quantity of
sand.

## Also outstanding

* **Night looks flat.** Sun below the horizon means flat ambient. Needs a moon,
  work lights that illuminate rather than glow, and adaptive exposure. `?hour=2`.
* **Ageing.** Damage is carried and entirely invisible. Paint fade, rust, dust.
  Needs a byte per machine on the wire.
* **A globe.** Small planet you could walk round, or Earth-sized.
* **Every reset begins in the same weather.** `/reset` sets the clock to zero,
  so a fresh world always starts at day 0: raise share 0.25, repose 36°, wind
  0.27. A levelling era.

## How it is put together

Two repositories.

* `Jeff-Lynn-SC/Repose` — `index.html`, one self-contained file, about 748 KB
  with three.js r128 inlined (no CDN: this is meant to last ten years). Served
  by GitHub Pages. `world.json` also lands here, written by the server every
  five minutes, so the commit log is the history of the world.
* `Jeff-Lynn-SC/repose-server` — `server.js`, `sim.node.js`, `bench.js`,
  `IDEAS.md`, `README.md`. Deployed on Render's free tier at
  `https://repose-qd2m.onrender.com`.

**The simulation exists twice, and the two copies must stay byte-identical.**
`sim.node.js` is the file `index.html` inlines as its worker. Check after every
change: extract from the line before `REPOSE — SIMULATION WORKER` to the next
`</script>` in the page, and from the same line to `module.exports` in the node
file, and diff. They should differ by one trailing newline and nothing else.

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
sand will hold, working rate, wind. The sun is real: solar position for
48.05°N, 10.88°E at the real time now.

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

Flags: `?dev` `?key=` `?hour=21` `?shot=follow` `?pop=800` `?time=6` `?fresh`
`?nosave`. `?v=anything` busts the cache — **use it after every deploy, and
check the two build lines agree before judging anything.**

## Getting changes live

Files live in `/Users/jefflynn/Library/CloudStorage/Dropbox/Personal Jeff/Art/Repose`.
Ask for access at the start of a session and write finished files straight in —
Jeff does not want downloads.

**Pushing to GitHub can be done for him, but the route has changed.** The
sandbox's proxy now blocks `github.com/login/device` and refuses to inject
credentials for these repositories, so neither the device-flow login nor a
direct push works from the sandbox. **The Mac's shell has full GitHub access
and git installed**, so run the whole thing there:

    # in device_bash, on the Mac
    curl -s -X POST https://github.com/login/device/code \
      -H "Accept: application/json" \
      -d "client_id=178c6fc778ccc68e1d6a&scope=public_repo"

Show Jeff the eight-character code for `github.com/login/device`, poll for the
token, write it to a file that is never printed, and use it through
`git -c credential.helper=...` so it never lands in a config file. Clone both
repositories into the Mac's scratch (outside `mnt/`), copy the files across
from the folder, commit, push. A device code lasts fourteen minutes and Jeff
will often need a fresh one — issue it and start polling in the same call.

Do not use client id `Iv1.b507a08c87ecfe98` — that is the GitHub CLI's App and
its token has no scopes.

**Deploying and resetting cannot be done for him.** The sandbox refuses
`api.render.com` and `*.onrender.com` from every shell. So: you push, Jeff
deploys. `repose-keys.txt` in the folder holds an unusable deploy hook and
reset key and can be blanked.

## Hard-won lessons — please read these

**Render does not reliably auto-deploy.** Always Manual Deploy → Deploy latest
commit and confirm before debugging anything else.

**Check the two build lines agree before believing anything you are told about
what the world looks like.** Jeff spent a round of feedback judging a bucket on
a page that did not contain it — GitHub Pages had not published yet. The
readout shows `page` and `world` dates; if they disagree, that is the only
thing to fix.

**Do not trust a read taken just after a push or a deploy.** Both
`raw.githubusercontent.com` and the live server serve stale copies for minutes.

**A shallow clone rebased over the server's own commits will silently no-op.**
Fetch, `reset --hard origin/main`, re-apply the file, commit, push, retry on
rejection.

**Patches that assert before writing lose their work silently.** Write every
change as one script that proves every anchor in every file first and writes
only at the end. When an anchor is a substring of another anchor, the count
comes out as two — include the preceding line.

**The recurring bug class: quantities scaled to cell or machine size.**
Everything used to scale with the grid, which was right when a cell was 87 cm.
A cell is 5.6 m and a machine is 6 m, so anything tied to either silently
became metres. Found so far: the bucket moving 1,395 m³ a scoop; the wind
removing a fraction of any raised ground forty times a second; rutting
trenching a metre a second; drive speed at 35 km/h; the slide rate throwing a
machine two hundred metres a second; a bite depth of nearly two metres; a
1.7 m fudge holding the teeth clear of the sand; dust sprites ten metres
across. **Anything still expressed in `CS` or `machLen` is suspect.**

**Dead guards that compare an absolute height against a small number.** Heights
used to be measured from zero and are now absolute, about 19 m. Two guards
compared `h[i]` against numbers under two and had therefore never once fired.
Grep for any comparison of `h[...]` against a small constant.

**Check your own arithmetic before reporting a number to Jeff.** I told him a
bucket moves 2.7 cm of ground. It moves 0.55 m — `cap` is already a height per
cell and I divided by the cell area a second time. He reasoned from that number
before I caught it. Derive units explicitly.

**Beware anything that must contain a grid cell.** Any code that gathers cells
within a distance needs a fallback for gathering none.

**Take Jeff's descriptions seriously even when a headless test says
otherwise** — it means the test is missing something. Every fault this week
started with him watching. But now you can look too: do that first.

**Test headlessly wherever possible.** `sim.node.js` runs in node. Reproduce
his exact conditions, not a convenient population — two machines on a kilometre
behaves nothing like forty. Do not run the simulation through `eval` or `vm`;
V8 cannot optimise it and it goes about a hundred times slower. A twenty-minute
run takes about five minutes of wall clock, so start pairs in the background
and poll.

## How Jeff works

Direct, plain English, one step at a time. No enthusiasm, no filler. Give him
one thing to do, not three. He has been finding faults by watching carefully
and describing precisely — treat those descriptions as evidence.

He is on an iPhone much of the time, so anything needing a keyboard needs a
button too.

He does not want an artificial limit on anything. If it breaks, it breaks.

If you have been working a long time without saying anything, say something.
He will ask if you are still there, and he should not have to.
