# CLAUDE.md — 폴크닉 (online-poledance)

서비스 이름: **폴크닉**(폴 + 피크닉). 소개 문구는 "온라인 폴댄스 놀이터" 하나로 통일(탭·링크 제목 "폴크닉 · 온라인 폴댄스 놀이터", 상단 부제, 입장 화면). 링크 설명 "귀여운 캐릭터로 호숫가에서 폴 타기. 다양한 폴댄스 기술을 즐겨보세요." 공유 이미지 `og-image.png`(1200×630, [marketing/logo/og.html](marketing/logo/og.html) → `node export-og.js`). 로고는 글자 로고 [marketing/logo/v2/wordmark.svg](marketing/logo/v2/wordmark.svg)('닉'의 ㅣ를 핑크 캡 폴로 바꾼 Jua 글자)와 P 심볼 `favicon.svg`(= `v2/symbol-p.svg`, 폴 굵기 14의 P 위에 핑크 캡. PNG 아이콘도 같은 모양). 인스타 게시물은 [marketing/instagram/](marketing/instagram/README.md). 로고·아이콘·OG 이미지를 바꾸면 `index.html`의 주소 뒤 `?v=N`(현재 3)을 올릴 것(안 올리면 브라우저·카톡 캐시에 예전 그림이 남음). 도메인을 바꾸면 og:url/og:image 절대 주소도 함께 바꿀 것. 예전 이름은 "야외 폴 연습장"

브라우저 3D 폴댄스 놀이 공간. 파스텔 호숫가 씬 + 무대·폴 3개 + 요가 매트 6개 + 간식 매점·테이블 + 2.5등신 치비 캐릭터(같은 방 최대 20명이 서로 보임), 옷 갈아입기, 폴 기술 5개, 앉기, 표정, BGM. https://polknic.yujamong.com 에 배포 중(예전 주소 https://uz2ni.github.io/polknic/ 은 GitHub이 자동 이동).
상세 설계·배경·이력은 [HANDOFF.md](docs/HANDOFF.md)에 있음. 단 HANDOFF.md의 캐릭터 치수·포즈 값은 이전 애니풍 7등신 버전 기준이고, 현재 값은 이 파일이 기준이다.
대화로 정한 것들의 이유는 [docs/DECISIONS.md](docs/DECISIONS.md), 멀티플레이·채팅 계획은 [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md), 알림판은 [docs/BOARD.md](docs/BOARD.md).

## 스타일 방향

- 동물의숲 같은 결의 귀여운 스타일: 큰 둥근 머리, 짧고 통통한 팔다리, 동그란 손, 큰 눈+볼 터치, 채도 높은 파스텔, 동글동글한 나무
- 동숲 주민·캐릭터 디자인, 로고, UI, 이름을 그대로 따라 하지 않는다. 오리지널 캐릭터로 유지
- 폴 포즈는 정확한 재현보다 "귀엽게 따라 하기". 팔이 짧아 머리 위로 못 뻗는 건 의도된 비율. 대신 실루엣은 기술을 알아볼 수 있게

## 현재 상태

- 결과물은 단일 파일 [index.html](index.html) (~2300줄, CSS/JS 인라인, 빌드 없음)
  - 예전 이름은 `online-poledance.html`(HANDOFF.md 원문에선 `pole-studio.html`). GitHub Pages 루트에서 바로 열리도록 `index.html`로 바꿈
  - `<head>`에는 기본 스타일, 제목, 파비콘, 미리보기(OG) 태그, 폰트, 메인 `<style>`이 있고 `<body>`는 `#scene`부터. 파비콘·OG 태그는 반드시 `<head>` 안에 둘 것(예전엔 Artifact 래퍼가 첫 줄에서 head를 닫아 크롬 탭에 파비콘이 안 떴음)
- git: GitHub `uz2ni/polknic`(공개, 예전 이름 `pole-3d`). 배포는 GitHub Pages, `main` 브랜치 루트(`.nojekyll` 포함) → https://polknic.yujamong.com (루트 `CNAME` 파일, DNS는 Cloudflare `polknic` CNAME → `uz2ni.github.io`, 프록시 끔)
  - `main`에 푸시하면 1~2분 뒤 자동 반영. 작업은 브랜치에서 하고 확인 후 `main`에 합치기
- 실시간 서버는 [server/](server/) (Cloudflare Worker + Durable Object, JS, Node 24 필요). `wss://polknic-ws.yujamong.com`에 배포 중(`cd server && npm run deploy`, `main` 푸시와 별개로 직접 배포). 설명·프로토콜은 [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) "서버". 새 방문이면 운영자 슬랙으로 알림(secret `SLACK_WEBHOOK`, 방문 = 같은 닉네임 퇴장 뒤 30분 안 재입장·방 이동은 하나, `Stats` DO), 매일 23:59 방문 수 요약(cron). 숫자 정의는 [docs/analytics.md](docs/analytics.md) "서버 집계"
- 사용자 주력 스택: Java / Spring Boot. 멀티플레이는 Cloudflare Workers + Durable Objects(DB는 D1)로 시작해, DO 요금이 월 $25를 넘으면 Spring WebSocket(Lightsail)으로 이전 예정([docs/MULTIPLAYER.md](docs/MULTIPLAYER.md))
- 문서·UI 텍스트·커밋 메시지는 한국어

