// 맥에 설치된 크롬을 그대로 씀(playwright 브라우저 따로 안 받음). 다른 경로면 CHROME 환경 변수로
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const REPO = path.join(__dirname, '../../..');

// --use-angle=metal: 헤드리스 기본값으론 WebGL 컨텍스트가 안 만들어짐
exports.launch = () => chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });

// index.html은 그대로 두고, 불러올 때만 내부 객체를 __poleDebug._x로 꺼냄(장면 연출용: 캐릭터 추가·배치·이모트, 릴스용 시간 진행·카메라)
const GAME_HTML = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8')
  .replace('window.__poleDebug = {', 'window.__poleDebug = { _x: { THREE: T, scene, camera, renderer, me, others, POLES, createAvatar, removeAvatar, showEmote, update, setSpin, ballHeight,'
    + ' MAT_SPOTS, sitDown, startStretch, takePhoto, get faceMode(){ return faceMode; }, set faceMode(v){ faceMode = v; },'
    + ' get yaw(){ return yaw; }, set yaw(v){ yaw = v; }, get pitch(){ return pitch; }, set pitch(v){ pitch = v; }, get clock(){ return clock; } },');
const GAME = 'http://polknic.local/index.html';
exports.GAME = GAME;
exports.HIDE = '.hud,#wardrobe,.brand,.corner,#entry,#loading,#nameTag,#settings,#uiShow,body>div[style*=monospace]{display:none!important}';   // 마지막은 ?bots 성능 표시

// 게임 페이지 열기. 실제 서버·분석에는 안 붙고, http://polknic.local/<경로>는 저장소 파일을 그대로 줌(tokens.css·로고도 이 주소로)
// look: 내 옷, looks: 장면 스크립트용 옷 목록(window.__LOOKS), ui: 게임 UI를 그대로 두고 2배 해상도로, rooms: 방별 인원 예시
exports.openGame = async (browser, { w, h, look, looks, q = '', ui = false, rooms }) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: ui ? 2 : 1 });
  await page.route(/polknic-ws|googletagmanager|google-analytics/, r => r.abort());
  if (rooms) await page.route(/polknic-ws\.yujamong\.com\/rooms/, r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ rooms, cap: 20 }) }));
  await page.route(/^http:\/\/polknic\.local\/index\.html/, r => r.fulfill({ contentType: 'text/html', body: GAME_HTML }));
  await page.route(/^http:\/\/polknic\.local\/(?!index\.html)/, r => r.fulfill({ path: path.join(REPO, decodeURIComponent(new URL(r.request().url()).pathname)) }));
  await page.addInitScript(([look, ui, all]) => {
    localStorage.setItem('pole-outfit-v2', JSON.stringify(look));
    localStorage.setItem('pole-name-show', '0');
    localStorage.setItem('pole-bgm', '0');
    if (ui) localStorage.setItem('pole-name', '자몽');
    window.__LOOKS = all;
  }, [look, ui, looks]);
  await page.goto(GAME + q);
  if (!ui) await page.addStyleTag({ content: exports.HIDE });
  await page.waitForFunction(() => window.__poleDebug, null, { timeout: 20000 });
  await page.waitForTimeout(1500);   // 폰트·첫 프레임
  return page;
};
