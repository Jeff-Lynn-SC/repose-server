/* patch36 - the machines are Meccano.
 *
 * Jeff, on a photograph of a Lego Technic digger: "I'm wondering if, instead
 * of photoreal, the bots should look like they are built from meccano, my
 * childhood favorite". And then: "i really like the idea of mecanno sets now
 * and kids playing at doing usefull stuff that ultimately isnt. the scale
 * also works for me as the peaks and troughs will be relatively high/deep
 * compared with toy".
 *
 * WHAT CHANGES. Only what a machine is drawn with. The same skeleton - the
 * same wheelbase, track, wheel size, boom pivot, boom length, bucket and
 * cutting edge - built from parts that exist: strips and angle girders with
 * their holes, flat plates, bolts, rods, collars, a motor. Every joint the
 * simulation works with is where it was, so the dig point does not move.
 *
 * THE HOLES ARE REAL. Each part carries its own hole grid, half a pitch in
 * from its ends the way a real strip's are, and the holes are cut in the
 * shader from the part's own frame, so the sand shows through them and so
 * does the sun: the shadow pass cuts the same holes. Far away, where a hole
 * would be smaller than a pixel, it is not cut - it could not be seen, and
 * cutting it would only make the part shimmer.
 *
 * IT IS BUILT THE WAY A MODEL HAS TO BE. The axles pass through holes in the
 * chassis girders, so the wheelbase is a whole number of holes - nine - and
 * the hole pitch follows from it. The chassis is inside the wheels. The body
 * is on a platform above the tyres, in two halves with the boom coming down
 * between them (Jeff chose this over tucking the body between the wheels: the
 * way a Meccano lorry is built). The first version ran girders and plates
 * straight through the tyres; a checker that treats every part as a solid
 * box, the tyres as solid tyres on full lock, and the arm at every pose a
 * working pit uses, finds nothing meeting anything now, apart from the boom's
 * own bearing at its pivot.
 *
 * The machine stands taller - about half a metre - because its body is now
 * above its wheels. The lamps on the cab roof go up with it.
 *
 * NOT IN THIS PATCH: bolts done wrong at birth and going slack with wear.
 * That needs the simulation and the wire, and comes next, on its own.
 *
 * The old geometry is still built - the constants the new one is measured
 * from live in it - but nothing draws it.
 */