## 기술 제약

- three.js **r128** UMD, 전역 `THREE` (코드에서는 `const T = THREE`)
  - r128 전용 API 사용 중: `LuminanceFormat`, `renderer.outputEncoding = sRGBEncoding`, `Color.convertSRGBToLinear()`, `PMREMGenerator.fromScene`
  - `CapsuleGeometry` 없음. 버전 올릴 때 위 API를 전부 교체해야 함
- 외부 에셋(모델·텍스처·음원) 없음 — 전부 코드 생성. 저작권 이슈 회피가 목적이므로 임의로 외부 에셋을 추가하지 말 것
- 폰트: Google Fonts `Jua`(타이틀·동작 버튼), `IBM Plex Sans KR`(본문)

## 코드 지도 (index.html, 위→아래)

| 대략 줄 | 블록 |
|---|---|
| 1–33 | `<head>`: 제목, 설명·OG 태그, 파비콘, GA4 로더(`GA_ID`, `polkTrack`), 폰트 |
| 34–126 | `<style>`: 크림색 둥근 패널 UI, 입장 화면, 이름표, 메뉴 숨기기(`body.clean`), 640px 이하 모바일 |
| 127–178 | HTML: `#scene`, `.brand`(+접속 인원 `#netText`), `.corner`(아이콘: 사진 찍기·메뉴 숨기기·알림판·옷장·설정), `#board`(알림판 패널), `#photoUI`·`#photoView`(사진 모드), `#entry`(닉네임 입장), `#nameTag`, `#wardrobe`, `#settings`(닉네임, 이름·채팅 보기, BGM·곡, 조작법, 저작권), `.hud`(동작 바: 폴 밖에선 앉기, 폴 위에선 내려오기·고정폴/회전폴 토글이 맨 앞 / 그 아래 표정 버튼+채팅 줄), `#uiShow`, `#loading`(로딩 화면) |
| 179–228 | three.js, renderer/scene, 공용 툰 셰이딩(`grad`, `TOON_K`, `tcol`, `toon`/`toonF`), `canvasTex()` |
| 229–496 | 하늘, 조명, 호수(`LAKE`, `inLake()`, `lakeShape()`), 잔디·꽃, 나무·덤불·언덕·구름, 데크 무대 + 실버 폴 3개(`POLES`, 앞쪽 오른편 요가 매트 6개 `MATS`·`onMat()`, `STAGE_R`, `onStage()`, `nearestPole()`, `POLE_H`, `STAGE_H`) |
| 497–590 | 소품: 징검돌, 벤치(`BENCHES`, 테이블 의자 3개도 여기 `chair:true`), 매점 위치·메뉴(`SHOP`, `SNACKS`), 간식 테이블 `TABLE`, 나무 푯말 `woodSign(글자, x, z, 회전)`('안전 폴링', 매트 뒤쪽 꽃밭의 '스트레칭존'), 징검다리 끝의 알림판·우체통(`BOARD_SPOTS`), 폴짝 매점 건물(카운터·차양·간판·메뉴판), 울타리, 바위(`OBSTACLES`), 나비 |
| 591–1041 | 캐릭터: 공용 재질(`accM` 등)·헬퍼, `chinify()`, 표정별 `drawFace()`(`EXPRS`), 이모트(`showEmote(av, kind)`), **`createAvatar(look, faceRes)`**(리그 `joint()` → `av.J[name]`, `skull`, 헤어, 팔다리, 치마, 장식), `removeAvatar(av)` |
| 1042–1097 | 옷장: `OPTIONS`, `CLOTH`, `COLORS`, `TOP_PARTS`/`BOT_PARTS`, `DEFAULT`, `dressAvatar(av)`, 내 아바타 `me`(+ 별칭 `holder`/`char`/`J`/`skull`), `applyOutfit()` |
| 1098–1227 | `POSES`(앉기 2종 + 동작 5종), `MOVE_ORDER`, `LIMBS`, `solveIK(av, …)` |
| 1228–1474 | 상태 머신(내 캐릭터 조작), 앉기(`sitDown`/`standUp`/`toggleSit`), `stepOK`, 카메라, `update(dt)`, **`animateAvatar(av, dt)`**, `hang()` |
| 1475–1607 | 입력(포인터·키보드 `DIRS`), UI(동작 바, 표정, 닉네임·이름표) |
| 1608–1836 | BGM(`MUSIC`, `unmuteIOS`), 메뉴 숨기기, 입장, 옷장 칩 |
| (봇 앞) | 매점: 직원 NPC `clerk`(`updateClerk`), 손에 든 간식(`buildSnack`, `setSnack(av, 종류)`, 한 입 `takeBite`, `sipAmount`, `showBites`, 손/테이블 `placeSnack`), 줄 서서 사기(`shopQ`, `shopState`, `shopSpot`, `goShop`, `joinLine`, `leaveShop`, `buySnack`, `updateShop`, `onShopQueue`) |
| 1872–1988 | 테스트 봇(`?bots=N`, `setBots`, `updateBot`), 성능 표시(`perfTick`), `?bench` |
| 1989–2246 | 멀티플레이: 접속·재접속(`net`, `netStart`, `netConnect`, `netRetry`), 보내기(`netTick`, `netState`, `netSend`), 다른 사람(`addRemote`, `remoteGoal` 지연 예측, `updateRemote`, `safeLook`), 채팅(`showBubble`, `chatForm`, `toast`) |
| (`toast` 뒤) | 알림판: `BOARD_URL`, `boardLoad`, `drawBoard`, `boardHeart`, `setBoard`, 안내 문구 `REQ_DONE_MSG` |
| 2247–끝 | `resize`(ResizeObserver), `frame()` 루프, `window.__poleDebug` |

