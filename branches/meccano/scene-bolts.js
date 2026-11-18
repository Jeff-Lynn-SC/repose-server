/* The two machines side by side, on the same sand, in the same light.
   Nothing here is the piece: it is a bench to look at a machine on. */
var renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var scene=new THREE.Scene();
scene.background=new THREE.Color(0x9fb0c6);
scene.fog=new THREE.FogExp2(0x9fb0c6,0.013);

var camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,0.05,400);

/* the piece's own light rig, at the hour everything has been shot at */
var hemi=new THREE.HemisphereLight(0x8fa6c4,0x4a331d,0.85); scene.add(hemi);
var sun=new THREE.DirectionalLight(0xffd9a0,1.00); scene.add(sun); scene.add(sun.target);
var rim=new THREE.DirectionalLight(0x6f8fbf,0.26); rim.position.set(8,5,-9); scene.add(rim);
var bounce=new THREE.HemisphereLight(0x000000,0xffc98a,0.34); scene.add(bounce);
var SUN_ALT=19*Math.PI/180, SUN_AZ=232*Math.PI/180;
sun.position.set(Math.sin(SUN_AZ)*Math.cos(SUN_ALT)*22, Math.sin(SUN_ALT)*22,
                 Math.cos(SUN_AZ)*Math.cos(SUN_ALT)*22);
sun.castShadow=true;
sun.shadow.mapSize.width=sun.shadow.mapSize.height=2048;
(function(){ var d=5.0, c=sun.shadow.camera;
  c.left=-d;c.right=d;c.top=d;c.bottom=-d;c.near=1;c.far=60;c.updateProjectionMatrix();
  var texel=2*d/2048;
  sun.shadow.normalBias=1.6*texel; sun.shadow.bias=-0.9*texel/(c.far-c.near);
})();

/* ---- the sand ---- */
var sandMat=new THREE.MeshStandardMaterial({roughness:0.94,metalness:0});
sandMat.color=new THREE.Color(0xc9a567);
sandMat.onBeforeCompile=function(sh){
  sh.vertexShader="varying vec3 vW;\n"+sh.vertexShader.replace("#include <begin_vertex>",
    "#include <begin_vertex>\n  vW=(modelMatrix*vec4(transformed,1.0)).xyz;");
  sh.fragmentShader="varying vec3 vW;\n"+
    "float rp(vec2 p){ return sin(p.x*0.85+sin(p.y*0.19)*2.4)+0.55*sin(p.x*2.10+sin(p.y*0.47)*1.7)+0.28*sin((p.x*0.55+p.y*0.42)*4.7); }\n"+
    sh.fragmentShader.replace("#include <normal_fragment_begin>",
    "#include <normal_fragment_begin>\n"+
    "  { vec2 q=vW.xz*0.78; float e=0.5;\n"+
    "    float r0=rp(q), rx=rp(q+vec2(e,0.0)), rz=rp(q+vec2(0.0,e));\n"+
    "    float amt=1.0-smoothstep(10.0,70.0,length(vW-cameraPosition));\n"+
    "    vec3 wn=normalize(vec3(0.0,1.0,0.0)-vec3(rx-r0,0.0,rz-r0)*0.17*amt);\n"+
    "    normal=normalize((viewMatrix*vec4(wn,0.0)).xyz); }");
};
var sand=new THREE.Mesh(new THREE.PlaneGeometry(240,240,1,1),sandMat);
sand.rotation.x=-Math.PI/2; sand.receiveShadow=true; scene.add(sand);

/* ---- the material the machines are drawn with ----
   The piece's own: colour, roughness and metalness all carried per vertex.
   The Meccano one adds the holes, cut from the part's own object space. */
