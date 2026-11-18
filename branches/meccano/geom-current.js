function boxPart(w,hh,d,tx,ty,tz,r,g,b,rz,taper){
  var bg=new THREE.BoxGeometry(w,hh,d);
  if(taper){
    /* pull the top face in: nothing on a real machine is a perfect cuboid,
       and a chamfer is what makes an edge catch the light */
    var pos=bg.attributes.position, ay=hh/2-1e-4;
    for(var i=0;i<pos.count;i++){
      if(pos.getY(i)>ay*0.9){ pos.setX(i,pos.getX(i)*taper); pos.setZ(i,pos.getZ(i)*taper); }
    }
    bg.computeVertexNormals();
  }
  if(rz) bg.applyMatrix4(new THREE.Matrix4().makeRotationZ(rz));
  bg.translate(tx,ty,tz);
  return {g:bg,c:[r,g,b]};
}
function mergeParts(parts,dirt){
  var vc=0,ic=0,i;
  for(i=0;i<parts.length;i++){ vc+=parts[i].g.attributes.position.count; ic+=parts[i].g.index.count; }
  var P=new Float32Array(vc*3), Nn=new Float32Array(vc*3), C=new Float32Array(vc*3),
      S=new Float32Array(vc*2),
      I=(vc>65000)?new Uint32Array(ic):new Uint16Array(ic);
  var vo=0,io=0;
  for(i=0;i<parts.length;i++){
    var a=parts[i].g.attributes, ix=parts[i].g.index, n=a.position.count, cc=parts[i].c, j;
    P.set(a.position.array,vo*3); Nn.set(a.normal.array,vo*3);
    for(j=0;j<n;j++){
      var r=cc[0],g=cc[1],b=cc[2];
      if(dirt){
        /* everything below the deck lives in the dust it works in, and the
           undersides never see the sky */
        var y=a.position.array[j*3+1], ny=a.normal.array[j*3+1];
        var low=1-Math.min(1,Math.max(0,(y-0.02)/0.30));
        var f=low*0.55+(ny<-0.3?0.25:0);
        if(f>0){ if(f>0.8)f=0.8; r+=(0.19-r)*f; g+=(0.155-g)*f; b+=(0.105-b)*f; }
        /* and no two panels weathered the same */
        var jit=0.94+((Math.sin((vo+j)*12.9898)*43758.5453)%1+1)%1*0.12;
        r*=jit; g*=jit; b*=jit;
      }
      C[(vo+j)*3]=r; C[(vo+j)*3+1]=g; C[(vo+j)*3+2]=b;
      /* glass is smooth, paint is satin, rubber and dust are dead flat, and
         bare steel is the only thing here that behaves like metal */
      S[(vo+j)*2]=parts[i].s!==undefined?parts[i].s:0.85;
      S[(vo+j)*2+1]=parts[i].m!==undefined?parts[i].m:0.05;
    }
    for(j=0;j<ix.count;j++) I[io+j]=ix.array[j]+vo;
    vo+=n; io+=ix.count; parts[i].g.dispose();
  }
  var G=new THREE.BufferGeometry();
  G.setAttribute("position",new THREE.BufferAttribute(P,3));
  G.setAttribute("normal",new THREE.BufferAttribute(Nn,3));
  G.setAttribute("color",new THREE.BufferAttribute(C,3));
  G.setAttribute("surf",new THREE.BufferAttribute(S,2));
  G.setIndex(new THREE.BufferAttribute(I,1));
  return G;
}
function surf(part,rough,metal){ part.s=rough; part.m=metal; return part; }
var GLASSY=[0.07,0.0], PAINT=[0.62,0.05], STEELY=[0.34,0.85],
    RUBBER=[0.95,0.0], DUSTY=[0.97,0.0], GRIME=[0.88,0.15];

function LIN3(r,g,b){ return [Math.pow(r,2.2),Math.pow(g,2.2),Math.pow(b,2.2)]; }
var DK =LIN3(.26,.25,.24),  BLK=LIN3(.115,.11,.105), STL=LIN3(.50,.49,.47),
    CRM=LIN3(.72,.72,.70),  GLS=LIN3(.12,.16,.18),   YEL=LIN3(.70,.55,.16),
    YLD=LIN3(.52,.41,.14),  DUS=LIN3(.44,.38,.29),   RST=LIN3(.36,.24,.15);

