/* perf.js — what a frame actually costs, and whether the picture is moving.
 *
 * Runs in the sandbox. index.html is served locally and driven by Playwright
 * on software GL, so the frame RATE here means nothing at all. What it does
 * measure honestly: bytes pushed to the card, milliseconds of JavaScript,
 * which part of the frame they are spent in, whether the incremental terrain
 * matches a full rebuild, and how much of real time the picture is moving for.
 *
 *   python3 -m http.server 8099            # from the Repose folder
 *   node branches/perf.js gl       "http://127.0.0.1:8099/index.html?dev&pop=3"
 *   node branches/perf.js steps    "...?dev&pop=3"
 *   node branches/perf.js terrain  "...?dev&pop=3"
 *   node branches/perf.js playout  "...?dev&pop=3"
 *
 * For the network path, run the real server beside it and point the page at
 * it — the local worker is not the thing being measured:
 *   PORT=8100 STATE_FILE=/tmp/world.json node server.js
 *   node branches/perf.js playout "http://127.0.0.1:8099/index.html?world=http://127.0.0.1:8100&pop=3&dev"
 *
 * The instrumented copies are written beside index.html as perf.<mode>.html
 * and are never pushed (push.sh copies branches/, not stray html).
 *
 * Three things learned the hard way, all of which cost a measurement:
 *  - On WebGL2 three.js uploads with bufferSubData(target, offset, array,
 *    srcOffset, length). The array handed in is the WHOLE attribute, so its
 *    byteLength is not what went to the card. Read the length argument.
 *  - A tab in a window that is behind another window is hidden, and a hidden
 *    tab gets no frames at all. Check document.visibilityState first.
 *  - Boot frames are not frames. Take the settled tail, not an average.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const MODE = process.argv[2];
const PAGE = process.argv[3];
const SECS = parseInt(process.argv[4] || '100', 10);
if (!MODE || !PAGE) { console.error('usage: node perf.js <gl|steps|terrain|playout> <url> [seconds]'); process.exit(1); }

/* ---- the page, instrumented ---- */
/* Every one of these proves its anchor before it writes. An edit that asserts
   after writing loses the work silently. */
function edit(src, name, from, to) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`anchor ${name}: ${n} — ABORTED`); process.exit(2); }
  return src.split(from).join(to);
}

function instrument(src, mode) {
  if (mode === 'steps') {
    src = edit(src, 'terrain+machines',
      `    updateTerrain(alpha);\n    drawMachines(alpha);`,
      `    var _m=performance.now(); updateTerrain(alpha); window.__ta=performance.now()-_m;\n` +
      `    _m=performance.now(); drawMachines(alpha); window.__tb=performance.now()-_m;`);
    src = edit(src, 'rest of frame',
      `  stepDust(dt);\n  if(now-lastSunAt>2000){ lastSunAt=now; updateSun(); updateEnvironment(false); }\n` +
      `  driveCamera(now,dt);\n  camLabel();\n  present(now);\n  updateDev(now);`,
      `  var _T=window.__T||(window.__T={rows:[]}), _t0=performance.now(), _m2;\n` +
      `  _m2=performance.now(); stepDust(dt); var _c=performance.now()-_m2;\n` +
      `  _m2=performance.now();\n` +
      `  if(now-lastSunAt>2000){ lastSunAt=now; updateSun(); updateEnvironment(false); }\n` +
      `  var _d=performance.now()-_m2;\n` +
      `  _m2=performance.now(); driveCamera(now,dt); camLabel(); var _e=performance.now()-_m2;\n` +
      `  _m2=performance.now(); present(now); var _f=performance.now()-_m2;\n` +
      `  _m2=performance.now(); updateDev(now); var _g=performance.now()-_m2;\n` +
      `  _T.rows.push([window.__ta||0,window.__tb||0,_c,_d,_e,_f,_g,\n` +
      `    (window.__ta||0)+(window.__tb||0)+(performance.now()-_t0),\n` +
      `    (typeof zoneN!=="undefined"?zoneN:-1)]);\n` +
      `  window.__ta=0; window.__tb=0;\n  if(_T.rows.length>3000) _T.rows.shift();`);
  }
  if (mode === 'terrain') {
    /* the incremental ground against a full rebuild, in the same frame */
    src = edit(src, 'check',
      `  stepDust(dt);\n  if(now-lastSunAt>2000){ lastSunAt=now; updateSun(); updateEnvironment(false); }`,
      `  if(ready&&hA&&hB&&pos&&typeof terrainAll!=="undefined"){\n` +
      `    var _K=window.__CHK||(window.__CHK={n:0,worst:0,worstN:0,worstC:0,checks:0,zone:0,full:0});\n` +
      `    _K.n++;\n    if(_K.n%5===0){\n` +
      `      var _P=pos.slice(), _N=nor.slice(), _C=col.slice();\n` +
      `      _K.zone=zoneN; _K.full=N*N;\n` +
      `      terrainAll=true; updateTerrain(alpha);\n` +
      `      var _i,_d,_mp=0,_mn=0,_mc=0;\n` +
      `      for(_i=0;_i<pos.length;_i++){\n` +
      `        _d=Math.abs(pos[_i]-_P[_i]); if(_d>_mp)_mp=_d;\n` +
      `        _d=Math.abs(nor[_i]-_N[_i]); if(_d>_mn)_mn=_d;\n` +
      `        _d=Math.abs(col[_i]-_C[_i]); if(_d>_mc)_mc=_d;\n      }\n` +
      `      if(_mp>_K.worst)_K.worst=_mp; if(_mn>_K.worstN)_K.worstN=_mn;\n` +
      `      if(_mc>_K.worstC)_K.worstC=_mc; _K.checks++;\n    }\n  }\n` +
      `  stepDust(dt);\n  if(now-lastSunAt>2000){ lastSunAt=now; updateSun(); updateEnvironment(false); }`);
  }
  if (mode === 'playout') {
    src = edit(src, 'alpha', `    updateTerrain(alpha);`,
      `    (window.__A||(window.__A=[])).push([now,alpha,span,tA]);\n` +
      `    if(window.__A.length>6000) window.__A.shift();\n    updateTerrain(alpha);`);
  }
  return src;
}

