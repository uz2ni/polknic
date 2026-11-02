# CLAUDE.md — 야외 폴 연습장 (online-poledance)

브라우저 3D 폴댄스 연습 공간 프로토타입. 호숫가 야외 씬 + 폴 1개 + 애니풍 캐릭터 1명(1인 전용), 옷 갈아입기, 폴 기술 5개.
상세 설계·배경·이력은 [HANDOFF.md](HANDOFF.md)에 있음. 이 파일은 작업할 때 바로 필요한 규칙과 지도만 담는다.

## 현재 상태

- 결과물은 단일 파일 [online-poledance.html](online-poledance.html) (~1170줄, CSS/JS 인라인, 빌드 없음)
  - HANDOFF.md에서 `pole-studio.html`이라고 부르는 파일이 바로 이것 (이름만 다름)
  - 1번째 줄의 `<!doctype>...<body>` + 기본 `<style>`은 claude.ai Artifact 배포 시 씌워진 래퍼. 실제 페이지는 `<title>`부터
- git 저장소 아님. 큰 변경 전에 `git init` 여부를 사용자에게 확인할 것
- 사용자 주력 스택: Java / Spring Boot (멀티플레이 백엔드는 나중에 Spring WebSocket 예정)
- 문서·UI 텍스트·커밋 메시지는 한국어

## 기술 제약

- three.js **r128** UMD, 전역 `THREE` (코드에서는 `const T = THREE`)
  - r128 전용 API 사용 중: `LuminanceFormat`, `renderer.outputEncoding = sRGBEncoding`, `Color.convertSRGBToLinear()`, `PMREMGenerator.fromScene`
  - `CapsuleGeometry` 없음. 버전 올릴 때 위 API를 전부 교체해야 함
- 외부 에셋(모델·텍스처·음원) 없음 — 전부 코드 생성. 저작권 이슈 회피가 목적이므로 임의로 외부 에셋을 추가하지 말 것
- 폰트: Google Fonts `Nanum Myeongjo`(타이틀), `IBM Plex Sans KR`(본문)
- Artifact로 배포하는 동안은 CDN 화이트리스트(cdnjs / jsdelivr / unpkg)만 가능, 외부 fetch 불가

## 코드 지도 (online-poledance.html, 위→아래)

| 대략 줄 | 블록 |
|---|---|
| 6–68 | `<style>` 유리 패널 UI, 640px 이하 모바일 대응 |
| 70–97 | HTML: `#scene`, `.brand`, `#wardrobe`, `.hud`(`#statusText`, `#spinTog`, `#camTog`, `#moves`) |
| 100–335 | renderer/scene, 하늘(+PMREM), 조명, 호수(`LAKE`, `inLake()`), 바닥·갈대·풀(9000)·꽃, 나무·산·구름, 스테이지+폴(`POLE` 원점) |
| 364–665 | 캐릭터: `TOON_K`, 헬퍼(`mesh/lathe/ell/tube/strandGeo`), 리그(`joint()` → `J[name]`), `chinify()`, `drawFace()`, 헤어, 팔다리 |
| 667–720 | 옷장: `OPTIONS`, `CLOTH`, `COLORS`, `TOP_PARTS`/`BOT_PARTS`, `DEFAULT`, `applyOutfit()` (localStorage `pole-outfit-v2`) |
| 723–850 | `POSES`, `MOVE_ORDER`, `JOINTS`, `LIMBS`, `boneQuat()`, `solveIK()` |
| 852–1013 | 상태 머신: `rebase`, `startMove`, `enterPole`, `requestLeave`, `doLeave`, `goTo`, `updateCamera`, `update(dt)` |
| 1014–1150 | `hang()`(스커트/머리 늘어짐), 포인터·키보드 입력, UI 동기화, `resize` |
| 1151–끝 | `frame()` 루프, `window.__poleDebug` |

줄 번호는 편집하면서 밀리니 함수명으로 grep 할 것.

## 반드시 지킬 규칙 (깨면 이미 고친 버그가 재발함)

