# Decisions a designer made that a machine could make

Written 4 September, after Jeff asked two questions: which choices about the
machines' actions were mine rather than theirs, and which constants could come
from something more primitive.

The test applied throughout: **does this number answer a question the machine is
in a position to answer for itself?** If it does, it is a procedure wearing the
clothes of a fact.

---

## A. The operator's hands

How a machine works its arm. All of it is prescribed; none of it responds to
what the sand is actually doing.

**The stroke is 7.0 seconds, and tipping is 4.6.** `this.stroke%7.0`. A dig
lasts a fixed time whether the bucket filled in two seconds or never filled at
all. It could dig until the bucket stops taking sand, and tip until it is empty.
Both of those it can measure. The clock is doing work that observation could do.

**The bite depth is a sine.** `0.10+0.45*sin(πq)` metres — into the sand and out
again on a fixed curve, the same in loose sand and in ground worked half to rock.
It could cut deeper while the load keeps coming and lift when it stalls. `got`
already tells it, and is already read for another purpose.

**The bucket attitude is a ramp.** `d3 = -0.90-0.90q`. Teeth down going in,
curling as it fills, on a schedule. An operator changes the attack angle with
the material. This one cannot.

**The pass shape is fixed.** Reach clamped to 0.85–1.50 machine lengths, teeth
dragged back 0.42 over the stroke. One shape of cut, always.

**Full is two thirds and empty is a tenth.** `load >= cap-0.05*CS` and
`load <= 0.02*CS`. Neither number means anything — and both are still in cell
units, so both quietly changed meaning when the cell grew. The real question is
when another second of digging is worth less than going, and the filler
*already computes exactly that* when it picks a job. It just doesn't use it here.

**Fourteen seconds of nothing before it gives up on a spot.** Same objection,
same answer available.

**Seven fixed bearings to try when the way is blocked.** `DETOUR`.

**Hydraulics lag at `dt*1.5`, the house slews at `dt*0.9`.** Fair as machine
build — but every machine ever born has identical hydraulics, and damage, which
is carried and entirely invisible, could show here first.

---

## B. The operator's head

How a machine chooses its work. Better than the hands — the filler genuinely
weighs jobs — but the weighing is hedged about with sampled constants.

**It considers 28 candidates.** How hard to think is itself a decision. It could
look harder when the best thing it has found so far is poor, and stop early when
something obviously good turns up.

**Where it looks:** `(3+crowd*12)*machLen*(0.5+rnd*rnd*6)`.
**How far it will carry:** `(1.2+rnd²*10)*machLen`.
Both sampled from shapes I chose, not judged.

**A hollow is defined at 38 metres.** That is the radius `reliefAt` averages
over — the scale at which ground counts as low. It should almost certainly *be*
the distance the machine is willing to carry, which would collapse two constants
into one and make the machine's idea of "a hollow" follow from its own reach.

**Close half the gap.** `gain = min(cap, reliefDifference*0.5)`. Why half.

**The raiser steps `0.9+rnd*0.5` radians round its ring.** Arbitrary.

**The datum rule — the one added today at your request.** A filler will not take
sand from ground below the datum. This is the most designerly thing in the file:
it is a fence, not a purpose. And it is probably redundant. The relief score
already knows that taking from ground lying below its surroundings makes the
world less level — that is precisely what relief measures. Left in because you
asked for it and because it is currently doing real work (53 of 62 dig sites
were below the datum before it), but the honest version is to weight relief
properly and delete the rule. **Worth revisiting once the relief scoring has
been watched for a while.**

**The raiser still builds on ground it prepared itself.** The fourth item named
in the handover as designer's judgement. Still true, still outstanding.

---

## C. Constants, and what they could come from

### The angle of repose — more emergent than you think

Heaps **already collapse under their own weight**, and with hysteresis. `relax`
carries three numbers, not one:

    slopeStat = tan(repose) x 1.30      the face holds past the critical angle
    slopeDyn  = tan(repose) x 0.80      once it fails it runs out past it
    and packed ground stands 35% steeper still, via `wear`

So a pile does build steeper than it can hold, fail, and overshoot on the way
down — which is why a summit slumps rather than creeping. That is not scripted.

What *is* imposed is `tan(34°)` itself, and the two multipliers.

Can the angle be derived? Not on a heightfield from first principles — tan(φ)
**is** the material constant; getting it out of anything more basic needs
grains, and grains are a different piece. But it could stop being a property of
the *world* and become a property of the *sand*:

- freshly tipped sand is loose and stands shallow
- sand left undisturbed settles and stands steeper
- sand that has just avalanched is loose again
- sand driven over is packed — already modelled, as `wear`

Then there is no angle of repose anywhere in the file. There is only sand with a
history, and the angle of any face is whatever that history left it. Two faces
of the same mound would stand differently because they were built differently.
Deep time would set grain character or humidity rather than an angle directly.

That is a real change and a good one. It also makes the piece's own title
emergent, which seems right.

### Other constants of the same kind

**`BUCKET = 26` m³ and `machLen`.** Every machine is the same size. Size could
be inherited, with the ones that get work done leaving more like themselves.

**`DRIVE = 1.40` m/s and the 30° climb limit.** Machine build, uniform across
the population and constant over a machine's life. Damage is already carried and
already invisible; this is where it should show.

**`rateMul`, from deep time.** The whole population works at one rate, decided
by the calendar. Your `IDEAS.md` note about machines choosing their own working
hours is the same observation.

**`SLIP`.** How fast a machine slides on a face too steep to hold it.

**The 0.55-cell bucket disc.** Not physics at all — a numerical artefact, and
the source of the bug that started this whole session. Anything that gathers
cells within a distance needs to work when it gathers none.

### One that is already right

**Saturation at about 200 machines per hectare.** Nobody set that. It falls out
of machines avoiding each other, braking, and taking damage from contact. It is
the model for what all of the above should look like.

---

## If it were ranked

1. **Repose from the sand's history.** Removes the piece's central constant and
   would visibly change every face in the world.
2. **Give up, fill up, and stop digging by the same economics used to pick a
   job.** Deletes three timers and two thresholds, and the machinery to replace
   them is already written.
3. **Bite depth and stroke length from what the sand gives.** Deletes two
   schedules and would make digging in rock look different from digging in
   loose sand.
4. **One carry distance, and let it define what a hollow is.** Deletes a
   constant and ties the machine's idea of the ground to its own reach.
5. **Delete the datum rule, once relief scoring has earned its trust.**