줄 번호는 편집하면서 밀리니 함수명으로 grep 할 것.

## 반드시 지킬 규칙 (깨면 이미 고친 버그가 재발함)

- **툰 색은 항상 `tcol(hex)`로** 만든다. `TOON_K = 0.37` 프리다크닝 + `toneMapped:false` 없이 넣으면 햇빛에 하얗게 날아감
- **`frame()`의 dt 클램프 유지**: `dt = min(0.05, max(0, ...))`, `last = max(last, now)`. rAF 타임스탬프가 `performance.now()`보다 이를 수 있어 음수 dt → 카메라 폭주
- 머리·얼굴 구에는 **같은 `chinify()`** 적용. 턱을 별도 메시로 붙이지 말 것(툰 이음선)
- 머리·얼굴·헤어 셸은 모두 `skull` 그룹 안에 둔다(같은 스케일을 공유해야 얼굴/머리가 안 어긋남)
- 캐릭터는 `createAvatar()`로만 만든다. 아바타별 상태(`pose`, `onPole`, `faceMode`, `moveAmp`, `walkPhase`, `spinVel`, `hopAt`/`landAt`/`emoteAt`, 깜빡임)는 `av`에 두고 `animateAvatar(av, dt)`가 그린다. 내 조작 로직(`mode`, `poseName` 등 전역)은 매 프레임 `me`에 옮겨 적는다. 옷 색이 바뀌는 재질은 아바타마다 따로, 안 바뀌는 재질은 공유(`removeAvatar`가 공유 재질은 지우지 않음)
- 캐릭터 전체 `receiveShadow = false`(자기 그림자가 툰에서 회색 띠로 보임), 스커트 `castShadow = false`, 나무는 그림자 받기 끔(구 표면 줄무늬)
- InstancedMesh에 툰 재질(`tcol`이 이미 곱해진 흰색)을 쓸 땐 `setColorAt`에 **원래 색**을 넣는다. `TOON_K`를 또 곱하면 두 번 어두워짐
- 모래톱/물거품은 `depthWrite:false` + `renderOrder`(1, 2, 물 3)로 겹침. polygonOffset만으로는 먼 거리에서 물이 가려짐
- 모드 전환 시 holder를 옮길 땐 `rebase()`를 거쳐 캐릭터 월드 위치가 튀지 않게
- 폰에서 페이지 확대·축소는 막는다(viewport `user-scalable=no` + iOS `gesturestart` 막기 + 입력창 글자 16px 이상: 더 작으면 iOS가 입력할 때 확대함). 핀치는 3D 카메라 줌 전용
- 화면 크기는 resize 이벤트만 믿지 말 것: 카카오톡·인스타 인앱 브라우저는 툴바가 접힐 때 이벤트 없이 높이가 바뀌어 화면이 위아래로 찌그러짐. `ResizeObserver` + `visualViewport` + 매 프레임 크기 비교로 `resize()` 호출
- 키 입력은 물리 키(`e.code`) 기준. `e.key`만 보면 한글 입력 상태에서 WASD·숫자·Q가 'ㅈ' 등으로 들어와 무시됨. 화살표는 `preventDefault`(패널 스크롤 방지)
- 이동 시 폴 근처 차단은 "폴에 더 가까워지는 걸음"만 막는다. 내려온 직후 캐릭터가 폴 0.4m 안에 서 있어서, 거리만으로 막으면 아무 방향으로도 못 움직임
- 카메라 드래그는 캐릭터 방향을 바꾸지 않는다(`poseYaw`는 동작 선택 시에만 카메라 쪽으로 맞춤). 스핀을 끄면 그 자리에서 멈춤
- 걸어서 피해야 하는 소품은 `OBSTACLES`(`[x, z, r]`)에 넣으면 `walkable()`/`stepOK()`가 막아줌. 이동은 `stepOK()`를 써야 장애물 안(벤치에서 일어난 직후 등)에서 빠져나올 수 있음
- `.chips` 클래스는 옷장 전용(`document.querySelectorAll('.chips')`가 `data-key`로 옵션을 그림). 다른 곳의 버튼 묶음에 붙이면 스크립트가 멈춤
- 입력창에 타이핑 중일 때는 keydown 처리를 건너뜀(닉네임에 WASD·E·Q가 들어가도 캐릭터가 안 움직이게)
- 내 포즈·표정·스핀이 바뀌는 곳에서는 `netState(emote)`를 부른다(직접 `netSend`로 state를 보내지 말 것: 0.1초 묶음 전송이 서버 도배 제한을 지켜 줌). 다른 사람 아바타는 `others`에 `av.net`이 붙은 것, 봇은 `av.bot`
- 서버는 60초 넘게 메시지·ping이 없는 접속을 내보낸다(앱을 그냥 내린 사람의 유령 캐릭터 정리, [docs/GHOST_PLAYERS.md](docs/GHOST_PLAYERS.md)). 그래서 숨겨진 페이지는 재접속하지 않고(`netRetry`·`netNow`의 `document.hidden`), 화면이 보이는 동안은 25초 ping을 멈추면 안 됨
- 다른 사람에게 받은 값은 그리기 전에 검사: 옷은 `safeLook()`, 포즈는 `POSES`에 있는 것만, 이름·채팅은 `textContent`로만(innerHTML 금지)