/* ---------------------------------------------------------
   HOW A BOLTED PART MOVES

   Three things, and each of them is a thing that happens to a real
   Meccano model rather than a look:

   A WRONG HOLE. The commonest mistake there is: a strip bolted one hole
   along from where it should be. It is off by exactly one pitch, no more
   and no less, because there is nowhere in between for a bolt to go.
   This is there from the day the model is built.

   PLAY. A bolt is 5/32" and the hole it goes through is a shade over
   4 mm, so a part held by two bolts that have worked loose can turn by
   the clearance over the distance between them: about a fifth of a
   millimetre in half an inch, 0.016 of a radian. Tight, it does not move
   at all. Barely visible, and real.

   ONE BOLT WHERE THERE SHOULD BE TWO. While the one bolt is tight,
   friction holds the part and nobody would know. As it loosens the part
   swings about it under its own weight - down, if it can - until its
   free end lands on whatever it should have been bolted to, one pitch
   below. So the flaw is invisible on a new machine and shows itself
   only as the machine wears out.

   uCare is the chance that any one joint was done wrong, and which of
   the two mistakes it was is a coin. uWear is how far through its life
   the machine is - the same number that decides when it dies.
   --------------------------------------------------------- */
var SLACK_GLSL=[
"attribute vec4 mc; attribute vec4 md; attribute float mid;",
"uniform float uCare; uniform float uWear; uniform float uSeed; uniform float uP;",
"float h_(float n){ return fract(sin(n)*43758.5453123); }",
"vec3 rotA(vec3 p, vec3 a, float t){ float cs=cos(t), sn=sin(t);",
"  return p*cs+cross(a,p)*sn+a*dot(a,p)*(1.0-cs); }",
"void slack(out vec3 piv, out vec3 ax, out float th, out vec3 sh){",
"  piv=vec3(0.0); ax=vec3(0.0,0.0,1.0); th=0.0; sh=vec3(0.0);",
"  if(md.w<0.5) return;",
"  float k=mid*1.6180339+uSeed*7.31;",
"  float h1=h_(k*12.9898), h2=h_(k*78.233), h3=h_(k*39.425), h4=h_(k*93.989);",
"  bool bad=h1<uCare;",
"  bool wrongHole=bad && h2<0.5;",
"  bool oneBolt=bad && h2>=0.5;",
"  vec3 c=mc.xyz, dir=md.xyz; float ha=mc.w;",
"  piv=c+((h3<0.5)?-1.0:1.0)*ha*dir;          /* which end it is held at */",
"  ax=(md.w<1.5)?vec3(1.0,0.0,0.0):((md.w<2.5)?vec3(0.0,1.0,0.0):vec3(0.0,0.0,1.0));",
"  th=(h4*2.0-1.0)*0.016*uWear;                /* play: the hole's clearance */",
"  if(oneBolt && ha>0.0){",
"    float lim=atan(uP/(2.0*ha));              /* until the free end drops a pitch */",
"    float s;",
"    if(abs(ax.y)>0.5) s=(h4<0.5)?-1.0:1.0;    /* a flat part has no down to fall to */",
"    else s=(cross(ax,c-piv).y>0.0)?-1.0:1.0;  /* otherwise the free end goes down */",
"    th=s*lim*uWear;",
"  }",
"  if(wrongHole) sh=dir*uP*((h4<0.5)?-1.0:1.0);",
"}",
""].join("\n");

