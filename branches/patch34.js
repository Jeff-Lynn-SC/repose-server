/* patch34 - a machine's life is spent on work, not on a clock.
 *
 * Jeff: "i would expect a digger to last years... at every step, i want the
 * whole world to be as realistic as possible rather than working to fixed
 * numbers or orchestrating effects."
 *
 * WHAT WAS THERE. Two lines:
 *     this.dmg+=_avKnock*dt*0.32;   // "contact is what wears them out"
 *     this.dmg+=dt*0.00035;         // "and ordinary use, slowly"
 * Measured on 28 September: a machine lived forty-seven minutes of world time
 * and they all died at the same age - 45.3 to 47.6 minutes over twenty-four
 * deaths. The comment was wrong: ordinary use was 98% of it and contact 2%,
 * and in a pit with two machines contact was nothing at all. So nothing a
 * machine did affected how long it lived, the "least damaged" machine the pit
 * picks as a parent was simply the YOUNGEST one in it, and every selection
 * measurement made that day was measuring a stopwatch.
 *
 * AND CONTACT IS NOT COLLISION. Nothing in this piece models an impact. What
 * `avoid` does is push two machines apart when they come closer than they fit,
 * and `_avKnock` is how far they overlapped - not how hard they hit, because
 * nothing hits. Damage from it was a consequence with no cause. With the clock
 * corrected it was measured again in a dense pit, a very dense pit and a roomy
 * one: 0.00% in all three. Whatever number were put on it, it would do
 * nothing. It is gone.
 *
 * WHAT ACTUALLY WEARS OUT A DIGGER IS WORK. That is not an opinion, it is how
 * these machines are costed: service life is quoted in OPERATING HOURS, and
 * the same machine is consumed far faster in rock than in loose material -
 * a severe application roughly halves component life. Undercarriage, pins,
 * pump, teeth: all of it goes with cycles and with what is being cut.
 *
 * Everything needed was already here. The pit knows what each machine cut on
 * every pass, it knows how hard the ground was - it already tracks ground
 * worked so often it has stopped being sand - and it knows when a machine is
 * doing nothing.
 *
 * SO:
 *   duty  = what it moved this step / what it is built to move in that time
 *   rate  = WEAR * (IDLE + (1-IDLE)*duty)
 *   and hard ground counts double, which is the severe-application figure
 *
 * IDLE is 0.22: an idling engine burns about a fifth of what a working one
 * does, and that is the floor - a machine that is stopped is still running.
 *
 * WEAR is set from ONE real number: twelve thousand operating hours, which is
 * about where one of these is reckoned worth rebuilding, and one of these
 * never stops, so that is its life. NORMAL_DUTY is not chosen either: it is
 * the duty a machine in this pit actually averages, measured from the running
 * simulation, so that twelve thousand hours means twelve thousand hours of the
 * work these machines really do rather than of some flat-out ideal they never
 * reach.
 *
 * WHAT FALLS OUT OF IT, rather than being arranged:
 *   - a machine that digs hard all day in rock wears out fastest;
 *   - a machine hemmed in and getting nothing done lasts LONGER than one
 *     working in the open - it is not wearing itself out, it simply achieves
 *     nothing with the time;
 *   - a big machine moves more sand but is built for it, so per hour of its
 *     own natural work it lasts the same - which is true of real machines and
 *     is why size is not a way of cheating death;
 *   - deaths become rare, so nearly every birth is a new visitor's, which is
 *     what was always intended.
 *
 * Existing machines carry their damage through: one near the end of the old
 * clock still dies shortly, the rest simply stop ageing in minutes. There is
 * no mass die-off and no reprieve.
 *
 * Usage: node patch34.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch34.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("what a life is spent on",
`var PASS=0.42, DRAG=0.60, ROLL=0.50;`,
`var PASS=0.42, DRAG=0.60, ROLL=0.50;
/* ---- what a machine's life is spent on ----
   Work, not the clock. See patch34. SERVICE_H is the one real number in here:
   a hydraulic excavator is reckoned worth rebuilding somewhere about twelve
   thousand operating hours, and one of these never stops, so that is its
   whole life. IDLE is the floor - an idling engine burns about a fifth of
   what a working one does, and a machine standing still is still running.
   ROCK_HARD is the industry's severe-application figure: ground that has been
   worked until it is no longer sand costs double.
   NORMAL_DUTY is measured, not chosen: it is what a machine in this pit
   actually averages, so that twelve thousand hours means twelve thousand
   hours of the work these machines really do. */
