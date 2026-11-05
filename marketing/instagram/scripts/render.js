// shots.json의 장면을 게임(index.html)에서 렌더해 renders/<name>.png로 저장
// node scripts/render.js            전부
// node scripts/render.js chair ...  이름 고른 것만
// shots.json 항목: jsFile(js 대신 scenes/ 안의 연출 스크립트, window.__LOOKS로 옷 목록을 씀), q(주소 뒤에 붙일 값, 예 ?bots=8), ui(true면 게임 UI를 숨기지 않고 2배 해상도로, 입장 화면 캡처용), rooms(방별 인원 예시 배열)
const fs = require('fs');
const path = require('path');
const { launch } = require('./common');

const ROOT = path.join(__dirname, '..');
// index.html은 그대로 두고, 불러올 때만 내부 객체를 __poleDebug._x로 꺼냄(장면 연출용: 캐릭터 추가·배치·이모트)
const GAME_HTML = fs.readFileSync(path.join(ROOT, '../../index.html'), 'utf8')
  .replace('window.__poleDebug = {', 'window.__poleDebug = { _x: { THREE: T, scene, camera, renderer, me, others, POLES, createAvatar, showEmote, get yaw(){ return yaw; } },');
const GAME = 'http://polknic.local/index.html';
const HIDE = '.hud,#wardrobe,.brand,.corner,#entry,#loading,#nameTag,#settings,#uiShow,body>div[style*=monospace]{display:none!important}';   // 마지막은 ?bots 성능 표시

(async () => {
  const { looks, shots } = JSON.parse(fs.readFileSync(path.join(ROOT, 'shots.json'), 'utf8'));
  const pick = process.argv.slice(2);
  const todo = pick.length ? shots.filter(s => pick.includes(s.name)) : shots;
  fs.mkdirSync(path.join(ROOT, 'renders'), { recursive: true });

  const browser = await launch();
  for (const s of todo) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.ui ? 2 : 1 });
    // 실제 서버·분석에는 안 붙음
    await page.route(/polknic-ws|googletagmanager|google-analytics/, r => r.abort());
    // rooms: 입장 화면 방 고르기에 보일 예시 인원(서버 /rooms 응답 대신)
    if (s.rooms) await page.route(/polknic-ws\.yujamong\.com\/rooms/, r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ rooms: s.rooms, cap: 20 }) }));
    await page.route(/^http:\/\/polknic\.local\/index\.html/, r => r.fulfill({ contentType: 'text/html', body: GAME_HTML }));
    await page.route(/^http:\/\/polknic\.local\/(?!index\.html)/, r => r.fulfill({ path: path.join(ROOT, '../..', new URL(r.request().url()).pathname) }));
    await page.addInitScript(([look, ui, all]) => {
      localStorage.setItem('pole-outfit-v2', JSON.stringify(look));
      localStorage.setItem('pole-name-show', '0');
      localStorage.setItem('pole-bgm', '0');
      if (ui) localStorage.setItem('pole-name', '자몽');
      window.__LOOKS = all;
    }, [looks[s.look], !!s.ui, looks]);
    await page.goto(GAME + (s.q || ''));
    if (!s.ui) await page.addStyleTag({ content: HIDE });
    await page.waitForFunction(() => window.__poleDebug, null, { timeout: 20000 });
    await page.waitForTimeout(1500);   // 폰트·첫 프레임
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
