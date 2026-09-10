# branches — the measuring tools, and two simulations that are now history

Rewritten 6 September 2026.

## Do not land the two simulations in here

`sim.honest-dig-26.js` and `sim.honest-dig-onepass.js` were the two ways of
making the dig honest that were built and measured on the night of 5 September,
so that the choice between them could be made on numbers rather than opinion.
**Both are superseded.** The answer turned out to be neither: the bucket holds
what the bucket, as drawn, actually holds, which is 3.6 m³, and the depth of
cut follows from that. That is in `../sim.node.js` and is live.

They are kept because the tables below are the evidence for a decision, and
evidence should not be thrown away because it lost. Copying either one over
`../sim.node.js` would put the piece back a step.

## What they measured, and what was chosen instead

Eight machines, thirty minutes, same world, cubic metres so the bucket sizes
compare.

Fillers — they want relief smaller:

| | moved | relief |
|---|---|---|
| before any of it | 10,850 m³ | −0.0043 |
| honest dig, bucket left at 26 m³ | 9,394 m³ | −0.0035 |
| honest dig, bucket = one pass (5.5 m³) | 3,548 m³ | −0.0069 |
| **landed: bucket as drawn (3.6 m³)** | **2,300 m³** | **−0.0072** |

Raisers, measured properly — how far a machine's own summit stands above the
ground around it, after forty minutes:

| | summit | moved | collapses |
|---|---|---|---|
| before | +3.42 m, falling back from +3.52 at 35 min | 15,263 m³ | 135 |
| **landed** | **+1.66 m and still climbing** | **2,740 m³** | **0** |

For most of that night the raisers were judged by the relief of a whole square
kilometre, which one machine working a thirty-metre patch cannot move — by that
figure the live code failed too. A control run on the live code is what showed
the instrument was wrong rather than the machines.

## The tools, which are current

`probe.js <raise|fill> [minutes] [pop] [seed]` — loads, shoved share, stalls,
teeth in the sand, mass drift, and the relief of the whole field before and
after. Good for fillers; the wrong instrument for raisers on a kilometre.

`summit.js [minutes] [pop]` — what a raiser is actually trying to do: how far
each machine's own summit stands above the ground around it, over time. This is
the one to use for raisers.

`trend.js <raise|fill> [minutes] [pop]` — reported every ten minutes, which is
how a thirty-minute answer turned out to be the opposite of an hour's.

`collapse.js [minutes] [pop]` — the size distribution of collapse events. It is
what showed that 85 collapses in half an hour had a median size of 0.56 m and a
largest of 1.06 m, and that not one of them was a hill.

`soak.js [minutes] [pop] [seed]` — a whole pit left alone, checking mass
conservation and that nothing goes non-finite.

`sync.js` — the only thing allowed to write one copy of the simulation from the
other. Proves every anchor before writing anything and checks afterwards.

`mktest.sh [red]` — builds `test.html` from `index.html` with a hook exposing
the camera and a way to stop the world. It now also exposes `RIG`, `THREE`,
`WR`, `WW`, `AX`, `dCur` and a general `set(key,value)` into the worker.
**`__R.set("time",0.01)` is the one that matters**: it drops the world below
real time, which is the only way to watch anything that takes a second. Never push `test.html`. The optional
`red` argument colours the load mesh bright red, which settles in one frame
questions that guessing cannot.

`fill.js [minutes] [pop] [seed]` — the one that answers "is it filling
hollows or shuffling flat sand". The relief of the field cannot: relief is
measured against the ground around a place, so what stands above always
equals what lies below and the two move together by construction, and most
of what the field does in the first few minutes is the sand settling rather
than the machines — eight machines "touched" thirteen thousand cells. So
this asks the machines instead. Every time sand enters or leaves a bucket it
records how far the ground it came from, or went to, stood above or below
what surrounds it at that moment. Nothing the wind does is counted.

**`load` is not cubic metres.** It is the height one bucket adds to one cell,
so a bucket reads as 0.115 and not 3.6. Multiply by `CS*CS`. This caught me
out and it is the recurring bug class exactly.

`tip.js [outdir]` — watches every machine and, the moment a bucket starts
letting go, aims at it and shoots flat out. It also reports how many grains
were emitted, which is the honest measure of whether a pour is a pour.

`wheelfix.py`, `keygate.py`, `pourfix.py`, `fillfix.py` — the four changes of
10 September, each one a script that proves every anchor before it writes
anything, kept because the reasoning is in the comments they insert.

`shot.js`, `blade.js`, `cab.js` — drive a headless browser at
`http://127.0.0.1:8099/test.html`. Serve the folder with
`python3 -m http.server 8099` first. **Stop the world before aiming**: at `?dev`
the local worker runs about seventy times real time, so a machine moves eighty
metres between aiming the camera and taking the picture.
