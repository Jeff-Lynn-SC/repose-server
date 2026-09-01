/* Repose — the simulation, as a normal module so that V8 will optimise it.
   Running this through vm/eval instead makes each step about a hundred times
   slower, which is enough to stall the whole server. */
var self={postMessage:function(){},onmessage:null};
/* ===================================================================
   REPOSE — SIMULATION WORKER
   The pit runs here, on its own thread, at a fixed timestep. The
   renderer never waits for it and never changes its step size: in a
   headset a variable-length physics step turns straight into nausea.
   =================================================================== */
var SIMDT=1/40;

/* ===================================================================
   ONE WORLD

   Every browser runs this same code forward from the same checkpoint,
   so the randomness cannot be the browser's own. mulberry32: small,
   fast, and its whole state is one 32-bit integer, which means the
   pit's luck can be written into a checkpoint alongside its sand.
   =================================================================== */
var RNG=0x9e3779b9;
function rnd(){
  RNG=(RNG+0x6D2B79F5)|0;
  var t=RNG;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
function seedRNG(s){ RNG=s|0; }
var dustN=0, DUSTMAX=220, dustBuf=new Float32Array(DUSTMAX*10);
function puff(x,y,z,vx,vy,vz,s0,s1,life,alpha){
  if(dustN>=DUSTMAX) return;
  var p=dustN*10; dustN++;
  dustBuf[p]=x; dustBuf[p+1]=y; dustBuf[p+2]=z;
  dustBuf[p+3]=vx; dustBuf[p+4]=vy; dustBuf[p+5]=vz;
  dustBuf[p+6]=s0; dustBuf[p+7]=s1; dustBuf[p+8]=life; dustBuf[p+9]=alpha;
}
var dustGate=1, avDX=new Float32Array(24), avDZ=new Float32Array(24), avDN=0, avSkip=0;
var reveal=false, ledger=false;   /* render-side flags the sim never reads */

/* ===================================================================
   DEEP TIME

   The pit's disposition is a function of the actual date. Nothing is
   stored and nothing is random: two people opening this on the same
   afternoon are looking at a pit in the same mood, and next week it
   is a different pit for both of them.

   Five slow walks with periods that do not divide into each other,
   so the combination never quite repeats.
   =================================================================== */
/* The pit keeps its own clock, in its own seconds, advanced only by its own
   steps and carried in its checkpoints. If it read the wall clock instead,
   two browsers a millisecond apart would compute imperceptibly different
   weather, and imperceptibly different weather does not stay imperceptible. */
var simTime=0;
function worldDays(){ return simTime/86400; }
function h1(n){ var s=Math.sin(n*127.1)*43758.5453; return s-Math.floor(s); }
function walk(d,period,seed){
  var x=d/period+seed*17.3, i=Math.floor(x), f=x-i, u=f*f*(3-2*f);
  return h1(i+seed*7.1)*(1-u)+h1(i+1+seed*7.1)*u;
}
var windDir=0, windStr=0, eraTick=0;
var clockShift=0;
function updateEra(){
  var d=worldDays();
  mixRaise = 0.22+0.56*walk(d,3.5,1);       /* ages of building, ages of levelling */
  setRepose(26+14*walk(d,1.7,2));           /* damp sand stands; dry sand does not */
  rateMul  = 0.55+1.05*walk(d,0.9,3);
  windDir  = walk(d,2.3,4)*6.2832;
  windStr  = Math.pow(walk(d,0.6,5),1.7);
}

/* ---- the pit remembers where it has been stripped ----
   Dig a place to the floor often enough and it stops being sand.
   Rock cannot be carried away and will not hold a hill, so every
   era leaves marks the next one has to work around. This is the
   only thing here that does not reverse. */
var rock=null, ROCKRATE=0;
function updateRock(){
  ROCKRATE=1/(12*CS);                     /* ground worked this hard stops being sand */
  var thr=0.20*CS;
  for(var i=0;i<h.length;i++){
    if(h[i]<thr && rock[i]<1) rock[i]=Math.min(1,rock[i]+0.03);
  }
}

/* ---- wind ---- */
function windStep(dt){
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
}

/* ---- things worth pointing a camera at ----
   0 a hill has failed under the machine that built it
   1 a big slide, unprompted
   2 a filler is taking sand off a raiser's hill
   3 a raiser has got higher than it has ever been          */
var EVMAX=64, evN=0, evBuf=new Float32Array(EVMAX*4);
function event(kind,x,z,mag){
  if(evN>=EVMAX) return;
  var p=evN*4; evN++;
  evBuf[p]=kind; evBuf[p+1]=x; evBuf[p+2]=z; evBuf[p+3]=mag;
}




/* =========================================================
   SCALE PRESETS
   Same rules at every scale. Only the size of a machine
   relative to the ground it stands on changes.
   ========================================================= */
var SCALES=[
  {name:"Six machines",       N:72,  width:44,   pop:6,    vis:1.9,  note:"A yard. Six machines, each big enough to matter. You can follow one and see what it does."},
  {name:"Forty machines",     N:128, width:110,  pop:44,   vis:1.0,  note:"A working pit. Individual purpose is still legible, but the ground has started to have a shape of its own."},
  {name:"Four hundred",       N:180, width:340,  pop:400,  vis:0.55, note:"A landscape. No single machine explains anything you can see."},
  {name:"Three thousand",     N:224, width:1000, pop:3000, vis:0.32, note:"Grain. The machines are a texture on the surface; the surface is the only thing left with a story."},
  {name:"A field",            N:224, width:4000, pop:1200000, vis:0.10, field:true,
   note:"No machines are simulated. The two purposes are continuous densities flowing over the ground, which is what the same rules become when you stop being able to count. A few are drawn as witnesses only \u2014 they dig nothing."}
];
var scaleIx=1;

/* =========================================================
   THE SAND
   ========================================================= */
var N,CS,HALF,h,h0,wear,DR,DF,BASE=3.0;
var fieldMode=false, TRACERS=260;
/* A bucket is a volume, not a fraction of a grid cell. Everything here used
   to be measured in cells, which was right while a cell was under a metre.
   With the world fixed at a kilometre a cell became 5.6 m and the bucket
   scaled up with it while the machine stayed six metres long: every scoop
   moved 1,395 cubic metres and set off an avalanche that destroyed the work.
   Stored as height, this becomes BUCKET/(cell area) metres — which stays
   right at any cell size, including one that varies. */
var BUCKET=26;
var reposeDeg=34, slopeMax, slopeStat, slopeDyn;
function setRepose(d){
  reposeDeg=d; slopeMax=Math.tan(d*Math.PI/180)*CS;
  slopeStat=slopeMax*1.30; slopeDyn=slopeMax*0.80;
}
var avalanche=0, meanH=BASE, collapses=0, rateMul=1.0;
var reveal=false, ledger=false;

function idx(x,z){return z*N+x;}

function seedField(){
  for(var z=0;z<N;z++)for(var x=0;x<N;x++){
    var u=x/N*6.0,v=z/N*6.0,ns=CS/0.87;
    h[idx(x,z)]=BASE+(Math.sin(u)*Math.cos(v*1.3)*0.18
      +Math.sin(u*2.7+1.4)*Math.sin(v*2.1)*0.10+(rnd()-0.5)*0.05)*ns;
  }
  h0.set(h); wear.fill(0);
}

var scanFlip=0;
var NBR=[[-1,0,1],[1,0,1],[0,-1,1],[0,1,1],[-1,-1,0],[1,-1,0],[-1,1,0],[1,1,0]];
function relax(passes){
  avalanche=0;
  var R2=Math.SQRT2;
  for(var p=0;p<passes;p++){
    scanFlip^=1;
    var zs=scanFlip?N-1:0, ze=scanFlip?-1:N, dz=scanFlip?-1:1;
    for(var z=zs;z!==ze;z+=dz){
      var xs=scanFlip?N-1:0, xe=scanFlip?-1:N, dx=scanFlip?-1:1;
      for(var x=xs;x!==xe;x+=dx){
        var i=z*N+x, hi=h[i];
        for(var k=0;k<8;k++){
          var nb=NBR[k], nx=x+nb[0], nz=z+nb[1];
          if(nx<0||nx>=N||nz<0||nz>=N) continue;
          /* a diagonal neighbour is sqrt(2) further away, so it will hold
             sqrt(2) more height before it fails. Without this the sand
             stands steeper on the diagonals and cones come out as diamonds. */
          var far=nb[2]?1:R2, w=nb[2]?0.42:0.21;
          var j=nz*N+nx, d=hi-h[j];
          var st=slopeStat*far*(1+0.35*wear[i]);   /* packed ground stands steeper */
          if(d>st){
            var m=(d-slopeDyn*far)*w; hi-=m; h[j]+=m; avalanche+=m; wear[j]*=0.25; wear[i]*=0.5;
            if(m>0.09*CS && avDN<24 && ((avSkip++)&31)===0){ avDX[avDN]=x*CS-HALF; avDZ[avDN]=z*CS-HALF; avDN++; }
          }
        }
        h[i]=hi;
      }
    }
  }
}
function hAt(wx,wz){
  var gx=(wx+HALF)/CS, gz=(wz+HALF)/CS;
  gx=gx<0?0:(gx>N-1.001?N-1.001:gx); gz=gz<0?0:(gz>N-1.001?N-1.001:gz);
  var x0=gx|0, z0=gz|0, fx=gx-x0, fz=gz-z0, i=z0*N+x0;
  var a=h[i],b=h[i+1],c=h[i+N],d=h[i+N+1];
  return (a*(1-fx)+b*fx)*(1-fz)+(c*(1-fx)+d*fx)*fz;
}
function gradAt(wx,wz){
  var e=CS;
  return {x:(hAt(wx+e,wz)-hAt(wx-e,wz))/(2*e), z:(hAt(wx,wz+e)-hAt(wx,wz-e))/(2*e)};
}
function cellCentre(i){return {x:(i%N)*CS-HALF, z:((i/N)|0)*CS-HALF};}

function takeFrom(wx,wz,r,amount){
  var gx=(wx+HALF)/CS, gz=(wz+HALF)/CS, rc=r/CS;
  var x0=Math.max(0,Math.floor(gx-rc)),x1=Math.min(N-1,Math.ceil(gx+rc));
  var z0=Math.max(0,Math.floor(gz-rc)),z1=Math.min(N-1,Math.ceil(gz+rc));
  var n=0,avail=0,x,z,i;
  for(z=z0;z<=z1;z++)for(x=x0;x<=x1;x++){
    var ax=x-gx,az=z-gz; if(ax*ax+az*az>rc*rc) continue;
    i=idx(x,z); if(h[i]<=0.02+rock[i]*0.34*CS) continue;
    _buf[n++]=i; avail+=h[i];
  }
  if(!n) return 0;
  var per=Math.min(amount,avail*0.5)/n, real=0;
  for(var c=0;c<n;c++){i=_buf[c]; var t=per<h[i]?per:h[i]; h[i]-=t; real+=t; wear[i]=0; if(rock[i]<1){ var lo=(meanH-h[i])/(1.5*CS); if(lo>0){ if(lo>1) lo=1; rock[i]+=t*ROCKRATE*lo; if(rock[i]>1) rock[i]=1; } } }
  return real;
}
function giveTo(wx,wz,r,amount){
  var gx=(wx+HALF)/CS, gz=(wz+HALF)/CS, rc=r/CS;
  var x0=Math.max(0,Math.floor(gx-rc)),x1=Math.min(N-1,Math.ceil(gx+rc));
  var z0=Math.max(0,Math.floor(gz-rc)),z1=Math.min(N-1,Math.ceil(gz+rc));
  var n=0,x,z;
  for(z=z0;z<=z1;z++)for(x=x0;x<=x1;x++){
    var ax=x-gx,az=z-gz; if(ax*ax+az*az>rc*rc) continue;
    _buf[n++]=idx(x,z);
  }
  if(!n) return 0;
  var per=amount/n;
  for(var c=0;c<n;c++){ h[_buf[c]]+=per; wear[_buf[c]]=0; }
  return amount;
}
var _buf=new Int32Array(4096);

var RAISE=0, FILL=1;
var COL_A=[1.55,.62,.22], COL_B=[.30,1.25,1.15], COL_N=[1,1,1];

var gateX=0, gateZ=0, spreadR=1;
function Machine(role,atGate,px,pz){
  this.role=role; this.dmg=0; this.crowd=0;
  if(px!==undefined){ this.x=px; this.z=pz; }
  else if(atGate){
    var ga=rnd()*6.2832, gr=Math.sqrt(rnd())*spreadR;
    this.x=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,gateX+Math.cos(ga)*gr));
    this.z=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,gateZ+Math.sin(ga)*gr));
  }else{
    this.x=(rnd()*2-1)*HALF*.85; this.z=(rnd()*2-1)*HALF*.85;
  }
  /* a summit and a ring angle whatever its purpose, so that a machine
     which changes its mind later cannot end up steering at nothing */
  this.ring=rnd()*6.2832; this.sx=this.x; this.sz=this.z;
  this.ang=rnd()*Math.PI*2;
  this.load=0; this.idle=0; this.cap=BUCKET/(CS*CS); this.state="go"; this.mode="scoop"; this.flash=0;
  this.boom=0.55; this.stick=-1.30; this.buck=-0.35; this.slew=0; this.stroke=rnd()*2;
  this.wt=rnd()*10; this.ph=rnd()*6.28; this.life=8+rnd()*32;
  this.moving=0; this.digging=0; this.tipping=0;
  this.tbA=0.55; this.tsA=-1.30; this.tkA=-0.35; this.slewT=0;
  if(role===RAISE){
    this.sx=this.x; this.sz=this.z; this.ring=rnd()*Math.PI*2;
    this.best=hAt(this.x,this.z); this.lastH=this.best; this.check=0;
    this.pickScoop();
  } else this.newJob();
}
Machine.prototype.pickScoop=function(){
  var grown=(this.best-BASE)/CS;
  var R=Math.min(22, 6.0+grown*2.4)*CS;
  var lim=HALF-2*CS;
  this.tx=Math.max(-lim,Math.min(lim,this.sx+Math.cos(this.ring)*R));
  this.tz=Math.max(-lim,Math.min(lim,this.sz+Math.sin(this.ring)*R));
  this.state="go"; this.mode="scoop";
};
Machine.prototype.relocate=function(){
  var bx=0,bz=0,bh=-1e9;
  /* most look for somewhere near by; the few that strike out are how a
     population ends up somewhere it has not been */
  var R=(rnd()<0.02)?frontier():(6+this.crowd*16)*machLen;  /* the hemmed-in look further */
  for(var k=0;k<10;k++){
    var ax=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,popX+(rnd()*2-1)*R));
    var az=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,popZ+(rnd()*2-1)*R));
    var i=cellAt(ax,az); if(i<0) continue;
    var v=(rnd()<0.5)?h[i]:h[i]-1e6;
    var dc=Math.sqrt((ax-popX)*(ax-popX)+(az-popZ)*(az-popZ));
    v-=dc*(1-this.crowd)*0.045;               /* keep near the others, until crowded */
    v-=densAt(ax,az)*this.crowd*0.55*CS;      /* and then not shoulder to shoulder */
    if(v>bh){bh=v;bx=ax;bz=az;}
  }
  this.sx=bx; this.sz=bz; this.best=hAt(bx,bz); this.lastH=this.best; this.check=0;
  this.ring=rnd()*Math.PI*2; this.pickScoop();
};
Machine.prototype.newJob=function(){
  var i,c,d,s,k,tol=0.55,pull=0.045;
  var R=(rnd()<0.02)?frontier():(5+this.crowd*14)*machLen;
  function near(self){ return {x:Math.max(-HALF+2*CS,Math.min(HALF-2*CS,self.x+(rnd()*2-1)*R)),
                              z:Math.max(-HALF+2*CS,Math.min(HALF-2*CS,self.z+(rnd()*2-1)*R))}; }
  var lo=1e9,hx=null,hz=null;
  for(k=0;k<40;k++){
    c=near(this); i=cellAt(c.x,c.z); if(i<0) continue;
    if(h[i]>meanH-tol) continue;
    d=Math.sqrt((c.x-this.x)*(c.x-this.x)+(c.z-this.z)*(c.z-this.z));
    var dc2=Math.sqrt((c.x-popX)*(c.x-popX)+(c.z-popZ)*(c.z-popZ));
    s=h[i]+d*pull+densAt(c.x,c.z)*this.crowd*0.5*CS
        +dc2*(1-this.crowd)*0.045;
    if(s<lo){lo=s;hx=c.x;hz=c.z;}
  }
  var hi=-1e9,ux=null,uz=null;
  for(k=0;k<40;k++){
    c=near(this); i=cellAt(c.x,c.z); if(i<0) continue;
    if(h[i]<meanH+tol) continue;
    d=Math.sqrt((c.x-this.x)*(c.x-this.x)+(c.z-this.z)*(c.z-this.z));
    s=h[i]-d*pull-Math.sqrt((c.x-popX)*(c.x-popX)+(c.z-popZ)*(c.z-popZ))*(1-this.crowd)*0.045;
    if(s>hi){hi=s;ux=c.x;uz=c.z;}
  }
  if(hx===null||ux===null){
    var pa=rnd()*6.2832, pr=(0.35+rnd()*0.75)*popR;
    this.hx=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,popX+Math.cos(pa)*pr));
    this.hz=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,popZ+Math.sin(pa)*pr));
    this.ux=this.hx; this.uz=this.hz; this.idle=1;
  }else{this.hx=hx;this.hz=hz;this.ux=ux;this.uz=uz;this.idle=0;}
  this.tx=this.ux; this.tz=this.uz; this.state="go"; this.mode="scoop";
};
/* ---------------------------------------------------------
   Where the teeth actually are.

   Forward kinematics down the same chain the renderer draws:
   house slew, boom, stick, bucket. The sand is taken from and
   given to this point, so the arm is the thing doing the work
   rather than an animation running alongside it.
   --------------------------------------------------------- */
