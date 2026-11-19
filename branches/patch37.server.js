/* patch37.server.js - two things, both in the server.
 *
 * 1. THE SAVED WORLD WAS LOSING ITS NEWEST MACHINE EVERY TIME THE SERVER
 *    WOKE UP. Found on 19 November reading the save code. The world is
 *    written as one block: sand, rock, the ground as it was, then every
 *    machine as a row of numbers. The reader worked out how many numbers to
 *    read from a constant, MF=28 - the width of a machine's row before
 *    patch30. Patch30 made the row 29 wide and put a marker in front, and
 *    this file was never told. The writer has written every number since;
 *    the reader has read 28*floor(written/28) of them, which is always short
 *    of the last row. Measured with the real simulation: 13 machines saved,
 *    12 come back; 14 saved, 13 come back; 30 saved, 29.
 *
 *    The free instance sleeps when nobody is looking and wakes when somebody
 *    does, so since 28 September every visit day has quietly killed the
 *    newest machine, and the pit - seeing itself one short of its visitors -
 *    has bred a replacement two seconds later from whoever it chose as a
 *    parent. Seen happening today: "visitors 14, machines 13, up 0m", then
 *    14 machines twenty seconds later.
 *
 *    The fix does not trust any count. The machines are the last thing in
 *    the block, so everything after the rock IS the machines: read all of
 *    it. That also brings back the machine the current save holds in full
 *    and the old reader has been dropping. The header now holds the number
 *    of machines, for anyone reading it by hand; nothing relies on it.
 *
 * 2. THE PACKET CAN CARRY HOW A MACHINE WAS BUILT, AND HOW WORN IT IS
 *    (patch37 in the page). j=1 alongside m=2 asks for it: seven more bytes a machine, 26
 *    in all. The seed that says which joints were done wrong (24 bits, low
 *    sixteen then high eight), how carefully it was built (a chance per
 *    joint, as log-odds times 1024, so no floor and no ceiling), and how far
 *    through its life it is (a fraction, sixteen bits). A second flag rather
 *    than m=3, so that the new page, which goes live a minute or two before
 *    the server, still gets the sizes from the old server meanwhile. m=2
 *    alone still gets 19 and nothing gets 17, so a page from before this
 *    reads what it always read; the page tells the three apart by the
 *    packet's own length.
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){ console.error("usage: node patch37.server.js server.js"); process.exit(1); }
let s=fs.readFileSync(f,"utf8");
const E=[];
E.push(["the row width the reader assumed",
`const MF=28;
function snapshot(){`,
`/* There used to be a constant here, MF=28, the width of a machine's row
   before patch30. Nothing is worked out from a row width any more. See
   patch37.server.js. */
function snapshot(){`]);
E.push(["what the header says",
`  head.writeUInt32LE((mf.length/MF)|0,4);`,
`  head.writeUInt32LE(ctx.machines.length,4);   /* for a person reading it; the reader does not use it */`]);
E.push(["the reader",
`      if(N===ctx.N && b.length>=8+n*7+nm*MF*4){`,
`      if(N===ctx.N && b.length>=8+n*7){`]);
E.push(["how many numbers it read",
`        if(nm>0){
          const mf=new Float32Array(nm*MF);`,
`        /* the machines are the last thing in the block, so everything left
           is the machines - all of it, however wide a row has become */
        const nf=((b.length-o)/4)|0;
        if(nf>0){
          const mf=new Float32Array(nf);`]);
E.push(["the packet's size",
`function pack(since, wide){`,
`function pack(since, lvl){
  /* lvl 3: twenty-six bytes, adding how the machine was built and how worn
     it is. See patch37.server.js. */`]);
E.push(["the machine rows' size",
`  const head = 44, mach = n*(wide?19:17), cells = count*8;`,
`  const head = 44, mach = n*(lvl>=3?26:(lvl>=2?19:17)), cells = count*8;`]);
E.push(["the size field",
`    if(wide){
      /* a logarithm, so there is no floor and no ceiling on how big or small`,
`    if(lvl>=2){
      /* a logarithm, so there is no floor and no ceiling on how big or small`]);
E.push(["after the size",
`      b.writeUInt16LE(u,o); o+=2;
    }
  }`,
`      b.writeUInt16LE(u,o); o+=2;
    }
    if(lvl>=3){
      /* which joints were done wrong is a function of the seed and how
         careful the builder was; the page asks the same function */
      const sd=(a.seed>>>0)&0xFFFFFF;
      b.writeUInt16LE(sd&0xFFFF,o); o+=2;
      b.writeUInt8(sd>>>16,o); o+=1;
      const e=a.err;
      b.writeInt16LE(clamp16(Math.round(Math.log(e/(1-e))*1024)),o); o+=2;
      b.writeUInt16LE(Math.max(0,Math.min(65535,Math.round(a.dmg*65535))),o); o+=2;
    }
  }`]);
E.push(["the request",
`    const body=pack(since, u.searchParams.get("m")==="2");`,
`    const mq=u.searchParams.get("m"), jq=u.searchParams.get("j");
    const body=pack(since, mq==="2"?(jq==="1"?3:2):1);`]);
let bad=0;
if(s.includes("if(lvl>=3){")){ console.error("already applied"); bad++; }
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["no row width anywhere",              !/\bMF\b/.test(back.replace(/MF=28/g,""))],
  ["the reader takes everything left",   back.includes("const nf=((b.length-o)/4)|0;")],
  ["three packet sizes",                 back.includes("n*(lvl>=3?26:(lvl>=2?19:17))")],
  ["j=1 with m=2 asks for the largest",  back.includes('mq==="2"?(jq==="1"?3:2):1')],
  ["seven more bytes when asked",        back.includes("if(lvl>=3){")],
  ["it still parses",                    (()=>{ try{ new (require("vm").Script)(back); return true; }catch(e){ console.log(e.message); return false; } })()],
  ["not applied twice",                  back.split("if(lvl>=3){").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