function machineMaterial(perforated, care, wear, seed){
  var m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.10});
  /* three.js caches compiled programs by the MATERIAL'S parameters, and takes
     no account of what onBeforeCompile did to the source. Two materials with
     the same parameters therefore share one program - so the second one here
     silently got the first one's shader, holes and all. This is the only thing
     that tells them apart. */
  m.customProgramCacheKey=function(){ return perforated?"mec-perf-slack":"mec-solid"; };
  m.onBeforeCompile=function(sh){
    sh.vertexShader="attribute vec2 surf;\nvarying vec2 vSurf;\n"+
      (perforated?"attribute vec4 perf;\nattribute vec2 perfo;\nvarying vec4 vPerf;\nvarying vec2 vPerfO;\nvarying vec3 vLoc;\nvarying vec3 vLocN;\n"+SLACK_GLSL:"")+
      sh.vertexShader
      .replace("#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\n"+
        (perforated?"  vec3 sPiv, sAx, sSh; float sTh; slack(sPiv,sAx,sTh,sSh);\n"+
                    "  objectNormal=rotA(objectNormal,sAx,sTh);\n":""))
      .replace("#include <begin_vertex>",
        "#include <begin_vertex>\n  vSurf=surf;"+
        (perforated?"\n  vPerf=perf;\n  vPerfO=perfo;\n  vLoc=position;\n  vLocN=normal;"+
                    "\n  transformed=sPiv+rotA(transformed-sPiv,sAx,sTh)+sSh;":""));
    sh.fragmentShader="varying vec2 vSurf;\n"+
      (perforated?"varying vec4 vPerf;\nvarying vec2 vPerfO;\nvarying vec3 vLoc;\nvarying vec3 vLocN;\nuniform float uP;\nuniform float uR;\n":"")+
      sh.fragmentShader
      .replace("#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\n"+
        (perforated?
         /* each part's own hole grid: into the part's frame - its centre,
            its turn about the bore - then holes on the pitch from wherever
            its first hole sits */
         "  if(vPerf.x>0.5){\n"+
         "    int ax=int(vPerf.x+0.5);\n"+
         "    vec3 an=abs(normalize(vLocN));\n"+
         "    vec2 q=vec2(0.0); bool face=false;\n"+
         "    if(ax==1 && an.x>0.5){ q=vLoc.zy; face=true; }\n"+
         "    else if(ax==2 && an.y>0.5){ q=vLoc.xz; face=true; }\n"+
         "    else if(ax==3 && an.z>0.5){ q=vLoc.xy; face=true; }\n"+
         "    if(face){\n"+
         "      vec2 d=q-vPerf.zw; float cs=cos(vPerf.y), sn=sin(vPerf.y);\n"+
         "      vec2 l=vec2(cs*d.x+sn*d.y, -sn*d.x+cs*d.y)-vPerfO;\n"+
         "      vec2 c=mod(l+uP*0.5,uP)-uP*0.5;\n"+
         "      if(dot(c,c)<uR*uR) discard;\n"+
         "    }\n"+
         "  }\n":""))
      .replace("#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\n  roughnessFactor=vSurf.x;")
      .replace("#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\n  metalnessFactor=vSurf.y;");
    if(perforated){ sh.uniforms.uP={value:MP}; sh.uniforms.uR={value:MHR};
      sh.uniforms.uCare={value:care||0}; sh.uniforms.uWear={value:wear||0};
      sh.uniforms.uSeed={value:seed||0}; }
  };
  return m;
}

/* ---- hang the parts off one another, the way the piece does ---- */
var _m4=new THREE.Matrix4(), _mC=new THREE.Matrix4();
function joint(out,parent,x,y,z,rz,ry){
  out.copy(parent);
  _mC.makeTranslation(x,y,z); out.multiply(_mC);
  if(ry){ _mC.makeRotationY(ry); out.multiply(_mC); }
  if(rz){ _mC.makeRotationZ(rz); out.multiply(_mC); }
  return out;
}
function mesh(g,mat){ var m=new THREE.Mesh(g,mat); m.castShadow=true; m.receiveShadow=true; return m; }

/* the arm, posed by hand and posed the same for both: boom down, bucket on
   the sand in front, which is where one of these spends its day */
var BOOM_A=-0.20, STICK_S=0.07, BUCK_A=0.46;

