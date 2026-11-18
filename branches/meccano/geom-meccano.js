/* ---------------------------------------------------------
   THE SAME MACHINE, BUILT OUT OF MECCANO

   Not a style applied to the old one: the same skeleton - the same
   wheelbase and wheels, the same boom pivot, boom and bucket, all read
   from the dimensions above - assembled out of parts that exist, and
   put together the way they have to go together.

   A real Meccano strip is half an inch wide, its holes are four
   millimetres across and they sit half an inch apart. So the hole pitch
   IS the strip width, and a hole is a third of the width. Those two
   ratios are the whole look and neither is a choice. MP below is that
   half inch, at the scale where the wheelbase is nine holes - a six-metre
   machine about twenty holes long, which is what a model of one would be.
   Everything else follows from it: thickness is 0.9 mm over 12.7, a bolt
   head is 5 over 12.7.

   The holes are real. They are cut in the shader from the part's own
   object space, so they line up through a plate front and back, they
   are the same size everywhere whatever part they are in, and you can
   see the sand through them. Each part has its own grid, half a pitch
   in from its ends, the way a real strip's holes are.
   --------------------------------------------------------- */

/* The axles go through holes in the chassis, because that is the only way an
   axle can be fixed to Meccano - so the wheelbase is a whole number of holes.
   Nine, which puts the pitch within two percent of a twentieth of the
   machine. The pitch follows from the wheelbase, not the other way round. */
var MP   = 2*WBX/9;           /* half an inch: hole pitch, and strip width */
var MHR  = 0.315*MP*0.5;      /* 4.0 mm over 12.7 */
var MT   = 0.071*MP;          /* 0.9 mm over 12.7 - a strip really is this thin */
var MBR  = 0.20*MP;           /* a bolt head, 5 mm over 12.7 */

/* The blue-and-yellow Meccano, which is the Meccano of the late sixties and
   seventies: yellow strips and girders, blue flat plates, zinc-plated small
   parts, brass bosses and pulleys. */
var M_YEL=LIN3(.84,.64,.09), M_YLD=LIN3(.62,.47,.07),
    M_BLU=LIN3(.09,.24,.50),  M_BLD=LIN3(.06,.16,.34),
    M_ZN =LIN3(.70,.72,.76),  M_BRS=LIN3(.74,.58,.24),
    M_BLK=LIN3(.085,.085,.085), M_STL=LIN3(.42,.41,.40);
/* enamel over steel is glossy; zinc and brass are the only metals here */
var ENAMEL=[0.30,0.06], ZINC=[0.36,0.90], BRASS=[0.30,0.95], TYRE=[0.95,0.0];

/* ---- a perforated part ----
   bore: 1, 2 or 3 - which axis the holes are bored along.
   ang:  how far the part is turned ABOUT that axis. A strip used as a brace
         runs at an angle, and its holes have to run with it.

   Every part carries its own hole grid, centred on itself, the way a real
   strip's are: a strip of N holes is N pitches long and its holes sit half
   a pitch in from each end, so an odd count has a hole dead in the middle
   and an even count straddles it. The first version put every part on one
   grid anchored at the assembly's origin, which sounded right and was not:
   a strip whose centre was not on that grid had its holes pushed towards
   one edge, and some of them half off it. */