var L_BOOM=0.84, L_STICK=0.50, P_BOOMX=0.30, P_BOOMY=0.345, P_BOOMZ=-0.055;
var _tw={x:0,z:0,y:0};
function toothWorld(a){
  var d1=a.boom, d2=d1+a.stick, d3=d2+a.buck;
  var px=P_BOOMX+L_BOOM*Math.cos(d1)+L_STICK*Math.cos(d2);
  var py=P_BOOMY+L_BOOM*Math.sin(d1)+L_STICK*Math.sin(d2);
  px+= 0.25*Math.cos(d3)+0.198*Math.sin(d3);
  py+= 0.25*Math.sin(d3)-0.198*Math.cos(d3);
  var cs=Math.cos(a.slew), sn=Math.sin(a.slew);
  var lx=px*cs+P_BOOMZ*sn, lz=-px*sn+P_BOOMZ*cs;
  var ca=Math.cos(a.ang), sa=Math.sin(a.ang);
  _tw.x=a.x+machLen*(lx*ca-lz*sa);
  _tw.z=a.z+machLen*(lx*sa+lz*ca);
  _tw.y=py;
  return _tw;
}
/* two-link solve: put the bucket pivot at (tx,ty) measured from the boom foot */
var _ik={b:0,s:0};
function armTo(tx,ty){
  var d=Math.sqrt(tx*tx+ty*ty);
  var lo=Math.abs(L_BOOM-L_STICK)+0.02, hi=L_BOOM+L_STICK-0.02;
  if(d<lo) d=lo; else if(d>hi) d=hi;
  var c=(d*d-L_BOOM*L_BOOM-L_STICK*L_STICK)/(2*L_BOOM*L_STICK);
  if(c>1) c=1; else if(c<-1) c=-1;
  var a2=Math.acos(c);
  _ik.s=-a2;
  _ik.b=Math.atan2(ty,tx)+Math.atan2(L_STICK*Math.sin(a2),L_BOOM+L_STICK*Math.cos(a2));
  return _ik;
}

