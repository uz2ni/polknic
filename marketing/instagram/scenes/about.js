// 첫인사 2장: 내가 1번 폴(가운데)에서 스플릿을 하고, 친구들이 둘레에서 앉거나 서서 구경
const d = __poleDebug, x = d._x, T = x.THREE, L = window.__LOOKS;
d.pose('split', null, 0.3, 5.6);
const YAW = x.yaw + (+new URLSearchParams(location.search).get('yaw') || 0), PITCH = 0.2, DIST = 5.2;   // 기술마다 실루엣이 잘 보이는 쪽으로 카메라만 돌림
d.look(YAW, PITCH, DIST);
const P = x.POLES[0];
// 카메라 쪽 방향 f, 화면 왼쪽 r (둘 다 바닥 평면)
const f = new T.Vector3(x.camera.position.x - P.x, 0, x.camera.position.z - P.z).normalize();
const r = new T.Vector3(-f.z, 0, f.x);
// [옷, 자세, 표정, 왼쪽으로(m), 카메라 쪽으로(m), 이모트]
[
  ['sky',   'sitGround', 'joy',  -1.5,  0.3, 'note'],
  ['lilac', 'stand',     'open',  1.6,  0.2, 'heart'],
  ['coral', 'sitGround', 'wink',  1.0, -1.5, null],
  ['sage',  'stand',     'wow',  -1.5, -1.2, 'wow'],
  ['rose',  'stand',     'joy',   2.1, -0.9, 'sparkle'],
].forEach(([look, pose, face, a, b, emote]) => {
  const av = x.createAvatar(L[look]);
  const p = P.clone().addScaledVector(r, a).addScaledVector(f, b);
  av.holder.position.set(p.x, 0, p.z);
  av.holder.rotation.y = Math.atan2(P.x - p.x, P.z - p.z);   // 폴을 바라봄
  av.pose = pose; av.faceMode = face; av.nameShown = false;
  x.others.push(av);
  if (emote) x.showEmote(av, emote);
});
d.look(YAW, PITCH, DIST);   // 몇 프레임 돌려 자세를 맞춘 뒤 그림
