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
function machineMaterial(perforated){
  var m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.10});
  /* three.js caches compiled programs by the MATERIAL'S parameters, and takes
     no account of what onBeforeCompile did to the source. Two materials with
     the same parameters therefore share one program - so the second one here
     silently got the first one's shader, holes and all. This is the only thing
     that tells them apart. */
  m.customProgramCacheKey=function(){ return perforated?"mec-perf":"mec-solid"; };
  m.onBeforeCompile=function(sh){
    sh.vertexShader="attribute vec2 surf;\nvarying vec2 vSurf;\n"+
      (perforated?"attribute vec4 perf;\nattribute vec2 perfo;\nvarying vec4 vPerf;\nvarying vec2 vPerfO;\nvarying vec3 vLoc;\nvarying vec3 vLocN;\n":"")+
      sh.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\n  vSurf=surf;"+
        (perforated?"\n  vPerf=perf;\n  vPerfO=perfo;\n  vLoc=position;\n  vLocN=normal;":""));
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
}
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
var matNow=machineMaterial(false), matMec=machineMaterial(true);

buildMachine(V1, matMec, -8.0, 0, Math.PI*0.62, ML);
buildMachine({under:GEOM_UNDER,wheel:GEOM_WHEEL,house:GEOM_HOUSE,
              boom:GEOM_BOOM,stick:GEOM_STICK,bucket:GEOM_BUCKET},
             matMec,  8.0, 0, Math.PI*0.62, ML);

/* ---- look at them ---- */
var VIEWS=[
  {name:"before (left) and after (right)",        t:[0,1.6,0],  r:30, th:1.57, ph:1.30},
  {name:"after",                                  t:[8,1.6,0],  r:14, th:1.72, ph:1.25},
  {name:"before",                                 t:[-8,1.6,0], r:14, th:1.72, ph:1.25},
  {name:"after, from the side, at wheel height",  t:[8,1.2,0],  r:13, th:0.43, ph:1.50},
  {name:"before, from the side, at wheel height", t:[-8,1.2,0], r:13, th:0.43, ph:1.50},
  {name:"after, from the front",                  t:[8,1.2,0],  r:13, th:2.00, ph:1.45}
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
