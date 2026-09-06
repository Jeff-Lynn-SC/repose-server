# Branches — built and measured, not landed

Written 5 September 2026, at the end of the session that added pushing.

Nothing in this folder is wired into the piece. `sim.node.js` and
`index.html` in the folder above are the working version and do not contain
any of this. These files are here so that a night's measured work is not
lost in a sandbox, and so that landing either one is a copy rather than a
rebuild.

---

## The two simulations

Both are drop-in replacements for `../sim.node.js`. To land either:

    cp branches/sim.honest-dig-26.js sim.node.js
    node branches/sync.js            # puts it back inside index.html and proves they match

`sync.js` refuses rather than half-writing if it cannot find its anchors, and
checks afterwards that the two copies of the simulation are byte-identical.
They must be.

### `sim.honest-dig-26.js` — the dig made honest, bucket left at 26 m³

The seven-second stroke, the 4.6-second tip, the fill rate of `cap*0.17` a
second, the "full is two thirds" and "empty is a tenth" tests, and the
fourteen-second give-up are all gone.

A pass of the teeth is now a real sweep: the width of the bucket, by the
depth it can cut, by the length of the pass. It advances only while the
teeth are in the sand. A bucket takes as many passes as its volume needs —
five, at 26 m³. Ground that gives nothing costs the same passes and yields
nothing, so digging in rock is slow because it is rock. A pass that comes up
empty is the whole of how a machine learns this ground is finished.

The tip is the same: the bucket rolls at the speed its ram moves it, and
sand leaves when the bucket can no longer hold it, which is a matter of
angle. A full bucket pours for longer than a half-empty one.

New: `PASS` (0.42 machine lengths), `DRAG` (0.60 m/s), `ROLL` (0.50 rad/s),
`SPILL_AT` and `EMPTY_AT` (two angles of the bucket). `PUSH_CUT` and the
digging bite are now one number, `CUT_MAX`. `reckon` gets its cycle time
from `digCycle()`, which is derived, instead of `2/(0.17*rateMul)`.

### `sim.honest-dig-onepass.js` — the same, and the bucket is a consequence

Identical, except `BUCKET` stops being 26 and becomes what one pass of its
own teeth cuts: width × depth of cut × length of pass, worked out in
`applyScale` because it depends on how big the machine is at that scale. It
comes out at 5.5 m³ for a six-metre machine.

---

## What they measure

Eight machines, thirty minutes, same seed, same world. Cubic metres, so the
two bucket sizes compare.

**Fillers** — they want relief smaller.

| | moved | relief | shoved |
|---|---|---|---|
| what is in the folder now | 10,850 m³ | −0.0043 | a third |
| honest dig, 26 m³ | 9,394 m³ | −0.0035 | three fifths |
| honest dig, one pass | 3,548 m³ | **−0.0069** | a third |

**Raisers**, over an hour rather than half of one — they want relief bigger.

| minutes | 26 m³ | one pass |
|---|---|---|
| 20 | +0.0011 | −0.0024 |
| 40 | +0.0040 | +0.0002 |
| 60 | +0.0012, 17,105 m³, 144 collapses | +0.0018 and still rising, 6,376 m³, 5 collapses |

The big bucket builds fast, over-steepens and falls back to where it began.
The small one builds slowly and had not stopped at the hour, on a third of
the sand.

Making the dig honest is what made pushing worth doing: a filler's shoved
share goes from a third to three fifths. Pushing was losing because digging
was cheating.

---

## The thing that is wrong in the working version

The raiser's collapse event is `now < this.best - 0.55`, a bare number. One
tip of the bucket puts 0.46 m onto a cell. Measured over eight raisers and
half an hour: 85 collapses, median size 0.56 m, largest in the whole run
1.06 m, seventy-seven of the eighty-five between 0.50 and 0.75. Not one of
them was a hill coming down. It is the recurring bug class — a height
against a small constant — and it is sitting under the piece's most
dramatic event.

`relax` already knows how much sand it moved on any step, and there is
already an event (kind 1) that fires when it moves a great deal at once.
That is a face actually failing. The raiser's own sense of its hill coming
down should come from there.

This is not fixed in either branch. It wants deciding first, because it
changes how often the piece does its most dramatic thing.

---

## The tools

`probe.js <raise|fill> [minutes] [pop] [seed]` — one purpose alone or a pit
of them; loads, shoved share, stalls, teeth in the sand, mass drift, and the
relief of the whole field before and after. The numbers above came from this.

`trend.js <raise|fill> [minutes] [pop]` — the same, reported every ten
minutes, which is how the raiser result turned out to be the opposite of
what half an hour said.

`collapse.js [minutes] [pop]` — the size distribution of collapse events.

`soak.js [minutes] [pop] [seed]` — a whole pit left alone, checking mass
conservation and that nothing goes non-finite. An hour of forty machines
conserves mass to a thousandth of a per cent.

`sync.js` — the only thing allowed to write one copy of the simulation from
the other.

`mktest.sh [red]` — builds `test.html` from `index.html` with a hook that
exposes the camera and lets the world be paused, which is what makes any of
the visual work possible. Never push `test.html`.

`shot.js`, `blade.js`, `cab.js` — drive a headless browser at
`http://127.0.0.1:8099/test.html`, wait for the world, aim, and look. Serve
the folder with `python3 -m http.server 8099` first. Pause the world before
aiming or the machine drives out of frame: at `?dev` the local worker runs
about seventy times real time.