/* ---------------------------------------------------------
   A 13-tonne tracked excavator. Unit 1.0 is the length of the
   track frame — about six metres. Each piece's origin is its
   own pivot, so the renderer can hang them off one another.
   --------------------------------------------------------- */
/* The silhouette does the work. A real machine is long and low: the track
   runs almost the whole length and stands proud at both ends, and the house
   is only about three-quarters as long, set back over the rear. Nothing pale
   goes near the running gear — that was what made it read as feet. */
/* --- a cylinder, for wheels: axis along Z, which is across the machine --- */
function cylPart(rad,len,tx,ty,tz,r,g,b,segs){
  var cg=new THREE.CylinderGeometry(rad,rad,len,segs||14,1,false);
  cg.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI/2));
  cg.translate(tx,ty,tz);
  return {g:cg,c:[r,g,b]};
}
/* ---- a real JCB 540-170, to the published dimensions ----
   One unit is 6.0 m. Everything below is the real measurement divided by that:
   overall height 2.69, width over tyres 2.44, length to the carriage 6.36,
   wheelbase 2.75, ground clearance 0.40, tyres 15.5/80-24 which measure 1.24
   across and about 0.40 wide.

   What was here before was a real machine's length with a toy's everything
   else: the roof stood at 4.92 m against 2.69, the wheelbase was 4.08 against
   2.75, it was 3.50 m over the tyres against 2.44, and the boom pivoted at
   4.20 m against about 1.85. Only the ground clearance was right. That is
   exactly why it read as a toy — toys are chunky.

   The wheel centre sits at WR so the tyre stands on the ground, and the frame
   sits at AX, which is now the same height: on a real machine the axles run
   through the depth of the chassis, they do not hang below it. */
var WR=.1033, WW=.0667, AX=.1033;   /* 0.62 m radius, 0.40 m wide, axle at 0.62 m */
var WBX=.2292, WBZ=.1700;           /* half the wheelbase (1.375 m), half the track (1.02 m) */

/* ---- chassis and wheels ---- */
var UNDER=[
  boxPart(.858,.070,.367,-.079,AX,   0,  DK[0],DK[1],DK[2]),                /* main frame, 5.15 x 0.42 x 2.20 m */
  boxPart(.150,.058,.390,-.229,AX,   0,  DK[0],DK[1],DK[2]),                /* rear axle */
  boxPart(.150,.058,.390, .229,AX,   0,  DK[0],DK[1],DK[2]),                /* front axle */
  boxPart(.100,.090,.300,-.455,AX+.008,0, DK[0],DK[1],DK[2],0,.88)          /* rear counterweight */
];
var GEO_UNDER=mergeParts(UNDER,true);

/* A wheel on its own, about its own axle, so it can turn. It used to be
   baked into the chassis with the other three, which meant a machine could
   travel a kilometre without any of them moving. Spin and steer are both
   worked out by the renderer from how far the machine actually went and how
   fast it actually turned - the simulation is not asked and does not care. */
var WHEEL=[
  surf(cylPart(WR,WW,0,0,0,BLK[0],BLK[1],BLK[2],16),RUBBER[0],RUBBER[1]),          /* tyre */
  surf(cylPart(WR*.55,WW*0.92,0,0,0,YEL[0],YEL[1],YEL[2],14),STEELY[0],STEELY[1]), /* rim */
  surf(cylPart(WR*.24,WW*1.06,0,0,0,STL[0],STL[1],STL[2],10),STEELY[0],STEELY[1])  /* hub */
];
(function(){
  for(var t=0;t<16;t++){                                                   /* tread blocks */
    var a=t/16*6.2832;
    WHEEL.push(surf(boxPart(.018,.030,WW*1.02, Math.cos(a)*WR*.99, Math.sin(a)*WR*.99, 0,
                            BLK[0],BLK[1],BLK[2],a),RUBBER[0],RUBBER[1]));
  }
})();
var GEO_WHEEL=mergeParts(WHEEL,true);