Machine.prototype.step=function(dt,self){
  avoid(this,self);
  var here=hAt(this.x,this.z);
  var dx=this.tx-this.x, dz=this.tz-this.z, dist=Math.sqrt(dx*dx+dz*dz);
  var arrive=Math.max(1.20*machLen,1.2*CS);

  if(this.state==="go"){
    if(dist<arrive) this.state="work";
    else{
      var wx=dx/dist+_avX*1.6, wz=dz/dist+_avZ*1.6;
      var want=Math.atan2(wz,wx);
      var diff=((want-this.ang+Math.PI*3)%(Math.PI*2))-Math.PI;
      this.ang+=Math.min(Math.abs(diff),0.55*dt)*(diff<0?-1:1);   /* tracks turn slowly */
      var g=gradAt(this.x,this.z);
      var up=-(Math.cos(this.ang)*g.x+Math.sin(this.ang)*g.z);
      var sp=1.6*CS*Math.max(.35,1-up*.8)*_avBrake*dt;            /* about 5 km/h */
      this.x+=Math.cos(this.ang)*sp; this.z+=Math.sin(this.ang)*sp;
      this.moving=sp/dt;
    }
  }
  if(this.state==="work"){
    this.moving=0;
    this.stroke+=dt;
    /* it parks and slews the house to face the work, rather than driving both ways */
    var faceD=((Math.atan2(dz,dx)-this.ang+Math.PI*3)%(Math.PI*2))-Math.PI;
    this.slewT=Math.max(-2.6,Math.min(2.6,faceD));
    var reach=dist/machLen;
    if(reach<0.85) reach=0.85; else if(reach>1.50) reach=1.50;

    var t=toothWorld(this);
    var groundAt=hAt(t.x,t.z);
    var amt=this.idle?0:this.cap*(this.mode==="scoop"?0.17:0.40)*rateMul*dt;
    if(this.idle && this.stroke>6){ this.stroke=0; this.newJob(); }

    if(this.mode==="scoop"){
      var q=(this.stroke%7.0)/7.0;
      /* drag the teeth back through the sand as the bucket closes */
      var r=reach-0.42*q;
      var bite=(0.10+0.20*Math.sin(Math.PI*q))*machLen;
      var ty=(groundAt-here-bite)/machLen+0.28;
      var k=armTo(r-P_BOOMX,ty-P_BOOMY);
      if(this.idle){ this.tbA=0.55; this.tsA=-1.30; this.tkA=-0.35; }
      else { this.tbA=k.b; this.tsA=k.s; this.tkA=-0.15-1.25*q; }
      /* only cuts while the teeth are actually in the ground */
      if(t.y*machLen+here <= groundAt+0.06*machLen){
        this.load+=takeFrom(t.x,t.z,0.55*CS,Math.min(amt,this.cap-this.load));
        this.digging=1;
        if(rnd()<9*dt*dustGate)
          puff(t.x,groundAt+0.05*machLen,t.z,(rnd()-0.5)*0.7*CS,0.25*CS,(rnd()-0.5)*0.7*CS,
               0.30*machLen,1.5*machLen,1.6+rnd()*1.4,0.20);
      } else this.digging=0;
      if(this.load>=this.cap-0.05*CS){
        this.mode="dump"; this.stroke=0; this.digging=0;
        if(this.role===RAISE){this.tx=this.sx;this.tz=this.sz;}
        else{this.tx=this.hx;this.tz=this.hz;}
        this.state="go";
      }
    }else{
      var r2=(this.stroke%4.6)/4.6;
      var ty2=(groundAt-here)/machLen+0.62;
      var k2=armTo(reach-P_BOOMX,ty2-P_BOOMY);
      this.tbA=k2.b; this.tsA=k2.s; this.tkA=-1.15+1.50*r2;
      if(r2>0.25){
        var give=Math.min(amt,this.load);
        this.load-=giveTo(t.x,t.z,0.55*CS,give);   /* only lose what the ground actually took */
        this.tipping=1;
        if(rnd()<14*dt*dustGate){
          var fy=t.y*machLen+here;
          puff(t.x,fy,t.z,(rnd()-0.5)*0.5*CS,-0.5*CS,(rnd()-0.5)*0.5*CS,
               0.25*machLen,1.9*machLen,1.8+rnd()*1.6,0.24);
        }
      } else this.tipping=0;
      if(this.load<=0.02*CS){
        if(this.load>0) this.load-=giveTo(t.x,t.z,0.55*CS,this.load);
        this.mode="scoop"; this.stroke=0; this.tipping=0;
        if(this.role===RAISE){this.ring+=0.9+rnd()*0.5; this.pickScoop();}
        else this.newJob();
      }
    }
  } else {
    this.tbA=0.55; this.tsA=-1.30; this.tkA=-0.35; this.slewT=0;
    this.digging=0; this.tipping=0;
  }

  var lim=HALF-1.8*CS;
  this.x=this.x<-lim?-lim:(this.x>lim?lim:this.x);
  this.z=this.z<-lim?-lim:(this.z>lim?lim:this.z);

  var gg=gradAt(this.x,this.z), m=Math.sqrt(gg.x*gg.x+gg.z*gg.z), crit=Math.tan(reposeDeg*Math.PI/180);
  if(m>crit*1.05){ var sl=(m-crit)*7*CS*dt; this.x-=gg.x/m*sl; this.z-=gg.z/m*sl; }

  if(this.role===RAISE){
    var now=hAt(this.sx,this.sz);
    if(now>this.best){ this.best=now; if(this.mark===undefined) this.mark=now; if(now>this.mark+1.20){ this.mark=now; event(3,this.sx,this.sz,now); } }
    if(now<this.best-0.55){
      collapses++; this.flash=1; event(0,this.sx,this.sz,this.best-now); this.best=now;
      if(rnd()<0.55) this.relocate();
    }
    this.check+=dt;
    if(this.check>75){
      if(now-this.lastH<0.10) this.relocate();
      else {this.lastH=now; this.check=0;}
    }
  }
  if(this.flash>0) this.flash=Math.max(0,this.flash-dt*1.5);

  /* Being in each other's way is not free. Braking costs time, and the
     knocks cost the machine itself. This is the only thing that decides
     how many the pit will hold. */
  this.crowd+=((_avCount>6?6:_avCount)/6-this.crowd)*dt*0.25;
  this.dmg+=_avKnock*dt*0.32;            /* contact is what wears them out */
  this.dmg+=dt*0.00035;                  /* and ordinary use, slowly */

  trackGround(this,dt);

  var lp=Math.min(1,dt*1.5);          /* hydraulics are not quick */
  this.boom+=(this.tbA-this.boom)*lp;
  this.stick+=(this.tsA-this.stick)*lp;
  this.buck+=(this.tkA-this.buck)*lp;
  this.slew+=(this.slewT-this.slew)*Math.min(1,dt*0.9);
};