## 플레이어 기능

- 입장 화면: 닉네임(최대 12자) 입력 후 입장. 다시 들어오면 저장된 이름이 미리 채워짐. 설정 서랍 맨 위 "닉네임"에서 변경
- 닉네임 태그: HTML 요소(`#nameTag`)를 머리 위 월드 좌표를 투영해 매 프레임 배치(`updateNameTag`). 거꾸로 매달린 포즈에서는 가장 높은 쪽 위로. "이름 표시/숨김" 토글
- 첫 방문엔 옷·헤어·색을 랜덤으로 골라 바로 저장(`pole-outfit-v2`가 없을 때만), 다시 오면 저장된 모습 그대로
- 같이 타기(최대 4명 그룹, `myGroup`=들어온 순서의 id 목록): 다른 캐릭터를 누르면 "같이 타기" → 받은 사람 수락 카드(10초, 3명 이상이 되면 "탕후루만 할 수 있어요" 안내). 둘 다 혼자면 둘 중간에서 가까운 빈 폴로 새 그룹, 한쪽이 그룹이면 혼자인 쪽이 그 그룹 폴로 합류(그룹 밖에서 그룹 사람에게 보내도 됨). 둘이면 동작 바에 눈사람·회전목마·탕후루, 3~4명이면 탕후루만. 눈사람·회전목마: 누른 사람이 위(`duo…Top`), 짝이 아래(`duo…Base`, 위 회전을 따라감). 탕후루(`duoBall`): 모두 웅크림, 들어온 순서대로 위에서부터 높이(`ballHeight`, 2명 1.0m·3명 0.8m·4명 0.6m 간격), 첫 사람 기준 90°씩 회전(내 화면 `duoTick`, 남의 화면은 state의 `ball:[자리, 인원]`으로). 스핀은 누가 켜든 모두. 한 명이 내려가면 그 사람만 빠지고 1명 남으면 끝. 미리보기 `__poleDebug.duo('stack'|'fly')`, `__poleDebug.ball(n, 회전)`
- 스트레칭: 매트를 누르거나(또는 매트 위에서 E) 그 매트로 걸어가 앉음(`goSitMat`, `sitAt`이 매트, 자세 `matSit`). 매트 위에선 동작 바가 [일어나기] 다리 찢기·스쿼트·플랭크·레그레이즈·다운독·코브라·아기자세로 바뀜(`STRETCHES`, `startStretch`, 포즈 `matSplit`(매트 길이 방향)/`matSquat`(위아래로 움직임)/`matPlank`/`matLegRaise`(다리 올렸다 내림)/`matDog`/`matCobra`(손은 IK로 매트에, 가슴을 내렸다 올림)/`matChild`). 매트 포즈는 몸 가운데가 매트 가운데에 오게 `p`의 z로 맞춤(위에서 `__poleDebug.mat(1, 자세, 0, 1.45)`로 확인). 매트 포즈는 `mat:true`로 매트 두께만큼 올려 그림. 매트는 한 명씩(`matsBy`, 서버 `mat`/`unmat`). 미리보기 `__poleDebug.mat(매트, 자세)`
- 방: 입장 화면과 설정 서랍에서 "1번~5번 호숫가" 중 고름(방별 인원 표시, 꽉 찬 방은 못 누름, 마지막 방 기억 `pole-room`)
- 접속 인원 문구: "N번 호숫가 · 폴메이트 N명과 함께 있어요!"(N은 나를 뺀 인원, 0명이면 "폴메이트를 기다리는 중이에요")
- 로딩 화면 `#loading`: 처음엔 첫 프레임이 그려지고 폰트가 올 때까지(최대 2.5초, 최소 페이지 연 뒤 1.5초) 하늘색 화면, three.js를 못 받으면 새로고침 안내. 방 입장·이동 중엔 흐린 화면에 "N번 호숫가로 이동하는 중…"(최소 0.7초, welcome·거절이 오면 닫힘, 7초 넘으면 닫고 혼자 놀기 안내)
- 화면 구성(2026-11-05): 하단은 두 줄만(위 동작 바, 아래 표정 버튼+채팅). 동작 바는 넓은 화면에선 버튼 크기만큼(최대 760px) 가운데, 채팅 줄(표정 버튼+입력창)은 넓은 화면에서 최대 560px 가운데. 640px 이하 폰에선 둘 다 가로 전체 폭(동작 버튼은 늘어나 줄을 채우고 넘치면 다음 줄로). 자주 안 바꾸는 설정은 오른쪽 위 톱니 아이콘의 설정 서랍, 옷장은 옷걸이 아이콘(둘은 같은 자리라 하나를 열면 다른 하나는 닫힘). 아이콘은 외부 에셋 없이 인라인 SVG. "지금: 동작" 상태 글자는 사용자 요청으로 없앰
- 표정: 하단 웃는 얼굴 버튼을 누르면 펼쳐지는 줄에서 자동(포즈별 `face`, 폴 위와 매트 위에서)/방긋/윙크/활짝/깜짝/헥헥 선택(`faceMode`). 고르면 해당 이모트가 뜸. 헥헥(`pant`)은 > < 눈·혀 내민 입·관자놀이 땀방울에 숨을 빠르게 쉬고, 이모트는 땀방울(`sweat`)
- 앉기(E 또는 "앉기" 버튼): 벤치 2.2m 안이면 벤치로 걸어가 앉고, 아니면 그 자리 바닥에. 걷는 중에 누르면 도착 지점에서 앉음. 벤치를 클릭해도 앉으러 감. 움직이면 일어남(`sitAt`, `sitQueued`, 포즈 `sitGround`/`sitBench`)
- 사진 찍기(오른쪽 위 카메라 아이콘, 예전 "전체 보기" 자리): `body.photo`가 메뉴·아이콘을 다 숨기고(이름표·말풍선은 설정대로 남음) 카메라를 내 캐릭터 가까이(`camDist` 2.3). 드래그·핀치로 구도, 땅 클릭으로는 안 걸어감, ✕나 Esc로 나감. 셔터: 하얀 반짝 + 코드로 만든 찰칵 소리 → `takePhoto()`가 3D 화면을 그린 직후 복사하고 HTML 이름표·말풍선을 화면 위치대로 덧그리고 오른쪽 아래 워터마크 "폴크닉 @yujamong.pole"(인스타 계정: 사진은 주로 인스타에 올라가고 거기선 주소가 안 눌림). 미리보기에서 [저장]: 폰은 공유 창(사진첩 저장, 웹은 사진첩에 직접 못 씀), 그 외는 다운로드, 인앱 브라우저는 "길게 눌러 저장" 안내
- 메뉴 숨기기(사진·영상용): 오른쪽 위 눈 가림 아이콘 또는 H. `body.clean`이 상·하단 UI를 숨기고, 오른쪽 위 "메뉴 보기" 버튼만 2.5초 뒤 투명해짐(마우스·터치·키 입력 시 다시 보임). 이름표는 별도 토글 그대로
- BGM: 코드로 합성하는 2곡(`MUSIC.TRACKS`: 오르골 소풍 / 노을 로파이. 우쿨렐레 왈츠는 사용자 선호로 뺌). 입장 시 시작(브라우저 자동재생 정책 때문에 클릭 후에만 소리 가능), "♪ BGM 켜짐/꺼짐" 버튼·M 키로 토글, 곡 이름 버튼으로 다음 곡. 탭이 숨겨지면 일시정지
  - 아이폰은 무음 스위치가 켜져 있으면 Web Audio를 막음 → `unmuteIOS()`가 `navigator.audioSession.type = 'playback'`(iOS 17+)과 무음 `<audio>` 루프(구버전)로 재생 모드로 바꿈. 반드시 탭/클릭 핸들러 안에서 호출
