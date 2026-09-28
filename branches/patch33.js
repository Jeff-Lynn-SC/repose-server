/* patch33 - the shared world tells the page how big each machine is.
 *
 * The live page does not compute the pit. It asks the server, and gets back a
 * packed binary snapshot: a 44-byte header, then seventeen bytes a machine,
 * then eight bytes for every cell of ground that has moved. None of those
 * seventeen bytes is the machine's size, so without this everything patch29
 * to patch32 does is invisible on the live page and every machine is drawn
 * the same.
 *
 * TWO MORE BYTES A MACHINE, and the awkward part is not the bytes. The page
 * and the server go live at different moments - the page the instant GitHub
 * publishes it, the server whenever Render is poked - so for a while one of
 * them is old. Get the format wrong by a single byte and every machine
 * position and every height after it in the packet is read out of step: not a
 * missing feature, a pit full of nonsense.
 *
 * So neither of them guesses.
 *   - The page ASKS for the new format, with m=2 on the request. A server
 *     that has never heard of m=2 ignores it and sends the old one.
 *   - The page then works out which it got from the packet's OWN LENGTH,
 *     before reading a single machine: it already knows how many machines
 *     and how many changed cells there are, both of which are in the header,
 *     so the two possible lengths are exactly computable. If it is neither,
 *     the packet is dropped rather than misread.
 * Safe whichever of the two goes out first, and safe for a page sitting in
 * somebody's cache for a month.
 *
 * SIZE, IN TWO BYTES, as a logarithm: 2^((u-32768)/4096). That covers a range
 * of 2^±8 - a machine a two-hundred-and-fiftieth of normal up to one two
 * hundred and fifty times normal - to better than a fiftieth of a percent.
 * A linear byte would have had to be given a floor and a ceiling, and there
 * are no floors or ceilings anywhere else in this: where the pit's machines
 * end up is for the pit to decide.
 *
 * Usage: node patch33.js <index.html>     (after patch29..32)
 *        and the matching change to server.js, which is in this file too.
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch33.js <index.html>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

e("ask for the new format",
`  fetch(WORLD_URL+"/state?since="+netSince,opt)`,
`  /* m=2 asks for the packet with each machine's size in it. A server that
     has not heard of it sends the old one and netApply notices. patch33. */
  fetch(WORLD_URL+"/state?since="+netSince+"&m=2",opt)`);

e("work out which format arrived",
`  /* the machines, all of them, every time: they are small and they all move */
  var ag=new Float32Array(count*12), P=Math.PI/32767;
  for(var i=0;i<count;i++){
    var p=i*12;`,
`  /* ---- which packet is this? ----
     Everything needed is already read: how many machines, how many changed
     cells. Seventeen bytes a machine is the old format, nineteen is the one
     with the size. If the length is neither, something is wrong with the
     packet and reading it would put every machine and every height after it
     out of step, so it is dropped. See patch33. */
  var body=d.byteLength-o;
  var per=(body===count*19+changed*8)?19:((body===count*17+changed*8)?17:0);
  if(!per){ netAsking=false; return; }

  /* the machines, all of them, every time: they are small and they all move */
  if(AGF!==13){ AGF=13; agA=null; nA=0; }
  var ag=new Float32Array(count*13), P=Math.PI/32767;
  for(var i=0;i<count;i++){
    var p=i*13;`);

e("read the size, or take it as one",
`    ag[p+9]=d.getUint8(o)/255; o+=1;
    ag[p+10]=ag[p]; ag[p+11]=ag[p+1];
  }`,
`    ag[p+9]=d.getUint8(o)/255; o+=1;
    /* a logarithm, so there is no floor and no ceiling: see patch33 */
    ag[p+12]=(per===19)?Math.pow(2,(d.getUint16(o,true)-32768)/4096):1;
    if(per===19) o+=2;
    ag[p+10]=ag[p]; ag[p+11]=ag[p+1];
  }`);

e("the shared world no longer sends twelve",
`  if(AGF!==12){ AGF=12; agA=null; nA=0; }
  hB=new Float32Array(netH); agB=ag; nB=count; wearB=netW; rockB=netR;`,
`  hB=new Float32Array(netH); agB=ag; nB=count; wearB=netW; rockB=netR;`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["the page asks for it",      back.includes('"/state?since="+netSince+"&m=2"')],
  ["and checks what it got",    back.includes("var per=(body===count*19+changed*8)?19:((body===count*17+changed*8)?17:0);")],
  ["a packet that is neither is dropped", back.includes("if(!per){ netAsking=false; return; }")],
  ["thirteen floats from the wire too",   back.includes("var ag=new Float32Array(count*13), P=Math.PI/32767;")],
  ["the size is read",          back.includes("ag[p+12]=(per===19)?Math.pow(2,(d.getUint16(o,true)-32768)/4096):1;")],
  ["and only then advanced",    back.includes("if(per===19) o+=2;")],
  ["nothing pins it to twelve", !back.includes("if(AGF!==12){ AGF=12; agA=null; nA=0; }")],
  ["not applied twice",         back.split("var body=d.byteLength-o;").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }

/* ---------- and the server's half, written out for server.js ---------- */
fs.writeFileSync("patch33.server.js",
`/* patch33 (server half) - send each machine's size when the page asks.
 * Usage: node patch33.server.js <server.js>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch33.server.js <server.js>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[];const e=(n,o,x)=>E.push([n,o,x]);

e("pack wide when asked",
\`function pack(since){
  const m = ctx.machines, n = m.length;\`,
\`function pack(since, wide){
  /* wide: nineteen bytes a machine instead of seventeen, the extra two
     being the size it was born with. Only sent when the page asks for it
     with m=2, so a page that predates this still gets what it expects and
     reads the packet correctly. See patch33. */
  const m = ctx.machines, n = m.length;\`);

e("two more bytes each",
\`  const head = 44, mach = n*17, cells = count*8;\`,
\`  const head = 44, mach = n*(wide?19:17), cells = count*8;\`);

e("write the size",
\`    b.writeUInt8(Math.max(0,Math.min(255,Math.round(a.flash*255))),o); o+=1;
  }\`,
\`    b.writeUInt8(Math.max(0,Math.min(255,Math.round(a.flash*255))),o); o+=1;
    if(wide){
      /* a logarithm, so there is no floor and no ceiling on how big or small
         the pit's machines are allowed to become: 2^((u-32768)/4096) */
      const sz=(a.size>0)?a.size:1;
      let u=Math.round(32768+4096*Math.log2(sz));
      if(u<0)u=0; else if(u>65535)u=65535;
      b.writeUInt16LE(u,o); o+=2;
    }
  }\`);

e("and only when it is asked for",
\`    const since=parseInt(u.searchParams.get("since")||"0",10)||0;
    const body=pack(since);\`,
\`    const since=parseInt(u.searchParams.get("since")||"0",10)||0;
    const body=pack(since, u.searchParams.get("m")==="2");\`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["pack takes the flag",   back.includes("function pack(since, wide){")],
  ["the packet can widen",  back.includes("const head = 44, mach = n*(wide?19:17), cells = count*8;")],
  ["the size is written",   back.includes("b.writeUInt16LE(u,o); o+=2;")],
  ["and only when asked",   back.includes('pack(since, u.searchParams.get("m")==="2")')],
  ["not applied twice",     back.split("function pack(since, wide){").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
`);
console.log("      wrote patch33.server.js for server.js");
process.exit(fail?1:0);