var machines=[], mixRaise=0.5, retireAcc=0, machLen=1;

/* ---------------------------------------------------------
   They are not competing, but they still have to get out of
   each other's way. A bucket grid so this stays cheap with
   three thousand of them.
   --------------------------------------------------------- */
var GW=1, GCELL=1, gHead=null, gNext=null, gCount=null;
function densAt(x,z){
  if(!gCount) return 0;
  var cx=((x+HALF)/GCELL)|0, cz=((z+HALF)/GCELL)|0;
  if(cx<0)cx=0; else if(cx>=GW)cx=GW-1;
  if(cz<0)cz=0; else if(cz>=GW)cz=GW-1;
  return gCount[cz*GW+cx];
}
function buildGrid(){
  GCELL=Math.max(CS*0.5, 3.0*machLen);
  GW=Math.max(1,Math.ceil(HALF*2/GCELL)+1);
  var n=GW*GW;
  if(!gHead||gHead.length!==n){ gHead=new Int32Array(n); gCount=new Int32Array(n); }
  gCount.fill(0);
  if(!gNext||gNext.length<machines.length) gNext=new Int32Array(machines.length+16);
  gHead.fill(-1);
  for(var i=0;i<machines.length;i++){
    var a=machines[i];
    var cx=((a.x+HALF)/GCELL)|0, cz=((a.z+HALF)/GCELL)|0;
    if(cx<0)cx=0; else if(cx>=GW)cx=GW-1;
    if(cz<0)cz=0; else if(cz>=GW)cz=GW-1;
    var c=cz*GW+cx; gNext[i]=gHead[c]; gHead[c]=i; gCount[c]++;
  }
}
/* ---------------------------------------------------------
   A machine does not only change the ground by digging. It
   presses ruts into it just by crossing it, and the spoil
   from a rut goes sideways into a berm: nothing leaves.
   --------------------------------------------------------- */
function cellAt(wx,wz){
  var gx=((wx+HALF)/CS)|0, gz=((wz+HALF)/CS)|0;
  if(gx<0||gz<0||gx>=N||gz>=N) return -1;
  return gz*N+gx;
}
function trackGround(a,dt){
  var ca=Math.cos(a.ang), sa=Math.sin(a.ang);
  var lx=-sa, lz=ca;                        /* across the machine */
  var half=0.26*machLen;
  var press=(a.moving>0?1.0:0.25)*dt;
  for(var t=-1;t<=1;t+=2){
    var wx=a.x+lx*half*t, wz=a.z+lz*half*t;
    var i=cellAt(wx,wz); if(i<0) continue;
    var w=wear[i];
    if(w<1) wear[i]=Math.min(1,w+press*2.0);
    /* soft ground ruts; ground already compacted barely gives */
    if(a.moving>0 && rnd()<5*dt*dustGate)
      puff(wx,h[i]+0.04*machLen,wz,-ca*0.3*CS+(rnd()-0.5)*0.3*CS,0.10*CS,-sa*0.3*CS+(rnd()-0.5)*0.3*CS,
           0.22*machLen,1.3*machLen,1.4+rnd()*1.2,0.13);
    var give=0.02*press*(1-w*0.85);
    if(give<=0) continue;
    if(give>h[i]*0.04) give=h[i]*0.04;
    if(give<=0) continue;
    var j1=cellAt(wx+lx*CS*t, wz+lz*CS*t), j2=cellAt(wx-lx*CS*0.6*t, wz-lz*CS*0.6*t);
    h[i]-=give;
    if(j1>=0&&j2>=0){ h[j1]+=give*0.6; h[j2]+=give*0.4; }
    else if(j1>=0) h[j1]+=give;
    else if(j2>=0) h[j2]+=give;
    else h[i]+=give;                        /* nowhere to put it: leave it be */
  }
}

