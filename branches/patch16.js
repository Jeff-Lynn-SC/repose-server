/* patch16 - the lamps are on the machines and they light things.
 *
 * What was there: two small boxes on the cab made of MeshBasicMaterial, which
 * glow and emit nothing, and - entirely separately - a flat disc laid on the
 * sand fourteen metres in front of the machine, seven machine lengths across,
 * blended additively at nine tenths. That is forty-two metres of painted
 * gradient. It did not come from the lamps, did not know where the machine
 * was pointing, did not fall on the shape of the ground, did not shorten when
 * the machine nosed down a slope, and lit neither the machine carrying it nor
 * anything else in the pit. Jeff, looking at it: "it should be lights on the
 * bots not some mystical spotlight."
 *
 * The file's own note said real lamps were impossible - "a few thousand point
 * lights is not a thing a browser will do". True of three.js lights, and
 * beside the point: the sand is one shader of our own and the machines are
 * another, and either can be handed the nearest few lamps and work out what
 * it is receiving. Distance squared and the angle the surface makes to the
 * beam is the whole of it.
 *
 * So: each machine carries one lamp on its cab, at the place the lamp boxes
 * are drawn, aimed where the machine is pointing and tilted down the way a
 * work light is. It moves with the body, so it tilts as the machine tilts on
 * its four wheels. The twelve nearest the camera are sent to both shaders
 * every frame. Sand lit by them, machines lit by them - including their own,
 * so a machine lights its own boom and bucket, and its neighbour's.
 *
 * Usage: node patch16.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch16.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

/* ---------- 1. the shared piece of shader ---------- */
e("lamp glsl and state",
`var machMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.10});`,
`/* ---- what a work lamp does to a surface ----
   Top level on purpose: the sand builds its material inside a function and
   the machines build theirs out here, and both have to see the same block.
   Declared once and pasted into both the sand's shader and the machines',
   because it is the same arithmetic and it must not drift apart.
   uLampP holds where each lamp is, uLampD where it is aimed. The beam is a
   cone with a soft edge; the falloff is distance squared with a few metres of
   softening in it so a lamp two feet from the sand does not become a white
   hole. Nothing here is a look: it is a lamp's power over the square of how
   far the light had to travel, times how squarely it lands. */
var LAMP_MAX=8;
var LAMP_DECL=[
 "uniform vec4 uLampP[8];",     /* xyz where it is */
 "uniform vec4 uLampD[8];",     /* xyz where it points */
 "uniform vec3 uLampC;",         /* colour times power */
 "uniform vec2 uLampCone;",      /* cosine of the outer edge, and of the inner */
 "uniform float uLampN;"
].join("\\n");
var LAMP_APPLY=[
 /* the whole block is skipped when there are no lamps on, which is every
    daylight hour. Without the guard the shader still reads the uniforms and
    sets up the loop for every pixel of the screen: measured at 7% of the
    frame, all day, for nothing. */
 "if(uLampN>0.5){",
 "  vec3 lampN=normalize(vWNrm);",
 "  for(int li=0;li<8;li++){",
 "    if(float(li)>=uLampN) break;",
 "    vec3 dv=uLampP[li].xyz-vWPos;",
 "    float d2=dot(dv,dv);",
 "    vec3 L=dv*inversesqrt(max(d2,1e-6));",
 "    float ndl=max(dot(lampN,L),0.0);",
 "    if(ndl<=0.0) continue;",
 "    float ca=dot(-L,uLampD[li].xyz);",
 "    float cone=smoothstep(uLampCone.x,uLampCone.y,ca);",
 "    if(cone<=0.0) continue;",
 "    vec3 irr=uLampC*(ndl*cone/(d2+9.0));",
 "    /* Lambert, written out rather than borrowed: three.js r128 calls it",
 "       BRDF_Diffuse_Lambert and later versions renamed it, and this file",
 "       is meant to still compile in ten years. */",
 "    reflectedLight.directDiffuse+=irr*diffuseColor.rgb*RECIPROCAL_PI;",
 "  }",
 "}"].join("\\n");
var LAMPU={ uLampP:{value:new Float32Array(32)}, uLampD:{value:new Float32Array(32)},
            uLampC:{value:new THREE.Vector3(0,0,0)},
            uLampCone:{value:new THREE.Vector2(0.42,0.80)},
            uLampN:{value:0} };
function lampUniforms(sh){ for(var k in LAMPU) sh.uniforms[k]=LAMPU[k]; }

var machMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.10});`);