/* ---- body: engine on the boom side, cab on the other, boom pivot at the rear ----
   A Loadall carries its boom down the right-hand side and the operator sits
   beside it, which is why the cab is narrow and the machine looks lopsided
   from the front. That lopsidedness is the whole silhouette.

   It was built mirrored, and nobody could tell until there was a way to sit
   in the cab and look out. Forward is +X and up is +Y, so the machine's
   right is +Z; the boom goes there and the cab on -Z, which is the other way
   round from how this was first written. */
/* ---- where a work lamp is ----
   On the leading edge of the cab roof, one at each side, which is where a
   Loadall carries them. The roof's front edge is x=.180 and its top is
   y=.449, so these sit just inboard and just proud of it.

   Three things are built from these four numbers: the housing just below
   (part of the machine, lit by the sun, there at midday), the lens in
   GEO_LAMPS that lights up at night, and the beam itself in drawMachines.
   Move a lamp and all three move. */
var LAMP_X=.168, LAMP_Y=.463, LAMP_Z1=-.175, LAMP_Z2=-.032;

var GEO_HOUSE=mergeParts([
  boxPart(.767,.017,.383, -.050,.147,   0,  DK[0],DK[1],DK[2]),             /* deck over the frame */
  /* engine bay, boom side (+Z). Low and long, and it does not reach the roof:
     on a Loadall only the cab does. */
  boxPart(.433,.142,.158, -.150,.227,  .100, YEL[0],YEL[1],YEL[2],0,.93),
  boxPart(.417,.013,.150, -.150,.297,  .100, YLD[0],YLD[1],YLD[2]),         /* hood seam */
  surf(boxPart(.017,.058,.017, .050,.325, .100, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1]),  /* exhaust */
  /* the boom pivots at the back, under the roof line, not above it */
  boxPart(.167,.217,.167, -.425,.242,  .087, DK[0],DK[1],DK[2],0,.90),
  surf(boxPart(.020,.030,.045, -.408,.308, .092, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1]), /* pivot boss */
  /* cab, the other side (-Z): a glasshouse, floor at 1.00 m, roof at 2.69 m */
  boxPart(.317,.017,.175,  .017,.167, -.103, YEL[0],YEL[1],YEL[2]),         /* cab floor */
  boxPart(.325,.013,.183,  .017,.442, -.103, DK[0],DK[1],DK[2],0,.95),      /* roof */
  boxPart(.018,.275,.175,  .175,.304, -.103, YEL[0],YEL[1],YEL[2]),         /* front post */
  boxPart(.018,.275,.175, -.142,.304, -.103, YEL[0],YEL[1],YEL[2]),         /* rear post */
  boxPart(.018,.275,.018,  .175,.304, -.191, YEL[0],YEL[1],YEL[2]),         /* outer front post */
  boxPart(.018,.275,.018, -.142,.304, -.191, YEL[0],YEL[1],YEL[2]),         /* outer rear post */
  boxPart(.317,.017,.018,  .017,.183, -.191, YEL[0],YEL[1],YEL[2]),         /* sill */
  surf(boxPart(.292,.242,.010, .017,.308,-.191, GLS[0],GLS[1],GLS[2]),GLASSY[0],GLASSY[1]),
  surf(boxPart(.010,.242,.175, .172,.308,-.103, GLS[0],GLS[1],GLS[2]),GLASSY[0],GLASSY[1]),
  surf(boxPart(.010,.242,.175,-.139,.308,-.103, GLS[0],GLS[1],GLS[2]),GLASSY[0],GLASSY[1]),
  boxPart(.300,.230,.165,  .017,.300, -.100, BLK[0],BLK[1],BLK[2]),         /* the dark inside */
  boxPart(.080,.090,.090, -.010,.217, -.100, DK[0],DK[1],DK[2]),            /* seat */
  boxPart(.070,.012,.090,  .140,.100, -.180, DK[0],DK[1],DK[2]),            /* step */
  surf(boxPart(.020,.027,.020,-.130,.453,-.103, CRM[0],CRM[1],CRM[2]),STEELY[0],STEELY[1]),  /* beacon */
  /* the lamp housings: 12 cm deep, 16 cm tall, 20 cm wide, cast and dark,
     with a little bracket under each holding it off the roof. These are part
     of the machine - they take the sun like everything else and they are
     there in the middle of the day, when the lamps are off. */
  surf(boxPart(.020,.027,.033, LAMP_X,LAMP_Y,LAMP_Z1, DK[0],DK[1],DK[2]),STEELY[0],STEELY[1]),
  surf(boxPart(.020,.027,.033, LAMP_X,LAMP_Y,LAMP_Z2, DK[0],DK[1],DK[2]),STEELY[0],STEELY[1]),
  boxPart(.008,.012,.010, LAMP_X-.004,LAMP_Y-.018,LAMP_Z1, DK[0],DK[1],DK[2]),
  boxPart(.008,.012,.010, LAMP_X-.004,LAMP_Y-.018,LAMP_Z2, DK[0],DK[1],DK[2])
],true);

