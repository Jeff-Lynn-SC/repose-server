/* sync.js — put sim.node.js back inside index.html, and prove they match.
   The two copies of the simulation must stay byte-identical; this is the
   only thing allowed to write one of them from the other. */
const fs=require("fs");
const MARK="REPOSE — SIMULATION WORKER";

const page=fs.readFileSync("index.html","utf8").split("\n");
const node=fs.readFileSync("sim.node.js","utf8").split("\n");

function must(cond,msg){ if(!cond){ console.error("REFUSED: "+msg); process.exit(1); } }

const pMark=page.findIndex(l=>l.includes(MARK));
const nMark=node.findIndex(l=>l.includes(MARK));
must(pMark>0,"no worker marker in index.html");
must(nMark>0,"no worker marker in sim.node.js");
const pStart=pMark-1, nStart=nMark-1;                 /* the /* =====  line above it */
must(page[pStart].indexOf("/* ===")===0,"index.html: marker not preceded by a banner");
must(node[nStart].indexOf("/* ===")===0,"sim.node.js: marker not preceded by a banner");

let pEnd=-1;
for(let i=pStart;i<page.length;i++) if(page[i].includes("</script>")){ pEnd=i; break; }
must(pEnd>pStart,"index.html: no </script> after the worker");

let nEnd=-1;
for(let i=nStart;i<node.length;i++) if(node[i].indexOf("module.exports")===0){ nEnd=i; break; }
must(nEnd>nStart,"sim.node.js: no module.exports after the worker");

const body=node.slice(nStart,nEnd);
const out=page.slice(0,pStart).concat(body,page.slice(pEnd));
fs.writeFileSync("index.html",out.join("\n"));

/* and check it took */
const p2=fs.readFileSync("index.html","utf8").split("\n");
const a=p2.slice(pStart,pStart+body.length).join("\n");
const b=body.join("\n");
must(a===b,"write did not take");
console.log("index.html worker replaced: "+body.length+" lines (was "+(pEnd-pStart)+")");