/* the GL counters go in before any page script runs, so nothing is missed */
const GL_INIT = `(function(){
  var S={glMs:0,buf:0,tex:0,draws:0};
  var P=window.__GLP={rows:[],sizes:[],tag:0};
  function sz(d){ return (d&&typeof d.byteLength==='number')?d.byteLength:0; }
  [window.WebGL2RenderingContext,window.WebGLRenderingContext].forEach(function(C){
    if(!C) return; var p=C.prototype;
    function wrap(name,kind){
      if(!p[name]||p[name].__w) return;
      var orig=p[name];
      var f=function(){
        var t=performance.now(); var r=orig.apply(this,arguments); S.glMs+=performance.now()-t;
        if(kind==='buf'){
          /* WebGL2: bufferSubData(target, byteOffset, data, srcOffset, length) */
          var isSub=(typeof arguments[1]==='number');
          var d=isSub?arguments[2]:arguments[1], b=0;
          if(d&&typeof d.byteLength==='number'){
            b=(isSub&&typeof arguments[4]==='number')?arguments[4]*(d.BYTES_PER_ELEMENT||1):d.byteLength;
          }
          S.buf+=b; if(P.sizes.length<400) P.sizes.push([P.tag,b]);
        } else if(kind==='tex'){
          for(var i=arguments.length-1;i>=0;i--){ var b2=sz(arguments[i]); if(b2){ S.tex+=b2; break; } }
        } else S.draws++;
        return r;
      };
      f.__w=1; p[name]=f;
    }
    wrap('bufferData','buf'); wrap('bufferSubData','buf');
    wrap('texImage2D','tex'); wrap('texSubImage2D','tex');
    wrap('drawElements','draw'); wrap('drawArrays','draw');
    wrap('drawElementsInstanced','draw'); wrap('drawArraysInstanced','draw');
  });
  var raf=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=function(cb){
    return raf(function(now){
      S.glMs=0;S.buf=0;S.tex=0;S.draws=0; P.tag++;
      var a=performance.now();
      try{ cb(now); } finally {
        P.rows.push([Math.round(now),+(performance.now()-a).toFixed(2),+S.glMs.toFixed(2),S.buf,S.tex,S.draws]);
        if(P.rows.length>3000) P.rows.shift();
      }
    });
  };
})();`;

