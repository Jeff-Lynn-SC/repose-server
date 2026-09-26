/* patch19 - a real moon, and a night dark enough to need it.
 *
 * The sun in this file has always been real: solar position for 48.05 N,
 * 10.88 E, at the actual time. The night was not. It was a hemisphere light
 * with a floor of 0.10 and a blue rim light with a floor of 0.10, both of
 * them coming from nowhere, and between them they lit the whole pit to an
 * even brown at two in the morning. That is the "night is flat" line in the
 * roadmap, and it is also why the metered exposure could not be made to
 * work: there was nothing true to meter.
 *
 * So the moon is computed the same way the sun is - the standard
 * low-precision series, the largest terms of a theory with hundreds, good to
 * about a third of a degree - and it carries its phase, because a night at
 * full moon and a night at new moon are different nights and the machines
 * work through both. Nobody chose which; the date did.
 *
 * What is left over when the moon is down is starlight and airglow, which is
 * a real thing and a very small one.
 *
 * The one compression: full moonlight is about a four-hundred-thousandth of
 * sunlight, which is nineteen stops. This uses a thousandth, which is ten.
 * The honest version needs the exposure to adapt across the whole day, and
 * that is patch10/patch15, held back until this existed. This is the thing
 * it was waiting for.
 *
 * Usage: node patch19.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch19.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("the moon's position and phase",
`/* sky colours by how high the sun is */`,
`/* ---- where the moon is, and how much of it is lit ----
   Same standard as the sun: real position for this place at this moment.
   These are the largest terms of the lunar theory - mean longitude, the
   equation of the centre, and the argument of latitude - which is good to
   about a third of a degree. The moon is half a degree wide, so that is
   near enough for a light source and nowhere near enough for an eclipse.

   The phase falls out of where the moon is relative to where the sun is, so
   it is not a separate thing to keep in step. A full moon is opposite the
   sun and therefore up all night, which is why full-moon nights are the
   bright ones - the geometry does that, not a rule. */
function lunarPosition(date,lat,lon){
  var JD=date.getTime()/86400000+2440587.5;
  var D=JD-2451545.0;                        /* days since J2000 */
  var Lp=218.316+13.176396*D;                /* the moon's mean longitude */
  var M =134.963+13.064993*D;                /* its mean anomaly */
  var F = 93.272+13.229350*D;                /* argument of latitude */
  var lam=(Lp+6.289*Math.sin(M*RAD))*RAD;    /* ecliptic longitude */
  var bet=(5.128*Math.sin(F*RAD))*RAD;       /* ecliptic latitude */
  var eps=23.4397*RAD;
  var ra=Math.atan2(Math.sin(lam)*Math.cos(eps)-Math.tan(bet)*Math.sin(eps),Math.cos(lam));
  var dec=Math.asin(Math.sin(bet)*Math.cos(eps)+Math.cos(bet)*Math.sin(eps)*Math.sin(lam));
  var gmst=(280.16+360.9856235*D)*RAD;
  var H=gmst+lon*RAD-ra;                     /* hour angle */
  var la=lat*RAD;
  var alt=Math.asin(Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(H));
  var az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(la)-Math.tan(dec)*Math.cos(la));
  /* the sun's ecliptic longitude, for the phase */
  var Ms=(357.529+0.98560028*D)*RAD;
  var lamS=((280.459+0.98564736*D)+1.915*Math.sin(Ms)+0.020*Math.sin(2*Ms))*RAD;
  var cosPsi=Math.cos(bet)*Math.cos(lam-lamS);       /* elongation from the sun */
  var lit=(1-cosPsi)/2;                              /* fraction of the disc lit */
  return { alt:alt/RAD, az:(az/RAD+180+360)%360, lit:Math.max(0,Math.min(1,lit)) };
}
var moonAlt=0, moonAz=0, moonLit=0;

/* sky colours by how high the sun is */`);

e("the moon as a light",
`var rim=new THREE.DirectionalLight(0x6f8fbf,0.30); rim.position.set(40,20,-40); scene.add(rim);`,
`var rim=new THREE.DirectionalLight(0x6f8fbf,0.30); rim.position.set(40,20,-40); scene.add(rim);
/* Moonlight is sunlight off a rock the colour of worn tarmac, so it is very
   slightly warm before it reaches us. It looks blue because the eye at that
   level is running on rods, which have no colour and report cool. This is a
   picture, so it gets the blue. */
var moon=new THREE.DirectionalLight(0xbfd0f0,0.0); scene.add(moon); scene.add(moon.target);
var MOON_FULL=0.0014;   /* a full moon straight overhead, against the sun's 1.45 */
var STARLIGHT=0.00035;  /* what is left when the moon is down: airglow, and the galaxy */`);

e("the moon drives the night",
`  hemi.intensity=0.10+0.85*Math.max(0,Math.min(1,(sunAlt+8)/22));`,
`  /* ---- the moon, and what the night is lit by ----
     Where the moon is and how much of it is lit are both read off the date.
     Its light falls off toward the horizon the way the sun's does, and the
     last of it is scattered out of the beam altogether below a few degrees. */
  var mp=lunarPosition(now,SITE_LAT,SITE_LON);
  moonAlt=mp.alt; moonAz=mp.az; moonLit=mp.lit;
  var mUp=Math.max(0,Math.sin(moonAlt*RAD))*Math.max(0,Math.min(1,(moonAlt+2)/5));
  var moonI=MOON_FULL*moonLit*mUp;
  moon.intensity=moonI;
  var ma=(180-moonAz)*RAD, me=Math.max(1,moonAlt)*RAD;
  moon.position.set(sunTargetX+Math.sin(ma)*Math.cos(me)*300, Math.sin(me)*300,
                    sunTargetZ+Math.cos(ma)*Math.cos(me)*300);
  moon.target.position.set(sunTargetX,0,sunTargetZ);

  /* The sky's own contribution. By day it is the sky; by night it is the
     moon lighting the air, plus starlight, and starlight is very little
     indeed. The 0.10 floor that used to be here was neither. */
  var dayLight=0.85*Math.max(0,Math.min(1,(sunAlt+8)/22));
  hemi.intensity=dayLight+moonI*0.30+STARLIGHT;`);

e("the rim light goes out at night too",
`  rim.intensity=0.10+0.16*up;`,
`  /* this has no source in the world and never had; at least let it not be
     the thing lighting the pit at two in the morning */
  rim.intensity=0.16*up+STARLIGHT;`);

e("the readout says which night it is",
`      (nightFactor>0.98?"night":(nightFactor>0.02?"dusk":"day"))+`,
`      (nightFactor>0.98?("night  moon "+moonAlt.toFixed(0)+"\\u00B0 "+
         Math.round(moonLit*100)+"%"):(nightFactor>0.02?"dusk":"day"))+`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["moon computed", back.includes("function lunarPosition(date,lat,lon){")],
  ["moon is a light", back.includes("var moon=new THREE.DirectionalLight(0xbfd0f0,0.0);")],
  ["night lit by the moon", back.includes("hemi.intensity=dayLight+moonI*0.30+STARLIGHT;")],
  ["the 0.10 floor is gone", !back.includes("hemi.intensity=0.10+0.85*")],
  ["rim floor gone", !back.includes("rim.intensity=0.10+0.16*up;")]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
