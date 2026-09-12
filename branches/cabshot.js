/* cabshot.js — prove the button actually puts you in a cab: one picture from
   the director, one from the driver's seat. */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const pg = await b.newPage({ viewport:{width:900,height:560} });
  await pg.goto('http://localhost:8099/test.html?dev=1&local=1', { waitUntil:'load' });
  await pg.waitForTimeout(25000);
  const st = () => pg.evaluate(() => ({ shot: window.__R.shotType, force: window.__R.forceType,
                                        nB: window.__R.nB, label: document.querySelector('#pad button[data-k="space"]').textContent }));
  console.log('director', JSON.stringify(await st()));
  await pg.screenshot({ path:'cab_director.png' });
  await pg.click('#pad button[data-k="space"]');
  await pg.waitForTimeout(4000);
  console.log('cab     ', JSON.stringify(await st()));
  await pg.screenshot({ path:'cab_seat.png' });
  await b.close();
})();
