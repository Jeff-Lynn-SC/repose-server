
## Built not quite right, and working loose — 19 November (patch37)

Jeff: *"i like the idea that the bolts could become loose over time or that
some arent built quite right."* Asked how many joints a child gets wrong:
*"One or two"* (of the 66 the first model had). Asked whether a badly built
machine should wear out sooner: *"yes"*. Asked how — the weakest joint
deciding, or spread over the machine: *"Spread over the machine"*.

**In the world (simulation).** Every machine has `err`, the chance of any one
joint being done wrong (first machines: `ERR0=1.5/66`), and a 24-bit `seed`.
Which joints are wrong is `jointBad(seed,err,j)`: a fact about the machine,
decided once. `weak` counts the wrong ones among the 43 that carry the work
(chassis and arm — a body strip done wrong rattles but wears nothing out). A
bad joint wears about twice as fast as a good one (the severe-application
figure, as for hard ground), shared over the working joints:
`dmg += ... *(1+weak/43)`. A child takes its parents' `err` averaged in
log-odds plus a little either way, exactly as it takes its size. Saved:
`MFIELDS` 31; an older row loads with `ERR0` and a fresh seed.

Measured over 400 births: wrong working joints per machine 0:43% 1:32% 2:17%
3:5% 4:2% 5:0.5%, mean 0.92 (expected 0.98); all joints, mean 1.99.

**In the picture.** The same `jointBad`, word for word, asked of the same
numbers. The page shows three real things, all bounded by the parts: every
joint works loose with wear by a hole's clearance; a bolt in the wrong hole
puts the part out by exactly one pitch; one bolt where there should be two
lets the part swing as it wears until its free end has dropped a pitch. Wear
is the machine's own `dmg`. The shadow pass does the same.

**Attributes had to be packed.** With the per-machine numbers the Meccano
shader wanted 17 vertex attributes; a vertex may have 16 (the instance matrix
alone takes 4) and it would not link. Now 14: hole offset shares with
roughness and metalness (`ps`), and a part's bolt axis is carried as the
length of its direction vector, leaving `md.w` for the member number. The
page's copy of the geometry does this; `branches/meccano/geom-meccano.js`
still writes the old layout the bench previews use.

**The wire.** The page asks `/state?m=2&j=1`. The new server sends 26 bytes a
machine (seed 24 bits, err as log-odds ×1024, dmg ×65535); an old server
ignores `j` and still sends sizes. Tested all four ways: new page/new server
(26), old page/new server (19), new page/old server (19, joints default to
none), worker (16 floats).

Frame time, software renderer, close shot: 191 → 202 ms (+5%).

## The saved world was losing its newest machine — 19 November (patch37.server.js)

Found reading the server. The world is saved as one block ending in every
machine's row. The reader worked out how many numbers to read from `MF=28`, the
row width before patch30; patch30 made it 29 with a marker in front and the
server was never told. So it read `28*floor(written/28)` numbers — always
short of the last row. Measured with the real simulation: 13 saved → 12 back,
14 → 13, 30 → 29.

The free instance sleeps when nobody watches, so **since 28 September every
visit day has killed the newest machine, and the pit bred a replacement two
seconds later**. Seen this evening: "visitors 14, machines 13, up 0m", then 14
twenty seconds after. The reader now takes everything after the rock, which is
the machines, however wide a row is. Tested: 14 saved, 14 back.

Also found: the world only advances while somebody keeps the server awake.
`world.json` commits since September fall on single days (29 Oct, 4 Nov,
12 Nov, 18 Nov, 19 Nov). Nothing done about it; it is a question for Jeff.

**The extra visitor.** On 18 November the Push Repose window checked the
server with `/join?id=pushcheck`, which counts as a new visitor and was given
a machine (13 real visitors became 14). Claude's own `/join?id=x` added a
15th that was never saved. That machine was lost at the next wake-up under
the bug above, and a replacement bred in its place. Jeff: "Leave it". The
count stays at 14. **Never call `/join` with an id to check a deploy**;
`/join` with no id adds nobody, and that is what Push Repose now uses.
