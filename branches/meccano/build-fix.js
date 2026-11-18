const fs=require("fs");
const three=fs.readFileSync("three.js","utf8");
const cur=fs.readFileSync("geom-current.js","utf8");
const v1=fs.readFileSync("geom-meccano-v1.js","utf8");
const mec=fs.readFileSync("geom-meccano.js","utf8");
const sce=fs.readFileSync("scene-fix.js","utf8");
const html=`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Repose - the same machine, in Meccano</title>
<style>
 html,body{margin:0;height:100%;background:#9fb0c6;overflow:hidden;
   font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#1b2430}
 canvas{display:block}
 #cap{position:fixed;left:12px;bottom:12px;background:rgba(0,0,0,.45);color:#fff;
   padding:6px 10px;border-radius:4px;letter-spacing:.02em}
 #key{position:fixed;left:12px;top:12px;background:rgba(0,0,0,.45);color:#fff;
   padding:6px 10px;border-radius:4px}
</style></head><body>
<div id="key">left: as it was &nbsp;|&nbsp; right: wheels outside the frame, body on a platform</div>
<div id="cap"></div>
<script>${three}</script>
<script>${cur}</script>
<script>${v1}</script>
<script>var V1={under:GEOM_UNDER,wheel:GEOM_WHEEL,house:GEOM_HOUSE,boom:GEOM_BOOM,stick:GEOM_STICK,bucket:GEOM_BUCKET};</script>
<script>${mec}</script>
<script>${sce}</script>
</body></html>`;
fs.writeFileSync("../MECCANO-wheels.html",html);
console.log("MECCANO-wheels.html", (html.length/1024).toFixed(0)+" kB");
