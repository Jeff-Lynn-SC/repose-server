#!/usr/bin/env python3
"""trackfix.py <index.html> — tracks of their own, a metre to the texel,
instead of a stain on a five-and-a-half-metre cell. Renderer only: the
simulation is not touched. Proves every anchor before it writes anything."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()
edits = []

# --- 1. the layer itself -----------------------------------------------
edits.append(("the layer", """var pos=null,nor=null,col=null,geo=null,terrain=null,pit=[];""",
"""var pos=null,nor=null,col=null,geo=null,terrain=null,pit=[];

/* ---------------------------------------------------------
   TRACKS.

   Wear is already on the wire and already tints the ground, but it is tinted
   into the terrain's own vertices - and a cell is five and a half metres, so
   a two-metre track was smeared across eleven and read as a cloud shadow.
   Seventy-five machines could cross the pit all day and leave a surface that
   looked untouched.

   So the tracks get a surface of their own, about a metre to the texel, which
   the sand shader samples. A machine lays down two bands where its wheels
   are, the wind rubs them out, and what is left is the pattern the work makes
   - which at a kilometre is the only thing on the ground big enough to read.

   It is drawn here rather than sent over the wire: it is a picture, not state,
   and the wire is for what the world is. The coarse wear tint stays as the
   shared base underneath, so two people looking at the same pit see the same
   worked ground; the fine lines are each viewer's own, from when they arrived.
   --------------------------------------------------------- */
var TRK_N=1024, trkData=null, trkTex=null, trkPx=1, trkUp=0, trkSlice=0,
    trkLX=null, trkLZ=null, trkOn=null;
function trackReset(){
  trkData=new Uint8Array(TRK_N*TRK_N);
  trkTex=new THREE.DataTexture(trkData,TRK_N,TRK_N,THREE.RedFormat,THREE.UnsignedByteType);
  trkTex.minFilter=THREE.LinearFilter; trkTex.magFilter=THREE.LinearFilter;
  trkTex.wrapS=THREE.ClampToEdgeWrapping; trkTex.wrapT=THREE.ClampToEdgeWrapping;
  trkTex.needsUpdate=true;
  trkPx=(HALF*2)/TRK_N;                 /* metres per texel */
  trkLX=new Float32Array(MAXI); trkLZ=new Float32Array(MAXI); trkOn=new Uint8Array(MAXI);
}
/* one soft dab of a wheel, in metres */
function trackDab(wx,wz,rad,amt){
  var u=(wx+HALF)/trkPx, v=(wz+HALF)/trkPx, r=rad/trkPx;
  var u0=Math.floor(u-r), u1=Math.ceil(u+r), v0=Math.floor(v-r), v1=Math.ceil(v+r);
  if(u1<0||v1<0||u0>=TRK_N||v0>=TRK_N) return;
  if(u0<0)u0=0; if(v0<0)v0=0; if(u1>TRK_N-1)u1=TRK_N-1; if(v1>TRK_N-1)v1=TRK_N-1;
  var rr=r*r;
  for(var vy=v0;vy<=v1;vy++){
    var dy=vy+0.5-v, row=vy*TRK_N;
    for(var ux=u0;ux<=u1;ux++){
      var dx=ux+0.5-u, d2=dx*dx+dy*dy;
      if(d2>rr) continue;
      var f=1-d2/rr;                    /* soft at the edge of the tyre */
      var q=trkData[row+ux]+amt*f;
      trkData[row+ux]=q>255?255:q;
    }
  }
}
/* the two bands a machine leaves between where it was and where it is */
function trackLay(i,x,z,ang){
  if(!trkData) return;
  if(!trkOn[i]){ trkOn[i]=1; trkLX[i]=x; trkLZ[i]=z; return; }
  var dx=x-trkLX[i], dz=z-trkLZ[i], d=Math.sqrt(dx*dx+dz*dz);
  if(d<0.02*machLen){ return; }
  if(d>0.6*machLen){ trkLX[i]=x; trkLZ[i]=z; return; }   /* it was moved, not driven */
  var half=0.245*machLen, rad=0.62*0.093*machLen+trkPx*0.55;
  var sx=-Math.sin(ang)*half, sz=Math.cos(ang)*half;
  var steps=Math.ceil(d/(trkPx*0.7)); if(steps>24) steps=24;
  for(var k=1;k<=steps;k++){
    var t=k/steps, px=trkLX[i]+dx*t, pz=trkLZ[i]+dz*t;
    trackDab(px+sx,pz+sz,rad,46);
    trackDab(px-sx,pz-sz,rad,46);
  }
  trkLX[i]=x; trkLZ[i]=z;
}
/* the wind rubs them out, a slice at a time so no frame carries the cost of
   a whole square kilometre */