function mecPart(w,hh,d, tx,ty,tz, col, bore, rough, metal, ang){
  var b=bore||0, a=ang||0;
  var g=new THREE.BoxGeometry(w,hh,d);
  if(a){
    /* turned about the bore axis, written so that the part's own length
       ends up pointing at (cos a, sin a) in the plane the holes are cut in */
    if(b===3)      g.applyMatrix4(new THREE.Matrix4().makeRotationZ(a));
    else if(b===2) g.applyMatrix4(new THREE.Matrix4().makeRotationY(-a));
    else if(b===1) g.applyMatrix4(new THREE.Matrix4().makeRotationX(-a));
  }
  g.translate(tx,ty,tz);
  var U=0,V=0,cu=0,cv=0;
  if(b===3){ U=w; V=hh; cu=tx; cv=ty; }
  else if(b===2){ U=w; V=d; cu=tx; cv=tz; }
  else if(b===1){ U=d; V=hh; cu=tz; cv=ty; }
  var nu=Math.max(1,Math.round(U/MP)), nv=Math.max(1,Math.round(V/MP));
  /* the frame it moves in when its bolts are slack: its centre, the way its
     length runs, how far its end holes are from the middle, and the axis its
     bolts run along - which is the only axis a bolted part can turn about */
  var ca=Math.cos(a), sa=Math.sin(a), dir=[0,0,0];
  if(b===3) dir=[ca,sa,0]; else if(b===2) dir=[ca,0,sa]; else if(b===1) dir=[0,sa,ca];
  return { g:g, c:col,
           s:(rough===undefined?ENAMEL[0]:rough), m:(metal===undefined?ENAMEL[1]:metal),
           perf:b, pa:a, pc:[cu,cv], po:[(nu%2)?0:MP*0.5, (nv%2)?0:MP*0.5],
           frame:(b>0)?{c:[tx,ty,tz], dir:dir, ha:Math.max(0,(nu-1)*0.5*MP), bore:b}:null };
}
/* a strip: MP wide, MT thick, lying along x, holes bored down y */
function strip(len, tx,ty,tz, col){ return mecPart(len,MT,MP, tx,ty,tz, col, 2); }
/* the same strip stood on edge, holes bored across z */
function stripUp(len, tx,ty,tz, col){ return mecPart(len,MP,MT, tx,ty,tz, col, 3); }
/* and run across the machine instead of along it */
function stripZ(len, tx,ty,tz, col){ return mecPart(MP,MT,len, tx,ty,tz, col, 2); }
/* a strip used as a brace: stood on edge and turned, from one point to another */
function brace(x0,y0, x1,y1, tz, col){
  var dx=x1-x0, dy=y1-y0, L=Math.sqrt(dx*dx+dy*dy);
  /* a whole number of holes, because that is the only length a strip comes in */
  var n=Math.max(2,Math.round(L/MP));
  return mecPart(n*MP,MP,MT, (x0+x1)*0.5,(y0+y1)*0.5,tz, col, 3, undefined,undefined, Math.atan2(dy,dx));
}
/* a flat plate lying down */
function plate(w,d, tx,ty,tz, col){ return mecPart(w,MT,d, tx,ty,tz, col, 2); }
/* a flat plate stood up across the machine */
function plateUp(w,hh, tx,ty,tz, col){ return mecPart(w,hh,MT, tx,ty,tz, col, 3); }
/* and one facing along the machine */
function plateEnd(hh,d, tx,ty,tz, col){ return mecPart(MT,hh,d, tx,ty,tz, col, 1); }

/* an angle girder: two strips at right angles, which is exactly what it is */
function girder(len, tx,ty,tz, col, out){
  var s=(out===undefined)?1:out;
  var f=strip(len, tx, ty, tz+s*MP*0.5-s*MT*0.5, col),
      u=stripUp(len, tx, ty+MP*0.5-MT*0.5, tz, col);
  u.join=f;                 /* one piece of folded steel: it moves as one */
  return [f,u];
}
/* a bolt: a zinc head, and nothing else of it shows */
function bolt(tx,ty,tz, axis){
  var cg=new THREE.CylinderGeometry(MBR,MBR,MT*2.2,6,1,false);
  if(axis===1) cg.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI/2));
  else if(axis===3) cg.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI/2));
  cg.translate(tx,ty,tz);
  return {g:cg,c:M_ZN,s:ZINC[0],m:ZINC[1],perf:0,isBolt:true,bc:[tx,ty,tz]};
}
/* a rod or an axle - zinc, round, and never perforated */
function rod(rad,len, tx,ty,tz, axis, col, rough, metal){
  var cg=new THREE.CylinderGeometry(rad,rad,len,9,1,false);
  if(axis===1) cg.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI/2));
  else if(axis===3) cg.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI/2));
  cg.translate(tx,ty,tz);
  return {g:cg,c:col||M_ZN,s:(rough===undefined?ZINC[0]:rough),
          m:(metal===undefined?ZINC[1]:metal),perf:0};
}
/* where the holes of a strip actually are, along its length - so that a bolt
   goes through one, which is the only place a bolt can go */
function holesAlong(centre,len,every){
  var n=Math.max(1,Math.round(len/MP)), out=[], k=every||1;
  for(var i=0;i<n;i+=k) out.push(centre+(i-(n-1)*0.5)*MP);
  return out;
}
/* a row of bolts down a strip, on the hole pitch */
function bolts(n, x0, ty, tz, axis, step){
  var out=[], st=(step||1)*MP;
  for(var i=0;i<n;i++) out.push(bolt(x0+i*st, ty, tz, axis||2));
  return out;
}
/* bolts through a strip's own holes */
function boltsIn(centre,len,every, ty,tz, axis){
  return holesAlong(centre,len,every).map(function(x){ return bolt(x,ty,tz,axis||2); });
}
function add(arr,x){ if(x.length) for(var i=0;i<x.length;i++) arr.push(x[i]); else arr.push(x); return arr; }

