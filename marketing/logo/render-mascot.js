// 게임 캐릭터를 배경 없이(투명 PNG) 렌더 → mascot/<name>.png
// index.html을 직접 고치지 않고, 불러올 때만 renderer alpha를 켜고 내부 객체를 __poleDebug._x로 꺼내 씀
// node render-mascot.js
const fs = require('fs');
const path = require('path');
const { launch } = require('../instagram/scripts/common');

const GAME = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8')
  .replace('new T.WebGLRenderer({ antialias: true,', 'new T.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true, antialias: true,')
  .replace('window.__poleDebug = {', 'window.__poleDebug = { _x: { scene, me, camera, renderer, setFace(v){ faceMode = v; } },');
const URL = 'http://polknic.local/index.html';
const LOOK = { top:'lace', topColor:'#f4e9d2', bottom:'laceSkirt', bottomColor:'#f4e9d2', shoes:'bare', hair:'bun', acc:'star', hairColor:'#5a3a24', eyeColor:'#7a4b32', skin:'#fff0e6' };

// name, 표정, 카메라 좌우 각도(rad, 0 = 정면), 위아래 높이, 거리, 바라보는 점 높이(머리 중심 기준)
const SHOTS = [
  ['joy-front',  'joy',  0,    0.08, 1.35, -0.05],
  ['joy-34',     'joy',  0.55, 0.15, 1.4,  -0.05],
  ['wink-34',    'wink', -0.5, 0.12, 1.4,  -0.05],
  ['open-front', 'open', 0,    0.08, 1.35, -0.05],
  ['joy-full',   'joy',  0.45, 0.3,  3.0,  -0.4],
];

(async () => {
  fs.mkdirSync(path.join(__dirname, 'mascot'), { recursive: true });
  const browser = await launch();
  for (const [name, face, ang, up, dist, aim] of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
    await page.route(/polknic-ws|googletagmanager|google-analytics/, r => r.abort());
    await page.route(URL, r => r.fulfill({ contentType: 'text/html', body: GAME }));
    await page.addInitScript(look => {
      localStorage.setItem('pole-outfit-v2', JSON.stringify(look));
      localStorage.setItem('pole-name-show', '0');
    }, LOOK);
    await page.goto(URL);
    await page.addStyleTag({ content: 'html,body,#scene{background:transparent!important}body>*:not(#scene){display:none!important}' });
    await page.waitForFunction(() => window.__poleDebug, null, { timeout: 20000 });
    await page.waitForTimeout(1200);
    await page.evaluate(([face, ang, up, dist, aim]) => {
      const d = __poleDebug, { scene, me, camera, renderer } = d._x, T = THREE;
      d._x.setFace(face);
      d.look(0, 0.2, 3); d.pause(true);   // 폴에서 떨어진 시작 자리에 선 그대로
      me.emote.visible = false;
      scene.background = null; scene.fog = null; renderer.setClearColor(0x000000, 0);
      // 카메라는 레이어 5만 봄 → 캐릭터만 그려짐. r128은 조명도 레이어로 거르니 조명도 5에 넣음
      me.holder.traverse(o => o.layers.enable(5));
      scene.traverse(o => { if (o.isLight) o.layers.enable(5); });
      camera.layers.set(5);
      // 햇빛을 정면 약간 옆에서 받도록 캐릭터를 돌림(게임 시작 자리에선 해를 등짐)
      let sun; scene.traverse(o => { if (o.isDirectionalLight && !sun) sun = o; });
      const sd = sun.position.clone().sub(sun.target.position);
      me.holder.rotation.y = Math.atan2(sd.x, sd.z) + 0.35;
      me.holder.updateMatrixWorld(true);
      const h = new T.Vector3(); me.skull.getWorldPosition(h);
      const f = new T.Vector3(0, 0, 1).applyQuaternion(me.holder.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
      f.applyAxisAngle(new T.Vector3(0, 1, 0), ang);
      camera.fov = 30; camera.aspect = 1; camera.updateProjectionMatrix();
      camera.position.copy(h).addScaledVector(f, dist).add(new T.Vector3(0, up, 0));
      camera.lookAt(h.x, h.y + aim, h.z);
      renderer.render(scene, camera);
    }, [face, ang, up, dist, aim]);
    await page.locator('#scene canvas').screenshot({ path: path.join(__dirname, 'mascot', name + '.png'), omitBackground: true });
    await page.close();
    console.log('mascot', name);
  }
  await browser.close();
})();