- 분석: GA4(코드 수정 시 맞출 값·이벤트 목록은 [docs/analytics.md](docs/analytics.md)). `<head>`의 `window.GA_ID`에 측정 ID를 넣으면 켜짐(비어 있으면 아무것도 안 보냄, localhost는 집계 제외). 이벤트는 `polkTrack(name, params)`로: `enter_game`, `pose_start{pose}`, `sit{spot}`(spot에 chair 추가), `face_change{face}`, `outfit_change{slot,value}`, `bgm_toggle{on}`, `bgm_track{track}`, `photo_mode{on}`(메뉴 숨기기), `camera_mode`, `photo_take`, `photo_save{how}`, `chat_send`, `snack_buy{item}`, `snack_finish{item}`, `board_open{from}`(icon/board/mailbox), `board_post{kind}`, `board_heart`, `board_delete{kind}`. 닉네임·채팅 내용은 보내지 않음. 탭을 숨겼다가 돌아왔을 때 마지막 이벤트 뒤로 `SESSION_TIMEOUT_MS`(30분, GA4 세션 제한 시간과 맞출 것)가 지났으면 `page_view{return_visit:true}`를 보냄(안 보내면 다음 게임 이벤트가 출처 없는 "(not set)" 세션이 됨. 주소창 UTM은 그대로 둬서 같은 링크로 다시 잡힘)
- 간식 매점('폴짝 매점', 서쪽 벤치 왼쪽): 매점이나 직원을 누르거나 매점 근처에서 E → 줄 끝으로 걸어가 줄 섬(서버 `shop`, 줄 자리 `shopSpot(i)`: 0이 카운터 앞 `SHOP.front`, 뒤로 0.75m씩). **카운터는 한 명씩**: 맨 앞이 고르고 직원이 2.5초(`SHOP_MAKE`) 만들어 건넬 때까지 뒷사람은 `#shopMenu`에 "앞에 N명" 대기 안내, 앞사람이 받으면(`unshop`) 한 칸씩 앞으로 걸어감. 맨 앞이 되면 메뉴(카메라는 매점이 보이게 돌림). 25초(`SHOP_IDLE`) 안 고르면 줄에서 나감. 줄에서 멀어지거나 다른 곳 클릭·폴·앉기·✕·Esc면 나감. 혼자(서버 없음)면 줄은 나뿐. 메뉴(`SNACKS`): 아메리카노·단백질 쉐이크(초코)·이온음료·닭가슴살·탕후루, 전부 무료. 받으면 직원 말풍선 + 오른손에 간식(`av.snack`, 팔은 `animateAvatar`가 앞으로 듦). 저절로 먹지 않고, 간식을 들고 있는 동안 동작 바 앉기 옆에 "(아이콘) 한 입" 버튼(`#biteBtn`). 누를 때마다 손을 입으로 가져가 한 입(1.1초 `BITE_T`, 그동안 표정 joy, 도중에 또 누르면 무시). 탕후루는 알 3개가 위에서부터 하나씩 없어지고 닭가슴살은 1→0.75→0.5로 작아짐(음료는 그대로). 3입(`SNACK_BITES`)이면 버튼이 바로 사라지고 동작이 끝나면 간식도 사라지며 하트 + 배불러서 2.5초 활짝 표정(`av.fullAt`, 표정 설정보다 우선) 후 원래 표정. 폴에 오르거나 매트에 앉으면 내려놓음(먹던 것도 없어짐, 남의 화면에서도 폴·매트 위에선 숨김). 다른 사람에겐 `state`의 `bite`(몇 입)로 전해져 같은 동작이 보임.
- 간식 테이블(매점 오른쪽 앞 `TABLE`, 둥근 테이블 + 의자 3개): 의자는 `BENCHES`에 `chair:true`로 들어가 벤치처럼 앉음(같은 `sitBench` 포즈, 의자 뒤 `front:-0.62`로 걸어와 앉고 일어나면 의자 뒤에 섬). 테이블을 누르면 가장 가까운 의자로, E는 가장 가까운 자리로. 간식을 든 채 의자에 앉으면 간식이 내 앞 테이블 위(`chair.food`)에 놓이고, "한 입"을 누르면 집어서 먹고 다시 내려놓음(`animateAvatar`가 sitBench + 의자 0.2m 안이면 판단해서 남의 화면에서도 똑같이). 의자 잠금은 없음(벤치와 같음). 미리보기 `__poleDebug.table(의자, 간식, yaw, pitch, dist)` 매점에서 멀어지면 메뉴 닫힘. 메뉴를 바꾸면 서버 `SNACKS`도 같이. 직원은 근처에 오면 6초마다 이모트. 미리보기 `__poleDebug.shop(yaw, pitch, dist, 거리)`, `__poleDebug.snack(종류, 먹은 입 수)`
- 채팅(서버 연결 중일 때만): HUD 입력창, Enter로 포커스, 60자·1초 1개. 머리 위 말풍선 8초(`CHAT_SHOW`, `showBubble`), 동작 바 아래 채팅 기록(`chatLog`, 최근 20줄만 화면에만, 누르면 크게 펼침, 입장·퇴장 알림 포함, 새로고침·방 이동 시 비움), "채팅 보기/숨김" 토글. 금칙어·링크는 서버가 거절하고 보낸 사람에게만 토스트(`toast`). 금칙어 목록은 [server/src/words.js](server/src/words.js)(닉네임도 검사). 신고·숨기기·강퇴는 아직 없음
- 알림판(오른쪽 위 핀 아이콘, 또는 징검다리 길 끝 뒤편의 코르크 알림판·분홍 우체통을 누르거나 근처에서 E: 알림판은 방명록, 우체통은 '운영자에게' 탭으로 `setBoard(true, tab)`, [docs/BOARD.md](docs/BOARD.md)): 방명록(40자, 색은 글 번호로)·기술 요청(이름 20자, 같은 이름은 합쳐서 하트 +1, 하트는 접속당 글마다 1회)은 공개 포스트잇(이번 접속에 내가 붙인 글은 ✕로 지움, `boardMine`), 운영자에게(문의/제안 200자, 연락처 선택)는 비공개. 저장은 D1(`env.DB`), 슬랙 알림, 운영자 페이지 `/admin`(`ADMIN_KEY`, 공개 글 내리기·완전 삭제). 연락처는 슬랙에 보내지 않고 처리 완료 또는 90일 뒤 지움(cron `boardCleanup`). 신고 기능은 넣지 않음
- localStorage 키: `pole-board-id`, `pole-board-seen`, `pole-outfit-v2`(옷), `pole-name`, `pole-name-show`, `pole-face`, `pole-bgm`, `pole-bgm-track`, `pole-chat-show`, `pole-room`

