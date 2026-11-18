
## The machines are Meccano — 18 November (patch36)

Jeff, on a photograph of a Lego Technic digger: *"I'm wondering if, instead of
photoreal, the bots should look like they are built from meccano, my childhood
favorite"*; and later *"i really like the idea of mecanno sets now and kids
playing at doing usefull stuff that ultimately isnt."*

Only what a machine is drawn with changes. The same skeleton — wheelbase,
track, wheels, boom pivot, boom, bucket, cutting edge — built from parts that
exist: strips and angle girders with their holes, flat plates, bolts, rods,
collars, a motor. Every joint the simulation uses is where it was, so the dig
point does not move. Sources in `branches/meccano/`; the geometry is
`geom-meccano.js`, embedded in the page inside `var MEC=(function(){...})()` so
its names stay to themselves.

**The holes are real**: each part has its own grid, half a pitch in from its
ends, cut in the shader from the part's own frame, so sand and sun show
through them — the shadow pass (`mecDepth`) cuts the same holes. Where a hole
would be under a pixel it is not cut (derivatives, taken before any branch).
Hole pitch = strip width; hole = a third of it; neither is a choice.

**It is built the way a model has to be.** The first version ran girders, cross
strips and half the deck straight through the tyres — Jeff saw it: *"the
placement of the wheels looks wierd. they cut thru a strut"*. Now the axles go
through holes in two chassis girders inside the wheels, so the wheelbase is a
whole number of holes (nine) and **the pitch is set from the wheelbase**. The
front wheels steer, so the front axle stops short of them. The body sits on a
platform above the tyres, in two halves with the boom coming down between them
— Jeff chose that over tucking the body between the wheels (*"Up on top of the
wheels"*, the way a Meccano lorry is built). The machine stands about half a
metre taller; `LAMP_Y` goes up with the cab, once, inside the Meccano block.
The boom is strips on edge at the real boom's width; laid flat it had been
nearly twice as wide and came down through the top of a front tyre.

`branches/meccano/sweep.js` checks it: every part an oriented box, the tyres
solid on full lock both ways, the arm at every pose from `poses.json`. Body
against wheels: none. Arm against body: none once the boom stops on the axle
(patch35), apart from the boom's own bearing at the pivot.

Frame time, software renderer, same sitting, three alternations each: wide
shot 167.5 → 178.7 ms (+7%), close working shot 132.5 → 147.0 ms (+11%).
5,508 triangles a machine against 1,912. Real hardware unknown.

The old geometry is still built — the constants the Meccano one is measured
from live in it — but nothing draws it.

**Not in yet:** bolts done wrong at birth and going slack with wear (preview:
`MECCANO-bolts.html`). Jeff: *"i like the idea that the bolts could become loose
over time or that some arent built quite right"*; typical mistakes per machine
*"one or two"*; and yes, a badly built machine should wear out sooner. That
needs the simulation, the save format and the wire, and comes next on its own.
