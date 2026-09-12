/* cabtest.js — does the camera button actually cycle, and does its label
   follow? Taps the real button, reads the real state. */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const pg = await b.newPage({ viewport:{width:900,height:600} });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await pg.goto('http://localhost:8099/test.html?dev=1', { waitUntil:'load' });
  await pg.waitForTimeout(9000);
  const btn = '#pad button[data-k="space"]';
  const read = () => pg.evaluate(s => ({
    label: document.querySelector(s).textContent,
    state: window.__R.camState(),
    force: window.__R.forceType,
    shot: window.__R.shotType,
    man: window.__R.man.on
  }), btn);
  const out = [];
  out.push(['start', await read()]);
  for (const tap of ['1st tap', '2nd tap', '3rd tap']) {
    await pg.click(btn);
    await pg.waitForTimeout(900);
    out.push([tap, await read()]);
  }
  /* and the key does the same thing */
  await pg.keyboard.press(' ');
  await pg.waitForTimeout(900);
  out.push(['space key', await read()]);
  for (const [k, v] of out) console.log(k.padEnd(10), JSON.stringify(v));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await b.close();
})();
