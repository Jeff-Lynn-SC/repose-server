#!/usr/bin/env python3
"""keygate.py <index.html> — a button that needs ?key= should say so rather
than doing nothing. Proves every anchor before it writes anything."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()
edits = []

edits.append(("gate the click",
"""    bs[i].addEventListener("click",function(ev){
      ev.preventDefault();
      var k=this.getAttribute("data-k");
      if(k==="space"){ man.on=!man.on; if(man.on) grabCamera(); }""",
"""    bs[i].addEventListener("click",function(ev){
      ev.preventDefault();
      var k=this.getAttribute("data-k");
      /* Adding, removing and pausing happen on the server and need the word.
         Without it these used to return in silence and whisper into a console
         nobody on a phone can open, so the button looked broken rather than
         locked. It says so now. */
      if(NEEDKEY[k] && netOn && !Q.get("key")){
        var was=this.textContent, self=this;
        self.textContent="needs &key=";
        setTimeout(function(){ self.textContent=was; },1800);
        return;
      }
      if(k==="space"){ man.on=!man.on; if(man.on) grabCamera(); }"""))

edits.append(("gate the look",
"""      else if(k==="r"){ try{localStorage.removeItem(SAVEKEY);}catch(err){} location.reload(); }
    });
  }
})();""",
"""      else if(k==="r"){ try{localStorage.removeItem(SAVEKEY);}catch(err){} location.reload(); }
    });
  }
  /* and they look locked, so the answer arrives before the tap does. netOn is
     not known at once, so this keeps checking. */
  function padGate(){
    var have=!!Q.get("key");
    for(var j=0;j<bs.length;j++){
      var d=bs[j].getAttribute("data-k");
      var lock=NEEDKEY[d]&&netOn&&!have;
      bs[j].style.opacity=lock?"0.38":"";
      bs[j].title=lock?"add &key=<your reset key> to the URL":"";
    }
  }
  padGate(); setInterval(padGate,2000);
})();"""))

edits.append(("the set itself",
"""/* the same actions as the keys, for a screen with no keyboard */
(function(){""",
"""/* which buttons ask the server to do something, and therefore need the word */
var NEEDKEY={R1:1,F1:1,R0:1,F0:1,m:1,M:1,pause:1};
/* the same actions as the keys, for a screen with no keyboard */
(function(){"""))

bad = ["%s: found %d" % (n, s.count(o)) for n, o, x in edits if s.count(o) != 1]
if bad:
    print("ANCHORS FAILED:\n  " + "\n  ".join(bad)); sys.exit(1)
for n, o, x in edits:
    s = s.replace(o, x)
open(p, "w", encoding="utf-8").write(s)
b = open(p, encoding="utf-8").read()
for n, o, x in edits:
    if b.count(x) != 1:
        print("CHECK FAILED:", n); sys.exit(1)   # note: a new block that contains its own anchor still counts once
print("keygate applied to %s: %d edits, %d chars" % (p, len(edits), len(b)))