var SERVICE_H=12000, IDLE=0.22, ROCK_HARD=1.0;
/* Measured off the running simulation, not chosen: a machine in an ordinary
   pit averages 0.125 - it spends most of its time driving to and from the
   work rather than cutting, which is what these machines really do. Two pits
   of different densities gave 0.123 and 0.125. */
var NORMAL_DUTY=0.125;
var WEAR=1/(SERVICE_H*3600*(IDLE+(1-IDLE)*NORMAL_DUTY));`);

e("how hard the ground is under a point",
`function cellAt(wx,wz){`,
`/* how far the ground here has stopped being sand, 0 to 1. Digging it costs a
   machine double at 1, which is the severe-application figure. See patch34. */
function rockAt(wx,wz){
  var i=cellAt(wx,wz);
  return (i<0)?0:rock[i];
}
function cellAt(wx,wz){`);

e("count the blade's work",
`            var cut=takeFrom(tp.x,tp.z,0.55*CS,vol<room?vol:room);
            this.load+=cut; this.got+=cut;`,
`            var cut=takeFrom(tp.x,tp.z,0.55*CS,vol<room?vol:room);
            this.load+=cut; this.got+=cut;
            /* what this cost the machine: the sand it moved, doubled where the
               ground has stopped being sand. See patch34. */
            this.work+=cut*(1+ROCK_HARD*rockAt(tp.x,tp.z));`);

e("and the bucket's",
`        this.load+=cut; this.got+=cut; this.gotPass+=cut;`,
`        this.load+=cut; this.got+=cut; this.gotPass+=cut;
        this.work+=cut*(1+ROCK_HARD*rockAt(t.x,t.z));`);

e("somewhere to keep it",
`  this.noPush=0; this.lifted=0; this.gotPass=0; this.slump=0;`,
`  this.noPush=0; this.lifted=0; this.gotPass=0; this.slump=0;
  /* sand moved since its life was last charged for, hard ground counted
     double. See patch34. */
  this.work=0;`);

e("and charge it for what it did",
`  this.dmg+=_avKnock*dt*0.32;            /* contact is what wears them out */
  this.dmg+=dt*0.00035;                  /* and ordinary use, slowly */`,
`  /* ---- what this step cost it ----
     The old two lines here charged a machine by the clock and called it
     contact. Neither was true: the clock was 98% of it and nothing a machine
     did changed how long it lived. A machine is now charged for the work it
     has actually done - against the work it is BUILT to do in that time, so a
     big machine is not punished for being big - with an idling engine's floor
     underneath, because a machine standing still is still running. Hard ground
     was already counted double where the work was recorded. See patch34. */
  var able=this.cap/digCycle(this.cap,this.len,this.cut);   /* its own natural rate */
  var duty=(able>0&&dt>0)?(this.work/dt)/able:0;
  this.work=0;
  if(duty>12) duty=12;                   /* nothing real is twelve times flat out */
  this.dmg+=dt*WEAR*(IDLE+(1-IDLE)*duty);`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["one real number, the service life", back.includes("var SERVICE_H=12000, IDLE=0.22, ROCK_HARD=1.0;")],
  ["the duty it is normalised at",  back.includes("var NORMAL_DUTY=0.125;")],
  ["wear follows from both",        back.includes("var WEAR=1/(SERVICE_H*3600*(IDLE+(1-IDLE)*NORMAL_DUTY));")],
  ["hardness can be looked up",     back.includes("function rockAt(wx,wz){")],
  ["the blade's work counts",       back.includes("this.work+=cut*(1+ROCK_HARD*rockAt(tp.x,tp.z));")],
  ["the bucket's work counts",      back.includes("this.work+=cut*(1+ROCK_HARD*rockAt(t.x,t.z));")],
  ["work is measured against its own rate", back.includes("var able=this.cap/digCycle(this.cap,this.len,this.cut);")],
  ["with an idling floor",          back.includes("this.dmg+=dt*WEAR*(IDLE+(1-IDLE)*duty);")],
  ["the clock is gone",             !back.includes("this.dmg+=dt*0.00035;")],
  ["and so is invented collision",  !back.includes("_avKnock*dt*0.32")],
  ["nothing charges for contact",   !/dmg\+=[^;]*_avKnock/.test(back)],
  ["not applied twice",             back.split("var SERVICE_H=12000").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