function trackFade(dt){
  if(!trkData) return;
  var wind=(era&&era.windStr!==undefined)?era.windStr:0.3;
  var per=16, len=(TRK_N*TRK_N/per)|0;
  var k=Math.exp(-(0.010+0.055*wind)*dt*per);
  var a=trkSlice*len, b=a+len;
  for(var i=a;i<b;i++){ var v=trkData[i]; if(v) trkData[i]=v*k; }
  trkSlice=(trkSlice+1)%per;
  var now=performance.now();
  if(now-trkUp>150){ trkUp=now; trkTex.needsUpdate=true; }
}"""))

# --- 2. build it with the terrain ---------------------------------------
edits.append(("build", """  var sandMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.94,metalness:0});
  sandMat.envMapIntensity=0.85;""",
"""  trackReset();
  var sandMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.94,metalness:0});
  sandMat.envMapIntensity=0.85;"""))

# --- 3. the shader samples it -------------------------------------------
edits.append(("shader uniforms", """    sh.uniforms.uRip={value:1.0};""",
"""    sh.uniforms.uRip={value:1.0};
    sh.uniforms.uTrk={value:trkTex};
    sh.uniforms.uTrkHalf={value:HALF};"""))

edits.append(("shader head", """    sh.fragmentShader=
      "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\nuniform float uRip;\\n"+""",
"""    sh.fragmentShader=
      "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\nuniform float uRip;\\n"+
      "uniform sampler2D uTrk;\\nuniform float uTrkHalf;\\n"+
      "float trackAt(vec2 w){ return texture2D(uTrk,(w+uTrkHalf)/(2.0*uTrkHalf)).r; }\\n"+"""))

edits.append(("shader ripple", """      "    float amt=near*lie*uRip;\\n"+""",
"""      "    float amt=near*lie*uRip*(1.0-0.90*trackAt(vWPos.xz));\\n"+"""))

edits.append(("shader colour", """    sandMat.userData.shader=sh;""",
"""    /* packed sand is darker and greyer than loose sand, and it holds no
       ripples at all - which is the whole of what a track looks like */
    sh.fragmentShader=sh.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\\n"+
      "  {\\n"+
      "    float tk=trackAt(vWPos.xz);\\n"+
      "    if(tk>0.002){\\n"+
      "      float lum=dot(diffuseColor.rgb,vec3(0.299,0.587,0.114));\\n"+
      "      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lum),0.22*tk)*(1.0-0.34*tk);\\n"+
      "    }\\n"+
      "  }");
    sandMat.userData.shader=sh;"""))

# --- 4. lay them as the machines move -----------------------------------
edits.append(("lay", """    var y=hAt(x,z), g=gradAt(x,z);""",
"""    trackLay(i,x,z,ang);
    var y=hAt(x,z), g=gradAt(x,z);"""))

edits.append(("fade", """function drawMachines(alpha){
  if(!agA||!agB) return;""",
"""function drawMachines(alpha){
  trackFade(Math.min(0.1,(performance.now()-(drawMachines._t||performance.now()))/1000));
  drawMachines._t=performance.now();
  if(!agA||!agB) return;"""))

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
print("trackfix applied to %s: %d edits, %d chars" % (p, len(edits), len(b)))