/* ---- merge, carrying each part's hole grid ----
   perf  = (bore axis, turn about it, centre in the bore plane)
   perfo = where its holes sit relative to that centre: on it, or half a
           pitch off, depending on whether it has an odd or even count */
/* Each part is a "member": a strip or a plate, and the bolts that go through
   its holes. A bolt is given to the part it actually sits in - found by
   asking which part's body contains it - so that when a part shifts, its
   bolts go with it, the way they would. Rods, bosses and wheels are not
   bolted parts and never move. base keeps member numbers distinct between
   the different assemblies of one machine. */
function memberise(parts, base){
  var i,j,id=base||0, boxes=[];
  for(i=0;i<parts.length;i++){
    var p=parts[i];
    if(p.frame){
      if(p.join && p.join.mid!==undefined){ p.mid=p.join.mid; p.frame=p.join.frame; }
      else p.mid=++id;
      p.g.computeBoundingBox();
      boxes.push(p);
    }
  }
  var pad=MT*3.5;
  for(i=0;i<parts.length;i++){
    var q=parts[i]; if(!q.isBolt) continue;
    var best=null, bv=1e9;
    for(j=0;j<boxes.length;j++){
      var bb=boxes[j].g.boundingBox, c=q.bc;
      if(c[0]<bb.min.x-pad||c[0]>bb.max.x+pad||c[1]<bb.min.y-pad||c[1]>bb.max.y+pad||
         c[2]<bb.min.z-pad||c[2]>bb.max.z+pad) continue;
      var vol=(bb.max.x-bb.min.x+pad)*(bb.max.y-bb.min.y+pad)*(bb.max.z-bb.min.z+pad);
      if(vol<bv){ bv=vol; best=boxes[j]; }       /* the thinnest part it is in */
    }
    if(best){ q.mid=best.mid; q.frame=best.frame; }
  }
  return id;
}
var MEMBER_BASE=0, MEMBER_COUNT={};
function mergeMec(parts){
  MEMBER_BASE=memberise(parts, MEMBER_BASE);
  var vc=0,ic=0,i;
  for(i=0;i<parts.length;i++){ vc+=parts[i].g.attributes.position.count; ic+=parts[i].g.index.count; }
  var P=new Float32Array(vc*3), Nn=new Float32Array(vc*3), C=new Float32Array(vc*3),
      S=new Float32Array(vc*2), M=new Float32Array(vc*4), O=new Float32Array(vc*2),
      MC=new Float32Array(vc*4), MD=new Float32Array(vc*4), MI=new Float32Array(vc),
      I=(vc>65000)?new Uint32Array(ic):new Uint16Array(ic);
  var vo=0,io=0;
  for(i=0;i<parts.length;i++){
    var pt=parts[i], a=pt.g.attributes, ix=pt.g.index, n=a.position.count, cc=pt.c, j;
    P.set(a.position.array,vo*3); Nn.set(a.normal.array,vo*3);
    for(j=0;j<n;j++){
      var v=vo+j;
      C[v*3]=cc[0]; C[v*3+1]=cc[1]; C[v*3+2]=cc[2];
      S[v*2]=pt.s!==undefined?pt.s:ENAMEL[0];
      S[v*2+1]=pt.m!==undefined?pt.m:ENAMEL[1];
      M[v*4]=pt.perf||0; M[v*4+1]=pt.pa||0;
      M[v*4+2]=pt.pc?pt.pc[0]:0; M[v*4+3]=pt.pc?pt.pc[1]:0;
      O[v*2]=pt.po?pt.po[0]:0; O[v*2+1]=pt.po?pt.po[1]:0;
      var fr=pt.frame;
      if(fr){
        MC[v*4]=fr.c[0]; MC[v*4+1]=fr.c[1]; MC[v*4+2]=fr.c[2]; MC[v*4+3]=fr.ha;
        MD[v*4]=fr.dir[0]; MD[v*4+1]=fr.dir[1]; MD[v*4+2]=fr.dir[2]; MD[v*4+3]=fr.bore;
        MI[v]=pt.mid||0;
      }
    }
    for(j=0;j<ix.count;j++) I[io+j]=ix.array[j]+vo;
    vo+=n; io+=ix.count; pt.g.dispose();
  }
  var G=new THREE.BufferGeometry();
  G.setAttribute("position",new THREE.BufferAttribute(P,3));
  G.setAttribute("normal",new THREE.BufferAttribute(Nn,3));
  G.setAttribute("color",new THREE.BufferAttribute(C,3));
  G.setAttribute("surf",new THREE.BufferAttribute(S,2));
  G.setAttribute("perf",new THREE.BufferAttribute(M,4));
  G.setAttribute("perfo",new THREE.BufferAttribute(O,2));
  G.setAttribute("mc",new THREE.BufferAttribute(MC,4));
  G.setAttribute("md",new THREE.BufferAttribute(MD,4));
  G.setAttribute("mid",new THREE.BufferAttribute(MI,1));
  G.setIndex(new THREE.BufferAttribute(I,1));
  return G;
}