/* ---- the boom: one straight member that telescopes, not a jointed arm ----
   Outer section, pivoting at the rear of the machine. Its origin is the pivot
   and it runs forward along its own +X. */
var BL=.961;   /* 5.77 m: pivot at -2.45 m to the carriage at +3.32 m */
/* 0.55 m deep and 0.45 m wide. It was 1.20 x 1.14 m - a boom thicker than
   the cab is tall - because patch6 shortened it and left its section at the
   size it was drawn for a machine half again too big. */
var BMH=.092, BMW=.075;
var GEO_BOOM=mergeParts([
  boxPart(BL,BMH,BMW,  BL*.5,0,0, YEL[0],YEL[1],YEL[2],0,.94),
  boxPart(.058,BMH*1.14,BMW*1.22, .035,0,0, DK[0],DK[1],DK[2]),             /* pivot yoke */
  boxPart(BL*.62,.012,BMW*.88, BL*.34,BMH*.52,0, YLD[0],YLD[1],YLD[2]),     /* wear strip */
  surf(boxPart(.44,.038,.038, .30,-.066,0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])     /* lift ram */
],true);

/* Inner section. Its origin slides along the outer one, so at rest it is
   swallowed by it and at full extension it stands almost clear. */
/* It slides inside the outer one, so it has to be smaller than it - which
   at 0.95 x 0.90 m against 1.20 x 1.14 m it only just was, and looked it.
   The headstock is wider than either, because it carries the bucket. */
var GEO_STICK=mergeParts([
  boxPart(BL*.98,BMH*.76,BMW*.75, BL*.49,0,0, DUS[0],DUS[1],DUS[2],0,.94),
  boxPart(.058,BMH*.96,BMW*1.40, BL*.97,0,0, DK[0],DK[1],DK[2]),            /* headstock */
  surf(boxPart(.20,.030,.030, BL*.86,-.048,0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])  /* tilt ram */
],true);

/* ---- a loading bucket: wide, flat-floored, a straight cutting edge and no
   teeth. The cutting edge sits exactly where the old bucket's teeth sat, so
   the simulation takes its sand from the same point it always did. ---- */
/* The section, this side of the worker boundary. The simulation holds the
   same four numbers as BK_BACK, BK_TOP, TOOTH_X and TOOTH_Y and works out
   what the bucket holds and how deep a pass cuts from them; they are typed
   twice because the simulation is a separate script, and they must agree.

   Everything below is a fraction of them, so redrawing the bucket is
   changing these four and nothing else. Seven of the numbers that used to
   be here were answers to a question nobody had written down, which is how
   a bucket ends up the wrong size and stays that way through a rebuild. */