function buildMachine(G, mat, px, pz, ang, ML){
  var root=new THREE.Group(); scene.add(root);
  root.position.set(px,0,pz); root.rotation.y=ang; root.scale.set(ML,ML,ML);
  var mU=new THREE.Matrix4();           /* the body's own frame */
  var under=mesh(G.under,mat); root.add(under);
  var house=mesh(G.house,mat); root.add(house);
  for(var w=0;w<4;w++){
    var wx=(w<2)?WBX:-WBX, wz=(w&1)?WBZ:-WBZ;
    var wh=mesh(G.wheel,mat); wh.position.set(wx,WR,wz); root.add(wh);
  }
  var boomM=new THREE.Matrix4(), stickM=new THREE.Matrix4(), buckM=new THREE.Matrix4();
  joint(boomM,mU,-0.408,0.308,0.092,BOOM_A,0);
  joint(stickM,boomM,STICK_S,0,0,0,0);
  joint(buckM,stickM,BL,0,0,BUCK_A,0);
  var boom=mesh(G.boom,mat);     boom.matrixAutoUpdate=false;  boom.matrix.copy(boomM);  root.add(boom);
  var stick=mesh(G.stick,mat);   stick.matrixAutoUpdate=false; stick.matrix.copy(stickM); root.add(stick);
  var buck=mesh(G.bucket,mat);   buck.matrixAutoUpdate=false;  buck.matrix.copy(buckM);  root.add(buck);
  return root;
}

var ML=5.99;                 /* a machine is six metres long */
var G_MEC={under:GEOM_UNDER,wheel:GEOM_WHEEL,house:GEOM_HOUSE,
           boom:GEOM_BOOM,stick:GEOM_STICK,bucket:GEOM_BUCKET};
/* uCare 0.12 is a careless builder for the sake of seeing it: about one joint
   in eight done wrong. What the pit's builders really start at is a separate
   question, and the population carries it from there. */
var FOUR=[
  {x:-16.5, care:0.00, wear:0.0, seed:11, label:"built carefully, new"},
  {x: -5.5, care:0.12, wear:0.0, seed:23, label:"built carelessly, new"},
  {x:  5.5, care:0.00, wear:1.0, seed:37, label:"built carefully, at the end of its life"},
  {x: 16.5, care:0.12, wear:1.0, seed:23, label:"the same careless one, at the end of its life"}
];
FOUR.forEach(function(f){
  buildMachine(G_MEC, machineMaterial(true,f.care,f.wear,f.seed), f.x, 0, Math.PI*0.62, ML);
});

/* ---- look at them ---- */
var VIEWS=[
  {name:"all four", t:[0,1.8,0], r:46, th:1.57, ph:1.28},
  {name:FOUR[0].label, t:[FOUR[0].x+0.8,1.7,0], r:13, th:1.80, ph:1.20},
  {name:FOUR[1].label, t:[FOUR[1].x+0.8,1.7,0], r:13, th:1.80, ph:1.20},
  {name:FOUR[2].label, t:[FOUR[2].x+0.8,1.7,0], r:13, th:1.80, ph:1.20},
  {name:FOUR[3].label, t:[FOUR[3].x+0.8,1.7,0], r:13, th:1.80, ph:1.20}
];
var vi=0;
function look(){
  var v=VIEWS[vi], sp=Math.sin(v.ph);
  camera.position.set(v.t[0]+v.r*sp*Math.cos(v.th), v.t[1]+v.r*Math.cos(v.ph),
                      v.t[2]+v.r*sp*Math.sin(v.th));
  camera.lookAt(v.t[0],v.t[1],v.t[2]);
  sun.target.position.set(v.t[0],0,v.t[2]); sun.target.updateMatrixWorld();
  sun.position.set(v.t[0]+Math.sin(SUN_AZ)*Math.cos(SUN_ALT)*22, Math.sin(SUN_ALT)*22,
                   v.t[2]+Math.cos(SUN_AZ)*Math.cos(SUN_ALT)*22);
  var l=document.getElementById("cap"); if(l) l.textContent=v.name+"   [space] to change view";
}
look();
addEventListener("keydown",function(e){ if(e.code==="Space"){ vi=(vi+1)%VIEWS.length; look(); } });
addEventListener("click",function(){ vi=(vi+1)%VIEWS.length; look(); });
addEventListener("resize",function(){
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight); look();
});
window.__V=function(i){ vi=i%VIEWS.length; look(); };
window.__DEBUGPERF=function(on){ matMec.onBeforeCompile=null; matMec.needsUpdate=true;
  matMec.vertexColors=!on; };
window.__READY=true;
(function frame(){ requestAnimationFrame(frame); renderer.render(scene,camera); })();