const fs=require("fs");
const f=process.argv[2]; if(!f){ console.error("usage: node patch36.js index.html"); process.exit(1); }
let s=fs.readFileSync(f,"utf8");
const GEOM="/* ---------------------------------------------------------\n   THE SAME MACHINE, BUILT OUT OF MECCANO\n\n   Not a style applied to the old one: the same skeleton - the same\n   wheelbase and wheels, the same boom pivot, boom and bucket, all read\n   from the dimensions above - assembled out of parts that exist, and\n   put together the way they have to go together.\n\n   A real Meccano strip is half an inch wide, its holes are four\n   millimetres across and they sit half an inch apart. So the hole pitch\n   IS the strip width, and a hole is a third of the width. Those two\n   ratios are the whole look and neither is a choice. MP below is that\n   half inch, at the scale where the wheelbase is nine holes - a six-metre\n   machine about twenty holes long, which is what a model of one would be.\n   Everything else follows from it: thickness is 0.9 mm over 12.7, a bolt\n   head is 5 over 12.7.\n\n   The holes are real. They are cut in the shader from the part's own\n   object space, so they line up through a plate front and back, they\n   are the same size everywhere whatever part they are in, and you can\n   see the sand through them. Each part has its own grid, half a pitch\n   in from its ends, the way a real strip's holes are.\n   --------------------------------------------------------- */\n\n/* The axles go through holes in the chassis, because that is the only way an\n   axle can be fixed to Meccano - so the wheelbase is a whole number of holes.\n   Nine, which puts the pitch within two percent of a twentieth of the\n   machine. The pitch follows from the wheelbase, not the other way round. */\nvar MP   = 2*WBX/9;           /* half an inch: hole pitch, and strip width */\nvar MHR  = 0.315*MP*0.5;      /* 4.0 mm over 12.7 */\nvar MT   = 0.071*MP;          /* 0.9 mm over 12.7 - a strip really is this thin */\nvar MBR  = 0.20*MP;           /* a bolt head, 5 mm over 12.7 */\n\n/* The blue-and-yellow Meccano, which is the Meccano of the late sixties and\n   seventies: yellow strips and girders, blue flat plates, zinc-plated small\n   parts, brass bosses and pulleys. */\nvar M_YEL=LIN3(.84,.64,.09), M_YLD=LIN3(.62,.47,.07),\n    M_BLU=LIN3(.09,.24,.50),  M_BLD=LIN3(.06,.16,.34),\n    M_ZN =LIN3(.70,.72,.76),  M_BRS=LIN3(.74,.58,.24),\n    M_BLK=LIN3(.085,.085,.085), M_STL=LIN3(.42,.41,.40);\n/* enamel over steel is glossy; zinc and brass are the only metals here */\nvar ENAMEL=[0.30,0.06], ZINC=[0.36,0.90], BRASS=[0.30,0.95], TYRE=[0.95,0.0];\n\n/* ---- a perforated part ----\n   bore: 1, 2 or 3 - which axis the holes are bored along.\n   ang:  how far the part is turned ABOUT that axis. A strip used as a brace\n         runs at an angle, and its holes have to run with it.\n\n   Every part carries its own hole grid, centred on itself, the way a real\n   strip's are: a strip of N holes is N pitches long and its holes sit half\n   a pitch in from each end, so an odd count has a hole dead in the middle\n   and an even count straddles it. The first version put every part on one\n   grid anchored at the assembly's origin, which sounded right and was not:\n   a strip whose centre was not on that grid had its holes pushed towards\n   one edge, and some of them half off it. */\nfunction mecPart(w,hh,d, tx,ty,tz, col, bore, rough, metal, ang){\n  var b=bore||0, a=ang||0;\n  var g=new THREE.BoxGeometry(w,hh,d);\n  if(a){\n    /* turned about the bore axis, written so that the part's own length\n       ends up pointing at (cos a, sin a) in the plane the holes are cut in */\n    if(b===3)      g.applyMatrix4(new THREE.Matrix4().makeRotationZ(a));\n    else if(b===2) g.applyMatrix4(new THREE.Matrix4().makeRotationY(-a));\n    else if(b===1) g.applyMatrix4(new THREE.Matrix4().makeRotationX(-a));\n  }\n  g.translate(tx,ty,tz);\n  var U=0,V=0,cu=0,cv=0;\n  if(b===3){ U=w; V=hh; cu=tx; cv=ty; }\n  else if(b===2){ U=w; V=d; cu=tx; cv=tz; }\n  else if(b===1){ U=d; V=hh; cu=tz; cv=ty; }\n  var nu=Math.max(1,Math.round(U/MP)), nv=Math.max(1,Math.round(V/MP));\n  /* the frame it moves in when its bolts are slack: its centre, the way its\n     length runs, how far its end holes are from the middle, and the axis its\n     bolts run along - which is the only axis a bolted part can turn about */\n  var ca=Math.cos(a), sa=Math.sin(a), dir=[0,0,0];\n  if(b===3) dir=[ca,sa,0]; else if(b===2) dir=[ca,0,sa]; else if(b===1) dir=[0,sa,ca];\n  return { g:g, c:col,\n           s:(rough===undefined?ENAMEL[0]:rough), m:(metal===undefined?ENAMEL[1]:metal),\n           perf:b, pa:a, pc:[cu,cv], po:[(nu%2)?0:MP*0.5, (nv%2)?0:MP*0.5],\n           frame:(b>0)?{c:[tx,ty,tz], dir:dir, ha:Math.max(0,(nu-1)*0.5*MP), bore:b}:null };\n}\n/* a strip: MP wide, MT thick, lying along x, holes bored down y */\nfunction strip(len, tx,ty,tz, col){ return mecPart(len,MT,MP, tx,ty,tz, col, 2); }\n/* the same strip stood on edge, holes bored across z */\nfunction stripUp(len, tx,ty,tz, col){ return mecPart(len,MP,MT, tx,ty,tz, col, 3); }\n/* and run across the machine instead of along it */\nfunction stripZ(len, tx,ty,tz, col){ return mecPart(MP,MT,len, tx,ty,tz, col, 2); }\n/* a strip used as a brace: stood on edge and turned, from one point to another */\nfunction brace(x0,y0, x1,y1, tz, col){\n  var dx=x1-x0, dy=y1-y0, L=Math.sqrt(dx*dx+dy*dy);\n  /* a whole number of holes, because that is the only length a strip comes in */\n  var n=Math.max(2,Math.round(L/MP));\n  return mecPart(n*MP,MP,MT, (x0+x1)*0.5,(y0+y1)*0.5,tz, col, 3, undefined,undefined, Math.atan2(dy,dx));\n}\n/* a flat plate lying down */\nfunction plate(w,d, tx,ty,tz, col){ return mecPart(w,MT,d, tx,ty,tz, col, 2); }\n/* a flat plate stood up across the machine */\nfunction plateUp(w,hh, tx,ty,tz, col){ return mecPart(w,hh,MT, tx,ty,tz, col, 3); }\n/* and one facing along the machine */\nfunction plateEnd(hh,d, tx,ty,tz, col){ return mecPart(MT,hh,d, tx,ty,tz, col, 1); }\n\n/* an angle girder: two strips at right angles, which is exactly what it is */\nfunction girder(len, tx,ty,tz, col, out){\n  var s=(out===undefined)?1:out;\n  var f=strip(len, tx, ty, tz+s*MP*0.5-s*MT*0.5, col),\n      u=stripUp(len, tx, ty+MP*0.5-MT*0.5, tz, col);\n  u.join=f;                 /* one piece of folded steel: it moves as one */\n  return [f,u];\n}\n/* a bolt: a zinc head, and nothing else of it shows */\nfunction bolt(tx,ty,tz, axis){\n  var cg=new THREE.CylinderGeometry(MBR,MBR,MT*2.2,6,1,false);\n  if(axis===1) cg.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI/2));\n  else if(axis===3) cg.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI/2));\n  cg.translate(tx,ty,tz);\n  return {g:cg,c:M_ZN,s:ZINC[0],m:ZINC[1],perf:0,isBolt:true,bc:[tx,ty,tz]};\n}\n/* a rod or an axle - zinc, round, and never perforated */\nfunction rod(rad,len, tx,ty,tz, axis, col, rough, metal){\n  var cg=new THREE.CylinderGeometry(rad,rad,len,9,1,false);\n  if(axis===1) cg.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI/2));\n  else if(axis===3) cg.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI/2));\n  cg.translate(tx,ty,tz);\n  return {g:cg,c:col||M_ZN,s:(rough===undefined?ZINC[0]:rough),\n          m:(metal===undefined?ZINC[1]:metal),perf:0};\n}\n/* where the holes of a strip actually are, along its length - so that a bolt\n   goes through one, which is the only place a bolt can go */\nfunction holesAlong(centre,len,every){\n  var n=Math.max(1,Math.round(len/MP)), out=[], k=every||1;\n  for(var i=0;i<n;i+=k) out.push(centre+(i-(n-1)*0.5)*MP);\n  return out;\n}\n/* a row of bolts down a strip, on the hole pitch */\nfunction bolts(n, x0, ty, tz, axis, step){\n  var out=[], st=(step||1)*MP;\n  for(var i=0;i<n;i++) out.push(bolt(x0+i*st, ty, tz, axis||2));\n  return out;\n}\n/* bolts through a strip's own holes */\nfunction boltsIn(centre,len,every, ty,tz, axis){\n  return holesAlong(centre,len,every).map(function(x){ return bolt(x,ty,tz,axis||2); });\n}\nfunction add(arr,x){ if(x.length) for(var i=0;i<x.length;i++) arr.push(x[i]); else arr.push(x); return arr; }\n\n/* ---- merge, carrying each part's hole grid ----\n   perf  = (bore axis, turn about it, centre in the bore plane)\n   perfo = where its holes sit relative to that centre: on it, or half a\n           pitch off, depending on whether it has an odd or even count */\n/* Each part is a \"member\": a strip or a plate, and the bolts that go through\n   its holes. A bolt is given to the part it actually sits in - found by\n   asking which part's body contains it - so that when a part shifts, its\n   bolts go with it, the way they would. Rods, bosses and wheels are not\n   bolted parts and never move. base keeps member numbers distinct between\n   the different assemblies of one machine. */\nfunction memberise(parts, base){\n  var i,j,id=base||0, boxes=[];\n  for(i=0;i<parts.length;i++){\n    var p=parts[i];\n    if(p.frame){\n      if(p.join && p.join.mid!==undefined){ p.mid=p.join.mid; p.frame=p.join.frame; }\n      else p.mid=++id;\n      p.g.computeBoundingBox();\n      boxes.push(p);\n    }\n  }\n  var pad=MT*3.5;\n  for(i=0;i<parts.length;i++){\n    var q=parts[i]; if(!q.isBolt) continue;\n    var best=null, bv=1e9;\n    for(j=0;j<boxes.length;j++){\n      var bb=boxes[j].g.boundingBox, c=q.bc;\n      if(c[0]<bb.min.x-pad||c[0]>bb.max.x+pad||c[1]<bb.min.y-pad||c[1]>bb.max.y+pad||\n         c[2]<bb.min.z-pad||c[2]>bb.max.z+pad) continue;\n      var vol=(bb.max.x-bb.min.x+pad)*(bb.max.y-bb.min.y+pad)*(bb.max.z-bb.min.z+pad);\n      if(vol<bv){ bv=vol; best=boxes[j]; }       /* the thinnest part it is in */\n    }\n    if(best){ q.mid=best.mid; q.frame=best.frame; }\n  }\n  return id;\n}\nvar MEMBER_BASE=0, MEMBER_COUNT={};\nfunction mergeMec(parts){\n  MEMBER_BASE=memberise(parts, MEMBER_BASE);\n  var vc=0,ic=0,i;\n  for(i=0;i<parts.length;i++){ vc+=parts[i].g.attributes.position.count; ic+=parts[i].g.index.count; }\n  var P=new Float32Array(vc*3), Nn=new Float32Array(vc*3), C=new Float32Array(vc*3),\n      S=new Float32Array(vc*2), M=new Float32Array(vc*4), O=new Float32Array(vc*2),\n      MC=new Float32Array(vc*4), MD=new Float32Array(vc*4), MI=new Float32Array(vc),\n      I=(vc>65000)?new Uint32Array(ic):new Uint16Array(ic);\n  var vo=0,io=0;\n  for(i=0;i<parts.length;i++){\n    var pt=parts[i], a=pt.g.attributes, ix=pt.g.index, n=a.position.count, cc=pt.c, j;\n    P.set(a.position.array,vo*3); Nn.set(a.normal.array,vo*3);\n    for(j=0;j<n;j++){\n      var v=vo+j;\n      C[v*3]=cc[0]; C[v*3+1]=cc[1]; C[v*3+2]=cc[2];\n      S[v*2]=pt.s!==undefined?pt.s:ENAMEL[0];\n      S[v*2+1]=pt.m!==undefined?pt.m:ENAMEL[1];\n      M[v*4]=pt.perf||0; M[v*4+1]=pt.pa||0;\n      M[v*4+2]=pt.pc?pt.pc[0]:0; M[v*4+3]=pt.pc?pt.pc[1]:0;\n      O[v*2]=pt.po?pt.po[0]:0; O[v*2+1]=pt.po?pt.po[1]:0;\n      var fr=pt.frame;\n      if(fr){\n        MC[v*4]=fr.c[0]; MC[v*4+1]=fr.c[1]; MC[v*4+2]=fr.c[2]; MC[v*4+3]=fr.ha;\n        MD[v*4]=fr.dir[0]; MD[v*4+1]=fr.dir[1]; MD[v*4+2]=fr.dir[2]; MD[v*4+3]=fr.bore;\n        MI[v]=pt.mid||0;\n      }\n    }\n    for(j=0;j<ix.count;j++) I[io+j]=ix.array[j]+vo;\n    vo+=n; io+=ix.count; pt.g.dispose();\n  }\n  var G=new THREE.BufferGeometry();\n  G.setAttribute(\"position\",new THREE.BufferAttribute(P,3));\n  G.setAttribute(\"normal\",new THREE.BufferAttribute(Nn,3));\n  G.setAttribute(\"color\",new THREE.BufferAttribute(C,3));\n  G.setAttribute(\"surf\",new THREE.BufferAttribute(S,2));\n  G.setAttribute(\"perf\",new THREE.BufferAttribute(M,4));\n  G.setAttribute(\"perfo\",new THREE.BufferAttribute(O,2));\n  G.setAttribute(\"mc\",new THREE.BufferAttribute(MC,4));\n  G.setAttribute(\"md\",new THREE.BufferAttribute(MD,4));\n  G.setAttribute(\"mid\",new THREE.BufferAttribute(MI,1));\n  G.setIndex(new THREE.BufferAttribute(I,1));\n  return G;\n}\n\n/* =========================================================\n   THE CHASSIS - two angle girders with the axles through them,\n   which is how every Meccano chassis that ever existed was made.\n\n   The first version put the girders where the wheels are. They\n   ran straight through the middle of the tyres, and so did the\n   cross strips and half the deck - because the body was copied\n   from a machine whose wheels sit outside a body as wide as it\n   is. A model cannot do that: its parts would meet.\n\n   So the girders are inside the wheels, close together, and the\n   axles pass through their holes. Everything wider than the gap\n   between the tyres is up on a platform that clears them.\n   ========================================================= */\n/* The two girders, two holes apart and set to the left of the middle: the\n   boom comes down on the right, and nothing of the chassis may be under it. */\nvar ZL=-1.5*MP, ZR=0.5*MP;\n/* so that the axle passes through the middle of a girder's upright face */\nvar CHY=AX-MP*0.5+MT*0.5;\nvar MUNDER=[];\n/* sixteen holes, -9.5 to +5.5 pitches: the axles go through the holes at\n   plus and minus four and a half */\nadd(MUNDER, girder(16*MP, -2*MP, CHY, ZL, M_YEL,  1));\nadd(MUNDER, girder(16*MP, -2*MP, CHY, ZR, M_YEL, -1));\n/* cross strips joining the two girders' flanges, whose holes are one pitch\n   apart - only where the wheels are not */\n[-8.5,-1.5,0.5,5.5].forEach(function(u){\n  add(MUNDER, stripZ(2*MP, u*MP, CHY+MT, -0.5*MP, M_YEL));\n  add(MUNDER, bolt(u*MP, CHY+MT*2.4, -MP, 2));\n  add(MUNDER, bolt(u*MP, CHY+MT*2.4,  0,  2));\n});\n/* the axles, through the girders. The back one runs right through, with a\n   collar inside each wheel to hold it. The front wheels steer, so a straight\n   rod cannot go through them: the front axle stops short of the wheels, and\n   each wheel turns on its own boss. */\nadd(MUNDER, rod(.013,.430, -WBX, AX, 0, 3));\n/* short enough that a wheel on full lock does not swing its boss onto it */\nadd(MUNDER, rod(.013,.236, WBX, AX, 0, 3));\n[-1,1].forEach(function(s){\n  add(MUNDER, rod(.018,.014, -WBX, AX, s*(WBZ-WW*0.65-0.007), 3, M_BRS, BRASS[0],BRASS[1]));\n});\n/* ballast at the back: a stack of flat plates on the girders, which is what\n   you did when a Meccano model needed weight */\nvar WTY=CHY-MT*0.5+MP+MT*0.5;\nfor(var mw=0;mw<4;mw++) add(MUNDER, plate(.100,.300, -9*MP, WTY+mw*MT*1.6, -0.5*MP, M_BLU));\nadd(MUNDER, bolts(2, -9.5*MP, WTY+4*MT*1.6, ZL, 2, 1));\nadd(MUNDER, bolts(2, -9.5*MP, WTY+4*MT*1.6, ZR, 2, 1));\n/* outriggers: flat strips from the chassis out to the right, low down and\n   between the wheels, carrying the posts the engine's platform stands on.\n   They run under the boom, which never comes down this far back. */\nvar OUTZ=5*MP;\n[-1.5,0.5].forEach(function(u){\n  add(MUNDER, stripZ(OUTZ+MP, u*MP, CHY+MT*2.2, OUTZ*0.5, M_YLD));\n  add(MUNDER, bolt(u*MP, CHY+MT*3.6, OUTZ, 2));\n});\nvar GEOM_UNDER=mergeMec(MUNDER);\n\n/* a wheel: a brass boss, a zinc disc and a rubber tyre */\nvar MWHEEL=[\n  rod(WR,WW, 0,0,0, 3, M_BLK, TYRE[0],TYRE[1]),\n  rod(WR*.62,WW*1.02, 0,0,0, 3, M_ZN, ZINC[0],ZINC[1]),\n  rod(WR*.20,WW*1.30, 0,0,0, 3, M_BRS, BRASS[0],BRASS[1])\n];\n(function(){\n  for(var t=0;t<6;t++){\n    var a=t/6*6.2832;\n    MWHEEL.push(bolt(Math.cos(a)*WR*.44, Math.sin(a)*WR*.44, WW*0.56, 3));\n  }\n  /* a tread, because a tyre has one */\n  for(var u=0;u<18;u++){\n    var b=u/18*6.2832;\n    var p=boxPart(.016,.026,WW*1.02, Math.cos(b)*WR*.99, Math.sin(b)*WR*.99, 0,\n                  M_BLK[0],M_BLK[1],M_BLK[2], b);\n    p.s=TYRE[0]; p.m=TYRE[1]; p.perf=0; MWHEEL.push(p);\n  }\n})();\nvar GEOM_WHEEL=mergeMec(MWHEEL);\n\n/* =========================================================\n   THE BODY - up on a platform above the wheels, the way a Meccano\n   lorry is built. Girders and strips, with plates where a plate is\n   the only thing that will do: something to stand on, something to\n   keep the rain off, the front of the bonnet. Real Meccano is\n   mostly frame. You can see into it and through it.\n\n   The platform is in two halves with a gap between them, cab on the\n   left and engine on the right, and the boom comes down through the\n   gap. It has to: the boom pivots at the back, lower than a platform\n   would let it work over, so the platform cannot be under it.\n   ========================================================= */\nvar MHOUSE=[];\n/* where drawMachines hangs the boom, which is where the simulation pivots it */\nvar PVX=-.408, PVY=.308, PVZ=.092;\nvar M_RED=LIN3(.46,.07,.05);       /* the motor: dark red, as the clockwork and electric ones were */\n\n/* How high the platform stands. Its rails hang from it on girders, and the\n   posts that carry them are bolted through a girder hole two pitches above\n   the axle's: that is the nearest the holes allow to clearing the top of a\n   tyre, and it leaves room for a wheel riding up over a bump. */\nvar RAILY=AX+2*MP;                 /* the rails' row of holes */\nvar PY=RAILY+MP*0.5+MT*0.5;        /* the platform plates */\n/* everything on the body that used to stand on a deck at .147 stands on\n   this instead */\nvar DY=PY-.147;\n/* a rail: an angle girder upside down, its face hanging under the plate and\n   its flange flat against the underside */\nfunction rail(len, tx, tz, out){\n  var s=(out===undefined)?1:out;\n  var f=strip(len, tx, RAILY+MP*0.5-MT*0.5, tz+s*MP*0.5-s*MT*0.5, M_YEL),\n      u=stripUp(len, tx, RAILY, tz, M_YEL);\n  u.join=f;\n  return [f,u];\n}\n/* a post: a strip stood upright, holes across it */\nfunction post(y0,y1, tx,tz, col){ return mecPart(MP,y1-y0,MT, tx,(y0+y1)*0.5,tz, col||M_YEL, 3); }\n\n/* ---- the cab's half: ten holes long, from x -7 to +3 pitches ---- */\nvar LX=-2*MP, LLEN=10*MP, LZO=ZL-3*MP;\nadd(MHOUSE, rail(LLEN, LX, ZL,  -1));                  /* over the left girder */\nadd(MHOUSE, rail(LLEN, LX, LZO,  1));                  /* outside the left tyres */\nadd(MHOUSE, plate(LLEN, 5*MP, LX, PY, ZL-MP, M_BLU));  /* z from -0.255 to 0 */\n/* posts from the chassis girder to the rail above it, at holes where no\n   axle is */\n[-5.5,1.5].forEach(function(u){\n  add(MHOUSE, post(AX-MP*0.5, RAILY+MP*0.5, u*MP, ZL-MT, M_YLD));\n  add(MHOUSE, bolt(u*MP, AX,    ZL-MT*2.6, 3));\n  add(MHOUSE, bolt(u*MP, RAILY, ZL-MT*2.6, 3));\n});\n/* and a strut between the two rails, between the wheels - the only place\n   one can go without meeting a tyre */\nadd(MHOUSE, mecPart(MT, MP, 3*MP, -0.5*MP, RAILY, ZL-1.5*MP, M_YLD, 1));\n/* bolted down through the plate into the rails' flanges, whose holes run\n   half a pitch in from their corners */\nvar FL=MP*0.5-MT*0.5;\nadd(MHOUSE, boltsIn(LX, LLEN, 3, PY+MT*1.6, LZO+FL, 2));\nadd(MHOUSE, boltsIn(LX, LLEN, 3, PY+MT*1.6, ZL-FL, 2));\n\n/* ---- the engine's half, on the right, outside the boom ---- */\nvar RZO=OUTZ;\nvar RX=-2.5*MP, RLEN=9*MP;\nadd(MHOUSE, rail(RLEN, RX, RZO, -1));                  /* outside the right tyres */\nadd(MHOUSE, plate(RLEN, 2*MP, RX, PY, RZO-MP, M_BLU)); /* z from 0.153 to 0.255 */\n/* posts down to the outriggers, and struts under the plate's inner edge */\n[-1.5,0.5].forEach(function(u){\n  add(MHOUSE, post(CHY+MT*2.8, RAILY+MP*0.5, u*MP, RZO+MT, M_YLD));\n  add(MHOUSE, bolt(u*MP, RAILY, RZO+MT*2.6, 3));\n  add(MHOUSE, mecPart(MT, MP, 2*MP, u*MP, RAILY, RZO-MP, M_YLD, 1));\n});\nadd(MHOUSE, boltsIn(RX, RLEN, 3, PY+MT*1.6, RZO-FL, 2));\n\n/* ---- and behind the wheels, one plate across the whole back joining the\n   two halves, carrying the boom pivot ---- */\nvar BKX=-8.5*MP;\nadd(MHOUSE, plate(3*MP, 10*MP, BKX, PY, 0, M_BLU));\n/* two strips on edge across under it; the front one stands on posts from the\n   chassis, the back one is over the ballast and only stiffens the plate */\n[-7.5,-9.5].forEach(function(u){\n  add(MHOUSE, mecPart(MT, MP, RZO-LZO, u*MP, RAILY, (LZO+RZO)*0.5, M_YEL, 1));\n});\nadd(MHOUSE, post(AX-MP*0.5, RAILY+MP*0.5, -7.5*MP, ZL-MT, M_YLD));\nadd(MHOUSE, post(AX-MP*0.5, RAILY+MP*0.5, -7.5*MP, ZR+MT, M_YLD));\nadd(MHOUSE, bolt(-7.5*MP, AX, ZL-MT*2.6, 3));\nadd(MHOUSE, bolt(-7.5*MP, AX, ZR+MT*2.6, 3));\n\n/* ---- the engine bay, as a frame you can see into ----\n   four corner posts, a rail along the top and the bottom of each side, a\n   brace across each side, a bonnet over the front half only - and in the\n   open back half, the motor, which is what you would see looking into one */\nvar EX0=-.366, EX1=.066, EZ0=RZO-2*MP+MP*0.3, EZ1=RZO-MT, EY0=PY+MT*0.5, EY1=EY0+.143;\n[[EX0+MP*.5,EZ0],[EX1-MP*.5,EZ0],[EX0+MP*.5,EZ1],[EX1-MP*.5,EZ1]].forEach(function(c){\n  add(MHOUSE, mecPart(MP,EY1-EY0,MT, c[0],(EY0+EY1)*.5,c[1], M_YEL, 3));\n});\n[EZ0,EZ1].forEach(function(z){\n  var inn=(z<(EZ0+EZ1)*0.5)?1:-1;     /* braces and bolts inside the bay, away from the boom */\n  add(MHOUSE, stripUp(EX1-EX0, (EX0+EX1)*.5, EY1-MP*.5, z, M_YEL));    /* top rail */\n  add(MHOUSE, stripUp(EX1-EX0, (EX0+EX1)*.5, EY0+MP*.5, z, M_YEL));    /* bottom rail */\n  add(MHOUSE, brace(EX0+MP, EY0+MP*.5, EX1-MP, EY1-MP*.5, z+inn*MT*1.2, M_YLD));\n  add(MHOUSE, boltsIn((EX0+EX1)*.5, EX1-EX0, 3, EY1-MP*.5, z+inn*MT*1.6, 3));\n});\nvar EZM=(EZ0+EZ1)*0.5, EZW=EZ1-EZ0;\nadd(MHOUSE, plate(.200,EZW+MT*4, EX1-.100, EY1+MT*.6, EZM, M_BLU));      /* bonnet, front half */\nadd(MHOUSE, plateEnd(.150,EZW+MT*4, EX1+MT, (EY0+EY1)*.5, EZM, M_BLU));  /* the front of it */\nadd(MHOUSE, stripZ(EZW+MT*4, EX0+MP*.5, EY1, EZM, M_YEL));               /* tie across the open back */\n/* the motor itself, on the platform in the open half */\nadd(MHOUSE, mecPart(.110,.070,EZW*0.62, -.250,EY0+.037,EZM, M_RED, 0, 0.42,0.05));\nadd(MHOUSE, plateUp(.120,.080, -.250,EY0+.037,EZM-EZW*0.36, M_ZN));\nadd(MHOUSE, plateUp(.120,.080, -.250,EY0+.037,EZM+EZW*0.36, M_ZN));\nadd(MHOUSE, rod(.006,EZW*0.95, -.215,EY0+.045,EZM, 3));\nadd(MHOUSE, rod(.022,.012, -.215,EY0+.045,EZM+EZW*0.47, 3, M_BRS, BRASS[0],BRASS[1]));   /* pulley */\n/* an exhaust, which on a Meccano model is a rod and a collar */\nadd(MHOUSE, rod(.009,.070, .030,EY1+.035,EZM, 2));\nadd(MHOUSE, rod(.015,.014, .030,EY1+.006,EZM, 2, M_BRS, BRASS[0],BRASS[1]));\n\n/* ---- the cab: four corner pillars and a roof frame, and nothing in between ---- */\nvar CBX0=-.300, CBX1=.120, CBZ0=-.245, CBZ1=-.035, CBF=PY+MT*0.5, CBY=.455+DY;\n[[CBX0,CBZ0],[CBX1,CBZ0],[CBX0,CBZ1],[CBX1,CBZ1]].forEach(function(c){\n  add(MHOUSE, mecPart(MP,CBY-CBF,MT, c[0],(CBY+CBF)*0.5,c[1], M_YEL, 3));\n  add(MHOUSE, bolt(c[0],CBF+.025,c[1]+MT*1.6, 3));\n  add(MHOUSE, bolt(c[0],CBY-.025,c[1]+MT*1.6, 3));\n});\nadd(MHOUSE, strip(CBX1-CBX0+MP, (CBX0+CBX1)*0.5, CBY, CBZ0, M_YEL));\nadd(MHOUSE, strip(CBX1-CBX0+MP, (CBX0+CBX1)*0.5, CBY, CBZ1, M_YEL));\nadd(MHOUSE, stripZ(CBZ1-CBZ0+MP, CBX0, CBY+MT, (CBZ0+CBZ1)*0.5, M_YEL));\nadd(MHOUSE, stripZ(CBZ1-CBZ0+MP, CBX1, CBY+MT, (CBZ0+CBZ1)*0.5, M_YEL));\n/* a roof, because the sun is the one thing an operator cannot work in */\nadd(MHOUSE, plate(.250,.150, -.110, CBY+MT*2.2, -.140, M_BLU));\n/* a seat: two plates, which is what a Meccano seat is, and a strip to steer by */\nadd(MHOUSE, plate(.110,.130, -.090,.220+DY,-.140, M_ZN));\nadd(MHOUSE, plateUp(.110,.110, -.145,.270+DY,-.140, M_ZN));\nadd(MHOUSE, rod(.005,.090, .010,.250+DY,-.140, 2));\nadd(MHOUSE, rod(.030,.006, .010,.296+DY,-.140, 2, M_BLK, TYRE[0],TYRE[1]));    /* wheel */\n\n/* ---- the boom pivot at the back: a plate each side of the boom, standing\n   on the back plate and braced back to it, and a pin through both at the\n   pivot the simulation uses ---- */\n[-1,1].forEach(function(s){\n  var z=PVZ+s*.052;\n  add(MHOUSE, plateUp(.100,PVY+.030-PY, PVX, (PVY+.030+PY)*0.5, z, M_BLU));\n  add(MHOUSE, brace(PVX-.020,PVY, PVX-.090,PY+MP*0.5, z+s*MT*1.2, M_YEL));\n});\nadd(MHOUSE, rod(.008,.130, PVX,PVY,PVZ, 3));\n\n/* the lamps, on the front of the cab roof, which has moved up with it */\nLAMP_Y+=DY;\nadd(MHOUSE, rod(.018,.022, LAMP_X,LAMP_Y,LAMP_Z1, 1, M_ZN, ZINC[0],ZINC[1]));\nadd(MHOUSE, rod(.018,.022, LAMP_X,LAMP_Y,LAMP_Z2, 1, M_ZN, ZINC[0],ZINC[1]));\nadd(MHOUSE, strip(LAMP_X-CBX1, (LAMP_X+CBX1)*0.5, LAMP_Y-.020, LAMP_Z1, M_YLD));\nadd(MHOUSE, strip(LAMP_X-CBX1, (LAMP_X+CBX1)*0.5, LAMP_Y-.020, LAMP_Z2, M_YLD));\nvar GEOM_HOUSE=mergeMec(MHOUSE);\n\n/* =========================================================\n   THE ARM - strips on edge, two each side, one above the other,\n   which is how a Meccano jib is built when it has to be stiff.\n   Built to the rig's own lengths and the real boom's own section:\n   BMW wide. The first version laid its strips flat, which made a\n   boom nearly twice as wide as the real one, and wide enough to\n   come down through the top of a front tyre.\n\n   The outer section stops short of the carriage pin. When the\n   boom is right in, the carriage on the end of the inner section\n   has to have somewhere to be, and that is past the end of the\n   outer one - which is what a real telescopic boom looks like\n   fully retracted.\n   ========================================================= */\nvar BOL=BL-.080;\nvar MBOOM=[];\n[-1,1].forEach(function(s){\n  var z=s*BMW*0.5;\n  add(MBOOM, stripUp(BOL, BOL*0.5,  MP*0.5, z, M_YEL));    /* top chord */\n  add(MBOOM, stripUp(BOL, BOL*0.5, -MP*0.5, z, M_YLD));    /* bottom chord */\n  /* fishplates inside, bolted through both chords: heads inside the boom,\n     so nothing stands proud of its sides */\n  [.06, BOL*0.36, BOL*0.66, BOL-.04].forEach(function(x){\n    add(MBOOM, mecPart(MP,2*MP,MT, x,0,z-s*MT, M_YLD, 3));\n    add(MBOOM, bolt(x, MP*0.5,z-s*MT*2.6, 3));\n    add(MBOOM, bolt(x,-MP*0.5,z-s*MT*2.6, 3));\n  });\n});\n/* ties across the top and the bottom, flush with the chords' edges */\n[.10, BOL*0.5, BOL-.08].forEach(function(x){\n  add(MBOOM, stripZ(BMW-MT, x,  MP-MT*0.5, 0, M_YEL));\n  add(MBOOM, stripZ(BMW-MT, x, -MP+MT*0.5, 0, M_YEL));\n});\nadd(MBOOM, rod(.022,BMW*1.60, 0,0,0, 3, M_BRS, BRASS[0],BRASS[1]));   /* the pivot boss */\nvar GEOM_BOOM=mergeMec(MBOOM);\n\n/* the inner section: one strip on edge a side, narrow enough to slide between\n   the outer section's fishplates */\nvar SKZ=BMW*0.5-MT*4.5;\nvar MSTICK=[];\n/* it starts clear of the pivot pin, which it would otherwise run into when\n   the boom is right in */\nvar SK0=.060, SK1=BL*.98;\nadd(MSTICK, stripUp(SK1-SK0, (SK0+SK1)*.5, 0, -SKZ, M_YEL));\nadd(MSTICK, stripUp(SK1-SK0, (SK0+SK1)*.5, 0,  SKZ, M_YEL));\nadd(MSTICK, stripZ(2*SKZ, SK0+.040, MP*0.5-MT*0.5, 0, M_YEL));\nadd(MSTICK, stripZ(BMW*1.30, BL*0.97, -MP*0.5-MT*0.5, 0, M_YEL));    /* headstock */\nadd(MSTICK, plateUp(.090,.090, BL*0.97, 0, -BMW*0.56, M_BLU));\nadd(MSTICK, plateUp(.090,.090, BL*0.97, 0,  BMW*0.56, M_BLU));\nadd(MSTICK, rod(.014,BMW*1.25, BL, 0, 0, 3, M_ZN, ZINC[0],ZINC[1]));\n[BL*0.18, BL*0.40, BL*0.62].forEach(function(x){\n  add(MSTICK, bolt(x, 0, -SKZ+MT*1.6, 3));\n  add(MSTICK, bolt(x, 0,  SKZ-MT*1.6, 3));\n});\nvar GEOM_STICK=mergeMec(MSTICK);\n\n/* The bucket, to the same envelope the simulation digs with: it takes its\n   sand from the cutting edge, so that edge has to be exactly where it was.\n   A Meccano bucket is flat plates bolted at angles, because the plates do\n   not bend - which is why it has a corner in it where a real one is round. */\nvar MBUCK=[];\nadd(MBUCK, plateUp(BKD*1.06,BKH*1.10, BKX0+BKD*.50, BKY0+BKH*.50, -BW*.5, M_BLU));\nadd(MBUCK, plateUp(BKD*1.06,BKH*1.10, BKX0+BKD*.50, BKY0+BKH*.50,  BW*.5, M_BLU));\nadd(MBUCK, mecPart(.028,BKH*.80,BW, BKX0+.010, BKY0+BKH*.62, 0, M_BLU, 1));   /* back */\nadd(MBUCK, plate(BKD*.80,BW, BKX0+BKD*.58, BKY0+.012, 0, M_BLU));             /* floor */\nadd(MBUCK, strip(BKD*.34, BKX0+BKD*.17, BKY0+BKH*.16, -BW*.30, M_YEL));       /* throat braces */\nadd(MBUCK, strip(BKD*.34, BKX0+BKD*.17, BKY0+BKH*.16,  BW*.30, M_YEL));\nadd(MBUCK, rod(.016,BW*.99, BKX1, BKY0, 0, 3, M_ZN, ZINC[0],ZINC[1]));        /* cutting edge */\nadd(MBUCK, mecPart(.050,.040,BW*.38, BKX0-.010, BKY1+.018, 0, M_YEL, 1));     /* pivot ear */\nadd(MBUCK, rod(.014,BW*.42, 0,0,0, 3, M_ZN, ZINC[0],ZINC[1]));\nadd(MBUCK, bolts(4, BKX0+.020, BKY0+BKH*.50, -BW*.5-MT*1.8, 3, 1));\nadd(MBUCK, bolts(4, BKX0+.020, BKY0+BKH*.50,  BW*.5+MT*1.8, 3, 1));\nvar GEOM_BUCKET=mergeMec(MBUCK);\n";
const E=[];

