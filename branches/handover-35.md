
## The boom rests on the front axle — 18 November (patch35)

Found while building the Meccano machine. `branches/meccano/sweep.js` treats
every part of the model as a solid box, the tyres as solid tyres (also on full
lock), and puts the arm through every pose a working pit actually uses — 5,760
of them from an hour of eight machines (`poses.json`, seed 11). **One pose in
eleven had the boom down through the machine's own front axle**, and the lowest
(−0.457) on through the platform behind it.

The cause was one number: `PITCH_LO=-0.80`, forty-six degrees down, which limits
nothing — the body stops the boom long before that. A telehandler's boom
pivots at the back and the front axle runs across under it, so lowered far
enough it rests on the axle. The limit is now worked out from the axle's place
and radius and the depth of the boom below its centreline (one hole-pitch,
which is a ninth of the wheelbase because the axles go through holes):
**−0.2152**. The travel pose is −0.1853 and does not change.

Jeff, asked: *"yes"*.

Measured, three starts each, 1.5 sim-hours, eight machines, before and after:

| | duty | digging | tipping | arm at the limit | tallest | gini |
|---|---|---|---|---|---|---|
| before | 0.366 (0.340–0.394) | 0.208 | 0.095 | — (8.8% below the axle) | 22.24 | 0.0201 |
| after  | 0.338 (0.280–0.382) | 0.191 | 0.088 | 5.3% | 22.16 | 0.0199 |

All three starts did less work after, by 4%, 17% and 3%: about 8% on
average, but the starts disagree too much to pin it down. The shape of the
world after an hour and a half is the same. A pass whose teeth cannot reach
the ground already comes up barren and sends the machine elsewhere — that is
how the piece has always learned ground is out of reach — so nothing new was
needed to cope with it.

**Something noticed and not acted on:** duty in these fresh pits is 0.34–0.39.
`NORMAL_DUTY` (patch34) is 0.125, measured on 28 September. Either duty falls a
long way as a pit ages, or the two were measured differently. It matters: the
service life is normalised at that figure. Worth a long run.