## 좌표·포즈 규약

- 캐릭터 정면 +Z, 왼쪽 +X. 팔다리는 -Y로 뻗음. 관절 **x 회전 음수 = 앞**, 양수 = 뒤
- 폴은 `POLES`(호숫가 잔디에 무대 3개, 개수는 서버 `POLES`와 맞출 것). 앞쪽 오른편엔 요가 매트 6개(앞뒤 두 줄 × 3, `MATS`, `MAT_SPOTS`). 내가 탄/가는 폴은 `myPole`. 동작 버튼은 가장 가까운 빈 폴(`freePole`), 폴(바닥 근처)을 클릭하면 그 폴로. 잠금은 `netTick`이 `mode`를 보고 `pole{i}`/`unpole`을 한곳에서 보냄(서버가 거절하면 `losePole`). 남이 잡은 폴 위에 "사용 중" 표시
- 포즈 좌표는 폴 프레임(내가 탄 폴 = Y축, 원점), 높이는 데크 윗면 기준(스테이지 위면 `STAGE_H` 0.06이 자동으로 더해짐)
- 치수(m): 키 약 1.06, 머리 반지름 `HEAD_R` 0.22(중심은 head 관절 위 `HEAD_Y` 0.2), 서 있을 때 루트 `STAND_Y` 0.367, 폴 힐 +0.022, 폴 높이 `POLE_H` 3.0
- 머리가 커서 포즈마다 머리 중심이 폴 축에서 약 0.24m 이상 떨어져야 안 뚫림. `__poleDebug.ik()`의 `headGap`이 0보다 커야 함
- 포즈 형식: `{ label, view, p:[x,y,z], up/fwd 또는 r, j:{joint:[x,y,z]}, ik:{limb:{t, h}} }`
  - IK 걸린 팔다리는 FK 블렌딩에서 제외(`ikSkip`). `LIMBS`: 팔 0.13/0.152(손 중심까지), 다리 0.14/0.135