var _avX=0,_avZ=0,_avBrake=1,_avKnock=0,_avCount=0;
function avoid(a,self){
  var R=2.9*machLen, R2=R*R, minS=1.30*machLen;
  _avX=0; _avZ=0; _avBrake=1; _avKnock=0; _avCount=0;
  if(!gHead) return;
  var cx=((a.x+HALF)/GCELL)|0, cz=((a.z+HALF)/GCELL)|0;
  var fx=Math.cos(a.ang), fz=Math.sin(a.ang);
  for(var oz=-1;oz<=1;oz++)for(var ox=-1;ox<=1;ox++){
    var gx=cx+ox, gz=cz+oz;
    if(gx<0||gz<0||gx>=GW||gz>=GW) continue;
    for(var j=gHead[gz*GW+gx]; j!==-1; j=gNext[j]){
      if(j===self) continue;
      var b=machines[j], dx=a.x-b.x, dz=a.z-b.z, d2=dx*dx+dz*dz;
      if(d2>R2||d2<1e-9) continue;
      var d=Math.sqrt(d2), w=1-d/R, ux=dx/d, uz=dz/d;
      _avCount++;
      /* push apart, and always pass on the same side so two machines
         meeting head-on don't stand there deferring to each other */
      _avX+=ux*w - uz*w*0.75;
      _avZ+=uz*w + ux*w*0.75;
      var ahead=(-ux*fx-uz*fz);
      if(ahead>0.5 && d<R*0.8){
        var bk=0.08+0.92*(d/(R*0.8));
        if(bk<_avBrake) _avBrake=bk;
      }
      if(d<minS){
        var push=(minS-d)*0.75; a.x+=ux*push; a.z+=uz*push;
        _avKnock+=(minS-d)/minS;          /* what it costs to be in the way */
      }
    }
  }
}
function newRole(){ return rnd()<mixRaise?RAISE:FILL; }
var targetPop=0, births=0, deaths=0, birthAcc=0;
function setPopulation(n){
  machines.length=0;
  if(fieldMode) n=TRACERS;
  targetPop=n;
  spreadR=Math.max(4*CS,Math.sqrt(n)*1.4*CS);
  for(var i=0;i<n;i++) machines.push(new Machine(newRole(),true));
  
  
}
/* =========================================================
   THE FIELD

   The same two purposes, taken to the limit where you can no
   longer count them. DR and DF are densities of the raising
   and the filling purpose. Neither is a machine any more.

   A raiser carries sand up its own slope, so as a density it
   moves sand along +grad(h): that is diffusion run backwards,
   and it is unstable — any bump grows. A filler carries sand
   from high to low, which is ordinary diffusion, and smooths.
   The two terms are the same equation with opposite signs.

       dh/dt = -div[ (kR*DR - kF*DF) * grad(h) ]

   Nothing bounds the raising term except the sand itself:
   the angle of repose is the only reason the pit does not
   run away to a spike. Every transfer below is written as a
   flux across a face, so the quantity of sand is exact.
   ========================================================= */
var kR=620, kF=620, aFlow=12, dSpread=0.06, tTurn=1/250, DMAX=1.3, HSTRIDE=6, HPASS=3;
var HS=null,HT=null;

/* A machine ranges further for material as its hill grows, so neither purpose
   is steered by the ground directly under it. HS is the long view: what the
   field is aiming at. Gravity still acts locally, on the real surface. Without
   this the instability picks the shortest wavelength there is and the pit fills
   with single-cell spikes instead of landforms. */
var fvAcc=0, fvTick=0;
function farView(dt){
  var n=N*N,i,x,z,st=HSTRIDE;
  if(!HS||HS.length!==n){ HS=new Float32Array(n); HS.set(h); HT=new Float32Array(n); fvAcc=0; fvTick=0; }
  fvAcc+=dt;
  if((fvTick++ % 3)!==0) return;
  dt=fvAcc; fvAcc=0;
  var tr=Math.min(1,dt*0.9);
  for(i=0;i<n;i++) HS[i]+=(h[i]-HS[i])*tr;
  for(var p=0;p<HPASS;p++){
    for(z=0;z<N;z++)for(x=0;x<N;x++){
      var a=x-st<0?0:x-st, b=x+st>N-1?N-1:x+st;
      HT[z*N+x]=(HS[z*N+a]+2*HS[z*N+x]+HS[z*N+b])*0.25;
    }
    for(z=0;z<N;z++)for(x=0;x<N;x++){
      var c=z-st<0?0:z-st, d=z+st>N-1?N-1:z+st;
      HS[z*N+x]=(HT[c*N+x]+2*HT[z*N+x]+HT[d*N+x])*0.25;
    }
  }
}
function stepField(dt){
  farView(dt);
  var i,j,x,z,g,T,capT,tanRep=Math.tan(reposeDeg*Math.PI/180);
  var lim=0.20*CS*CS/Math.max(dt,1e-5);      /* diffusive stability cap */

  /* --- sand moved by the two purposes --- */
  for(z=0;z<N;z++){
    for(x=0;x<N;x++){
      i=z*N+x;
      for(var k=0;k<2;k++){
        if(k===0){ if(x===N-1) continue; j=i+1; } else { if(z===N-1) continue; j=i+N; }
        var gl=(h[j]-h[i])/CS;
        g = (HS[j]-HS[i])/CS;               /* what they are aiming at */
        /* nobody can build a face steeper than sand will stand */
        var taper=1-(gl*gl)/(tanRep*tanRep); if(taper<0) taper=0;
        var coef = (kR*(DR[i]+DR[j])*0.5*taper - kF*(DF[i]+DF[j])*0.5)*rateMul;
        if(coef>lim) coef=lim; else if(coef<-lim) coef=-lim;
        T = coef*g*dt/CS;
        if(T>0){ if(T>h[i]*0.4) T=h[i]*0.4; }
        else   { if(-T>h[j]*0.4) T=-h[j]*0.4; }
        h[i]-=T; h[j]+=T;
      }
    }
  }

  /* --- the purposes themselves move: raising climbs, filling descends --- */
  var sp=aFlow*CS;
  for(z=0;z<N;z++){
    for(x=0;x<N;x++){
      i=z*N+x;
      for(var k2=0;k2<2;k2++){
        if(k2===0){ if(x===N-1) continue; j=i+1; } else { if(z===N-1) continue; j=i+N; }
        g = (HS[j]-HS[i])/CS;
        var vR = sp*g, vF = -sp*g;           /* up-slope, down-slope */
        var fR = (vR>0? DR[i] : DR[j])*vR*dt/CS;
        var fF = (vF>0? DF[i] : DF[j])*vF*dt/CS;
        var mR = 0.45*(vR>0?DR[i]:DR[j]);    /* don't move more than is there */
        if(fR>mR) fR=mR; else if(fR<-mR) fR=-mR;
        var mF = 0.45*(vF>0?DF[i]:DF[j]);
        if(fF>mF) fF=mF; else if(fF<-mF) fF=-mF;
        /* there is only so much room on a summit. Without this everyone who
           wants to be high ends up at the top and nobody is left on the flank
           still carrying material up: the pump starves itself. */
        var roomI=1-(DR[i]+DF[i])/DMAX; if(roomI<0) roomI=0;
        var roomJ=1-(DR[j]+DF[j])/DMAX; if(roomJ<0) roomJ=0;
        if(fR>0) fR*=roomJ; else fR*=roomI;
        if(fF>0) fF*=roomJ; else fF*=roomI;
        DR[i]-=fR; DR[j]+=fR;
        DF[i]-=fF; DF[j]+=fF;
        /* they do not all go the same way: a little spread */
        var sp2=dSpread*dt;
        var sR=(DR[j]-DR[i])*sp2, sF=(DF[j]-DF[i])*sp2;
        DR[i]+=sR; DR[j]-=sR; DF[i]+=sF; DF[j]-=sF;
      }
    }
  }

  /* --- turnover: a purpose is reassigned at random, for ever --- */
  var tau=tTurn*dt, w;
  for(i=0;i<DR.length;i++){
    var tot=DR[i]+DF[i];
    DR[i]+=(mixRaise*tot-DR[i])*tau;
    DF[i]+=((1-mixRaise)*tot-DF[i])*tau;
    if(DR[i]<0) DR[i]=0; if(DF[i]<0) DF[i]=0;
    w=wear[i]+tot*0.45*dt; wear[i]=w>1?1:w;
  }
}

