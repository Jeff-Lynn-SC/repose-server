const fs=require("fs");
const three=fs.readFileSync("three.js","utf8");
const cur=fs.readFileSync("geom-current.js","utf8");
const mec=fs.readFileSync("geom-meccano.js","utf8");
const sce=fs.readFileSync("scene-bolts.js","utf8");
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
<div id="key">careful and careless, new and worn out</div>
<div id="cap"></div>
<script>${three}</script>
<script>${cur}</script>
<script>${mec}</script>
<script>${sce}</script>
</body></html>`;
fs.writeFileSync("../MECCANO-bolts.html",html);
console.log("MECCANO-preview.html", (html.length/1024).toFixed(0)+" kB");
