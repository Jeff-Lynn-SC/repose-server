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

---

## E. The dig made honest, 6 September

Answered by Jeff with one sentence, twice: *the same rule as always, match
reality.*

**The bucket holds what the bucket holds.** It was 26 cubic metres, which is
about seven times what the bucket drawn on the screen can physically contain.
The machine you watched and the machine that moved the sand were not the same
machine. A loader bucket is a triangle in section - back plate, floor, and the
opening running from the top of the back plate down to the teeth - and those
four numbers are already in the model. This one holds **3.6 cubic metres**.
Redraw the bucket and the physics follows without anybody touching a capacity.

**The depth of cut is not a number.** A loading shovel fills its bucket in one
pass, so the cut is the bucket spread over the width of the bucket and the
length of a pass. It comes out at half a metre. `CUT_MAX` and `PUSH_CUT` were
two numbers and are now none.

**A pass is a sweep, not a clock.** The seven-second stroke, the 4.6-second
tip, the fill rate of `cap*0.17` a second, "full is two thirds", "empty is a
tenth" and the fourteen-second give-up are all gone. What comes up is the
width of the bucket times the depth of cut times how far the teeth were
dragged. Ground that gives nothing costs the same pass and yields nothing, so
digging in rock is slow because it is rock. A pass that comes up empty is the
whole of how a machine learns this ground is finished.

**The tip is an angle, not a clock.** The bucket rolls at the speed its ram
moves it, and sand leaves when the bucket can no longer hold it. A full bucket
pours for longer than a half-empty one, which is true and was not modelled.

**The collapse comes from the sand.** It was `now < this.best - 0.55`, and one
tip used to put 0.46 m onto a cell, so the test could not tell a hill failing
from a bucket being moved: measured, 85 collapses in half an hour, median
0.56 m, largest 1.06 m, not one of them a hill. The only thing that lowers
ground without a machine doing it is `relax`, which is the sand refusing to
stand where it was put. Each raiser notes where its summit stood, the sand is
allowed to settle, and whatever `relax` took out of that summit is a slump and
nothing else. What counts as failing is the machine's own bucket. No constant
in it at all. Tested: a six-metre spike on a summit fires it once; three
minutes of ordinary work beside it fires nothing.

New, and all of them a rate or an angle of the machine rather than a schedule:
`DRAG` (0.60 m/s, how fast the teeth are pulled through sand), `ROLL`
(0.50 rad/s), `PASS` (0.42 machine lengths), and `SPILL_AT`/`EMPTY_AT`, the
two angles at which a bucket starts and finishes letting go.

### What it cost and what it bought

Eight machines, forty minutes, same world. A raiser's purpose measured where
it actually lives - how far its own summit stands above the ground around it -
because the figure used before averaged over a whole kilometre that one
machine cannot reach, and by that figure the old code failed too.

| | summit after 40 min | sand moved | collapses |
|---|---|---|---|
| before | +3.42 m, and falling back from +3.52 | 15,263 m³ | 135 |
| after | +1.66 m and still climbing | 2,740 m³ | 0 |

Half the height on a fifth of the sand, which is two and a half times as much
hill per cubic metre - and where the old one plateaued and began losing ground
at half an hour, this one had not stopped. Fillers: relief −0.0072 against
−0.0048, on 2,300 m³ against 10,000.

Two faults found on the way, both of the usual kind. A raiser stood still for a
whole thirty-minute run, because a pass that could only end when sand arrived
never ended if sand never arrived; the pass now advances because the arm is
moving. And letting a raiser work one face until it was gone - which is right
for a filler - had it park between a hole and a heap thirteen metres apart and
spend half an hour turning on the spot: every bucket it lands pushes its own
repose cone out past the cut it just made, so it has to keep moving round.

---

## D. Pushing, added 5 September

A machine can now move sand two ways: dig a bucket and carry it, or put the
bucket on the ground and drive. Both purposes have both. Written down here
because it added constants as well as deleting them, and the ledger should be
honest in both directions.

### What it deleted, or refused to add