- 블렌딩은 `1 - exp(-rate*dt)` (폴 4, 자유이동 10, IK 9)
- 상태: `roam → approach → pole → (requestLeave) ready 1.3s → doLeave → roam`
- 포즈 옵션 `face`(open/wink/joy/wow, 눈 깜빡임은 open·wow일 때만)와 `emote`(heart/note/wow/sparkle). 폴 진입 시 폴짝(`hopAt`), 내려올 때 착지 찌그러짐(`landAt`)은 `holder.position.y`와 `char.scale`로 처리
- 동작: 체어 · P포즈(`ppose`, 피겨헤드를 대체) · 헤라 · 브라스 · 스플릿(`split`, 아이샤를 대체). 버튼으로만 고름(숫자키 단축키와 버튼 아래 작은 설명은 2026-11-05 사용자 요청으로 없앰). `ready`/`stand`는 버튼 없음
  - P포즈·스플릿은 사용자가 준 사진을 보고 "귀엽게 따라 하기" 수준으로 맞춤. 다리가 짧아 스플릿 폭은 작음

## 검증 방법

포즈·외형을 바꾸면 반드시 렌더링해서 눈으로 확인한다(코드만 보고 "됐다"고 하지 말 것).

테스트가 이상하게 나오면 같은 무거운 테스트를 반복하지 말고 이 순서로 한다(2026-11-06, 4인 헤드리스 테스트를 반복하다 원인이 맥 부하였던 일 이후 정한 규칙):
1. **가벼운 재현부터**: 2인 문제는 Browser pane 탭 2개(앞에 있는 탭만 rAF가 돎, 루프가 중요한 쪽을 앞으로), 서버 문제는 `server/test/smoke.mjs`. 헤드리스 여러 개는 마지막 확인용
2. **첫 실행부터 내부 상태 기록**: 결과와 함께 mode·pose·타이머(`clock - poseStart`)·대기 플래그·초당 프레임(`__poleDebug.fps()`)을 찍어, 한 번의 실패로 코드 문제인지 환경 문제인지 가른다
3. **무거운 테스트 전 환경 점검**: `uptime` 로드 평균, 남은 테스트 프로세스(`ps`, 5199 포트). 부하가 높으면 가벼운 방법으로
4. **타임박스**: 같은 재현이 2번 실패하거나 10분이 넘으면 멈추고, 아는 것·가설·다음 방법을 사용자에게 알린 뒤 방법을 바꾼다
5. **시간에 덜 휘둘리게**: 로직 확인은 실제 프레임을 기다리지 말고 `__poleDebug.step(초)`로 시뮬레이션을 직접 진행

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
  - `__poleDebug.net()` 접속 상태와 받은 다른 사람 목록(위치·포즈·표정·옷). 로컬 멀티 확인은 launch.json의 `server` + `static`을 띄우고 탭 두 개로 입장
  - `__poleDebug.step(초, dt)` 화면 갱신을 기다리지 않고 게임 시간을 직접 진행(기본 dt 1/30, 끝나면 한 번 그림). 반환값은 mode·pose·타이머 등 상태. 컴퓨터가 느려도 결과가 같음
  - `await __poleDebug.fps(ms)` 그 페이지의 실제 초당 프레임(rAF). 테스트 결과가 이상하면 먼저 이것부터
  - `__poleDebug.bots(n)` 또는 주소에 `?bots=N`(최대 30): 돌아다니는 봇 N명 + 위쪽에 fps·draw call 표시. 폰에서 방 정원 측정용
  - 주소에 `?bench`: 봇을 0→49명으로 늘리며 단계마다 fps(평균/느릴 때)·draw call을 재고 표로 보여 줌(결과 복사 가능). 카메라를 멀리 빼서 전원이 화면에 보이는 최악의 경우를 잼. 폰에서는 `.claude/launch.json`의 `lan`(0.0.0.0:5174)으로 띄우고 같은 와이파이에서 `http://맥IP:5174/index.html?bench`
  - 프로덕션에선 개발 모드 한정으로 노출하는 방향

