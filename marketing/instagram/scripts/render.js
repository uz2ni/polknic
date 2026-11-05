// shots.json의 장면을 게임(index.html)에서 렌더해 renders/<name>.png로 저장
// node scripts/render.js            전부
// node scripts/render.js chair ...  이름 고른 것만
const fs = require('fs');
const path = require('path');
const { launch } = require('./common');

const ROOT = path.join(__dirname, '..');
const GAME = 'file://' + path.join(ROOT, '../../index.html');
const HIDE = '.hud,#wardrobe,.brand,.corner,#entry,#loading,#nameTag,#settings,#uiShow,#perf{display:none!important}';

(async () => {
  const { looks, shots } = JSON.parse(fs.readFileSync(path.join(ROOT, 'shots.json'), 'utf8'));
  const pick = process.argv.slice(2);
  const todo = pick.length ? shots.filter(s => pick.includes(s.name)) : shots;
  fs.mkdirSync(path.join(ROOT, 'renders'), { recursive: true });

  const browser = await launch();
  for (const s of todo) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
    // 실제 서버·분석에는 안 붙음
    await page.route(/polknic-ws|googletagmanager|google-analytics/, r => r.abort());
    await page.addInitScript(look => {
      localStorage.setItem('pole-outfit-v2', JSON.stringify(look));
      localStorage.setItem('pole-name-show', '0');
      localStorage.setItem('pole-bgm', '0');
    }, looks[s.look]);
    await page.goto(GAME);
    await page.addStyleTag({ content: HIDE });
    await page.waitForFunction(() => window.__poleDebug, null, { timeout: 20000 });
    await page.waitForTimeout(1500);   // 폰트·첫 프레임
    await page.evaluate(js => { eval(js); __poleDebug.pause(true); }, s.js);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ROOT, 'renders', s.name + '.png') });
    await page.close();
    console.log('render', s.name);
  }
  await browser.close();
})();