/* 1. the Meccano machine, built where everything it is measured from exists,
      and kept to itself so none of its names meet the page's */
E.push(["before the machines' material",
`var machMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.10});
machMat.envMapIntensity=1.0;`,
`/* =========================================================
   THE MACHINE IN MECCANO. See patch36. Built inside a function so
   that its strips and plates and bolts keep their names to
   themselves; what comes out is the six assemblies and the hole
   pitch and radius the material cuts with.
   ========================================================= */
var MEC=(function(){
`+GEOM+`
return {UNDER:GEOM_UNDER, WHEEL:GEOM_WHEEL, HOUSE:GEOM_HOUSE,
        BOOM:GEOM_BOOM, STICK:GEOM_STICK, BUCKET:GEOM_BUCKET,
        MP:MP, MHR:MHR, MEMBERS:MEMBER_BASE};
})();

var machMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.10});
machMat.envMapIntensity=1.0;`]);

/* 2. its material, and the same holes in the shadow it casts */
E.push(["the instancing helper",
`function mkInst(g,mult){
  var CAP=MAXI*(mult||1);
  var m=new THREE.InstancedMesh(g,machMat,CAP);`,
`/* ---- THE MECCANO MATERIAL ----
   The same as the machines' own - its roughness and metalness carried by the
   geometry, the work lamps - with the holes cut, and without the crease
   darkening, which was for a body made of boxes and means nothing on a frame
   you can see through.

   A part's holes are on its own grid: into its frame - its centre, its turn
   about the axis the holes are bored along - then a hole every pitch from
   wherever its first hole sits. Only the faces the holes are bored through
   are cut; the edges of a strip are solid, as they are.

   Where one pixel covers more of a part than a hole's radius, the hole is
   not cut. It could not be seen, and cutting it there only makes the part
   flicker as it moves. The derivatives are taken before anything branches,
   because a derivative inside a branch is undefined. */
var PERF_V="attribute vec4 perf;\\nattribute vec2 perfo;\\nvarying vec4 vPerf;\\nvarying vec2 vPerfO;\\n"+
           "varying vec3 vLoc;\\nvarying vec3 vLocN;\\n";
var PERF_SET="\\n  vPerf=perf;\\n  vPerfO=perfo;\\n  vLoc=position;\\n  vLocN=normal;";
var PERF_F="varying vec4 vPerf;\\nvarying vec2 vPerfO;\\nvarying vec3 vLoc;\\nvarying vec3 vLocN;\\n"+
           "uniform float uP;\\nuniform float uR;\\n";
var PERF_CUT=[
"  {",
"    vec3 fw=fwidth(vLoc);",
"    if(vPerf.x>0.5){",
"      int ax=int(vPerf.x+0.5);",
"      vec3 an=abs(normalize(vLocN));",
"      vec2 q=vec2(0.0); float px=1.0; bool face=false;",
"      if(ax==1 && an.x>0.5){ q=vLoc.zy; px=max(fw.z,fw.y); face=true; }",
"      else if(ax==2 && an.y>0.5){ q=vLoc.xz; px=max(fw.x,fw.z); face=true; }",
"      else if(ax==3 && an.z>0.5){ q=vLoc.xy; px=max(fw.x,fw.y); face=true; }",
"      if(face && px<uR*0.75){",
"        vec2 d=q-vPerf.zw; float cs=cos(vPerf.y), sn=sin(vPerf.y);",
"        vec2 l=vec2(cs*d.x+sn*d.y, -sn*d.x+cs*d.y)-vPerfO;",
"        vec2 c=mod(l+uP*0.5,uP)-uP*0.5;",
"        if(dot(c,c)<uR*uR) discard;",
"      }",
"    }",
"  }",
""].join("\\n");
function perfUniforms(sh){ sh.uniforms.uP={value:MEC.MP}; sh.uniforms.uR={value:MEC.MHR}; }
var mecMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.10});
mecMat.envMapIntensity=1.0;
/* three.js shares one compiled program between materials with the same
   parameters, whatever onBeforeCompile did to them - so without this the
   Meccano parts would be drawn with the old machines' shader, holes and all
   missing, or the other way round */
mecMat.customProgramCacheKey=function(){ return "mec-perf"; };
mecMat.onBeforeCompile=function(sh){
  lampUniforms(sh); perfUniforms(sh);
  sh.vertexShader="attribute vec2 surf;\\nvarying vec2 vSurf;\\n"+
    "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\n"+PERF_V+
    sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\\n  vSurf=surf;"+PERF_SET+"\\n"+
      "  #ifdef USE_INSTANCING\\n"+
      "    vWPos=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\\n"+
      "    vWNrm=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*objectNormal);\\n"+
      "  #else\\n"+
      "    vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;\\n"+
      "    vWNrm=normalize(mat3(modelMatrix)*objectNormal);\\n"+
      "  #endif");
  sh.fragmentShader="varying vec2 vSurf;\\n"+
    "varying vec3 vWPos;\\nvarying vec3 vWNrm;\\n"+LAMP_DECL+"\\n"+PERF_F+
    sh.fragmentShader
      .replace("#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\\n"+PERF_CUT)
      .replace("#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\\n  roughnessFactor=vSurf.x;")
      .replace("#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\\n  metalnessFactor=vSurf.y;")
      .replace("#include <lights_fragment_end>",
        "#include <lights_fragment_end>\\n"+LAMP_APPLY);
};
/* and the shadow: the sun sees through the holes too */
var mecDepth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
mecDepth.extensions={derivatives:true};
mecDepth.customProgramCacheKey=function(){ return "mec-perf-depth"; };
mecDepth.onBeforeCompile=function(sh){
  perfUniforms(sh);
  sh.vertexShader=PERF_V+sh.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>"+PERF_SET);
  sh.fragmentShader=PERF_F+sh.fragmentShader.replace("#include <clipping_planes_fragment>",
    "#include <clipping_planes_fragment>\\n"+PERF_CUT);
};
function mkInst(g,mult,mat,depth){
  var CAP=MAXI*(mult||1);
  var m=new THREE.InstancedMesh(g,mat||machMat,CAP);
  if(depth) m.customDepthMaterial=depth;`]);

