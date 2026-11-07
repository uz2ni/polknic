// shots.json의 장면을 게임(index.html)에서 렌더해 renders/<name>.png로 저장
// node scripts/render.js            전부
// node scripts/render.js chair ...  이름 고른 것만
// shots.json 항목: jsFile(js 대신 scenes/ 안의 연출 스크립트, window.__LOOKS로 옷 목록을 씀), q(주소 뒤에 붙일 값, 예 ?bots=8), ui(true면 게임 UI를 숨기지 않고 2배 해상도로, 입장 화면 캡처용), rooms(방별 인원 예시 배열)
const fs = require('fs');
const path = require('path');
const { launch, openGame } = require('./common');

const ROOT = path.join(__dirname, '..');

(async () => {
  const { looks, shots } = JSON.parse(fs.readFileSync(path.join(ROOT, 'shots.json'), 'utf8'));
  const pick = process.argv.slice(2);
  const todo = pick.length ? shots.filter(s => pick.includes(s.name)) : shots;
  fs.mkdirSync(path.join(ROOT, 'renders'), { recursive: true });

  const browser = await launch();
  for (const s of todo) {
    const page = await openGame(browser, { w: s.w, h: s.h, look: looks[s.look], looks, q: s.q, ui: !!s.ui, rooms: s.rooms });
    const js = s.jsFile ? fs.readFileSync(path.join(ROOT, s.jsFile), 'utf8') : (s.js || '');
    await page.evaluate(js => { eval(js); }, js);
    if (!s.ui) await page.evaluate(() => __poleDebug.pause(true));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ROOT, 'renders', s.name + '.png') });
    // 장면 스크립트가 window.__marks(머리 위 화면 좌표 등)를 남기면 renders/<name>.json으로 저장(말풍선 배치용)
    const marks = await page.evaluate(() => window.__marks || null);
    if (marks) fs.writeFileSync(path.join(ROOT, 'renders', s.name + '.json'), JSON.stringify(marks, null, 1));
    await page.close();
    console.log('render', s.name);
  }
  await browser.close();
})();