/* =========================================================
   THE CHASSIS - two angle girders with the axles through them,
   which is how every Meccano chassis that ever existed was made.

   The first version put the girders where the wheels are. They
   ran straight through the middle of the tyres, and so did the
   cross strips and half the deck - because the body was copied
   from a machine whose wheels sit outside a body as wide as it
   is. A model cannot do that: its parts would meet.

   So the girders are inside the wheels, close together, and the
   axles pass through their holes. Everything wider than the gap
   between the tyres is up on a platform that clears them.
   ========================================================= */
/* The two girders, two holes apart and set to the left of the middle: the
   boom comes down on the right, and nothing of the chassis may be under it. */
var ZL=-1.5*MP, ZR=0.5*MP;
/* so that the axle passes through the middle of a girder's upright face */
var CHY=AX-MP*0.5+MT*0.5;
var MUNDER=[];
/* sixteen holes, -9.5 to +5.5 pitches: the axles go through the holes at
   plus and minus four and a half */
add(MUNDER, girder(16*MP, -2*MP, CHY, ZL, M_YEL,  1));
add(MUNDER, girder(16*MP, -2*MP, CHY, ZR, M_YEL, -1));
/* cross strips joining the two girders' flanges, whose holes are one pitch
   apart - only where the wheels are not */
[-8.5,-1.5,0.5,5.5].forEach(function(u){
  add(MUNDER, stripZ(2*MP, u*MP, CHY+MT, -0.5*MP, M_YEL));
  add(MUNDER, bolt(u*MP, CHY+MT*2.4, -MP, 2));
  add(MUNDER, bolt(u*MP, CHY+MT*2.4,  0,  2));
});
/* the axles, through the girders. The back one runs right through, with a
   collar inside each wheel to hold it. The front wheels steer, so a straight
   rod cannot go through them: the front axle stops short of the wheels, and
   each wheel turns on its own boss. */
add(MUNDER, rod(.013,.430, -WBX, AX, 0, 3));
/* short enough that a wheel on full lock does not swing its boss onto it */
add(MUNDER, rod(.013,.236, WBX, AX, 0, 3));
[-1,1].forEach(function(s){
  add(MUNDER, rod(.018,.014, -WBX, AX, s*(WBZ-WW*0.65-0.007), 3, M_BRS, BRASS[0],BRASS[1]));
});
/* ballast at the back: a stack of flat plates on the girders, which is what
   you did when a Meccano model needed weight */
var WTY=CHY-MT*0.5+MP+MT*0.5;
for(var mw=0;mw<4;mw++) add(MUNDER, plate(.100,.300, -9*MP, WTY+mw*MT*1.6, -0.5*MP, M_BLU));
add(MUNDER, bolts(2, -9.5*MP, WTY+4*MT*1.6, ZL, 2, 1));
add(MUNDER, bolts(2, -9.5*MP, WTY+4*MT*1.6, ZR, 2, 1));
/* outriggers: flat strips from the chassis out to the right, low down and
   between the wheels, carrying the posts the engine's platform stands on.
   They run under the boom, which never comes down this far back. */
var OUTZ=5*MP;
[-1.5,0.5].forEach(function(u){
  add(MUNDER, stripZ(OUTZ+MP, u*MP, CHY+MT*2.2, OUTZ*0.5, M_YLD));
  add(MUNDER, bolt(u*MP, CHY+MT*3.6, OUTZ, 2));
});
var GEOM_UNDER=mergeMec(MUNDER);

/* a wheel: a brass boss, a zinc disc and a rubber tyre */
var MWHEEL=[
  rod(WR,WW, 0,0,0, 3, M_BLK, TYRE[0],TYRE[1]),
  rod(WR*.62,WW*1.02, 0,0,0, 3, M_ZN, ZINC[0],ZINC[1]),
  rod(WR*.20,WW*1.30, 0,0,0, 3, M_BRS, BRASS[0],BRASS[1])
];
(function(){
  for(var t=0;t<6;t++){
    var a=t/6*6.2832;
    MWHEEL.push(bolt(Math.cos(a)*WR*.44, Math.sin(a)*WR*.44, WW*0.56, 3));
  }
  /* a tread, because a tyre has one */
  for(var u=0;u<18;u++){
    var b=u/18*6.2832;
    var p=boxPart(.016,.026,WW*1.02, Math.cos(b)*WR*.99, Math.sin(b)*WR*.99, 0,
                  M_BLK[0],M_BLK[1],M_BLK[2], b);
    p.s=TYRE[0]; p.m=TYRE[1]; p.perf=0; MWHEEL.push(p);
  }
})();
var GEOM_WHEEL=mergeMec(MWHEEL);

