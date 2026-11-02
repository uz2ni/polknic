# 야외 폴 연습장 — Claude Code 인계 문서

브라우저에서 동작하는 3D 폴댄스 연습 공간 프로토타입. 서버 없이 혼자 접속해서 쓰는 단계까지 완성되어 있음.
현재 결과물은 단일 파일 `online-poledance.html` (같이 전달). 이 문서는 그 파일의 구조, 설계 결정, 알려진 한계, 다음 작업을 정리한 것.

---

## 1. 목표와 범위

- 레퍼런스: 온라인 산사(sansatemple.com) 같은 "링크로 들어와 머무는" 웹 3D 공간
- 배경: 하늘 + 호수/강가 + 잔디 + 숲 + 먼 산 (사용자가 준 야외 폴 사진 분위기)
- 폴 1개, 1인 전용 (멀티플레이 없음)
- 애니 스타일 3D 캐릭터, 옷 갈아입기 가능
- 폴 기술 5개만: **체어(스플릿 그립), 피겨헤드, 헤라, 브라스, 아이샤**
- 사용자 주력 스택: Java / Spring Boot. 나중에 멀티플레이 붙일 때 백엔드는 Spring WebSocket 예정

## 2. 기술 스택 / 제약

- three.js **r128** UMD (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`), 전역 `THREE`
  - r128 기준 API 사용 중: `LuminanceFormat`, `outputEncoding = sRGBEncoding`, `convertSRGBToLinear()`, `PMREMGenerator.fromScene`
  - CapsuleGeometry 없음(r139+). 버전 올리면 위 API들 교체 필요
- 빌드 도구 없음. HTML 한 파일에 CSS/JS 인라인
- 외부 에셋(모델·텍스처·음원) 없음. 전부 코드로 생성 (저작권 이슈 회피 목적)
- 폰트: Google Fonts `Nanum Myeongjo`(타이틀), `IBM Plex Sans KR`(본문)
- 현재 claude.ai Artifact로 배포 중. Artifact 환경 제약: CDN 화이트리스트(cdnjs, jsdelivr, unpkg), 외부 fetch 불가. 자체 호스팅으로 옮기면 이 제약은 사라짐

## 3. 파일 구조 (`online-poledance.html` 위에서 아래 순서)

| 블록 | 내용 |
|---|---|
| `<style>` | 풀스크린 캔버스 + 유리 패널 UI(옷장 오른쪽, 동작 바 아래). 모바일 640px 이하 대응 |
| HTML | `#scene`(캔버스), `.brand`(타이틀), `#wardrobe`(옷장), `.hud`(상태·토글·동작 버튼) |
| renderer / scene | ACES 톤매핑, PCFSoft 그림자, Fog |
| sky | 그라디언트 ShaderMaterial 구 + 같은 하늘로 PMREM 환경맵 생성(크롬 폴 반사용) |
| lights | Hemisphere + Directional(태양, 그림자 범위 ±11m) |
| lake | `LAKE {x:0, z:-21, rx:38, rz:13}` 물결 타원. `inLake(x,z,margin)`로 판정. 물은 커스텀 셰이더(프레넬, 하늘 반사, 맞은편 숲 반사 흉내, 태양 스펙큘러) |
| ground / reeds / grass / flowers | 버텍스 컬러 바닥, InstancedMesh 갈대(호숫가)·풀 9000개·꽃 |
| trees / hills / mountains / clouds | 로우폴리 나무(가까운 것만 그림자), 원뿔 변형 산, 구 묶음 구름(천천히 이동) |
| stage + pole | 원형 스테이지(r 1.4m), 크롬 폴(r 0.0225m, 높이 3.75m) 원점에 위치 |
| CHARACTER | 아래 4장 |
| outfit | 아래 5장 |
| POSES / IK | 아래 6장 |
| state / update | 아래 7장 |
| input / UI / loop | 포인터(드래그 회전, 클릭 이동, 핀치·휠 줌), 키보드, 옷장 칩/스와치 생성 |
| `window.__poleDebug` | 테스트용 훅 (9장) |

## 4. 캐릭터

### 리그 (Group 계층, 스키닝 아님)
```
holder (월드 위치/회전. 자유이동 땐 캐릭터 발밑, 폴에선 폴 원점)
 └ char (골반 = 루트)
    ├ spine ─ chest ─ neck ─ head ─ (hairBase, long, tail, bun)
    │           ├ lUp ─ lFore ─ lHand
    │           └ rUp ─ rFore ─ rHand
    ├ lThigh ─ lShin ─ lFoot
    ├ rThigh ─ rShin ─ rFoot
    └ skirt (피벗)
```
- 관절 이름 → `J[name]`
- 치수(m): 허벅지 0.43, 정강이 0.42, 위팔 0.27, 아래팔 0.24(+손, IK 유효길이 0.285). 서 있을 때 루트 y = 0.958. 키 약 1.66m, 머리 스케일 1.1(약 7등신, 성인 체형)
- 관절 각도 규약: 팔다리는 -Y 방향으로 뻗음. **x 회전 음수 = 앞으로**, 양수 = 뒤로. 캐릭터 정면 +Z, 왼쪽 +X

### 형태
- 몸통·팔다리: `LatheGeometry` 회전체(`PELVIS`, `ABD`, `CHEST`, `UPPER`, `FORE`, `THIGH`, `SHIN` 프로파일 배열). 관절 이음매는 구로 덮음
- 머리: 구 하나를 `chinify()`로 아래쪽만 좁혀 애니풍 턱 생성(이음매 없음)
- 얼굴: 머리 앞쪽 부분구(`faceMesh`)에 캔버스 텍스처. `drawFace(canvas, open, eyeColor, hairColor)`가 눈(흰자/홍채 그라디언트/동공/하이라이트/속눈썹), 눈썹, 코 음영, 입, 볼 터치를 그림. 뜬 눈/감은 눈 텍스처 2장을 바꿔서 깜빡임
  - 같은 `chinify()`를 얼굴 구에도 적용해야 얼굴이 머리에서 안 뜸
- 헤어: 캡 + 뒷머리 셸 + 앞머리 9가닥 + 옆머리 2가닥 + 스타일 피스(로우 번 / 긴 생머리 11가닥 / 하이 포니테일). 가닥은 `strandGeo(len, w, thick)`(납작한 원뿔)
- 재질: 전부 `MeshToonMaterial` + 4단계 그라디언트맵, `toneMapped:false`, `DoubleSide`
  - **`TOON_K = 0.37`**: 툰 색을 미리 어둡게 곱해둠. 안 하면 햇빛(2.3)+반구광 때문에 하얗게 날아감. 색 바꿀 때 반드시 `tcol(hex)` 사용

## 5. 옷장

- 옷은 몸 위에 겹친 별도 메시. `piece(key, mesh, parent)`로 등록 → `P[key]` 목록
- `applyOutfit()`가 `TOP_PARTS` / `BOT_PARTS` 조합에 따라 `visible` 토글, 색·레이스 텍스처 적용, 얼굴 텍스처 재생성, localStorage(`pole-outfit-v2`) 저장

| 슬롯 | 옵션 |
|---|---|
| 상의 | 레이스 크롭(캡 소매) / 스포츠 브라(끈) / 홀터 비키니(목 끈) / 레오타드 |
| 하의 | 레이스 스커트 / 하이웨이스트 쇼츠 / 비키니 브리프 / 롱스커트 |
| 신발 | 맨발 / 폴 힐(서 있을 때 루트 0.075 올림) |
| 헤어 | 로우 번 / 긴 생머리 / 하이 포니테일 + 색 7종 |
| 눈동자 | 5색 |
| 피부 | 5톤 |

- 기본값: 아이보리 레이스 크롭 + 레이스 스커트, 맨발, 로우 번
- 레이스 무늬는 캔버스로 생성한 반복 텍스처(`laceTex`)
- 스커트·긴머리·포니테일은 `hang()`으로 매 프레임 월드 아래 방향을 향하게 회전 → 인버트 동작에서 자연스럽게 늘어짐. 스커트는 그림자 캐스트 끔(다리에 검은 띠 생기는 문제 때문)

## 6. 동작(POSES)과 IK

### 포즈 정의 형식
```js
name: {
  label, key, sub,          // 버튼 표시, 숫자키
  view,                     // 카메라가 볼 방향(포즈 프레임 기준 각도). 동작 시작 시 holder가 이쪽으로 천천히 회전
  p: [x,y,z],               // 골반 위치, 폴 프레임(폴 = Y축, 원점)
  up: [..], fwd: [..],      // 골반→머리 방향, 가슴이 향하는 방향 (또는 r: 오일러)
  j: { joint: [x,y,z] },    // 로컬 오일러(XYZ)
  ik: { rArm: { t:[x,y,z], h:[x,y,z] } }  // 손/발 목표점(폴 프레임), h = 팔꿈치/무릎이 향할 방향
}
```
- 루트 쿼터니언은 로드 시 `up/fwd` 직교 기저로 미리 계산(`p.q`)
- IK가 걸린 팔다리 관절은 FK 블렌딩에서 제외(`ikSkip`)

### 현재 동작
| 키 | 이름 | 요지 | IK |
|---|---|---|---|
| 1 | 체어 (스플릿 그립) | 폴이 오른쪽, 위 손 높게 / 아래 손 골반 옆, 왼무릎 들고 오른다리 뒤로 접음 | 양손 |
| 2 | 피겨헤드 | 왼무릎 오금으로 폴 걸고 오른발로 폴 지지, 상체 뒤로 젖히고 양팔 날개 | 오른발 |
| 3 | 헤라 | 폴을 등 뒤에 두고 위 손 머리 뒤로 높게, 다리 폴 따라 길게, 왼손 얼굴 앞 | 오른손, 양발 |
| 4 | 브라스 | 거꾸로, 무릎으로 폴 걸고 한 손 로우 그립, 반대 팔 자유 | 오른손 |
| 5 | 아이샤 | 거꾸로 양손 스플릿 그립, 골반을 폴에서 띄우고 다리 앞뒤 스플릿 | 양손 |
| - | ready | 폴 앞에 서서 오른손으로 폴 잡기. 진입/이탈 경유용(버튼 없음) | 오른손 |

- 1번 기술은 사용자가 이름을 몰라서 "스플릿 그립 체어"로 붙임. 이름 확인 필요
- 아이샤는 사진이 없어서 일반적인 형태로 만듦. 사진 받으면 수정 필요
- 모든 포즈는 헤드리스 크롬으로 렌더링해서 눈으로 확인함

### IK
- `solveIK(limb, spec, k)`: 해석적 2본 IK. 코사인 법칙으로 팔꿈치/무릎 위치 계산 → `boneQuat()`로 뼈 방향 기저 생성 → 부모 기준 로컬 쿼터니언으로 slerp
- `LIMBS`: `lArm/rArm`(L1 0.27, L2 0.285), `lLeg/rLeg`(0.43, 0.42). 팔은 굽힘 방향 부호가 반대(`arm:true`)
- 목표점이 holder 로컬이라 폴 스핀 중에도 손이 폴에 붙어 있음

## 7. 상태 머신 (`update(dt)`)

```
roam ──(동작 버튼/숫자키)──▶ approach ──(폴 0.34m 지점 도착)──▶ pole
  ▲                                                          │
  └──── doLeave() ◀── ready 포즈 1.3초 유지 ◀── requestLeave()┘
```
- `rebase(pos, rotY)`: holder를 옮겨도 캐릭터 월드 위치/회전이 안 튀게 로컬 좌표를 다시 계산. 모드 전환 시 사용
- roam: 클릭 지점/WASD(카메라 기준)로 걷기, 걷기 애니메이션(허벅지·팔 스윙, 바운스). 이동 가능 영역 `walkable()` = 반경 8.5m, 호수 제외
- pole: 동작별 `view`로 holder 회전 정렬. "스핀 폴" 토글 켜면 계속 회전(-0.65 rad/s)
- 블렌딩: 루트·관절 모두 `1 - exp(-rate*dt)` 지수 보간(폴 모드 4, 자유이동 10, IK 9)
- 카메라: 캐릭터 골반 추적 오빗. 드래그 회전, 휠/핀치 줌(1.4–14m), "전체 보기" 토글

## 8. 해결한 버그 (재발 주의)

1. **rAF 타임스탬프가 `performance.now()`보다 이를 수 있음** → dt 음수 → 보간 계수 음수 → 카메라가 수십만 단위로 튐. `dt = max(0, ...)`, `last = max(last, now)`로 고정
2. 툰 재질 하얗게 날아감 → `TOON_K` 프리다크닝 + `toneMapped:false`
3. 턱을 별도 구로 붙였을 때 툰 셰이딩에서 이음선 보임 → `chinify()` 단일 메시로 변경
4. 머리에 그림자 받기 켜면 얼굴에 줄무늬 → 머리 메시 `receiveShadow = false`
5. 피겨헤드 머리 회전 부호 반대로 넣으면 얼굴이 카메라 반대로 감 → 현재 값(+y) 유지

## 9. 테스트 방법

헤드리스 크롬 + Playwright로 각 포즈 스크린샷 확인함.

```bash
# three r128을 로컬로 받고, CDN 주소를 로컬 경로로 바꾼 테스트 사본 생성
npm pack three@0.128.0 && tar xzf three-0.128.0.tgz
sed 's#https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js#package/build/three.min.js#' online-poledance.html > test.html
# doctype/html/body로 감싸고 UI 숨기는 CSS(.hud,#wardrobe,.brand{display:none}) 추가 후 렌더
```
- Chrome 실행 인자: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`
- 디버그 훅:
  - `__poleDebug.pose(name, yaw, pitch, dist)` — 해당 포즈로 즉시 진입 후 4초 시뮬레이션
  - `__poleDebug.look(yaw, pitch, dist)` — 카메라만 이동
  - `__poleDebug.pause(true)` + `__poleDebug.face(0.38)` — 루프 멈추고 얼굴 클로즈업
  - `__poleDebug.state()` — 카메라/캐릭터/모드 상태 JSON
- 배포 전 훅을 남길지 결정 필요(무해하지만 프로덕션에선 제거 권장)

## 10. 알려진 한계

- 캐릭터가 스키닝 메시가 아니라 도형 조합 → 관절이 크게 꺾이면 이음매 보임, 옷이 몸에 딱 붙지 않음
- 다리가 폴을 "감는" 접촉은 IK가 아니라 FK 각도로 근사(피겨헤드 왼무릎, 브라스 양무릎)
- 동작 간 전환은 포즈 보간뿐(오르기/내려오기 애니메이션 없음)
- 손가락 표현 없음(손 = 타원체 3개)
- 성능: 모바일에서 풀 9000개 + 그림자 2048이 무거울 수 있음. 저사양 옵션 미구현
- 소리 없음

## 11. 다음 작업 제안 (우선순위 순)

1. **파일 분리 + Vite 프로젝트화**: `scene/`, `character/`, `poses/`, `ui/` 모듈로 나누기. three.js 최신 버전으로 올리면서 r128 전용 API 교체
2. **진짜 캐릭터 모델로 교체**
   - VRoid Studio로 만든 VRM + `@pixiv/three-vrm` (애니 스타일 유지, SpringBone으로 머리/스커트 흔들림)
   - 현재 `POSES.j` 관절 이름을 VRM 휴머노이드 본(`hips, spine, chest, neck, head, leftUpperArm, leftLowerArm, leftUpperLeg ...`)에 매핑
   - `solveIK`는 본 길이만 모델에서 읽어오면 그대로 재사용 가능
3. **옷 갈아입기를 스키닝 기반으로**: 옷 GLB를 같은 스켈레톤에 재바인딩(본 이름 매칭), 슬롯당 1개, 옷이 덮는 몸 부위는 숨김
4. **다리 IK 확장**: 무릎 오금/허벅지 안쪽을 폴에 붙이는 "접촉점 IK"(무릎 목표 + 정강이 굽힘각)
5. **동작 전환 애니메이션**: 클라임 → 포즈, 포즈 → 슬라이드 다운. 장기적으로는 Blender 키프레임 GLB를 `AnimationMixer`로 재생
6. **성능 옵션**: 풀 개수/그림자 해상도/픽셀비율 자동 하향
7. **멀티플레이(나중)**: Spring Boot `TextWebSocketHandler` 방 서버. 메시지 `join / pose{name} / move{x,z} / leave`, 방당 정원, 좌표·메시지 크기·전송 빈도 검증. 포즈는 이름만 보내고 각 브라우저가 로컬에서 재생
8. **배포**: 정적 파일은 Cloudflare Pages 또는 S3+CloudFront

## 12. Claude Code에 줄 첫 지시 예시

```
HANDOFF.md와 online-poledance.html을 읽고, 동작은 그대로 유지한 채
Vite + three.js 최신 버전 프로젝트로 모듈 분리해줘.
- r128 전용 API(LuminanceFormat, outputEncoding, convertSRGBToLinear 등)는 최신 API로 교체
- 분리 후 헤드리스 크롬으로 5개 포즈 스크린샷을 찍어 이전 버전과 비교
- __poleDebug는 개발 모드에서만 노출
```