## 알려진 한계

스키닝 아닌 도형 조합 캐릭터(큰 꺾임에서 이음매, 옷 밀착 안 됨) · 다리 감기는 FK 근사 · 팔이 짧아 일부 IK 목표에 못 닿음(포즈마다 `__poleDebug.ik()`로 확인) · 동작 전환 애니메이션 없음 · 모바일 성능 옵션 없음 · 캐릭터 메쉬가 많아 여러 명을 그리기엔 무거움(멀티플레이 전 최적화 필요)

## 로드맵 (우선순위 순)

1. 멀티플레이 1단계: ~~아바타 분리 + 봇 테스트로 방 정원 측정~~(완료, 방 20명) → Cloudflare DO 무료 플랜으로 지인 테스트([docs/MULTIPLAYER.md](docs/MULTIPLAYER.md))
2. ~~폴 여러 개 + 잠금, 방 나누기~~(2026-11-05: 폴 5개, 방 1~5 고르기). 벤치 자리 잠금은 아직
3. 채팅(머리 위 말풍선, 본문 비저장, 신고된 것만 저장)
4. 성능: 캐릭터 메쉬 합치기·LOD, 풀/그림자/픽셀비율 자동 하향
5. 동작 전환 애니메이션, 다리 접촉점 IK
6. 필요해지면 Vite 프로젝트화 + three.js 최신화(r128 전용 API 교체, 분리 전후 포즈 스크린샷 비교)
7. 홍보 시 UTM 링크([docs/marketing/utm-guide.md](docs/marketing/utm-guide.md))

HANDOFF.md 로드맵 중 "VRoid VRM으로 캐릭터 교체"는 치비 스타일 결정으로 보류.