/* =========================================================
   THE BODY - up on a platform above the wheels, the way a Meccano
   lorry is built. Girders and strips, with plates where a plate is
   the only thing that will do: something to stand on, something to
   keep the rain off, the front of the bonnet. Real Meccano is
   mostly frame. You can see into it and through it.

   The platform is in two halves with a gap between them, cab on the
   left and engine on the right, and the boom comes down through the
   gap. It has to: the boom pivots at the back, lower than a platform
   would let it work over, so the platform cannot be under it.
   ========================================================= */
var MHOUSE=[];
/* where drawMachines hangs the boom, which is where the simulation pivots it */
var PVX=-.408, PVY=.308, PVZ=.092;
var M_RED=LIN3(.46,.07,.05);       /* the motor: dark red, as the clockwork and electric ones were */

/* How high the platform stands. Its rails hang from it on girders, and the
   posts that carry them are bolted through a girder hole two pitches above
   the axle's: that is the nearest the holes allow to clearing the top of a
   tyre, and it leaves room for a wheel riding up over a bump. */
var RAILY=AX+2*MP;                 /* the rails' row of holes */
var PY=RAILY+MP*0.5+MT*0.5;        /* the platform plates */
/* everything on the body that used to stand on a deck at .147 stands on
   this instead */
var DY=PY-.147;
/* a rail: an angle girder upside down, its face hanging under the plate and
   its flange flat against the underside */
function rail(len, tx, tz, out){
  var s=(out===undefined)?1:out;
  var f=strip(len, tx, RAILY+MP*0.5-MT*0.5, tz+s*MP*0.5-s*MT*0.5, M_YEL),
      u=stripUp(len, tx, RAILY, tz, M_YEL);
  u.join=f;
  return [f,u];
}
/* a post: a strip stood upright, holes across it */
function post(y0,y1, tx,tz, col){ return mecPart(MP,y1-y0,MT, tx,(y0+y1)*0.5,tz, col||M_YEL, 3); }

/* ---- the cab's half: ten holes long, from x -7 to +3 pitches ---- */
var LX=-2*MP, LLEN=10*MP, LZO=ZL-3*MP;
add(MHOUSE, rail(LLEN, LX, ZL,  -1));                  /* over the left girder */
add(MHOUSE, rail(LLEN, LX, LZO,  1));                  /* outside the left tyres */
add(MHOUSE, plate(LLEN, 5*MP, LX, PY, ZL-MP, M_BLU));  /* z from -0.255 to 0 */
/* posts from the chassis girder to the rail above it, at holes where no
   axle is */
[-5.5,1.5].forEach(function(u){
  add(MHOUSE, post(AX-MP*0.5, RAILY+MP*0.5, u*MP, ZL-MT, M_YLD));
  add(MHOUSE, bolt(u*MP, AX,    ZL-MT*2.6, 3));
  add(MHOUSE, bolt(u*MP, RAILY, ZL-MT*2.6, 3));
});
/* and a strut between the two rails, between the wheels - the only place
   one can go without meeting a tyre */
add(MHOUSE, mecPart(MT, MP, 3*MP, -0.5*MP, RAILY, ZL-1.5*MP, M_YLD, 1));
/* bolted down through the plate into the rails' flanges, whose holes run
   half a pitch in from their corners */
var FL=MP*0.5-MT*0.5;
add(MHOUSE, boltsIn(LX, LLEN, 3, PY+MT*1.6, LZO+FL, 2));
add(MHOUSE, boltsIn(LX, LLEN, 3, PY+MT*1.6, ZL-FL, 2));

/* ---- the engine's half, on the right, outside the boom ---- */
var RZO=OUTZ;
var RX=-2.5*MP, RLEN=9*MP;
add(MHOUSE, rail(RLEN, RX, RZO, -1));                  /* outside the right tyres */
add(MHOUSE, plate(RLEN, 2*MP, RX, PY, RZO-MP, M_BLU)); /* z from 0.153 to 0.255 */
/* posts down to the outriggers, and struts under the plate's inner edge */
[-1.5,0.5].forEach(function(u){
  add(MHOUSE, post(CHY+MT*2.8, RAILY+MP*0.5, u*MP, RZO+MT, M_YLD));
  add(MHOUSE, bolt(u*MP, RAILY, RZO+MT*2.6, 3));
  add(MHOUSE, mecPart(MT, MP, 2*MP, u*MP, RAILY, RZO-MP, M_YLD, 1));
});
add(MHOUSE, boltsIn(RX, RLEN, 3, PY+MT*1.6, RZO-FL, 2));