var BKX0=.029, BKY1=.023, BKX1=.192, BKY0=-.104;
var BKD=BKX1-BKX0, BKH=BKY1-BKY0;      /* 0.98 m deep, 0.76 m in the mouth */
var BW=.397;                           /* 2.38 m over the side plates */
var BKW=BW*.96;                        /* and 2.29 m between them */
var GEO_BUCKET=mergeParts([
  boxPart(.020,BKH*.80,BW,  BKX0+.004,BKY0+BKH*.62, 0, DK[0],DK[1],DK[2],  .05),  /* back plate */
  boxPart(BKD*.28,.018,BW,  BKX0+BKD*.15,BKY0+BKH*.12, 0, DK[0],DK[1],DK[2], -.70), /* throat */
  boxPart(BKD*.78,.018,BW,  BKX0+BKD*.60,BKY0+.010, 0, DK[0],DK[1],DK[2], -.03),  /* floor */
  boxPart(BKD*1.06,BKH*1.10,.016, BKX0+BKD*.50,BKY0+BKH*.50, BW*.5, DK[0],DK[1],DK[2]),  /* side plate */
  boxPart(BKD*1.06,BKH*1.10,.016, BKX0+BKD*.50,BKY0+BKH*.50,-BW*.5, DK[0],DK[1],DK[2]),
  boxPart(.050,.040,BW*.38, BKX0-.010,BKY1+.018, 0, DK[0],DK[1],DK[2]),           /* pivot ear */
  surf(boxPart(.055,.020,BW*.98, BKX1,BKY0, 0, STL[0],STL[1],STL[2]),STEELY[0],STEELY[1])  /* cutting edge */
],true);

/* The sand it is carrying. Warmer and darker than the bucket it sits in,
   and heaped proud of the rim, because a full bucket has to read as full
   from further away than you would think. */
var SND=LIN3(.80,.60,.30);
/* Sand heaps; it does not stack. Three rings of a cone, nine-sided, wider
   across the bucket than fore-and-aft, which is the shape a loader bucket
   holds. It was three boxes and read as three boxes. */
function heapPart(rb,rt,hh,tx,ty,tz,sx,sz,r,g,b){
  var cg=new THREE.CylinderGeometry(rt,rb,hh,9,1,false);
  cg.scale(sx,1,sz); cg.translate(tx,ty,tz);
  return {g:cg,c:[r,g,b]};
}
/* Each ring as a fraction of the bucket's own section rather than seven more
   numbers to re-tune whenever the bucket changes: how wide it lies across the
   floor, how thick it is, and how far up the mouth it sits. */
function bkHeap(fr,ft,fh,fy,fz){
  return heapPart(BKD*fr,BKD*ft,BKH*fh, BKX0+BKD*.466,BKY0+BKH*fy, 0,
                  1.0, (BKW*fz)/(BKD*fr), SND[0],SND[1],SND[2]);
}
var GEO_LOAD=mergeParts([
  bkHeap(.534,.504,.378,.266,.517),
  bkHeap(.479,.321,.280,.589,.428),
  bkHeap(.291,.043,.197,.826,.223)
]);

/* far enough away that an arm is a pixel, this stands in */
var GEO_BLOB=mergeParts([
  surf(boxPart(.86,WR*2,WW,  0,WR, WBZ, BLK[0],BLK[1],BLK[2]),RUBBER[0],RUBBER[1]),
  surf(boxPart(.86,WR*2,WW,  0,WR,-WBZ, BLK[0],BLK[1],BLK[2]),RUBBER[0],RUBBER[1]),
  boxPart(.60,.24,.44, -.10,.27,   0,  YEL[0],YEL[1],YEL[2],0,.9),
  boxPart(.62,.075,.085, .48,.34,  0,  YEL[0],YEL[1],YEL[2], -.22),
  boxPart(.09,.19,.22,   .82,.15,  0,  DK[0],DK[1],DK[2])
],true);

/* ---- what a work lamp does to a surface ----
   Top level on purpose: the sand builds its material inside a function and
   the machines build theirs out here, and both have to see the same block.
   Declared once and pasted into both the sand's shader and the machines',
   because it is the same arithmetic and it must not drift apart.
   uLampP holds where each lamp is, uLampD where it is aimed. The beam is a
   cone with a soft edge; the falloff is distance squared with a few metres of
   softening in it so a lamp two feet from the sand does not become a white
   hole. Nothing here is a look: it is a lamp's power over the square of how
   far the light had to travel, times how squarely it lands. */