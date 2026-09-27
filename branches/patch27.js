/* patch27 - how much sky each patch of ground can see.
 *
 * Nothing in the piece knew this, and it is one gap behind three separate
 * complaints: a machine looks pasted onto the sand; midday looks flat; and a
 * shadow can only ever get so dark.
 *
 * At midday sun.intensity is about 0.80 against hemi 0.85 plus rim and
 * environment, so the sun is only about two fifths of the light landing on
 * level ground. The other three fifths is sky, and it was being handed out
 * in full to every point in the world - the bottom of a dug pit, the inside
 * of a wheel rut, the strip of sand under a bucket - exactly as if each of
 * them had the whole dome overhead. A hollow got as much sky as a hilltop.
 * That is why hollows read flat and why turning the shadow up never helped:
 * the missing darkness was never the sun's to give.
 *
 * WHAT IS COMPUTED. For every point of the terrain, the fraction of the sky
 * hemisphere that is actually open, cosine-weighted, which is the quantity
 * that multiplies sky light. Eight directions; along each, march out to 184 m
 * and keep the steepest horizon found; a horizon standing at angle e hides
 * everything below it, and the cosine-weighted fraction of that slice still
 * visible is cos^2(e). With t as the tangent of the horizon - which is what
 * marching a heightfield gives you directly - cos^2(e) is 1/(1+t*t), so the
 * whole thing is done without a single trigonometric call.
 *
 * It is an approximation in one respect worth naming: the hemisphere is taken
 * about the vertical rather than about the surface normal. On ground that
 * never stands steeper than its angle of repose, 36 degrees, that is a small
 * error and it costs a great deal to do properly.
 *
 * MULTI-BOUNCE. Sand is bright. Light that reaches the floor of a hollow
 * bounces off the walls and lands again, so a hollow is genuinely not as dark
 * as one bounce says it is - and lit sand is close to the worst case for
 * this. The fit used is the standard one (Jimenez et al.), driven by the
 * albedo of the sand actually under the pixel, so dark packed track and
 * bright loose sand each get what they deserve.
 *
 * WHAT IT REPLACES. updateTerrain was baking a fake occlusion into the vertex
 * COLOUR from a one-cell Laplacian: ao=1-clamp(lap/CS*0.6,0,0.32). Two things
 * wrong with it. It can only see one cell - 5.6 m - so a pit wall twenty
 * metres away meant nothing to it. And being in the colour, it darkened
 * direct sunlight too, which is not what occlusion does: a spot in full sun
 * at the bottom of a pit is fully lit by the sun and starved only of sky.
 * It is gone.
 *
 * WHERE IT RUNS. On the page, not in the simulation. The simulation is the
 * world; how much of the sky you can see from a given grain of it is a
 * question about looking, and it keeps sim.node.js out of this entirely. Six
 * rows of the grid per frame, wrapping, so the whole field is refreshed every
 * thirty frames and the cost is about a tenth of a millisecond a frame.
 *
 * NOT scaled by this: sun, moon, and the rim light. The sun and moon have the
 * shadow map. The rim is a directional light standing in for sky off one
 * side, so it arguably should be - but it is one light among the whole
 * direct-lighting sum inside three.js's own shader and cannot be picked out
 * of it without rewriting the chunk. Written down rather than quietly left.
 *
 * Usage: node patch27.js <index.html>
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){console.error("usage: node patch27.js <file>");process.exit(1);}
let s=fs.readFileSync(f,"utf8");
const E=[]; const e=(n,o,x)=>E.push([n,o,x]);

/* ---- 1. somewhere to keep it ---- */
e("declare the field",
`var pos=null,nor=null,col=null,geo=null,terrain=null,pit=[];`,
`var pos=null,nor=null,col=null,geo=null,terrain=null,pit=[];
/* how much of the sky each point of the grid can see, 0..1. See patch27. */
var skyV=null, skyRow=0;`);

e("allocate it with the rest",
`  pos=new Float32Array(N*N*3); nor=new Float32Array(N*N*3); col=new Float32Array(N*N*3);`,
`  pos=new Float32Array(N*N*3); nor=new Float32Array(N*N*3); col=new Float32Array(N*N*3);
  skyV=new Float32Array(N*N); skyV.fill(1); skyRow=0;`);

e("give it to the card",
`  geo.setAttribute("color",new THREE.BufferAttribute(col,3));`,
`  geo.setAttribute("color",new THREE.BufferAttribute(col,3));
  geo.setAttribute("sky",new THREE.BufferAttribute(skyV,1));`);

/* ---- 2. carry it through the sand shader ---- */
e("carry it to the fragment",
`    sh.vertexShader="varying vec3 vWPos;\\nvarying vec3 vWNrm;\\n"+sh.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\\n"+
      "  vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;\\n"+
      "  vWNrm=normalize(mat3(modelMatrix)*normal);");`,
`    sh.vertexShader="varying vec3 vWPos;\\nvarying vec3 vWNrm;\\n"+
      "attribute float sky;\\nvarying float vSky;\\n"+sh.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\\n"+
      "  vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;\\n"+
      "  vWNrm=normalize(mat3(modelMatrix)*normal);\\n"+
      "  vSky=sky;");`);

e("declare it in the fragment",
`      "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\nuniform float uRip;\\n"+LAMP_DECL+"\\n"+`,
`      "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\nvarying float vSky;\\nuniform float uRip;\\n"+LAMP_DECL+"\\n"+`);