/* ---- and behind the wheels, one plate across the whole back joining the
   two halves, carrying the boom pivot ---- */
var BKX=-8.5*MP;
add(MHOUSE, plate(3*MP, 10*MP, BKX, PY, 0, M_BLU));
/* two strips on edge across under it; the front one stands on posts from the
   chassis, the back one is over the ballast and only stiffens the plate */
[-7.5,-9.5].forEach(function(u){
  add(MHOUSE, mecPart(MT, MP, RZO-LZO, u*MP, RAILY, (LZO+RZO)*0.5, M_YEL, 1));
});
add(MHOUSE, post(AX-MP*0.5, RAILY+MP*0.5, -7.5*MP, ZL-MT, M_YLD));
add(MHOUSE, post(AX-MP*0.5, RAILY+MP*0.5, -7.5*MP, ZR+MT, M_YLD));
add(MHOUSE, bolt(-7.5*MP, AX, ZL-MT*2.6, 3));
add(MHOUSE, bolt(-7.5*MP, AX, ZR+MT*2.6, 3));

/* ---- the engine bay, as a frame you can see into ----
   four corner posts, a rail along the top and the bottom of each side, a
   brace across each side, a bonnet over the front half only - and in the
   open back half, the motor, which is what you would see looking into one */
var EX0=-.366, EX1=.066, EZ0=RZO-2*MP+MP*0.3, EZ1=RZO-MT, EY0=PY+MT*0.5, EY1=EY0+.143;
[[EX0+MP*.5,EZ0],[EX1-MP*.5,EZ0],[EX0+MP*.5,EZ1],[EX1-MP*.5,EZ1]].forEach(function(c){
  add(MHOUSE, mecPart(MP,EY1-EY0,MT, c[0],(EY0+EY1)*.5,c[1], M_YEL, 3));
});
[EZ0,EZ1].forEach(function(z){
  var inn=(z<(EZ0+EZ1)*0.5)?1:-1;     /* braces and bolts inside the bay, away from the boom */
  add(MHOUSE, stripUp(EX1-EX0, (EX0+EX1)*.5, EY1-MP*.5, z, M_YEL));    /* top rail */
  add(MHOUSE, stripUp(EX1-EX0, (EX0+EX1)*.5, EY0+MP*.5, z, M_YEL));    /* bottom rail */
  add(MHOUSE, brace(EX0+MP, EY0+MP*.5, EX1-MP, EY1-MP*.5, z+inn*MT*1.2, M_YLD));
  add(MHOUSE, boltsIn((EX0+EX1)*.5, EX1-EX0, 3, EY1-MP*.5, z+inn*MT*1.6, 3));
});
var EZM=(EZ0+EZ1)*0.5, EZW=EZ1-EZ0;
add(MHOUSE, plate(.200,EZW+MT*4, EX1-.100, EY1+MT*.6, EZM, M_BLU));      /* bonnet, front half */
add(MHOUSE, plateEnd(.150,EZW+MT*4, EX1+MT, (EY0+EY1)*.5, EZM, M_BLU));  /* the front of it */
add(MHOUSE, stripZ(EZW+MT*4, EX0+MP*.5, EY1, EZM, M_YEL));               /* tie across the open back */
/* the motor itself, on the platform in the open half */
add(MHOUSE, mecPart(.110,.070,EZW*0.62, -.250,EY0+.037,EZM, M_RED, 0, 0.42,0.05));
add(MHOUSE, plateUp(.120,.080, -.250,EY0+.037,EZM-EZW*0.36, M_ZN));
add(MHOUSE, plateUp(.120,.080, -.250,EY0+.037,EZM+EZW*0.36, M_ZN));
add(MHOUSE, rod(.006,EZW*0.95, -.215,EY0+.045,EZM, 3));
add(MHOUSE, rod(.022,.012, -.215,EY0+.045,EZM+EZW*0.47, 3, M_BRS, BRASS[0],BRASS[1]));   /* pulley */
/* an exhaust, which on a Meccano model is a rod and a collar */
add(MHOUSE, rod(.009,.070, .030,EY1+.035,EZM, 2));
add(MHOUSE, rod(.015,.014, .030,EY1+.006,EZM, 2, M_BRS, BRASS[0],BRASS[1]));

