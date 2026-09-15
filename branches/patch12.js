/* patch12 - the bucket hinge: the fourth copy of the boom's length.
 *
 * patch6 shortened the boom from 1.30 machine lengths to 0.961 and set BL,
 * which the boom and the inner section are drawn from. The point the bucket
 * hangs from was a separate typed 1.30 in drawMachines, and nothing found it.
 *
 * So the bucket was drawn 2.2 m past the end of the boom with nothing joining
 * them, floating in mid-air, and 2.0 m further out than the simulation puts
 * the teeth. Visible from any angle the moment the machine is looked at.
 *
 * The simulation hinges the bucket at L_BASE. BL is the drawing's copy of
 * that same number - they cannot be shared, because the simulation is a
 * separate <script id="simsrc"> turned into a worker, and that is exactly why
 * a third and fourth copy of one length can sit in a file disagreeing.
 *
 * Usage: node patch12.js <file.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch12.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const old=`    var mK=joint(_mB,mS,1.30,0,0,bk,0);             RIG.bucket.setMatrixAt(i,mK);`;
const neu=`    /* the bucket hangs off the end of the inner section, so this is the boom's
       own retracted length - it was 1.30, which was that length before the
       machine was made real, and the shortened boom left the bucket behind
       in mid-air. The simulation hinges it at L_BASE; BL is this side's copy
       of the same number, because the two live in different scripts. */
    var mK=joint(_mB,mS,BL,0,0,bk,0);               RIG.bucket.setMatrixAt(i,mK);`;
const n=s.split(old).length-1;
if(n!==1){ console.error("ANCHOR bucket hinge: found "+n+", expected 1; nothing written"); process.exit(1); }
fs.writeFileSync(f,s.replace(old,neu));
const back=fs.readFileSync(f,"utf8");
const ok=back.includes("var mK=joint(_mB,mS,BL,0,0,bk,0);") && !back.includes("joint(_mB,mS,1.30,0,0,bk,0)");
console.log((ok?"ok  ":"FAIL")+"  bucket hinged at the boom's own length");
process.exit(ok?0:1);