e("let the sky light obey it",
`    sh.fragmentShader=sh.fragmentShader.replace(
      "#include <lights_fragment_end>",
      "#include <lights_fragment_end>\\n"+LAMP_APPLY);`,
`    /* Sky, bounce and environment are all indirect: they arrive from the
       dome, so a point that can only see half the dome gets half of them.
       Direct sun and moon are not touched - the shadow map is their business,
       and a spot in full sun at the bottom of a pit is fully sunlit and short
       of sky, not the other way round. See patch27. */
    sh.fragmentShader=sh.fragmentShader.replace(
      "#include <lights_fragment_maps>",
      "#include <lights_fragment_maps>\\n"+
      "  {\\n"+
      "    float sv=clamp(vSky,0.0,1.0);\\n"+
      "    /* sand is bright, and light bounces about inside a hollow, so one\\n"+
      "       bounce says it is darker than it is. Jimenez's fit, driven by the\\n"+
      "       albedo actually under this pixel. */\\n"+
      "    vec3 al=diffuseColor.rgb;\\n"+
      "    vec3 ma=2.0404*al-0.3324;\\n"+
      "    vec3 mb=-4.7951*al+0.6417;\\n"+
      "    vec3 mc=2.7552*al+0.6903;\\n"+
      "    vec3 vis=max(vec3(sv),((sv*ma+mb)*sv+mc)*sv);\\n"+
      "    irradiance*=vis;\\n"+
      "    iblIrradiance*=vis;\\n"+
      "  }");
    sh.fragmentShader=sh.fragmentShader.replace(
      "#include <lights_fragment_end>",
      "#include <lights_fragment_end>\\n"+LAMP_APPLY);`);

/* ---- 3. the fake one goes ---- */
e("the one-cell fake goes",
`    var lap=(hl+hr+hd+hu)*0.25-hv;
    var ao=1-Math.max(0,Math.min(0.32,lap/CS*0.6));
    var k=sd*ao*((hv%band)<band*0.06?0.93:1.0);`,
`    /* There was a fake occlusion here, from a one-cell Laplacian, baked into
       the colour. It could see 5.6 m and it darkened direct sunlight along
       with everything else. Real sky visibility now does the job, in the
       light rather than in the paint. See patch27. */
    var k=sd*((hv%band)<band*0.06?0.93:1.0);`);

/* ---- 4. work it out ---- */
e("work it out, six rows at a time",
`/* ---- machines, drawn from the interpolated snapshot ---- */`,
`/* ---------------------------------------------------------
   HOW MUCH SKY THIS POINT CAN SEE

   Eight directions; along each, march out and keep the steepest horizon.
   A horizon at angle e hides everything below it, so the cosine-weighted
   fraction of that slice still open is cos^2(e) = 1/(1+t*t) with t the
   tangent - which is exactly what marching a heightfield hands you, so
   there is no trigonometry here at all.

   Six rows a frame, wrapping: the whole field every thirty frames. It has
   to be the whole field, not the cells that changed, because digging one
   hole changes what a point two hundred metres away can see.
   --------------------------------------------------------- */
var SKY_DIR=[1,0, 0,1, -1,0, 0,-1, 0.7071,0.7071, -0.7071,0.7071,
             0.7071,-0.7071, -0.7071,-0.7071];
var SKY_STEP=[1,2,3,5,7,10,14,19,25,33];        /* cells: out to about 184 m */
var SKY_ROWS=6;
function skyPass(){
  if(!skyV||!hCur||!geo||!geo.attributes.sky) return;
  var z0=skyRow, z1=z0+SKY_ROWS; if(z1>N) z1=N;
  var z,x,k,j,d,sx,sz,ix,iz,t,hm,vis,i,h0;
  for(z=z0;z<z1;z++) for(x=0;x<N;x++){
    i=z*N+x; h0=hCur[i]; if(h0<0) h0=0;
    vis=0;
    for(k=0;k<8;k++){
      sx=SKY_DIR[k*2]; sz=SKY_DIR[k*2+1]; hm=0;
      for(j=0;j<10;j++){
        d=SKY_STEP[j];
        ix=(x+sx*d)|0; if(ix<0||ix>=N) break;
        iz=(z+sz*d)|0; if(iz<0||iz>=N) break;
        t=(hCur[iz*N+ix]-h0)/(d*CS);
        if(t>hm) hm=t;
      }
      vis+=1/(1+hm*hm);
    }
    skyV[i]=vis*0.125;
  }
  var a=geo.attributes.sky;
  a.updateRange.offset=z0*N; a.updateRange.count=(z1-z0)*N;
  a.needsUpdate=true;
  skyRow=(z1>=N)?0:z1;
}

/* ---- machines, drawn from the interpolated snapshot ---- */`);

e("run it each frame",
`    updateTerrain(alpha);
    drawMachines(alpha);`,
`    updateTerrain(alpha);
    skyPass();
    drawMachines(alpha);`);

let bad=0;
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["the field exists",              back.includes("var skyV=null, skyRow=0;")],
  ["it is allocated",               back.includes("skyV=new Float32Array(N*N); skyV.fill(1);")],
  ["the card gets it",              back.includes(`geo.setAttribute("sky",new THREE.BufferAttribute(skyV,1));`)],
  ["the vertex shader carries it",  back.includes("attribute float sky;")],
  ["the fragment declares it",      back.includes("varying float vSky;")],
  ["indirect light obeys it",       back.includes("irradiance*=vis;")],
  ["environment obeys it too",      back.includes("iblIrradiance*=vis;")],
  ["direct light is untouched",     !back.includes("directDiffuse*=vis")],
  ["the one-cell fake is gone",     !back.includes("var ao=1-Math.max(0,Math.min(0.32,lap/CS*0.6));")],
  ["and nothing still uses it",     !back.includes("var k=sd*ao*")],
  ["the pass exists",               back.includes("function skyPass(){")],
  ["it runs each frame",            back.includes("    skyPass();\n")],
  ["the sim is untouched",          back.split("function skyPass(){").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