/* 3. drawn with it */
E.push(["the rig",
`var RIG={under:mkInst(GEO_UNDER),house:mkInst(GEO_HOUSE),boom:mkInst(GEO_BOOM),
         stick:mkInst(GEO_STICK),bucket:mkInst(GEO_BUCKET),load:mkInst(GEO_LOAD),
         wheel:mkInst(GEO_WHEEL,4)};`,
`var RIG={under:mkInst(MEC.UNDER,1,mecMat,mecDepth),house:mkInst(MEC.HOUSE,1,mecMat,mecDepth),
         boom:mkInst(MEC.BOOM,1,mecMat,mecDepth),stick:mkInst(MEC.STICK,1,mecMat,mecDepth),
         bucket:mkInst(MEC.BUCKET,1,mecMat,mecDepth),load:mkInst(GEO_LOAD),
         wheel:mkInst(MEC.WHEEL,4,mecMat,mecDepth)};`]);

let bad=0;
if(s.includes("var MEC=(function(){")){ console.error("already applied"); bad++; }
for(const [n,o] of E){ const c=s.split(o).length-1;
  if(c!==1){ console.error("ANCHOR "+n+": found "+c); bad++; } }
if(bad){ console.error("nothing written"); process.exit(1); }
for(const [,o,x] of E) s=s.replace(o,x);
fs.writeFileSync(f,s);
const back=fs.readFileSync(f,"utf8");
const checks=[
  ["the Meccano machine is in the page",  back.includes("var MEC=(function(){") && back.includes("var GEOM_BUCKET=mergeMec(MBUCK);")],
  ["built before its material",           back.indexOf("var MEC=(function(){")<back.indexOf("var mecMat=")],
  ["after everything it is measured from",back.indexOf("var MEC=(function(){")>back.indexOf("var BKW=")
                                            && back.indexOf("var MEC=(function(){")>back.indexOf("var LAMP_X=")],
  ["and before the lamp lenses are made",  back.indexOf("var MEC=(function(){")<back.indexOf("var GEO_LAMPS=")],
  ["the lamps go up with the cab, once",   back.split("LAMP_Y+=DY;").length===2],
  ["its own program",                      back.includes('mecMat.customProgramCacheKey=function(){ return "mec-perf"; };')],
  ["holes in the shadow too",              back.includes("m.customDepthMaterial=depth;")],
  ["drawn with it",                        back.includes("under:mkInst(MEC.UNDER,1,mecMat,mecDepth)")],
  ["the old rig is not",                   !back.includes("house:mkInst(GEO_HOUSE)")],
  ["the load and the far stand-in are untouched", back.includes("load:mkInst(GEO_LOAD)") && back.includes("var BLOB=mkInst(GEO_BLOB);")],
  ["not applied twice",                    back.split("var MEC=(function(){").length===2]
];
let fail=0;
for(const [n,ok] of checks){ console.log((ok?"ok  ":"FAIL")+"  "+n); if(!ok) fail++; }
process.exit(fail?1:0);