/* ---- the cab: four corner pillars and a roof frame, and nothing in between ---- */
var CBX0=-.300, CBX1=.120, CBZ0=-.245, CBZ1=-.035, CBF=PY+MT*0.5, CBY=.455+DY;
[[CBX0,CBZ0],[CBX1,CBZ0],[CBX0,CBZ1],[CBX1,CBZ1]].forEach(function(c){
  add(MHOUSE, mecPart(MP,CBY-CBF,MT, c[0],(CBY+CBF)*0.5,c[1], M_YEL, 3));
  add(MHOUSE, bolt(c[0],CBF+.025,c[1]+MT*1.6, 3));
  add(MHOUSE, bolt(c[0],CBY-.025,c[1]+MT*1.6, 3));
});
add(MHOUSE, strip(CBX1-CBX0+MP, (CBX0+CBX1)*0.5, CBY, CBZ0, M_YEL));
add(MHOUSE, strip(CBX1-CBX0+MP, (CBX0+CBX1)*0.5, CBY, CBZ1, M_YEL));
add(MHOUSE, stripZ(CBZ1-CBZ0+MP, CBX0, CBY+MT, (CBZ0+CBZ1)*0.5, M_YEL));
add(MHOUSE, stripZ(CBZ1-CBZ0+MP, CBX1, CBY+MT, (CBZ0+CBZ1)*0.5, M_YEL));
/* a roof, because the sun is the one thing an operator cannot work in */
add(MHOUSE, plate(.250,.150, -.110, CBY+MT*2.2, -.140, M_BLU));
/* a seat: two plates, which is what a Meccano seat is, and a strip to steer by */
add(MHOUSE, plate(.110,.130, -.090,.220+DY,-.140, M_ZN));
add(MHOUSE, plateUp(.110,.110, -.145,.270+DY,-.140, M_ZN));
add(MHOUSE, rod(.005,.090, .010,.250+DY,-.140, 2));
add(MHOUSE, rod(.030,.006, .010,.296+DY,-.140, 2, M_BLK, TYRE[0],TYRE[1]));    /* wheel */

/* ---- the boom pivot at the back: a plate each side of the boom, standing
   on the back plate and braced back to it, and a pin through both at the
   pivot the simulation uses ---- */
[-1,1].forEach(function(s){
  var z=PVZ+s*.052;
  add(MHOUSE, plateUp(.100,PVY+.030-PY, PVX, (PVY+.030+PY)*0.5, z, M_BLU));
  add(MHOUSE, brace(PVX-.020,PVY, PVX-.090,PY+MP*0.5, z+s*MT*1.2, M_YEL));
});
add(MHOUSE, rod(.008,.130, PVX,PVY,PVZ, 3));

/* the lamps, on the front of the cab roof, which has moved up with it */
LAMP_Y+=DY;
add(MHOUSE, rod(.018,.022, LAMP_X,LAMP_Y,LAMP_Z1, 1, M_ZN, ZINC[0],ZINC[1]));
add(MHOUSE, rod(.018,.022, LAMP_X,LAMP_Y,LAMP_Z2, 1, M_ZN, ZINC[0],ZINC[1]));
add(MHOUSE, strip(LAMP_X-CBX1, (LAMP_X+CBX1)*0.5, LAMP_Y-.020, LAMP_Z1, M_YLD));
add(MHOUSE, strip(LAMP_X-CBX1, (LAMP_X+CBX1)*0.5, LAMP_Y-.020, LAMP_Z2, M_YLD));
var GEOM_HOUSE=mergeMec(MHOUSE);

/* =========================================================
   THE ARM - strips on edge, two each side, one above the other,
   which is how a Meccano jib is built when it has to be stiff.
   Built to the rig's own lengths and the real boom's own section:
   BMW wide. The first version laid its strips flat, which made a
   boom nearly twice as wide as the real one, and wide enough to
   come down through the top of a front tyre.

   The outer section stops short of the carriage pin. When the
   boom is right in, the carriage on the end of the inner section
   has to have somewhere to be, and that is past the end of the
   outer one - which is what a real telescopic boom looks like
   fully retracted.
   ========================================================= */
