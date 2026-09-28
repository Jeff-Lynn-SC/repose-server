/* patch33 (server half) - send each machine's size when the page asks.
 * Usage: node patch33.server.js <server.js>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch33.server.js <server.js>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[];const e=(n,o,x)=>E.push([n,o,x]);

e("pack wide when asked",
`function pack(since){
  const m = ctx.machines, n = m.length;`,
`function pack(since, wide){
  /* wide: nineteen bytes a machine instead of seventeen, the extra two
     being the size it was born with. Only sent when the page asks for it
     with m=2, so a page that predates this still gets what it expects and
     reads the packet correctly. See patch33. */
  const m = ctx.machines, n = m.length;`);

e("two more bytes each",
`  const head = 44, mach = n*17, cells = count*8;`,
`  const head = 44, mach = n*(wide?19:17), cells = count*8;`);

e("write the size",
`    b.writeUInt8(Math.max(0,Math.min(255,Math.round(a.flash*255))),o); o+=1;
  }`,
`    b.writeUInt8(Math.max(0,Math.min(255,Math.round(a.flash*255))),o); o+=1;
    if(wide){
      /* a logarithm, so there is no floor and no ceiling on how big or small
         the pit's machines are allowed to become: 2^((u-32768)/4096) */
      const sz=(a.size>0)?a.size:1;
      let u=Math.round(32768+4096*Math.log2(sz));
      if(u<0)u=0; else if(u>65535)u=65535;
      b.writeUInt16LE(u,o); o+=2;
    }
  }`);

e("and only when it is asked for",
`    const since=parseInt(u.searchParams.get("since")||"0",10)||0;
    const body=pack(since);`,
`    const since=parseInt(u.searchParams.get("since")||"0",10)||0;
    const body=pack(since, u.searchParams.get("m")==="2");`);

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
