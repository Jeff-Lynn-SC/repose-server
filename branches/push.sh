#!/bin/sh
# push.sh — put the folder into the two repositories, and stamp the page with
# the moment it actually goes out. Run it on Jeff's Mac, from anywhere: the
# sandbox cannot push, because the proxy refuses to inject a credential for
# these repositories.
#
#   sh branches/push.sh "commit message"
#
# The token is a fine-grained personal access token scoped to these two
# repositories with contents write and no expiry. It lives in repose-keys.txt
# as GITHUB_TOKEN=. Never print it. Never copy repose-keys.txt into a clone.
set -e
SRC=$(cd "$(dirname "$0")/.." && pwd)
MSG=${1:-"a change"}
WORK="$HOME/.repose-work"

TOK=$(sed -n 's/^[[:space:]]*GITHUB_TOKEN[[:space:]]*[:=][[:space:]]*//p' "$SRC/repose-keys.txt")
[ -n "$TOK" ] || { echo "no GITHUB_TOKEN in repose-keys.txt"; exit 1; }
HELPER="!f(){ echo username=x-access-token; echo password=$TOK; }; f"
mkdir -p "$WORK"

prep(){
  R="$1"
  [ -d "$WORK/$R/.git" ] || git -c credential.helper="$HELPER" clone -q "https://github.com/Jeff-Lynn-SC/$R.git" "$WORK/$R"
  cd "$WORK/$R"
  git config user.email "jeff.lynn.is@gmail.com"
  git config user.name  "Jeff Lynn"
  # a shallow clone rebased over the server's own commits silently no-ops, so
  # fetch and reset rather than pulling
  git -c credential.helper="$HELPER" fetch -q origin main
  git reset -q --hard origin/main
}

commit_push(){
  R="$1"
  git add -A
  if git diff --cached --quiet; then echo "$R: nothing to commit"; return 0; fi
  printf '%s\n' "$MSG" > "$WORK/msg.txt"
  git commit -q -F "$WORK/msg.txt"
  git -c credential.helper="$HELPER" push -q origin HEAD:main && echo "$R: pushed $(git rev-parse --short HEAD)"
}

# ---- the page ----
# BUILT is what the readout calls "page". It used to be stamped by hand, which
# means it was stamped when somebody remembered: two different pages went out
# under one stamp on 10 September. It is now set here, to the moment the file
# actually leaves, and only when the file has really changed - so a run that
# changes nothing does not manufacture a commit.
prep Repose
cp "$SRC/index.html" index.html
if git diff --quiet -- index.html; then
  echo "Repose: index.html unchanged"
else
  python3 - "$SRC/index.html" <<'PY'
import sys, re, time, datetime
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
now = int(time.time() * 1000)
txt = datetime.datetime.utcfromtimestamp(now / 1000).strftime("%Y-%m-%d %H:%M")
new, n = re.subn(r'var BUILT=\d+\s*/\*[^*]*\*/',
                 'var BUILT=%d  /* %s UTC */' % (now, txt), s, count=1)
if n != 1:
    print("REFUSED: no BUILT to stamp"); sys.exit(1)
open(p, "w", encoding="utf-8").write(new)
# it is a Dropbox folder: a write reported as done has come back a version
# behind before, so read it again
back = open(p, encoding="utf-8").read()
if ("var BUILT=%d" % now) not in back:
    print("REFUSED: the stamp did not take"); sys.exit(1)
print("page stamped " + txt + " UTC")
PY
  cp "$SRC/index.html" index.html
fi
commit_push Repose

# ---- the server, and every tool in branches, so a new one is never left
# behind. test.html is built and never pushed; repose-keys.txt is never
# named here at all. ----
prep repose-server
for f in sim.node.js DECISIONS.md HANDOVER.md IDEAS.md README.md bench.js server.js; do
  cp "$SRC/$f" "$f"
done
mkdir -p branches
for f in "$SRC"/branches/*; do
  b=$(basename "$f")
  [ "$b" = "test.html" ] && continue
  cp "$f" "branches/$b"
done
commit_push repose-server
