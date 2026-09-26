/* patch15 - the light, part one. RUN AFTER patch10.js, which builds the meter.
 *
 * Three things, each measured.
 *
 * 1. THE METER WAS READING THE WRONG BUFFER. patch10 metered rtB, which is the
 *    bloom - a bright-pass blur. A pit of sand under a hazy sun has almost no
 *    highlights in it, so that buffer is very nearly black, and the meter
 *    returned the bottom of its own log range at noon and at midnight alike:
 *    0.00098 both times, which is 2^-10, the floor of the encoding. It then
 *    asked for an exposure of 180 and got the clamp of 40, at every hour of
 *    the day. THAT is why the adapting version made midnight brighter than
 *    midday, and it was a bug rather than the design error it was written up
 *    as. Metering rtScene - linear radiance, before the tone map - gives
 *    0.240 at one in the afternoon, 0.029 at six, 0.026 at two in the morning.
 *
 * 2. THE EYE DOES NOT FULLY ADAPT, AND NEITHER SHOULD THIS. With the meter
 *    fixed, full adaptation still renders every hour to the same mid grey, so
 *    a night is a day with a blue cast. Real adaptation is partial: a night
 *    still looks like night. The exposure now follows the scene's own
 *    brightness raised to a power - ADAPT of 1 is full adaptation, 0 is a
 *    fixed exposure - so what reaches the screen keeps a fraction of the
 *    difference the world actually has.
 *
 * 3. THE SAND BOUNCES, AND THAT IS MOST OF WHAT DESERT LIGHT IS. A downward
 *    face in a desert gets more light bounced up off the sand than an upward
 *    face gets from the whole sky: sand throws back about two fifths of what
 *    lands on it, and half the sky below a shadowed surface is sand. It was
 *    being carried by the hemisphere light's ground colour, which is the same
 *    light as the skylight and was just cut to a quarter with it, so the
 *    shadows went dead at the same moment the sky stopped flooding the frame.
 *    The bounce is its own light now: nothing from above, warm sand from
 *    below, and it fades with the sun because it is the sun's light coming
 *    back up.
 *
 * Usage: node patch15.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch15.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
if(!s.includes("var MID_GREY=")){ console.error("REFUSED: run patch10.js first"); process.exit(1); }
const E=[];
const e=(n,o,x)=>E.push([n,o,x]);

e("meter the scene, not the bloom",
`  if(!rtL||!rtB) return;
  if(now-lastMeter>330){
    lastMeter=now;
    lumaMat.uniforms.tSrc.value=rtB.texture;`,
`  if(!rtL||!rtScene) return;
  if(now-lastMeter>330){
    lastMeter=now;
    /* the SCENE, not the bloom. Metering rtB read the bright-pass buffer,
       which in a pit of sand with no highlights in it is very nearly black:
       the meter returned the bottom of its own range at noon and at midnight
       alike, asked for an impossible exposure both times, and got the clamp.
       That, and not a design error, is what made midnight brighter than
       midday. rtScene is linear radiance before the tone map, which is the
       thing a light meter is for. */
    lumaMat.uniforms.tSrc.value=rtScene.texture;`);

e("partial adaptation",
`      var lum=Math.pow(2,(s/64)/255*20-10);
      var want=MID_GREY/Math.max(1e-5,lum);`,
`      var lum=Math.pow(2,(s/64)/255*20-10);
      meter._lum=lum;
      /* Partial adaptation. An eye walking out of a house at noon does not
         make noon look like the hallway it left; it keeps some of the
         difference. So does this. ADAPT=1 is full adaptation and renders
         every hour to the same grey, which is how a night ends up looking
         like a day. ADAPT=0 is a fixed exposure, which is what was here
         before and could not serve both ends of a day. What reaches the
         screen is MID_GREY*(lum/L_REF)^(1-ADAPT).
         L_REF is the measured scene luminance at one in the afternoon, so
         midday lands on the meter's own grey and every other hour is placed
         relative to it. Re-measure it if the sand's albedo changes. */
      var want=MID_GREY/Math.max(1e-6,
                 Math.pow(lum,ADAPT)*Math.pow(L_REF,1-ADAPT));`);

e("the two constants",
`var MID_GREY=0.18;                 /* the grey a light meter aims at */`,
`var MID_GREY=0.30;                 /* what a frame of sunlit sand should sit at.
                                      A meter aims at 0.18 because an average
                                      scene averages to it; a pit of sand is not
                                      an average scene, and metering one to grey
                                      is the same mistake as photographing snow
                                      and getting slush. */