/* ---------- 2. into the sand ---------- */
e("sand takes the lamps",
`    sh.fragmentShader=
      "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\nuniform float uRip;\\n"+`,
`    lampUniforms(sh);
    sh.fragmentShader=
      "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\nuniform float uRip;\\n"+LAMP_DECL+"\\n"+`);

e("sand lit by the lamps",
`    sandMat.userData.shader=sh;`,
`    sh.fragmentShader=sh.fragmentShader.replace(
      "#include <lights_fragment_end>",
      "#include <lights_fragment_end>\\n"+LAMP_APPLY);
    sandMat.userData.shader=sh;`);

/* ---------- 3. into the machines ---------- */
e("machines take the lamps",
`machMat.onBeforeCompile=function(sh){
  sh.vertexShader="attribute vec2 surf;\\nvarying vec2 vSurf;\\nvarying vec3 vLocal;\\n"+
    sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\\n  vSurf=surf;\\n  vLocal=position;");
  sh.fragmentShader="varying vec2 vSurf;\\nvarying vec3 vLocal;\\n"+`,
`machMat.onBeforeCompile=function(sh){
  lampUniforms(sh);
  /* the machines are instanced, so the world matrix is the model matrix and
     the instance's own together - modelMatrix alone puts every machine at the
     origin, which is the sort of thing that looks like a broken shader */
  sh.vertexShader="attribute vec2 surf;\\nvarying vec2 vSurf;\\nvarying vec3 vLocal;\\n"+
    "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\n"+
    sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\\n  vSurf=surf;\\n  vLocal=position;\\n"+
      "  #ifdef USE_INSTANCING\\n"+
      "    vWPos=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\\n"+
      "    vWNrm=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*objectNormal);\\n"+
      "  #else\\n"+
      "    vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;\\n"+
      "    vWNrm=normalize(mat3(modelMatrix)*objectNormal);\\n"+
      "  #endif");
  sh.fragmentShader="varying vec2 vSurf;\\nvarying vec3 vLocal;\\n"+
    "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\n"+LAMP_DECL+"\\n"+`);

e("machines lit by the lamps",
`      .replace("#include <aomap_fragment>",
        "#include <aomap_fragment>\\n"+
        "  {\\n"+
        "    float crease=1.0-smoothstep(0.0,0.055,abs(vLocal.y)+abs(vLocal.z)*0.25);\\n"+
        "    reflectedLight.indirectDiffuse*=1.0-crease*0.30;\\n"+
        "  }");
};`,
`      .replace("#include <aomap_fragment>",
        "#include <aomap_fragment>\\n"+
        "  {\\n"+
        "    float crease=1.0-smoothstep(0.0,0.055,abs(vLocal.y)+abs(vLocal.z)*0.25);\\n"+
        "    reflectedLight.indirectDiffuse*=1.0-crease*0.30;\\n"+
        "  }")
      .replace("#include <lights_fragment_end>",
        "#include <lights_fragment_end>\\n"+LAMP_APPLY);
};`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["lamp glsl declared", back.includes("var LAMP_DECL=[")],
  ["uniform block", back.includes("function lampUniforms(sh){")],
  ["sand declares", back.includes('uniform float uRip;\\n"+LAMP_DECL')],
  ["sand applies", back.includes('"#include <lights_fragment_end>\\n"+LAMP_APPLY')],
  ["machines carry world position", back.includes("vWPos=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;")],
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
