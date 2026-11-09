// 폴짝 매점 카드뉴스 장면. 주소 ?s=snack&kind=coffee(간식 든 클로즈업) · s=bite&n=1(n입째, 4면 다 먹고 활짝) · s=line(줄 서기) · s=table(테이블)
const d = __poleDebug, x = d._x, T = x.THREE, L = window.__LOOKS, q = new URLSearchParams(location.search), me = x.me, S = x.SHOP;
const s = q.get('s');
// 카메라: 대상(tx, ty, tz)을 yaw 쪽(대상에서 카메라로, 0이면 +z) 거리 dist에서. 멈춘 뒤 직접 놓아 그림
function shoot(tx, ty, tz, yaw, pitch, dist) {
  d.pause(true);
  x.camera.position.set(tx + Math.sin(yaw)*Math.cos(pitch)*dist, ty + Math.sin(pitch)*dist, tz + Math.cos(yaw)*Math.cos(pitch)*dist);
  x.camera.lookAt(tx, ty, tz);
  x.renderer.render(x.scene, x.camera);
}
function friend(look, px, pz, rot, pose = 'stand', face = 'joy') {
  const av = x.createAvatar(L[look]);
  av.holder.position.set(px, 0, pz); av.holder.rotation.y = rot;
  av.pose = pose; av.faceMode = face; av.nameShown = false;
  x.others.push(av);
  return av;
}
const hx = (a, m) => S.x + Math.sin(a)*m, hz = (a, m) => S.z + Math.cos(a)*m;

if (s === 'snack' || s === 'bite') {
  // 클로즈업: 호수를 등지고 손에 든 간식과 얼굴이 함께 보이게. 뒤는 숲
  me.holder.position.set(2.2, 0, 3.4); me.holder.rotation.y = 0.5;
  if (s === 'snack') {
    x.setSnack(me, q.get('kind')); me.faceMode = 'joy';
    d.pause(false); d.step(1.2);
  } else {
    const n = +q.get('n');
    x.setSnack(me, 'tanghulu');
    d.pause(false); d.step(1.2);
    if (n <= 3) { me.bites = n; me.biteAt = x.clock; me.faceMode = 'joy'; d.step(1.4); }   // 삼키고 손을 내린 순간: 남은 알이 보임
    else { me.bites = 3; x.setSnack(me, null); me.fullAt = x.clock; x.showEmote(me, 'heart'); d.step(0.6); }
  }
  const c = me.holder.position, a = me.holder.rotation.y;
  shoot(c.x, +q.get('h') || 0.66, c.z, a - 0.32, 0.06, +q.get('dist') || (s === 'bite' ? 0.92 : 1.0));
}
if (s === 'line') {
  // 카운터 앞에 셋이 줄(맨 앞이 나). 옆에서 비스듬히, 직원과 간판이 보이게
  const R = S.rot + Math.PI, p = i => x.shopSpot(i);
  me.holder.position.copy(p(0)); me.holder.rotation.y = R + 0.45; me.faceMode = 'joy';
  const b = friend('sky', p(1).x, p(1).z, R, 'stand', 'wink'), c = friend('coral', p(2).x, p(2).z, R, 'stand', 'joy');
  d.pause(false); d.step(1.5);
  const y = S.rot + (+q.get('y') || 0.55), tx = hx(S.rot, 0.95), tz = hz(S.rot, 0.95), dist = +q.get('dist') || 3.9;
  // 뒤의 둘은 카메라 쪽으로 돌아봄(줄 선 채 뒤돌아 인사)
  const cx = tx + Math.sin(y)*dist, cz = tz + Math.cos(y)*dist;
  [b, c].forEach(av => { const h = av.holder.position; av.holder.rotation.y = Math.atan2(cx - h.x, cz - h.z) - 0.25; });
  me.holder.rotation.y = Math.atan2(cx - me.holder.position.x, cz - me.holder.position.z) - 1.0;
  d.step(0.3);
  shoot(tx, 0.92, tz, y, +q.get('p') || 0.1, dist);
}
if (s === 'table') {
  // 테이블에 셋: 간식은 앞 테이블 위(가운데 사람은 한 입 드는 중)
  const ch = x.BENCHES.filter(b => b.chair);
  const put = (av, c, kind) => { av.holder.position.set(c.x, 0, c.z); av.holder.rotation.y = c.rot; av.pose = 'sitBench'; x.setSnack(av, kind); };
  me.faceMode = 'joy';
  d.table(0, 'tanghulu');
  const a = friend('sky', ch[1].x, ch[1].z, ch[1].rot, 'sitBench', 'joy'), b = friend('coral', ch[2].x, ch[2].z, ch[2].rot, 'sitBench', 'wink');
  put(a, ch[1], 'coffee'); put(b, ch[2], 'shake');
  d.pause(false); d.step(1.5);
  a.bites = 1; a.biteAt = x.clock; d.step(0.55);
  shoot(x.TABLE.x, 0.55, x.TABLE.z, +q.get('y') || 3.54, +q.get('p') || 0.25, +q.get('dist') || 2.6);
}