/* --- witnesses: a handful drawn from the field, digging nothing --- */
function tracerStep(a,dt,self){
  avoid(a,self);
  var g=gradAt(a.x,a.z), m=Math.sqrt(g.x*g.x+g.z*g.z)+1e-6;
  var s=(a.role===RAISE)?1:-1;
  a.wt+=dt;
  var dx=s*g.x/m+Math.cos(a.wt*0.5+a.ph)*0.55;
  var dz=s*g.z/m+Math.sin(a.wt*0.43+a.ph)*0.55;
  dx+=_avX*1.6; dz+=_avZ*1.6;
  var dm=Math.sqrt(dx*dx+dz*dz)+1e-6, sp=1.15*CS*_avBrake*dt;
  a.x+=dx/dm*sp; a.z+=dz/dm*sp;
  var lim=HALF-2*CS;
  a.x=a.x<-lim?-lim:(a.x>lim?lim:a.x);
  a.z=a.z<-lim?-lim:(a.z>lim?lim:a.z);
  var want=Math.atan2(dz,dx);
  var diff=((want-a.ang+Math.PI*3)%(Math.PI*2))-Math.PI;
  a.ang+=Math.min(Math.abs(diff),0.55*dt)*(diff<0?-1:1);

  a.moving=1; trackGround(a,dt);
  a.stroke+=dt;
  var ph=(a.stroke%19);
  var tb,ts,tk;
  if(ph<7.5){ var q=(ph/7.5); tb=-0.06+0.28*q; ts=-0.44-0.50*q; tk=-0.22-1.06*q; a.load=a.cap*q; }
  else if(ph<13){ tb=0.50; ts=-1.42; tk=-0.62; a.load=a.cap; }
  else { var r=(ph-13)/6; tb=0.30; ts=-0.98; tk=-0.25+0.85*r; a.load=a.cap*(1-r); }
  var lp=Math.min(1,dt*1.5);
  a.boom+=(tb-a.boom)*lp; a.stick+=(ts-a.stick)*lp; a.buck+=(tk-a.buck)*lp;
  a.slew+=(Math.sin(a.stroke*1.5)*0.14-a.slew)*lp;

  /* Reassigned in place, never moved: a witness that teleported would just
     read as machines popping in and out of the ground. */
  a.life-=dt;
  if(a.life<0){
    var ci=((((a.z+HALF)/CS)|0)*N+(((a.x+HALF)/CS)|0));
    if(ci<0||ci>=DR.length) ci=0;
    var tot=DR[ci]+DF[ci];
    a.role=(tot>0 && rnd()<DR[ci]/tot)?RAISE:FILL;   /* by whatever it is standing in */
    a.life=30+rnd()*50;
  }
}


var maxH=0,gini=0,nA=0,nB=0,totalMass=0,stripped=0,buried=0,tracked=0;
var gHist=[],aHist=[],samp=new Float32Array(1400);
function stats(){
  var sum=0,mx=0,i,st=0,bu=0,tk=0,tol=0.4*CS;
  for(i=0;i<h.length;i++){
    var v=h[i]; sum+=v; if(v>mx) mx=v;
    var d=v-h0[i]; if(d<-tol) st++; else if(d>tol) bu++;
    if(wear[i]>0.1) tk++;
  }
  meanH=sum/h.length; maxH=mx;
  stripped=st/h.length; buried=bu/h.length; tracked=tk/h.length;
  var carried=0;
  if(!fieldMode) for(i=0;i<machines.length;i++) carried+=machines[i].load;
  totalMass=(sum+carried)*CS*CS;
  var S=samp.length;
  for(i=0;i<S;i++) samp[i]=h[(rnd()*h.length)|0];
  samp.sort();
  var cum=0,wsum=0;
  for(i=0;i<S;i++){ cum+=samp[i]; wsum+=(i+1)*samp[i]; }
  gini=cum>0?(2*wsum)/(S*cum)-(S+1)/S:0;
  nA=0;nB=0;
  if(fieldMode){
    var sr=0,sf=0;
    for(i=0;i<DR.length;i++){ sr+=DR[i]; sf+=DF[i]; }
    var tt=sr+sf;
    nA=tt>0?Math.round(SCALES[scaleIx].pop*sr/tt):0;
    nB=tt>0?SCALES[scaleIx].pop-nA:0;
  }else{
    for(i=0;i<machines.length;i++){ if(machines[i].role===RAISE) nA++; else nB++; }
  }
  gHist.push(gini); if(gHist.length>150) gHist.shift();
  aHist.push(avalanche/CS); if(aHist.length>150) aHist.shift();
}


/* ---- who is standing on whose work ---- */
var conflictTick=0, avMean=0;

/* Where the population is and how far it has got. A machine that strikes out
   goes past the edge of what is already occupied, not to a random point in
   the world: a frontier that creeps outward, rather than a scattering. */
var popX=0, popZ=0, popR=1, popTick=0;
function measurePopulation(){
  var n=machines.length; if(!n) return;
  var cx=0,cz=0,i;
  for(i=0;i<n;i++){ cx+=machines[i].x; cz+=machines[i].z; }
  cx/=n; cz/=n;
  var s2=0;
  for(i=0;i<n;i++){
    var dx=machines[i].x-cx, dz=machines[i].z-cz;
    s2+=dx*dx+dz*dz;
  }
  popX=cx; popZ=cz;
  popR=Math.max(Math.sqrt(s2/n)*1.6, 10*machLen);   /* typical, not furthest */
}
function frontier(){ return Math.min(HALF, popR+5*machLen); }
function findConflicts(){
  if(fieldMode||machines.length>600) return;
  var i,j,near=9*CS;
  for(i=0;i<machines.length;i++){
    var f=machines[i];
    if(f.role!==FILL||f.mode!=="scoop"||f.state!=="work") continue;
    for(j=0;j<machines.length;j++){
      var r=machines[j];
      if(r.role!==RAISE) continue;
      var dx=f.x-r.sx, dz=f.z-r.sz;
      if(dx*dx+dz*dz<near*near){
        event(2,(f.x+r.sx)*0.5,(f.z+r.sz)*0.5,hAt(r.sx,r.sz));
        return;
      }
    }
  }
}

/* ===================================================================
   ABSENCE

   Nobody is here to work the pit, so no work happens: pretending
   otherwise would cost about a hundred million steps for a day away,
   which is not slow but impossible. What does happen is weather.
   Sand settles and wind moves it, and both of those are stable at a
   coarse step, so an absence of days costs a second of arithmetic.
   You come back to the pit you left, weathered, under a new sky.
   =================================================================== */
