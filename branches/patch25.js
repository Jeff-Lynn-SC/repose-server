/* patch25 - a lamp that looks like a lamp.
 *
 * Jeff: "ok. they are now just weird looking while cubes." Fair. They were
 * two 18 cm cubes of `MeshBasicMaterial` - a material that takes no light at
 * all, so they are a flat wash of the same near-white whatever the sun is
 * doing, and they are cubes, which no lamp is.
 *
 * And worse: they are the ONLY lamp there is. Their opacity is the night
 * factor, so at noon a machine has no lamps on it whatsoever - nothing on
 * the roof, no housing, no glass. A machine with nothing where its lights
 * should be is as wrong as a glowing sugar lump, it just does not catch the
 * eye.
 *
 * A work lamp is two things. A cast housing bolted to the roof, which is
 * part of the machine, is shaded like the machine and is there at midday.
 * And a lens across the front of it, which is the only part that lights up.
 * So that is what it is: the housing joins GEO_HOUSE and is lit by the sun
 * like every other panel, and GEO_LAMPS becomes the lens alone - a thin
 * plate on the front face, facing the way the beam goes.
 *
 * The four numbers that say where a lamp is move above GEO_HOUSE so the
 * housing, the lens and the light are all built from them. That is now three
 * things off one set of numbers rather than three opinions.
 *
 * Usage: node patch25.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch25.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

/* 1. the four numbers, and the housings, move up to the body */
e("lamp position defined before the body that carries it",
`var GEO_HOUSE=mergeParts([`,
`/* ---- where a work lamp is ----
   On the leading edge of the cab roof, one at each side, which is where a
   Loadall carries them. The roof's front edge is x=.180 and its top is
   y=.449, so these sit just inboard and just proud of it.

   Three things are built from these four numbers: the housing just below
   (part of the machine, lit by the sun, there at midday), the lens in
   GEO_LAMPS that lights up at night, and the beam itself in drawMachines.
   Move a lamp and all three move. */
var LAMP_X=.168, LAMP_Y=.463, LAMP_Z1=-.175, LAMP_Z2=-.032;

var GEO_HOUSE=mergeParts([`);

e("housings on the roof",
`  surf(boxPart(.020,.027,.020,-.130,.453,-.103, CRM[0],CRM[1],CRM[2]),STEELY[0],STEELY[1])   /* beacon */
],true);`,
`  surf(boxPart(.020,.027,.020,-.130,.453,-.103, CRM[0],CRM[1],CRM[2]),STEELY[0],STEELY[1]),  /* beacon */
  /* the lamp housings: 12 cm deep, 16 cm tall, 20 cm wide, cast and dark,
     with a little bracket under each holding it off the roof. These are part
     of the machine - they take the sun like everything else and they are
     there in the middle of the day, when the lamps are off. */
  surf(boxPart(.020,.027,.033, LAMP_X,LAMP_Y,LAMP_Z1, DK[0],DK[1],DK[2]),STEELY[0],STEELY[1]),
  surf(boxPart(.020,.027,.033, LAMP_X,LAMP_Y,LAMP_Z2, DK[0],DK[1],DK[2]),STEELY[0],STEELY[1]),
  boxPart(.008,.012,.010, LAMP_X-.004,LAMP_Y-.018,LAMP_Z1, DK[0],DK[1],DK[2]),
  boxPart(.008,.012,.010, LAMP_X-.004,LAMP_Y-.018,LAMP_Z2, DK[0],DK[1],DK[2])
],true);`);

/* 2. GEO_LAMPS becomes the lens */
e("the lens, not a cube",
`/* ---- where a work lamp is ----
   On the leading edge of the cab roof, one at each side, which is where a
   Loadall carries them. The roof's front edge is x=.180 and its top is
   y=.449, so these sit just inboard and just proud of it. The boxes below
   are built from these numbers and so is the light, three hundred lines up,
   so the thing you can see and the thing doing the lighting are the same
   lamp. They used to be two different lamps and neither was on the machine.
   0.03 of a machine length is 18 cm, which is a work lamp. */
var LAMP_X=.168, LAMP_Y=.463, LAMP_Z1=-.175, LAMP_Z2=-.032;
var GEO_LAMPS=mergeParts([
  boxPart(.03,.03,.03,  LAMP_X,LAMP_Y,LAMP_Z1, 1,1,1),
  boxPart(.03,.03,.03,  LAMP_X,LAMP_Y,LAMP_Z2, 1,1,1)
]);`,
`/* Only the lens. The housing that holds it is part of the body, built from
   the same four numbers up where the cab is made. A lens is a thin pane
   across the front of the housing, facing the way the beam goes - not a
   cube, and not the whole lamp. */
var GEO_LAMPS=mergeParts([
  boxPart(.005,.020,.026, LAMP_X+.011,LAMP_Y,LAMP_Z1, 1,1,1),
  boxPart(.005,.020,.026, LAMP_X+.011,LAMP_Y,LAMP_Z2, 1,1,1)
]);`);

/* 3. and the comment that said there could be no real lamps */
e("the old note about real lamps",
`   No real lamps: a few thousand point lights is not a thing a
   browser will do. Two bright boxes on the cab that the bloom
   pass turns into a glare, and a soft warm disc thrown on the
   sand in front. Both appear as the sun goes down.`,
`   This said, for a long time: "No real lamps: a few thousand
   point lights is not a thing a browser will do." True of
   three.js lights and beside the point - the sand is a shader
   of our own and so are the machines, and either can be handed
   the nearest few lamps and work out what it is receiving.
   They are real now. What is here is what you SEE of a lamp:
   a housing on the body, and a lens that lights up.`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["numbers defined once, above the body", back.indexOf("var LAMP_X=.168")>0 &&
      back.indexOf("var LAMP_X=.168")<back.indexOf("var GEO_HOUSE=mergeParts([")],
  ["only one definition of them", back.split("var LAMP_X=.168").length-1===1],
  ["housings on the machine", back.includes("surf(boxPart(.020,.027,.033, LAMP_X,LAMP_Y,LAMP_Z1,")],
  ["lens not a cube", back.includes("boxPart(.005,.020,.026, LAMP_X+.011,LAMP_Y,LAMP_Z1,")],
  ["no cubes left", !back.includes("boxPart(.03,.03,.03,  LAMP_X,LAMP_Y,LAMP_Z1, 1,1,1)")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