var BOL=BL-.080;
var MBOOM=[];
[-1,1].forEach(function(s){
  var z=s*BMW*0.5;
  add(MBOOM, stripUp(BOL, BOL*0.5,  MP*0.5, z, M_YEL));    /* top chord */
  add(MBOOM, stripUp(BOL, BOL*0.5, -MP*0.5, z, M_YLD));    /* bottom chord */
  /* fishplates inside, bolted through both chords: heads inside the boom,
     so nothing stands proud of its sides */
  [.06, BOL*0.36, BOL*0.66, BOL-.04].forEach(function(x){
    add(MBOOM, mecPart(MP,2*MP,MT, x,0,z-s*MT, M_YLD, 3));
    add(MBOOM, bolt(x, MP*0.5,z-s*MT*2.6, 3));
    add(MBOOM, bolt(x,-MP*0.5,z-s*MT*2.6, 3));
  });
});
/* ties across the top and the bottom, flush with the chords' edges */
[.10, BOL*0.5, BOL-.08].forEach(function(x){
  add(MBOOM, stripZ(BMW-MT, x,  MP-MT*0.5, 0, M_YEL));
  add(MBOOM, stripZ(BMW-MT, x, -MP+MT*0.5, 0, M_YEL));
});
add(MBOOM, rod(.022,BMW*1.60, 0,0,0, 3, M_BRS, BRASS[0],BRASS[1]));   /* the pivot boss */
var GEOM_BOOM=mergeMec(MBOOM);

/* the inner section: one strip on edge a side, narrow enough to slide between
   the outer section's fishplates */
var SKZ=BMW*0.5-MT*4.5;
var MSTICK=[];
/* it starts clear of the pivot pin, which it would otherwise run into when
   the boom is right in */
var SK0=.060, SK1=BL*.98;
add(MSTICK, stripUp(SK1-SK0, (SK0+SK1)*.5, 0, -SKZ, M_YEL));
add(MSTICK, stripUp(SK1-SK0, (SK0+SK1)*.5, 0,  SKZ, M_YEL));
add(MSTICK, stripZ(2*SKZ, SK0+.040, MP*0.5-MT*0.5, 0, M_YEL));
add(MSTICK, stripZ(BMW*1.30, BL*0.97, -MP*0.5-MT*0.5, 0, M_YEL));    /* headstock */
add(MSTICK, plateUp(.090,.090, BL*0.97, 0, -BMW*0.56, M_BLU));
add(MSTICK, plateUp(.090,.090, BL*0.97, 0,  BMW*0.56, M_BLU));
add(MSTICK, rod(.014,BMW*1.25, BL, 0, 0, 3, M_ZN, ZINC[0],ZINC[1]));
[BL*0.18, BL*0.40, BL*0.62].forEach(function(x){
  add(MSTICK, bolt(x, 0, -SKZ+MT*1.6, 3));
  add(MSTICK, bolt(x, 0,  SKZ-MT*1.6, 3));
});
var GEOM_STICK=mergeMec(MSTICK);

/* The bucket, to the same envelope the simulation digs with: it takes its
   sand from the cutting edge, so that edge has to be exactly where it was.
   A Meccano bucket is flat plates bolted at angles, because the plates do
   not bend - which is why it has a corner in it where a real one is round. */
var MBUCK=[];
add(MBUCK, plateUp(BKD*1.06,BKH*1.10, BKX0+BKD*.50, BKY0+BKH*.50, -BW*.5, M_BLU));
add(MBUCK, plateUp(BKD*1.06,BKH*1.10, BKX0+BKD*.50, BKY0+BKH*.50,  BW*.5, M_BLU));
add(MBUCK, mecPart(.028,BKH*.80,BW, BKX0+.010, BKY0+BKH*.62, 0, M_BLU, 1));   /* back */
add(MBUCK, plate(BKD*.80,BW, BKX0+BKD*.58, BKY0+.012, 0, M_BLU));             /* floor */
add(MBUCK, strip(BKD*.34, BKX0+BKD*.17, BKY0+BKH*.16, -BW*.30, M_YEL));       /* throat braces */
add(MBUCK, strip(BKD*.34, BKX0+BKD*.17, BKY0+BKH*.16,  BW*.30, M_YEL));
add(MBUCK, rod(.016,BW*.99, BKX1, BKY0, 0, 3, M_ZN, ZINC[0],ZINC[1]));        /* cutting edge */
add(MBUCK, mecPart(.050,.040,BW*.38, BKX0-.010, BKY1+.018, 0, M_YEL, 1));     /* pivot ear */
add(MBUCK, rod(.014,BW*.42, 0,0,0, 3, M_ZN, ZINC[0],ZINC[1]));
add(MBUCK, bolts(4, BKX0+.020, BKY0+BKH*.50, -BW*.5-MT*1.8, 3, 1));
add(MBUCK, bolts(4, BKX0+.020, BKY0+BKH*.50,  BW*.5+MT*1.8, 3, 1));
var GEOM_BUCKET=mergeMec(MBUCK);
