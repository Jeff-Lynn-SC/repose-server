/* patch38.server.js - the world stays awake.
 *
 * Found on 19 November: the world only went forward while somebody had the
 * page open. Render's free instance stops after fifteen minutes with no
 * request and takes about a minute to start again, so between visits the
 * sand did not move and the machines did not age. The saved world's commits
 * since September fall on a handful of single days.
 *
 * The README called that a principle ("Repose works when it is watched").
 * Asked again for a piece meant to run for years, Jeff chose otherwise:
 * "Keep it awake, free".
 *
 * 1. IT ASKS ITSELF FOR ITS FIGURES EVERY TEN MINUTES. That is an ordinary
 *    request arriving from outside, which is all Render counts. The free
 *    allowance is 750 instance hours a month per workspace and a month is
 *    at most 744, so one server running all month fits inside it. Render
 *    may still restart a free service whenever it likes; it comes back on
 *    its own and carries on asking. It asks /stats, which changes nothing -
 *    never /join with an id, which would count a visitor and give it a
 *    machine.
 *
 * 2. IT WRITES THE WORLD DOWN FOUR TIMES A DAY, NOT EVERY FIVE MINUTES. Each
 *    save is a commit of about 190 kB to the page's own repository. Awake a
 *    few days a month, five minutes was harmless; awake all the time it is
 *    288 commits and about 55 MB a day, and the repository would pass
 *    GitHub's recommended size for a Pages site within weeks. Every six
 *    hours is about 280 MB a year. It still writes the world down whenever
 *    it is stopped - Render sends a signal before a restart or a deploy -
 *    so what an ordinary restart costs is nothing; only a crash loses time,
 *    and at most six hours of it. GH_EVERY in the environment still
 *    overrides this.
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){ console.error("usage: node patch38.server.js server.js"); process.exit(1); }
let s=fs.readFileSync(f,"utf8");
const E=[];
E.push(["how often the world is written down",
`const GH_EVERY = parseInt(process.env.GH_EVERY || "300000", 10);   /* five minutes */`,
`/* six hours: awake all the time, five minutes would put 55 MB a day into the
   page's repository. It is also written whenever the server is stopped.
   See patch38.server.js. */
const GH_EVERY = parseInt(process.env.GH_EVERY || "21600000", 10);`]);
E.push(["after it starts listening",
`server.listen(PORT,()=>console.log("repose listening on "+PORT));`,
`server.listen(PORT,()=>console.log("repose listening on "+PORT));

/* ---- staying awake. See patch38.server.js. ----
   Render stops a free service after fifteen minutes with no request, and
   then the world stops too. Jeff: "Keep it awake, free". So it asks itself
   for its figures every ten minutes - a request like any other. /stats,
   because it changes nothing; never /join with an id, which counts as a
   visitor and is given a machine. Render tells a service its own address in
   RENDER_EXTERNAL_URL; run anywhere else it has no address and does not
   need one. */
const SELF = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || "";
if(SELF){
  console.log("keeping awake: asking "+SELF+"/stats every ten minutes");
  setInterval(()=>{
    fetch(SELF+"/stats",{headers:{"User-Agent":"repose-awake"}}).catch(e=>console.log("could not ask myself:",e.message));
  }, 10*60*1000);
} else console.log("no address of my own, so not keeping awake");`]);
let bad=0;
if(s.includes("keeping awake")){ console.error("already applied"); bad++; }
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["it asks itself every ten minutes",   back.includes("}, 10*60*1000);") && back.includes('fetch(SELF+"/stats"')],
  ["and never as a visitor",              !/fetch\(SELF\+"\/join/.test(back)],
  ["written down every six hours",        back.includes('process.env.GH_EVERY || "21600000"')],
  ["and still when it is stopped",        back.includes('process.on("SIGTERM", goodbye);')],
  ["it still parses",                     (()=>{ try{ new (require("vm").Script)(back); return true; }catch(e){ console.log(e.message); return false; } })()],
  ["not applied twice",                   back.split("keeping awake: asking").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