function weather(hoursAway){
  if(!(hoursAway>0)) return 0;
  var n=Math.round(Math.min(2600, hoursAway*90));
  var saveW=windStr;
  windStr=Math.max(windStr,0.25);
  for(var i=0;i<n;i++){
    windStep(0.5);
    if((i&1)===0) relax(1);
    if((i%50)===0){ for(var w=0;w<wear.length;w++) wear[w]*=0.6; }
  }
  windStr=saveW;
  relax(3);
  return n;
}

/* ------------------------- state ------------------------- */
var SCALEDEF=null, timeScale=1, running=true, acc=0, tick=0, saveTick=0;

/* bilinear resample, so the pit can grow without forgetting itself */
function resample(src,sn,dn){
  var out=new Float32Array(dn*dn);
  for(var z=0;z<dn;z++){
    var sz=z*(sn-1)/(dn-1), z0=sz|0, fz=sz-z0, z1=z0<sn-1?z0+1:z0;
    for(var x=0;x<dn;x++){
      var sx=x*(sn-1)/(dn-1), x0=sx|0, fx=sx-x0, x1=x0<sn-1?x0+1:x0;
      var a=src[z0*sn+x0],b=src[z0*sn+x1],c=src[z1*sn+x0],d=src[z1*sn+x1];
      out[z*dn+x]=(a*(1-fx)+b*fx)*(1-fz)+(c*(1-fx)+d*fx)*fz;
    }
  }
  return out;
}
function applyScale(def,carry,fresh){
  SCALEDEF=def; scaleIx=def.ix;
  var oldN=N, oldCS=CS, oh=h, ow=wear, orx=rock, oh0=h0;
  N=def.N; CS=def.width/(N-1); HALF=(N-1)*CS/2; BASE=3.45*CS;
  h=new Float32Array(N*N); h0=new Float32Array(N*N); wear=new Float32Array(N*N);
  DR=new Float32Array(N*N); DF=new Float32Array(N*N); HS=null; HT=null;
  rock=new Float32Array(N*N);
  /* carrying the old ground forward is right when the pit grows and wrong
     when it starts again, so starting again has to say so */
  var src=carry||((oh&&!fresh)?{h:oh,wear:ow,rock:orx,h0:oh0,N:oldN,CS:oldCS}:null);
  fieldMode=!!def.field;
  if(fieldMode) for(var q=0;q<N*N;q++){ var j=0.90+rnd()*0.20; DR[q]=mixRaise*j; DF[q]=(1-mixRaise)*(2-j); }
  machLen=4.6*CS*def.vis; ROCKRATE=1/(12*CS);
  gateX=0; gateZ=0;      /* the first one arrives in the middle of it */
  updateEra();          /* the weather has to exist before the machines do:
                           who is given which purpose depends on it */
  seedField(); meanH=BASE; collapses=0; gHist.length=0; aHist.length=0;
  gHead=null; gNext=null;
  /* everything that would otherwise remember the last pit */
  scanFlip=0; retireAcc=0; birthAcc=0; births=0; deaths=0; eraTick=0; conflictTick=0; avMean=0; avDN=0; avSkip=0;
  evN=0; dustN=0; statTick=0; saveTick=0; acc=0; fvAcc=0; fvTick=0;
  if(src && src.h && src.N){
    /* the pit widens as it is watched; the ground it already has comes with it,
       stretched to fit, scars and all. Heights scale with the cell so slopes keep
       their angle rather than flattening out every time it grows. */
    var k=CS/src.CS;
    var rh=resample(src.h,src.N,N);
    for(var i=0;i<h.length;i++) h[i]=rh[i]*k;
    h0.set(h);
    wear.set(resample(src.wear,src.N,N));
    rock.set(resample(src.rock,src.N,N));
  }
  setPopulation(def.pop);
  stats();
}
function substep(dt){
  simTime+=dt;
  buildGrid();
  if(fieldMode){
    stepField(dt);
    for(var i=0;i<machines.length;i++) tracerStep(machines[i],dt,i);
  }else{
    for(var i2=0;i2<machines.length;i2++) machines[i2].step(dt,i2);
    /* deaths: enough knocks and a machine is finished. What was in its
       bucket stays in the pit. */
    var died=false;
    for(var kd=machines.length-1;kd>=0;kd--){
      var mk=machines[kd];
      if(mk.dmg>=1){
        if(mk.load>0) mk.load-=giveTo(mk.x,mk.z,1.3*CS,mk.load);
        event(4,mk.x,mk.z,1);
        machines.splice(kd,1); deaths++; died=true;
      }
    }
    if(died) buildGrid();      /* the indices have moved; the grid must be redrawn */
    /* births happen where the population already is. A machine is not
       delivered to the pit; it appears beside two that are already working,
       and takes its purpose from them. */
    if(machines.length<targetPop){
      birthAcc+=dt*0.55;
      while(birthAcc>=1 && machines.length<targetPop){ birthAcc-=1; beget(); }
    }
  }
  relax(fieldMode?1:2);
  windStep(dt);
  if((eraTick++%80)===0){ updateEra(); updateRock(); }
  if((popTick++%20)===0) measurePopulation();
  dustGate=Math.min(1,260/Math.max(1,machines.length));
  /* a slide worth cutting to is one much bigger than the pit's usual creep */
  avMean=avMean*0.99+avalanche*0.01;
  if(avDN>0 && avalanche>Math.max(avMean*4.5, 1.6*CS)) event(1,avDX[0],avDZ[0],avalanche/CS);
  for(var k=0;k<avDN;k++){
    var ax=avDX[k], az=avDZ[k], ay=hAt(ax,az);
    puff(ax,ay+0.1*CS,az,(rnd()-0.5)*0.6*CS,0.1*CS,(rnd()-0.5)*0.6*CS,
         0.7*CS,3.2*CS,2.2+rnd()*2.0,0.16);
  }
  avDN=0;
  if((conflictTick++%40)===0) findConflicts();
  /* wear fades here rather than in the renderer: it is state, not shading */
  var decay=1-0.035*dt;
  for(var w=0;w<wear.length;w++) if(wear[w]>0.002) wear[w]*=decay;
}

/* --------------------- how a machine comes to be --------------------- */
function nearestTo(a,self){
  if(!gHead) return null;
  var cx=((a.x+HALF)/GCELL)|0, cz=((a.z+HALF)/GCELL)|0, best=null, bd=1e18;
  for(var oz=-1;oz<=1;oz++)for(var ox=-1;ox<=1;ox++){
    var gx=cx+ox, gz=cz+oz;
    if(gx<0||gz<0||gx>=GW||gz>=GW) continue;
    for(var j=gHead[gz*GW+gx]; j!==-1; j=gNext[j]){
      if(j===self) continue;
      var b=machines[j];
      if(!b) continue;          /* a death this step has shifted the indices along */
      var dx=a.x-b.x, dz=a.z-b.z, d2=dx*dx+dz*dz;
      if(d2<bd){ bd=d2; best=b; }
    }
  }
  return best;
}
/* Two raisers tend to make a raiser. The era still leans on the outcome, but
   only leans: what a machine is comes mostly from what its neighbours were.
   This is what lets one stretch of the pit come to have a character. */