- **툰 색은 항상 `tcol(hex)`로** 만든다. `TOON_K = 0.37` 프리다크닝 + `toneMapped:false` 없이 넣으면 햇빛에 하얗게 날아감
- **`frame()`의 dt 클램프 유지**: `dt = min(0.05, max(0, ...))`, `last = max(last, now)`. rAF 타임스탬프가 `performance.now()`보다 이를 수 있어 음수 dt → 카메라 폭주
- 머리·얼굴 구에는 **같은 `chinify()`** 적용. 턱을 별도 메시로 붙이지 말 것(툰 이음선)
- 머리 메시 `receiveShadow = false`(얼굴 줄무늬), 스커트 `castShadow = false`(다리 검은 띠)
- 피겨헤드 머리 회전은 현재 부호(+y) 유지
- 모드 전환 시 holder를 옮길 땐 `rebase()`를 거쳐 캐릭터 월드 위치가 튀지 않게

## 좌표·포즈 규약

- 캐릭터 정면 +Z, 왼쪽 +X. 팔다리는 -Y로 뻗음. 관절 **x 회전 음수 = 앞**, 양수 = 뒤
- 포즈 좌표는 폴 프레임(폴 = Y축, 원점). 서 있을 때 루트 y = 0.958, 폴 힐이면 +0.075
- 포즈 형식: `{ label, key, sub, view, p:[x,y,z], up/fwd 또는 r, j:{joint:[x,y,z]}, ik:{limb:{t, h}} }`
  - IK 걸린 팔다리는 FK 블렌딩에서 제외(`ikSkip`). `LIMBS`: 팔 0.27/0.285, 다리 0.43/0.42
- 블렌딩은 `1 - exp(-rate*dt)` (폴 4, 자유이동 10, IK 9)
- 상태: `roam → approach → pole → (requestLeave) ready 1.3s → doLeave → roam`
- 동작 키: 1 체어(스플릿 그립) · 2 피겨헤드 · 3 헤라 · 4 브라스 · 5 아이샤. `ready`/`stand`는 버튼 없음
  - 1번 이름과 아이샤 형태는 사용자 확인 대기 중(사진 받으면 수정)

## 검증 방법

포즈·외형을 바꾸면 반드시 렌더링해서 눈으로 확인한다(코드만 보고 "됐다"고 하지 말 것).

- 빠른 확인: Browser pane으로 HTML 파일을 열고 `__poleDebug` 사용
- 헤드리스 비교: three r128을 로컬로 받아 CDN 경로 치환한 사본으로 Playwright 스크린샷
  ```bash
  npm pack three@0.128.0 && tar xzf three-0.128.0.tgz
  sed 's#https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js#package/build/three.min.js#' online-poledance.html > test.html
  ```
  Chrome 인자: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. UI 숨김 CSS `.hud,#wardrobe,.brand{display:none}` 주입
  테스트 사본·스크린샷은 프로젝트 폴더가 아니라 스크래치 디렉터리에 둘 것
- 디버그 훅
  - `__poleDebug.pose(name, yaw, pitch, dist)` 포즈 즉시 진입 + 4초 시뮬레이션
  - `__poleDebug.look(yaw, pitch, dist)` 카메라만 이동
  - `__poleDebug.pause(true)` + `__poleDebug.face(0.38)` 얼굴 클로즈업
  - `__poleDebug.state()` 카메라/캐릭터/모드 JSON
  - 프로덕션에선 개발 모드 한정으로 노출하는 방향

## 알려진 한계

스키닝 아닌 도형 조합 캐릭터(큰 꺾임에서 이음매, 옷 밀착 안 됨) · 다리 감기는 FK 근사 · 동작 전환 애니메이션 없음 · 손가락 없음 · 모바일 성능 옵션 없음 · 소리 없음

## 로드맵 (HANDOFF.md 11장 요약, 우선순위 순)

1. Vite 프로젝트화 + 모듈 분리(`scene/`, `character/`, `poses/`, `ui/`), three.js 최신으로 올리며 r128 API 교체 — 분리 전후 5개 포즈 스크린샷 비교로 동작 동일성 검증
2. VRoid VRM + `@pixiv/three-vrm`으로 캐릭터 교체(`POSES.j` → VRM 휴머노이드 본 매핑, `solveIK` 재사용)
3. 스키닝 기반 옷 갈아입기(같은 스켈레톤 재바인딩)
4. 다리 접촉점 IK
5. 동작 전환 애니메이션(장기: Blender GLB + `AnimationMixer`)
6. 성능 옵션(풀 개수/그림자/픽셀비율 자동 하향)
7. 멀티플레이: Spring Boot `TextWebSocketHandler`, 메시지 `join / pose{name} / move{x,z} / leave`, 포즈는 이름만 전송
8. 배포: Cloudflare Pages 또는 S3+CloudFront
