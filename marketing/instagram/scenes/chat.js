// 폴메이트 4장: 잔디에 다섯 명이 카메라 쪽을 보며 반원으로 모여 수다. 각자 머리 꼭대기의 화면 좌표를 window.__marks에 남김
const d = __poleDebug, x = d._x, T = x.THREE, L = window.__LOOKS;
d.look(x.yaw - 0.4, 0.2, 5.0);
d.pause(true);
const cam = x.camera, M = x.me.holder.position.clone();
const f = new T.Vector3(cam.position.x - M.x, 0, cam.position.z - M.z).normalize();   // 카메라 쪽
const r = new T.Vector3(-f.z, 0, f.x);
const C = M.clone().addScaledVector(f, 1.6);   // 다들 이 점(카메라 앞쪽)을 보고 둘러섬
const face = (av) => { const p = av.holder.position; av.holder.rotation.y = Math.atan2(C.x - p.x, C.z - p.z); };
face(x.me); x.me.faceMode = 'joy';
// [옷, 자세, 표정, 왼쪽으로(m), 카메라 쪽으로(m)] — 내 자리 M 기준
const crew = [
  ['lilac', 'stand',     'open', -0.75, 0.2],
  ['coral', 'stand',     'joy',   0.75, 0.2],
  ['rose',  'stand',     'wink', -1.45, 0.65],
  ['sage',  'sitGround', 'joy',   1.35, 0.8],
].map(([look, pose, faceMode, a, b]) => {
  const av = x.createAvatar(L[look]);
  const p = M.clone().addScaledVector(r, a).addScaledVector(f, b);
  av.holder.position.set(p.x, 0, p.z); face(av);
  av.pose = pose; av.faceMode = faceMode; av.nameShown = false;
  x.others.push(av);
  return av;
});
d.pause(false); d.look(x.yaw, 0.2, 5.0); d.pause(true);
// 머리 꼭대기(머리 반지름 0.22 위)를 화면 픽셀로
const W = innerWidth, H = innerHeight;
window.__marks = [['me', x.me], ...crew.map((av, i) => [['lilac', 'coral', 'rose', 'sage'][i], av])].map(([name, av]) => {
  av.holder.updateMatrixWorld(true);
  const h = new T.Vector3(); av.skull.getWorldPosition(h); h.y += 0.26;
  h.project(cam);
  return { name, x: Math.round((h.x + 1) / 2 * W), y: Math.round((1 - h.y) / 2 * H) };
});
