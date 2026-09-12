#!/usr/bin/env python3
"""windfix.py <sim.node.js> — wind that varies in time and over the ground,
that only moves sand once it is strong enough to, and that cannot lift packed
sand as easily as loose. Proves every anchor before it writes anything."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()
edits = []

edits.append(("gusts", """  windDir  = walk(d,2.3,4)*6.2832;
  windStr  = Math.pow(walk(d,0.6,5),1.7);""",
"""  windDir  = walk(d,2.3,4)*6.2832;
  windStr  = Math.pow(walk(d,0.6,5),1.7);
  /* Deep time gives the prevailing wind - what the season is doing. Real wind
     is not one number for a week: it gusts and drops over minutes, and it
     swings a few degrees with each gust. Two faster walks on the same clock,
     so nothing is stored and two people opening this at the same moment are
     in the same weather. */
  windGust = 0.45+1.35*walk(d,0.0042,11);        /* about six minutes */
  windDir += (walk(d,0.0090,12)-0.5)*0.55;       /* and it wanders as it goes */"""))

edits.append(("declare", """var windDir=0, windStr=0, eraTick=0;""",
"""var windDir=0, windStr=0, windGust=1, eraTick=0;"""))

edits.append(("windStep", """function windStep(dt){
  if(windStr<0.06) return;
  var wx=Math.cos(windDir), wz=Math.sin(windDir);
  var ax=Math.abs(wx), az=Math.abs(wz), sx=ax/(ax+az+1e-6), sz=1-sx;
  var jxo=wx>0?1:-1, jzo=wz>0?N:-N;
  /* Wind works over hours, not seconds. At the old rate it took a fraction of
     any raised ground away forty times a second, so a fresh heap was flat
     before the machine that made it had turned round. */
  var k=0.010*windStr*dt;
  for(var z=1;z<N-1;z++){
    for(var x=1;x<N-1;x++){
      var i=z*N+x;
      var loc=(h[i-1]+h[i+1]+h[i-N]+h[i+N])*0.25;
      var ex=h[i]-loc;
      if(ex<=0.02*CS) continue;
      var t=ex*k; if(t>ex*0.2) t=ex*0.2;
      h[i]-=t; h[i+jxo]+=t*sx; h[i+jzo]+=t*sz;
      if(wear[i]>0) wear[i]*=(1-0.55*windStr*dt);
    }
  }
}""",
"""/* WIND.

   What this was: one strength for the whole pit, moving sand only off cells
   that already stood above their neighbours, and scrubbing wear only on those
   same cells. So a track on flat ground was never touched by wind at all, and
   the wind had no geography - the lee of a hill blew as hard as its crest.

   What it is now, which is how sand actually moves:

   * There is a threshold. Below a certain wind nothing lifts at all; above
     it the amount carried climbs steeply - Bagnold's cube of the excess. So
     a quiet week leaves the ground alone entirely and a gale rearranges it,
     rather than everything creeping all the time.

   * Packed sand resists. Ground that has been driven over needs a harder
     wind to lift it, so a track that has been used survives weather that
     wipes the loose sand beside it away. That is why old desert tracks last
     for decades and sometimes end up standing proud of the ground around
     them: history, written by the wind refusing to take it.

   * The wind has a shape, and the shape is the ground. It runs quicker up a
     windward face and over a crest, and it slackens in the lee and in
     hollows - which is exactly where the sand it is carrying gets dropped.
     No wind map: the local wind is the prevailing wind and the slope it is
     crossing, so this costs nothing to store and nothing on the wire, and
     dunes walk downwind because of it rather than because anyone said so.

   `WIND_T` is the threshold and `WIND_PACK` how much harder packed sand is to
   lift. Both are material, like the angle of repose. `windGust` is weather. */
var WIND_T=0.12, WIND_PACK=2.2;
function windStep(dt){
  var str=windStr*windGust;
  if(str<WIND_T*0.5) return;                 /* nothing is moving anywhere */
  var wx=Math.cos(windDir), wz=Math.sin(windDir);
  var ax=Math.abs(wx), az=Math.abs(wz), sx=ax/(ax+az+1e-6), sz=1-sx;
  var jxo=wx>0?1:-1, jzo=wz>0?N:-N;
  /* Wind works over hours, not seconds. At the old rate it took a fraction of
     any raised ground away forty times a second, so a fresh heap was flat
     before the machine that made it had turned round. */
  var k=0.055*dt, cs=1/CS;
  for(var z=1;z<N-1;z++){
    for(var x=1;x<N-1;x++){
      var i=z*N+x;
      /* how exposed this place is: the ground it stands above, upwind */
      var upw=h[i-jxo]*sx+h[i-jzo]*sz;
      var expo=(h[i]-upw)*cs;                /* a slope: + into the wind, - in the lee */
      var loc=str*(1+2.2*expo);
      if(loc>str*2.5) loc=str*2.5; else if(loc<0) loc=0;
      var thr=WIND_T*(1+WIND_PACK*(wear[i]||0));
      if(loc<=thr) continue;                 /* it cannot lift this sand */
      var q=loc-thr, flux=q*q*q;             /* Bagnold: the cube of the excess */
      var t=flux*k*CS;
      /* it cannot take more than stands proud of its own neighbours, or it
         would dig a hole in flat ground rather than move a surface */
      var nb=(h[i-1]+h[i+1]+h[i-N]+h[i+N])*0.25, ex=h[i]-nb+0.02*CS;
      if(ex<=0) continue;
      if(t>ex*0.25) t=ex*0.25;
      h[i]-=t; h[i+jxo]+=t*sx; h[i+jzo]+=t*sz;
      /* and the same wind that lifted the sand scours what packed it */
      if(wear[i]>0){
        var sc=q*q*0.9*dt; if(sc>0.5) sc=0.5;
        wear[i]*=(1-sc);
      }
    }
  }
}"""))

edits.append(("on the wire", """    era:{day:worldDays(),mix:mixRaise,repose:reposeDeg,rate:rateMul,windDir:windDir,windStr:windStr},""",
"""    era:{day:worldDays(),mix:mixRaise,repose:reposeDeg,rate:rateMul,windDir:windDir,
         windStr:windStr,windGust:windGust},"""))

edits.append(("export", """  get windStr(){return windStr}, get windDir(){return windDir},""",
"""  get windStr(){return windStr}, get windDir(){return windDir},
  get windGust(){return windGust}, windStep:windStep,"""))

bad = ["%s: found %d" % (n, s.count(o)) for n, o, x in edits if s.count(o) != 1]
if bad:
    print("ANCHORS FAILED:\n  " + "\n  ".join(bad)); sys.exit(1)
for n, o, x in edits:
    s = s.replace(o, x)
open(p, "w", encoding="utf-8").write(s)
b = open(p, encoding="utf-8").read()
for n, o, x in edits:
    if b.count(x) != 1:
        print("CHECK FAILED:", n); sys.exit(1)
print("windfix applied to %s: %d chars" % (p, len(b)))