var ADAPT=0.55;                    /* how much of the day's range the eye takes out */
var L_REF=0.322;                   /* measured: the scene at 13:00, sun 38 degrees */`);

e("the sand bounce",
`var rim=new THREE.DirectionalLight(0x6f8fbf,0.30); rim.position.set(40,20,-40); scene.add(rim);`,
`var rim=new THREE.DirectionalLight(0x6f8fbf,0.30); rim.position.set(40,20,-40); scene.add(rim);
/* ---- the sand bouncing back up ----
   Sand throws back about two fifths of what lands on it, and from anything
   in shadow half the sky is sand. So a downward-facing surface in a desert
   is getting more light than an upward-facing one gets from the sky, and it
   arrives the colour of the ground. It is the single thing that most makes
   a picture read as desert rather than as a model on a table.
   A hemisphere light with nothing in its sky and sand in its ground is
   exactly that: it lights what faces down and leaves what faces up alone.
   It is separate from the skylight because it is not skylight - it is the
   sun's own light coming back, so it goes out when the sun does. */
var bounce=new THREE.HemisphereLight(0x000000,0xffc98a,0.0); scene.add(bounce);`);

e("the bounce follows the sun",
`  rim.intensity=0.10+0.16*up;`,
`  rim.intensity=0.10+0.16*up;
  /* two fifths of what the ground is receiving, which is the sun at this
     altitude plus the sky. Not a look: sand's albedo. */
  bounce.intensity=0.40*(1.45*up+0.10+0.22*Math.max(0,Math.min(1,(sunAlt+8)/22)));
  /* and it is the colour of the sand it came off, warmer as the sun reddens */
  bounce.groundColor.setRGB(1.0,0.78-0.10*warm,0.54-0.22*warm);`);


e("put the skylight back",
`  /* skylight against sunlight. This gave the sky two thirds of what the sun
     delivers, which is why midday had no shadow in it - measured, the whole
     picture sat inside eighty values out of 255. On a flat surface at noon the
     real sky is nearer a sixth. The overall level is the exposure's job now,
     so only this ratio matters. */
  hemi.intensity=0.10+0.22*Math.max(0,Math.min(1,(sunAlt+8)/22));`,
`  /* ---- and this is where the plan was wrong ----
     patch10 cut the skylight from two thirds of sunlight to a sixth, on the
     grounds that a sixth is what a real sky delivers to a flat surface at
     noon. It is. But cutting it made midday FLATTER, measured three times at
     one in the afternoon with the exposure metered so the overall level is
     held steady:

         skylight as it was  (0.85)   the picture used 88 values of 255
         cut to a sixth      (0.22)   63
         all but switched off (0.05)  53

     The reason is that a hemisphere light shades by which way a surface
     faces - cool sky above, dark ground below - so on a dune field it is not
     really acting as skylight at all. It is standing in for how much sky each
     patch of sand can see, which is the thing that actually gives a dune its
     shape at midday. Take it away and the only shading left is the sun's
     angle on ground that barely tilts, and the dunes go smooth.

     So it stays as it was. The ratio is wrong and the honest fix is not to
     turn the sky down but to work out how much sky each cell can really see -
     the height field knows its own horizon - and then a correct sky and a
     correct shape can both be true at once. Until that exists, turning the
     sky down only deletes the shading. */
  hemi.intensity=0.10+0.85*Math.max(0,Math.min(1,(sunAlt+8)/22));`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["meters the scene", back.includes("lumaMat.uniforms.tSrc.value=rtScene.texture;")],
  ["no longer meters the bloom", !back.includes("lumaMat.uniforms.tSrc.value=rtB.texture;")],
  ["adaptation is partial", back.includes("Math.pow(lum,ADAPT)*Math.pow(L_REF,1-ADAPT)")],
  ["constants present", back.includes("var ADAPT=0.55;") && back.includes("var L_REF=0.322;")],
  ["bounce light made", back.includes("var bounce=new THREE.HemisphereLight(0x000000,0xffc98a,0.0);")],
  ["bounce follows the sun", back.includes("bounce.intensity=0.40*(1.45*up")],
  ["skylight restored", back.includes("hemi.intensity=0.10+0.85*")],
  ["target raised off mid grey", back.includes("var MID_GREY=0.30;")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
