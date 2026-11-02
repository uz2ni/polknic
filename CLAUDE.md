# CLAUDE.md — 야외 폴 연습장 (online-poledance)

브라우저 3D 폴댄스 연습 공간 프로토타입. 파스텔 호숫가 씬 + 폴 1개 + 2.5등신 치비 캐릭터 1명(1인 전용, 사람만), 옷 갈아입기, 폴 기술 5개.
상세 설계·배경·이력은 [HANDOFF.md](HANDOFF.md)에 있음. 단 HANDOFF.md의 캐릭터 치수·포즈 값은 이전 애니풍 7등신 버전 기준이고, 현재 값은 이 파일이 기준이다.

## 스타일 방향

- 동물의숲 같은 결의 귀여운 스타일: 큰 둥근 머리, 짧고 통통한 팔다리, 동그란 손, 큰 눈+볼 터치, 채도 높은 파스텔, 동글동글한 나무
- 동숲 주민·캐릭터 디자인, 로고, UI, 이름을 그대로 따라 하지 않는다. 오리지널 캐릭터로 유지
- 폴 포즈는 정확한 재현보다 "귀엽게 따라 하기". 팔이 짧아 머리 위로 못 뻗는 건 의도된 비율. 대신 실루엣은 기술을 알아볼 수 있게

## 현재 상태

- 결과물은 단일 파일 [index.html](index.html) (~1430줄, CSS/JS 인라인, 빌드 없음)
  - 예전 이름은 `online-poledance.html`(HANDOFF.md 원문에선 `pole-studio.html`). GitHub Pages 루트에서 바로 열리도록 `index.html`로 바꿈
  - 1번째 줄의 `<!doctype>...<body>` + 기본 `<style>`은 claude.ai Artifact 배포 시 씌워진 래퍼. 실제 페이지는 `<title>`부터
- git: GitHub `uz2ni/pole-3d`(공개). 배포는 GitHub Pages, `main` 브랜치 루트(`.nojekyll` 포함) → https://uz2ni.github.io/pole-3d/
  - `main`에 푸시하면 1~2분 뒤 자동 반영. 작업은 브랜치에서 하고 확인 후 `main`에 합치기
- 사용자 주력 스택: Java / Spring Boot (멀티플레이 백엔드는 나중에 Spring WebSocket 예정)
- 문서·UI 텍스트·커밋 메시지는 한국어

## 기술 제약

- three.js **r128** UMD, 전역 `THREE` (코드에서는 `const T = THREE`)
  - r128 전용 API 사용 중: `LuminanceFormat`, `renderer.outputEncoding = sRGBEncoding`, `Color.convertSRGBToLinear()`, `PMREMGenerator.fromScene`
  - `CapsuleGeometry` 없음. 버전 올릴 때 위 API를 전부 교체해야 함
- 외부 에셋(모델·텍스처·음원) 없음 — 전부 코드 생성. 저작권 이슈 회피가 목적이므로 임의로 외부 에셋을 추가하지 말 것
- 폰트: Google Fonts `Jua`(타이틀·동작 버튼), `IBM Plex Sans KR`(본문)
- Artifact로 배포하는 동안은 CDN 화이트리스트(cdnjs / jsdelivr / unpkg)만 가능, 외부 fetch 불가

## 코드 지도 (index.html, 위→아래)

| 대략 줄 | 블록 |
|---|---|
| 6–68 | `<style>` 크림색 둥근 패널 UI(타이틀 폰트 Jua), 640px 이하 모바일 대응 |
| 70–97 | HTML: `#scene`, `.brand`, `#wardrobe`, `.hud`(`#statusText`, `#spinTog`, `#camTog`, `#moves`) |
| 100–148 | renderer/scene, 공용 툰 셰이딩(`grad`, `TOON_K`, `tcol`, `toon`/`toonF`), `canvasTex()` |
| 150–416 | 하늘(+PMREM), 조명, 호수(`LAKE`, `inLake()`, `lakeShape()` 모래톱·물거품·물), 잔디(틱 텍스처)·꽃, 둥근 나무/침엽수·덤불·언덕·구름, 나무 데크 스테이지+폴(`POLE_H`, `STAGE_H`) |
| 417–505 | 소품: 징검돌, 벤치, 표지판, 울타리, 물가 바위(`OBSTACLES`), 나비(`updateButterflies`) |
| 506–918 | 캐릭터: 헬퍼(`mesh/lathe/ell/tube/strandGeo/shellGeo/frillGeo`), 리그(`joint()` → `J[name]`), `skull` 그룹(머리·얼굴·헤어 셸), `chinify()`, 표정별 `drawFace()`(`EXPRS`), 헤어 스타일, 팔다리, 리본·머리 장식, 이모트 스프라이트 |
| 919–964 | 옷장: `OPTIONS`, `CLOTH`, `COLORS`, `TOP_PARTS`/`BOT_PARTS`, `DEFAULT`, `applyOutfit()` (localStorage `pole-outfit-v2`) |
| 965–1081 | `POSES`, `MOVE_ORDER`, `JOINTS`, `LIMBS`, `boneQuat()`, `solveIK()` |
| 1082–1271 | 상태 머신: `rebase`, `startMove`, `enterPole`, `requestLeave`, `doLeave`, `goTo`, `updateCamera`, `update(dt)` |
| 1272–1412 | `hang()`(스커트/머리 늘어짐), 포인터·키보드 입력, UI 동기화, `resize` |
| 1413–끝 | `frame()` 루프, `window.__poleDebug` |