function inheritRole(a,b){
  /* The first birth is always the other purpose. A single machine left to
     inherit from itself would found a world of one mind, which is an accident
     of there being nobody else about rather than anything the rules intend.
     Once there is a pair, heredity takes over. */
  if(machines.length<=1) return (a.role===RAISE)?FILL:RAISE;
  var fa=(a.role===FILL)?1:0;
  /* and a machine with nobody near by takes its second parent from the era
     rather than from itself, for the same reason */
  var fb=b?((b.role===FILL)?1:0):((rnd()<mixRaise)?0:1);
  var p=0.78*((fa+fb)*0.5)+0.22*(1-mixRaise);
  if(rnd()<0.04) p=1-p;                       /* the occasional oddity */
  return (rnd()<p)?FILL:RAISE;
}
function beget(){
  if(!machines.length){ machines.push(new Machine(newRole(),true)); births++; return; }
  /* the parent is one that is not being knocked about: the frontier breeds */
  var best=-1, bs=1e9;
  for(var k=0;k<6;k++){
    var i=(rnd()*machines.length)|0, m=machines[i];
    var sc=m.dmg+m.crowd*0.6+rnd()*0.15;
    if(sc<bs){ bs=sc; best=i; }
  }
  var pa=machines[best], pb=nearestTo(pa,best);
  var ang=rnd()*6.2832, r=(2.2+rnd()*3.4)*machLen;
  var px=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,pa.x+Math.cos(ang)*r));
  var pz=Math.max(-HALF+2*CS,Math.min(HALF-2*CS,pa.z+Math.sin(ang)*r));
  machines.push(new Machine(inheritRole(pa,pb),false,px,pz));
  births++;
}

/* --------------------- packing for the renderer --------------------- */
var pool=[];
function grab(n){
  for(var i=0;i<pool.length;i++) if(pool[i].length===n) return pool.splice(i,1)[0];
  return new Float32Array(n);
}
function snapshot(){
  var n=machines.length;
  var ag=grab(n*12);
  for(var i=0;i<n;i++){
    var a=machines[i], p=i*12;
    ag[p]=a.x; ag[p+1]=a.z; ag[p+2]=a.ang;
    ag[p+3]=a.boom; ag[p+4]=a.stick; ag[p+5]=a.buck; ag[p+6]=a.slew;
    ag[p+7]=a.load/a.cap; ag[p+8]=a.role; ag[p+9]=a.flash;
    ag[p+10]=(a.role===RAISE)?a.sx:a.hx; ag[p+11]=(a.role===RAISE)?a.sz:a.hz;
  }
  var hh=grab(h.length); hh.set(h);
  var ww=grab(wear.length); ww.set(wear);
  var du=grab(Math.max(10,dustN*10)); du.set(dustBuf.subarray(0,dustN*10));
  var ev=grab(Math.max(4,evN*4)); ev.set(evBuf.subarray(0,evN*4));
  var rk=grab(rock.length); rk.set(rock);
  var msg={type:"snap", tick:tick++, n:n, dustN:dustN, evN:evN,
    h:hh, wear:ww, agents:ag, dust:du, events:ev, rock:rk,
    era:{day:worldDays(),mix:mixRaise,repose:reposeDeg,rate:rateMul,windDir:windDir,windStr:windStr},
    N:N, CS:CS, HALF:HALF, BASE:BASE, machLen:machLen, fieldMode:fieldMode,
    stats:{mean:meanH,max:maxH,gini:gini,stripped:stripped,buried:buried,
           tracked:tracked,collapses:collapses,nA:nA,nB:nB,mass:totalMass,
           alive:machines.length,wanted:targetPop,births:births,deaths:deaths}};
  dustN=0; evN=0;
  self.postMessage(msg,[hh.buffer,ww.buffer,ag.buffer,du.buffer,ev.buffer,rk.buffer]);
}

var statTick=0;
function frame(){
  if(running && SCALEDEF){
    acc+=0.033*timeScale;
    var guard=0;
    while(acc>=SIMDT && guard<12){ substep(SIMDT); acc-=SIMDT; guard++; }
    if(acc>SIMDT*12) acc=0;
    if((statTick++%8)===0) stats();
    snapshot();
    if((saveTick++%1800)===0 && saveTick>1){        /* about once a minute */
      self.postMessage({type:"save", at:Date.now(), N:N, width:SCALEDEF?SCALEDEF.width:N*CS,
        rng:RNG, simTime:simTime,
        h:new Float32Array(h), wear:new Float32Array(wear),
        rock:new Float32Array(rock), h0:new Float32Array(h0)});
    }
  }
  setTimeout(frame,33);
}

self.onmessage=function(e){
  var d=e.data;
  if(d.type==="init"){ mixRaise=d.mix; rateMul=d.rate; setRepose(d.repose);
    simTime=(d.simTime!==undefined)?d.simTime:0;
    seedRNG(d.seed||0x9e3779b9);
    applyScale(d.scale,null,true);
    if(d.saved && d.saved.h && d.saved.N){
      applyScale(d.scale,{h:d.saved.h,wear:d.saved.wear,rock:d.saved.rock,
                          h0:d.saved.h0,N:d.saved.N,CS:d.saved.width/(d.saved.N-1)});
      if(d.saved.rng!==undefined) seedRNG(d.saved.rng);
      if(d.saved.simTime!==undefined) simTime=d.saved.simTime;
      var steps=weather((Date.now()-d.saved.at)/3600000);
      self.postMessage({type:"restored",hours:(Date.now()-d.saved.at)/3600000,steps:steps});
    }
    frame(); }
  else if(d.type==="scale"){ applyScale(d.scale); }
  else if(d.type==="grow"){ applyScale(d.scale); }
  else if(d.type==="set"){
    if(d.key==="mix") mixRaise=d.value;
    else if(d.key==="rate") rateMul=d.value;
    else if(d.key==="repose") setRepose(d.value);
    else if(d.key==="time") timeScale=d.value;
    else if(d.key==="running") running=d.value;
    else if(d.key==="level"){ var s=0,i; for(i=0;i<h.length;i++) s+=h[i];
      var m=s/h.length; for(i=0;i<h.length;i++) h[i]=m; }
  }
  else if(d.type==="setPop"){
    var want=Math.max(0,d.n|0);
    targetPop=want;
    while(machines.length<want) beget();
  }
  else if(d.type==="addPop"){
    targetPop+=d.n;
    for(var an=0;an<d.n;an++) beget();      /* at once, rather than one every two seconds */
  }
  else if(d.type==="checkpoint"){
    self.postMessage({type:"checkpoint", at:Date.now(), N:N, width:SCALEDEF?SCALEDEF.width:0,
      pop:machines.length, rng:RNG, tick:tick, simTime:simTime,
      h:new Float32Array(h), wear:new Float32Array(wear),
      rock:new Float32Array(rock), h0:new Float32Array(h0)});
  }
  else if(d.type==="recycle"){
    if(d.h) pool.push(new Float32Array(d.h));
    if(d.wear) pool.push(new Float32Array(d.wear));
    if(d.rock) pool.push(new Float32Array(d.rock));
    if(d.agents) pool.push(new Float32Array(d.agents));
    if(d.dust) pool.push(new Float32Array(d.dust));
    if(pool.length>16) pool.length=16;
  }
};

module.exports={
  applyScale:applyScale, substep:substep, stats:stats, beget:beget,
  measurePopulation:measurePopulation,
  get h(){return h}, get wear(){return wear}, get rock(){return rock}, get h0(){return h0},
  get machines(){return machines},
  get N(){return N}, get CS(){return CS}, get HALF(){return HALF},
  get BASE(){return BASE}, get machLen(){return machLen},
  get mixRaise(){return mixRaise}, set mixRaise(v){mixRaise=v},
  get reposeDeg(){return reposeDeg},
  get windStr(){return windStr}, get windDir(){return windDir},
  get maxH(){return maxH}, get gini(){return gini}, get stripped(){return stripped},
  get collapses(){return collapses},
  get simTime(){return simTime}, set simTime(v){simTime=v},
  get targetPop(){return targetPop}, set targetPop(v){targetPop=v},
  set evN(v){evN=v}, set dustN(v){dustN=v},
  seedRNG:seedRNG
};
