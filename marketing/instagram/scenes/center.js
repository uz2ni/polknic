// 기술 장면을 캐릭터 몸 전체의 한가운데로 맞춰 그림(거꾸로 매달리는 기술은 기본 카메라에서 머리가 아래로 잘림)
// 주소의 ?move=브라스 같은 기술 이름, ?dist=카메라 거리
const d = __poleDebug, x = d._x, T = x.THREE, q = new URLSearchParams(location.search);
const dist = +q.get('dist') || 2.4;
d.pose(q.get('move'), null, null, dist);
d.pause(true);   // 멈추지 않으면 다음 프레임의 카메라 갱신이 아래 위치를 덮어씀
const box = new T.Box3().setFromObject(x.me.holder), c = box.getCenter(new T.Vector3());
const cam = x.camera, fw = cam.getWorldDirection(new T.Vector3());
cam.position.copy(c).addScaledVector(fw, -dist);   // 같은 방향에서 몸 한가운데를 정확히 dist 거리로
cam.lookAt(c);
x.renderer.render(x.scene, cam);