줄 번호는 편집하면서 밀리니 함수명으로 grep 할 것.

## 반드시 지킬 규칙 (깨면 이미 고친 버그가 재발함)

- **툰 색은 항상 `tcol(hex)`로** 만든다. `TOON_K = 0.37` 프리다크닝 + `toneMapped:false` 없이 넣으면 햇빛에 하얗게 날아감
- **`frame()`의 dt 클램프 유지**: `dt = min(0.05, max(0, ...))`, `last = max(last, now)`. rAF 타임스탬프가 `performance.now()`보다 이를 수 있어 음수 dt → 카메라 폭주
- 머리·얼굴 구에는 **같은 `chinify()`** 적용. 턱을 별도 메시로 붙이지 말 것(툰 이음선)
- 머리·얼굴·헤어 셸은 모두 `skull` 그룹 안에 둔다(같은 스케일을 공유해야 얼굴/머리가 안 어긋남)
- 캐릭터 전체 `receiveShadow = false`(자기 그림자가 툰에서 회색 띠로 보임), 스커트 `castShadow = false`, 나무는 그림자 받기 끔(구 표면 줄무늬)
- InstancedMesh에 툰 재질(`tcol`이 이미 곱해진 흰색)을 쓸 땐 `setColorAt`에 **원래 색**을 넣는다. `TOON_K`를 또 곱하면 두 번 어두워짐
- 모래톱/물거품은 `depthWrite:false` + `renderOrder`(1, 2, 물 3)로 겹침. polygonOffset만으로는 먼 거리에서 물이 가려짐
- 모드 전환 시 holder를 옮길 땐 `rebase()`를 거쳐 캐릭터 월드 위치가 튀지 않게
- 키 입력은 물리 키(`e.code`) 기준. `e.key`만 보면 한글 입력 상태에서 WASD·숫자·Q가 'ㅈ' 등으로 들어와 무시됨. 화살표는 `preventDefault`(패널 스크롤 방지)
- 이동 시 폴 근처 차단은 "폴에 더 가까워지는 걸음"만 막는다. 내려온 직후 캐릭터가 폴 0.4m 안에 서 있어서, 거리만으로 막으면 아무 방향으로도 못 움직임
- 카메라 드래그는 캐릭터 방향을 바꾸지 않는다(`poseYaw`는 동작 선택 시에만 카메라 쪽으로 맞춤). 스핀을 끄면 그 자리에서 멈춤
- 걸어서 피해야 하는 소품은 `OBSTACLES`(`[x, z, r]`)에 넣으면 `walkable()`/`stepOK()`가 막아줌. 이동은 `stepOK()`를 써야 장애물 안(벤치에서 일어난 직후 등)에서 빠져나올 수 있음
- 입력창에 타이핑 중일 때는 keydown 처리를 건너뜀(닉네임에 WASD·E·Q가 들어가도 캐릭터가 안 움직이게)

## 플레이어 기능

- 입장 화면: 닉네임(최대 12자) 입력 후 입장. 다시 들어오면 저장된 이름이 미리 채워짐. 옷장의 "닉네임"에서 변경
- 닉네임 태그: HTML 요소(`#nameTag`)를 머리 위 월드 좌표를 투영해 매 프레임 배치(`updateNameTag`). 거꾸로 매달린 포즈에서는 가장 높은 쪽 위로. "이름 표시/숨김" 토글
- 표정: HUD에서 자동(포즈별 `face`)/방긋/윙크/활짝/깜짝 선택(`faceMode`). 고르면 해당 이모트가 뜸
- 앉기(E 또는 "앉기" 버튼): 벤치 2.2m 안이면 벤치로 걸어가 앉고, 아니면 그 자리 바닥에. 걷는 중에 누르면 도착 지점에서 앉음. 벤치를 클릭해도 앉으러 감. 움직이면 일어남(`sitAt`, `sitQueued`, 포즈 `sitGround`/`sitBench`)
- localStorage 키: `pole-outfit-v2`(옷), `pole-name`, `pole-name-show`, `pole-face`

## 좌표·포즈 규약

