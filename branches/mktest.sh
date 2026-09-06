#!/bin/sh
node -e "
const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const a='requestAnimationFrame(frame);\n})();';
if(s.split(a).length!==2){console.error('anchor');process.exit(1);}
fs.writeFileSync('test.html', s.replace(a,'requestAnimationFrame(frame);\nwindow.__R={man:man,manualOn:manualOn,get agB(){return agB},get nB(){return nB},get BASE(){return BASE},get machLen(){return machLen},get HALF(){return HALF},run:function(v){worker&&worker.postMessage({type:\"set\",key:\"running\",value:v});}};\n})();'));
"
[ "$1" = "red" ] && python3 - <<'PY'
p='test.html'; s=open(p).read()
old="""  heapPart(.125,.118,.115, .150,-.168, 0, 1.0, 1.95, SND[0],SND[1],SND[2]),
  heapPart(.112,.075,.085, .150,-.070, 0, 1.0, 1.80, SND[0],SND[1],SND[2]),
  heapPart(.068,.010,.060, .150, .002, 0, 1.0, 1.55, SND[0],SND[1],SND[2])"""
assert s.count(old)==1
open(p,'w').write(s.replace(old,old.replace("SND[0],SND[1],SND[2]","1.6,0.1,0.1")))
PY
echo "test.html built ${1:-plain}"