**The push/carry choice is not a threshold.** It is the same reckoning the
filler already used to pick a job — sand moved per second — run twice, once
for each way of moving it. A blade load is dead weight that eats the
machine's grip exactly as a slope does, so a push up anything steep simply
takes so long that the arithmetic refuses it. There is no rule about slopes
anywhere in it. What falls out: pushing wins under about twenty-five metres
on the flat, that distance collapses as the ground tilts, and somewhere near
eighteen degrees it goes below the length of the machine and pushing stops
being possible at all. Those three numbers are consequences. Change the angle
of repose and they change.

**How deep the blade cuts is not a schedule.** It is the ceiling times
whatever grip is left over, so the cut thins away as the blade fills and
stops altogether on a bank. And nothing charges the machine for cutting:
what it cuts becomes load, and load is already what eats its grip.

**Giving up on a shove is not a timer.** Once a second the machine asks
whether shoving on still beats picking the bucket up and driving. Shoving is
slower over the ground but it is still gathering; lifting is quicker and
gathers nothing. So a machine shoves while the blade is filling and lifts
once it is full — unless the far end is nearer than a blade takes to fill,
in which case it shoves the whole way, which is the short haul into a
hollow.

**The raiser's ring is now chosen rather than derived.** It considers two
distances — as far out as the sand runs back, which is the old cone, and as
far out as a blade needs to fill, which it knows from its own bucket over its
own blade — and takes whichever reckons better. Measured, this alone made a
raiser reach the same height on a quarter less digging.

### What it added, and what those numbers are

**`PUSH_RES = 0.55`** — how much of a machine's grip a full blade eats.
Machine build, the same family as `DRIVE` and the thirty-degree climb limit,
and the same objection applies: every machine ever born has the same one, and
damage should show here first.

**`PUSH_CUT = 0.70` m** — the deepest a blade will ever cut. Not chosen
freely: a blade fills over about four times its own width, which is what
dozing looks like, so this is a bucket spread over that distance. It should
probably stop being a constant at all and become the same quantity as the
bucket's bite when digging, which would collapse two numbers into one.

**`PUSH_SPILL = 0.004` per metre** — the fraction of the load that rolls off
the ends of the blade as it travels. This is why nobody pushes sand across
the pit: the world punishes a long shove rather than a rule forbidding it.
Sampled from nothing; it is the one number here with no argument behind it
beyond being the right order.

**`BLADE_W = 0.52`** of a machine length — how wide the bucket is. A fact
about the model, not a decision.

### The thing pushing exposed

A dig-and-tip cycle moves twenty-six cubic metres in about twelve seconds.
One pass of the teeth physically cuts about four — three metres of bucket, half
a metre of bite, two and a half metres of drag. The bucket is not being filled
by the pass; it is being filled by `cap*0.17` a second, a rate with no
connection to the geometry, and the seven-second stroke exists to give that
rate time to work. That is why carrying beats shoving by a factor of twenty,
and it is the largest untrue number in the file.

---

## If it were ranked

1. **Repose from the sand's history.** Removes the piece's central constant and
   would visibly change every face in the world. Freshly tipped sand stands
   shallow, settled sand stands steeper, sand that has just avalanched is loose
   again, driven-over sand is packed - which is already modelled as `wear`.
2. **The raiser still builds on ground it prepared itself.** It digs a ring
   round its own summit and never considers standing on a hill somebody else
   made, or taking a summit already occupied. The ring is chosen by reckoning
   now, which is a start and not an answer.
3. **How hard to think is itself a decision.** A filler considers 28
   candidates, always. It could look harder when the best thing it has found is
   poor and stop early when something obviously good turns up.
4. **One carry distance, and let it define what a hollow is.** The 38 m over
   which relief is measured should be the distance the machine is willing to
   carry, which would collapse two constants into one.
5. **Damage should show somewhere.** It is carried, it kills machines, and it
   is invisible in the hydraulics, the drive speed and the grip - all three of
   which are identical in every machine that has ever lived.
6. **`PUSH_SPILL` has no argument behind it.** 0.004 of the blade load per
   metre. Everything else in the pushing arithmetic can be defended; this
   cannot, beyond being the right order.

*Struck from this list: the datum rule is deleted; giving up, filling up and
choosing how to move a load are done by the same economics that picks the job;
the bucket holds what the bucket holds and the depth of cut follows from it;
the stroke and the tip are a sweep and an angle rather than two clocks; and a
hill coming down is the sand refusing rather than a number.*