- 캐릭터 정면 +Z, 왼쪽 +X. 팔다리는 -Y로 뻗음. 관절 **x 회전 음수 = 앞**, 양수 = 뒤
- 포즈 좌표는 폴 프레임(폴 = Y축, 원점), 높이는 데크 윗면 기준(스테이지 위면 `STAGE_H` 0.06이 자동으로 더해짐)
- 치수(m): 키 약 1.06, 머리 반지름 `HEAD_R` 0.22(중심은 head 관절 위 `HEAD_Y` 0.2), 서 있을 때 루트 `STAND_Y` 0.367, 폴 힐 +0.022, 폴 높이 `POLE_H` 3.0
- 머리가 커서 포즈마다 머리 중심이 폴 축에서 약 0.24m 이상 떨어져야 안 뚫림. `__poleDebug.ik()`의 `headGap`이 0보다 커야 함
- 포즈 형식: `{ label, key, sub, view, p:[x,y,z], up/fwd 또는 r, j:{joint:[x,y,z]}, ik:{limb:{t, h}} }`
  - IK 걸린 팔다리는 FK 블렌딩에서 제외(`ikSkip`). `LIMBS`: 팔 0.13/0.152(손 중심까지), 다리 0.14/0.135
- 블렌딩은 `1 - exp(-rate*dt)` (폴 4, 자유이동 10, IK 9)
- 상태: `roam → approach → pole → (requestLeave) ready 1.3s → doLeave → roam`
- 포즈 옵션 `face`(open/wink/joy/wow, 눈 깜빡임은 open·wow일 때만)와 `emote`(heart/note/wow/sparkle). 폴 진입 시 폴짝(`hopAt`), 내려올 때 착지 찌그러짐(`landAt`)은 `holder.position.y`와 `char.scale`로 처리
- 동작 키: 1 체어(스플릿 그립) · 2 P포즈(`ppose`, 피겨헤드를 대체) · 3 헤라 · 4 브라스 · 5 스플릿(`split`, 아이샤를 대체). `ready`/`stand`는 버튼 없음
  - P포즈·스플릿은 사용자가 준 사진을 보고 "귀엽게 따라 하기" 수준으로 맞춤. 다리가 짧아 스플릿 폭은 작음

## 검증 방법

포즈·외형을 바꾸면 반드시 렌더링해서 눈으로 확인한다(코드만 보고 "됐다"고 하지 말 것).

- 빠른 확인: `.claude/launch.json`의 `static`(python http.server, 5173)으로 띄우고 Browser pane에서 `http://localhost:5173/index.html`을 열어 `__poleDebug` 사용
- 헤드리스 비교: three r128을 로컬로 받아 CDN 경로 치환한 사본으로 Playwright 스크린샷
  ```bash
  npm pack three@0.128.0 && tar xzf three-0.128.0.tgz
  sed 's#https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js#package/build/three.min.js#' index.html > test.html
  ```
  Chrome 인자: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. UI 숨김 CSS `.hud,#wardrobe,.brand{display:none}` 주입
  테스트 사본·스크린샷은 프로젝트 폴더가 아니라 스크래치 디렉터리에 둘 것
- 디버그 훅
  - `__poleDebug.pose(name, yaw, pitch, dist)` 포즈 즉시 진입 + 4초 시뮬레이션
  - `__poleDebug.look(yaw, pitch, dist)` 카메라만 이동
  - `__poleDebug.pause(true)` + `__poleDebug.face(0.9)` 얼굴 클로즈업
  - `__poleDebug.state()` 카메라/캐릭터/모드 JSON
  - `__poleDebug.ik()` 현재 포즈의 IK 목표까지 남은 거리(팔은 손목 기준이라 0.032가 정상 도달)와 `headGap`
  - 프로덕션에선 개발 모드 한정으로 노출하는 방향

## 알려진 한계

스키닝 아닌 도형 조합 캐릭터(큰 꺾임에서 이음매, 옷 밀착 안 됨) · 다리 감기는 FK 근사 · 팔이 짧아 일부 IK 목표에 못 닿음(포즈마다 `__poleDebug.ik()`로 확인) · 동작 전환 애니메이션 없음 · 모바일 성능 옵션 없음 · 소리 없음

## 로드맵 (HANDOFF.md 11장 요약, 우선순위 순)

1. Vite 프로젝트화 + 모듈 분리(`scene/`, `character/`, `poses/`, `ui/`), three.js 최신으로 올리며 r128 API 교체 — 분리 전후 5개 포즈 스크린샷 비교로 동작 동일성 검증
2. VRoid VRM + `@pixiv/three-vrm`으로 캐릭터 교체(`POSES.j` → VRM 휴머노이드 본 매핑, `solveIK` 재사용)
3. 스키닝 기반 옷 갈아입기(같은 스켈레톤 재바인딩)
4. 다리 접촉점 IK
5. 동작 전환 애니메이션(장기: Blender GLB + `AnimationMixer`)
6. 성능 옵션(풀 개수/그림자/픽셀비율 자동 하향)
7. 멀티플레이: Spring Boot `TextWebSocketHandler`, 메시지 `join / pose{name} / move{x,z} / leave`, 포즈는 이름만 전송
8. 배포: Cloudflare Pages 또는 S3+CloudFront
