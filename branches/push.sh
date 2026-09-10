#!/bin/sh
# push.sh — put the folder into the two repositories. Run it on Jeff's Mac,
# from anywhere: the sandbox cannot push, because the proxy refuses to inject
# a credential for these repositories.
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
push_repo(){
  R="$1"; shift
  [ -d "$WORK/$R/.git" ] || git -c credential.helper="$HELPER" clone -q "https://github.com/Jeff-Lynn-SC/$R.git" "$WORK/$R"
  cd "$WORK/$R"
  git config user.email "jeff.lynn.is@gmail.com"
  git config user.name  "Jeff Lynn"
  # a shallow clone rebased over the server's own commits silently no-ops, so
  # fetch and reset rather than pulling
  git -c credential.helper="$HELPER" fetch -q origin main
  git reset -q --hard origin/main
  for f in "$@"; do mkdir -p "$(dirname "$f")"; cp "$SRC/$f" "$f"; done
  git add -A
  if git diff --cached --quiet; then echo "$R: nothing to commit"; return 0; fi
  printf '%s\n' "$MSG" > "$WORK/msg.txt"
  git commit -q -F "$WORK/msg.txt"
  git -c credential.helper="$HELPER" push -q origin HEAD:main && echo "$R: pushed $(git rev-parse --short HEAD)"
}

push_repo Repose index.html

# every tool in branches, so a new one is never left behind. test.html is
# built and never pushed; repose-keys.txt is never named here at all.
BR=""
for f in "$SRC"/branches/*; do
  b=$(basename "$f")
  [ "$b" = "test.html" ] && continue
  BR="$BR branches/$b"
done
push_repo repose-server sim.node.js DECISIONS.md HANDOVER.md IDEAS.md README.md bench.js server.js $BR
