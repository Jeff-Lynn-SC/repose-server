/* netfail.js — take the world away from a page that has reached it, and see what it does.
   Before this fix: six failures, 1.2 seconds, and the browser silently starts
   computing its own pit for ever. After: it waits, and comes back. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const PORT = 8101;
const PAGE = `http://127.0.0.1:8099/index.html?world=http://127.0.0.1:${PORT}&pop=3&dev&v=nf`;

function startWorld() {
  const p = spawn('node', ['server.js'], {
    cwd: require('path').join(__dirname,'..'),
    env: { ...process.env, PORT: String(PORT), STATE_FILE: '/tmp/world-nf.json' },
    stdio: 'ignore',
  });
  return p;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const INIT = `(function(){
  var M=window.__NET={inflight:0,max:0,sent:0,done:0,failed:0};
  var of=window.fetch;
  window.fetch=function(){
    var u=String((arguments[0]&&arguments[0].url)||arguments[0]||"");
    if(u.indexOf("stat"+"e?")<0) return of.apply(window,arguments);
    M.sent++; M.inflight++; if(M.inflight>M.max) M.max=M.inflight;
    return of.apply(window,arguments).then(function(r){ M.inflight--; M.done++; return r; },
                                           function(e){ M.inflight--; M.failed++; throw e; });
  };
})();`;

(async () => {
  let world = startWorld();
  await wait(6000);

  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 300 } });
  await page.addInitScript(INIT);
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });

  const read = async () => await page.evaluate(() => {
    const t = ((document.getElementById('dev') || {}).innerText || '').split('\n');
    return { line: (t[2] || '') + ' | ' + (t[3] || ''), net: window.__NET };
  });

  await wait(70000);
  const connected = await read();

  /* how many questions are in the air while it is healthy */
  await page.evaluate(() => { window.__NET.max = 0; window.__NET.sent = 0; window.__NET.done = 0; });
  await wait(20000);
  const healthy = await read();

  /* take the world away */
  world.kill('SIGKILL');
  await wait(30000);
  const gone = await read();

  /* give it back */
  world = startWorld();
  await wait(45000);
  const back = await read();

  console.log(JSON.stringify({
    errors: errs.slice(0, 3),
    connected: connected.line,
    healthy: { line: healthy.line, sentIn20s: healthy.net.sent, maxInFlight: healthy.net.max },
    worldKilled: { line: gone.line, failed: gone.net.failed, sent: gone.net.sent },
    worldBack: { line: back.line, sent: back.net.sent, done: back.net.done },
  }, null, 1));
  await browser.close();
  world.kill('SIGKILL');
  process.exit(0);
})();