/* ---- run it ---- */
(async () => {
  const u = new URL(PAGE);
  const file = path.basename(u.pathname);
  const dir = path.dirname(path.resolve(process.argv[5] || './index.html'));
  const srcPath = path.join(dir, file);
  let outUrl = PAGE;
  if (MODE !== 'gl') {
    const out = path.join(dir, 'perf.' + MODE + '.html');
    fs.writeFileSync(out, instrument(fs.readFileSync(srcPath, 'utf8'), MODE));
    u.pathname = u.pathname.replace(file, path.basename(out));
    outUrl = u.toString();
    console.error('instrumented: ' + out);
  }

  const browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  /* small viewport: software GL is fill-rate bound, and more frames per
     snapshot is what the playout measurement needs */
  const page = await browser.newPage({ viewport: MODE === 'playout' ? { width: 420, height: 300 } : { width: 1000, height: 700 } });
  await page.addInitScript(GL_INIT);
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  await page.goto(outUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(Math.max(1, SECS - 8) * 1000);
  await page.evaluate(() => { if (window.__GLP) window.__GLP.sizes.length = 0; });
  await page.waitForTimeout(8000);

  const out = await page.evaluate((mode) => {
    const pct = (a, q) => { a = a.slice().sort((x, y) => x - y); return a.length ? +a[Math.min(a.length - 1, Math.round((a.length - 1) * q))].toFixed(2) : null; };
    const dev = ((document.getElementById('dev') || {}).innerText || '').split('\n').slice(0, 4);
    if (mode === 'terrain') return { dev, ...(window.__CHK || { error: 'no checks' }) };
    if (mode === 'steps') {
      const R = (window.__T && window.__T.rows || []).slice(-150);
      if (!R.length) return { dev, error: 'no rows' };
      const names = ['updateTerrain', 'drawMachines', 'stepDust', 'sunAndSky', 'camera', 'present', 'devReadout', 'wholeFrame', 'zoneCells'];
      const o = { dev, frames: R.length };
      names.forEach((nm, i) => { const c = R.map(r => r[i]); o[nm] = { p50: pct(c, .5), p90: pct(c, .9) }; });
      return o;
    }
    if (mode === 'playout') {
      const A = (window.__A || []).slice(-1500);
      if (A.length < 50) return { dev, error: 'only ' + A.length + ' frames' };
      let frozen = 0, ratios = [];
      for (let i = 1; i < A.length; i++) {
        const [n1, a1, s1, tA1] = A[i], [n0, a0, , tA0] = A[i - 1];
        if (a1 >= 1) frozen++;
        if (tA1 === tA0 && n1 > n0) ratios.push(((a1 - a0) * s1) / (n1 - n0));
      }
      return { dev, frames: A.length, frozenPct: +(100 * frozen / A.length).toFixed(1),
               advanceRatio: { p10: pct(ratios, .1), p50: pct(ratios, .5), p90: pct(ratios, .9) } };
    }
    const R = (window.__GLP.rows || []).slice(-120);
    if (!R.length) return { dev, error: 'no frames' };
    const iv = []; for (let i = 1; i < R.length; i++) iv.push(R[i][0] - R[i - 1][0]);
    const tally = {}; const byFrame = {};
    window.__GLP.sizes.forEach(([t, b]) => { (byFrame[t] = byFrame[t] || []).push(b); });
    const keys = Object.keys(byFrame);
    (byFrame[keys[Math.floor(keys.length * 0.7)]] || []).forEach(b => { tally[b] = (tally[b] || 0) + 1; });
    return {
      dev, frames: R.length,
      frameIntervalMs: { p50: pct(iv, .5), p90: pct(iv, .9) },
      callbackMs: { p50: pct(R.map(r => r[1]), .5), p90: pct(R.map(r => r[1]), .9) },
      insideGLMs: { p50: pct(R.map(r => r[2]), .5), p90: pct(R.map(r => r[2]), .9) },
      javascriptMs: { p50: pct(R.map(r => r[1] - r[2]), .5), p90: pct(R.map(r => r[1] - r[2]), .9) },
      bufferBytesPerFrame: { p50: pct(R.map(r => r[3]), .5), max: pct(R.map(r => r[3]), 1) },
      textureBytesPerFrame: { p50: pct(R.map(r => r[4]), .5), max: pct(R.map(r => r[4]), 1) },
      drawCalls: { p50: pct(R.map(r => r[5]), .5) },
      oneFrameUploads: tally,
    };
  }, MODE);

  await page.screenshot({ path: path.join(dir, 'perf.' + MODE + '.png') });
  console.log(JSON.stringify({ mode: MODE, errors: errs.slice(0, 3), ...out }, null, 1));
  await browser.close();
})();
