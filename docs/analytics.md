# 분석 (GA4 + 서버 집계)

코드를 고칠 때 GA4 쪽과 같이 맞춰야 하는 것, 그리고 서버가 슬랙으로 보내는 집계의 정의를 적는다.

## 설정 위치

- 측정 ID `G-P6T4ZLNN91`, [index.html](../index.html) `<head>`의 `window.GA_ID`
- gtag 로더도 같은 `<script>` 블록에 있다. 스크립트 로드와 `gtag('config')`는 한 번씩만 한다. localhost·127.0.0.1·`.local`·`file:`에서는 아무것도 보내지 않는다
- 이벤트는 `polkTrack(name, params)`로 보낸다. `gtag`를 직접 부르지 말 것(마지막 전송 시각 기록이 `window.gtag`에서 이뤄짐)

## GA4와 맞춰야 하는 값

| 코드 | GA4 | 바꾸면 |
|---|---|---|
| `SESSION_TIMEOUT_MS` = 30분 | 관리 > 데이터 스트림 > 태그 설정 > 세션 제한 시간(30분) | 둘을 같은 값으로 |
| 서버 `VISIT_GAP_SEC` = 30분 ([server/src/index.js](../server/src/index.js)) | 같은 세션 제한 시간 | 셋 다 같은 값으로(아래 "서버 집계") |
| `return_visit` 파라미터 | 맞춤 측정기준 "재방문 여부"(이벤트 범위) | GA4 맞춤 측정기준도 수정 |

재방문 page_view: 탭이 다시 보일 때 마지막 이벤트 뒤로 `SESSION_TIMEOUT_MS`가 지났으면 `page_view {return_visit:true}`를 보낸다. 이게 없으면 다음 게임 이벤트가 `session_start`·출처 없는 "(not set)" 세션이 된다. 주소창 UTM은 지우지 않는다(새 세션도 처음 유입 경로로 잡히게).

## 커스텀 이벤트

| 이벤트 | 파라미터 | 언제 |
|---|---|---|
| `enter_game` | `returning`(저장된 닉네임이 있었는지) | 입장 화면에서 입장 |
| `pose_start` | `pose` | 폴 동작 버튼(체어·P포즈·헤라·브라스·스플릿) |
| `duo_start` | `kind`(stack 눈사람·fly 회전목마·ball 탕후루), `n`(인원) | 같이 타기 동작 시작 |
| `stretch` | `pose` | 매트 위 스트레칭 동작 |
| `sit` | `spot`(ground/bench/mat/chair) | 앉기 (chair는 간식 테이블 의자) |
| `face_change` | `face` | 표정 고르기 |
| `outfit_change` | `slot`, `value` | 옷장에서 옷·헤어·색 고르기 |
| `bgm_toggle` | `on` | BGM 켜기/끄기 |
| `bgm_track` | `track` | 곡 바꾸기 |
| `photo_mode` | `on` | 메뉴 숨기기 켜기/끄기 (이름은 예전 그대로) |
| `camera_mode` | `on`(true) | 사진 찍기 모드 들어감 |
| `photo_take` | 없음 | 셔터 |
| `photo_save` | `how`(share/download) | 사진 저장 |
| `chat_send` | 없음 | 채팅 보냄 (내용은 안 보냄) |
| `snack_buy` | `item`(coffee/shake/ion/chicken/tanghulu) | 매점에서 간식 주문(맨 앞 차례에서 고른 순간) |
| `snack_finish` | `item` | "한 입"을 눌러 간식을 다 먹음(마지막 한 입) |
| `gesture` | `kind`(clap/wave/poke/light) | 박수·인사 버튼, 다른 사람 메뉴의 콕 찌르기, 폰 라이트 켜기(light, 켤 때만) |
| `board_open` | `from`(icon/board/mailbox) | 게시판 열기. 오른쪽 위 아이콘, 호숫가의 게시판(방명록 탭), 우체통(운영자에게 탭) 중 어디서 열었는지 |
| `board_post` | `kind`(guest/req/ask/idea) | 방명록·기술 요청·문의·제안 보냄 (내용은 안 보냄) |
| `board_heart` | 없음 | 기술 요청에 하트 |
| `board_delete` | `kind`(guest/req) | 이번 접속에 붙인 내 글 지우기 |
| `donate_click` | 없음 | "응원하기" 버튼(카메라 아이콘 왼쪽, 좁은 화면은 로고 아래. 크티 후원 페이지 새 탭) |
| `page_view` | `return_visit`(true) | 위 재방문 page_view |
| `app_install` | 없음 | 홈 화면 앱 설치(안드로이드 Chrome 등 `appinstalled`가 오는 브라우저만. 아이폰은 안 옴) |
| `app_first_open` | `platform`(ios/other) | 홈 화면 아이콘(전체 화면)으로 처음 연 때, 기기당 한 번(`pole-app-opened`). 아이폰 설치 수는 이걸로 셈 |

닉네임·채팅 내용은 보내지 않는다. 그 밖의 `scroll`, `form_start`, `user_engagement` 등은 GA4 향상된 측정이 자동으로 보낸다(코드에 없음, 마지막 전송 시각에도 안 잡힘).

## 홈 화면 앱(아이콘)으로 들어온 접속

2026-11-12 매니페스트 추가부터. "앱으로 들어오면 GA4에 다르게 잡히나?"에 대한 답.

- 아이콘으로 열면 `manifest.webmanifest`의 `start_url`(`/?utm_source=homescreen&utm_medium=pwa`)로 열려서 **세션 소스/매체 = `homescreen / pwa`**. 보는 곳: 보고서 → 획득 → 트래픽 획득 → 기본 측정기준 "세션 소스/매체"
- 탭을 오래 내렸다가 돌아와 새 세션이 돼도 주소창 UTM을 안 지우므로 계속 `homescreen`
- 기본 채널 그룹에선 Unassigned로 빠질 가능성이 높음(`pwa`는 GA4 표준 매체가 아님). 채널 그룹 말고 소스/매체로 볼 것
- 아이폰: 홈 화면 앱은 Safari와 저장 공간(쿠키)이 따로라 같은 사람도 **새 사용자**로 한 번 더 세어짐. `enter_game`의 `returning`도 처음엔 false. 안드로이드 Chrome은 쿠키를 같이 써서 같은 사용자
- 매니페스트 배포 전에 만든 아이콘은 그냥 바로가기라 추가할 때 보던 주소(인스타 UTM 등)로 열려 `homescreen`으로 안 잡힘
- 아이폰이 `start_url`을 쓰는지는 실제로 확인 안 함: 아이폰 아이콘으로 들어온 뒤 GA4 실시간에서 소스가 `homescreen`인지 볼 것
- 설치 수(2026-11-12부터): 안드로이드는 `app_install`, 아이폰은 `app_first_open{platform:'ios'}`(추가하고 한 번이라도 연 사람이라 실제 추가 수보다 조금 적음). 매니페스트 없이 만든 예전 바로가기는 못 셈
- 안드로이드는 Chrome과 저장 공간을 같이 써서 설치 뒤 첫 실행에 `app_first_open{platform:'other'}`도 한 번 옴. 설치 수는 `app_install`로 볼 것

## 서버 집계 (슬랙 입장 알림 · 하루 요약)

2026-11-08 정함. 실시간 서버가 운영자 슬랙으로 보내는 숫자의 정의. 구현은 [server/src/index.js](../server/src/index.js)의 `Room.notifyJoin`·`Stats`·`scheduled`, 운영 방법은 [MULTIPLAYER.md](MULTIPLAYER.md) "서버".

### 용어

| 용어 | 정의 |
|---|---|
| **입장** | 입장 화면에서 닉네임을 넣고 방에 들어가 서버가 `welcome`을 보낸 것. 새로고침·재접속·방 이동도 한 번씩 |
| **방문** | 같은 닉네임의 입장을 GA4 세션처럼 묶은 것. 그 닉네임의 **마지막 입장 또는 퇴장 뒤 30분**(`VISIT_GAP_SEC`) 안에 다시 들어오면 같은 방문, 지나면 새 방문 |
| **사람** | 그날 방문한 서로 다른 닉네임 수("닉네임 기준 N명") |
| 닉네임 | 서버가 붙인 중복 번호(`#2`)를 뗀 이름. `유자#2`도 `유자`로 센다 |
| 하루 | 한국 시간 0:00~23:59 |

- 30분은 **퇴장 시각부터** 잰다. 1시간 놀다 새로고침해도 같은 방문(들어온 시각부터 재면 새 방문이 됨)
- **방 이동은 같은 방문**. 방(Durable Object)끼리는 서로 기록을 못 봐서 방문은 한 곳(`Stats` "main")에서 센다
- 퇴장에는 창 닫기·앱 내리기 뒤 60초 무응답으로 서버가 내보낸 것(유령 정리)도 들어간다. 그래서 앱을 내린 사람은 실제보다 약 1분 늦게 퇴장한 것으로 잡힌다
- `NOTIFY_SKIP`(wrangler secret, 쉼표 구분)에 넣은 닉네임은 알림·집계 모두에서 뺀다(운영자 본인 테스트용)

### 슬랙에 오는 것

| 메시지 | 언제 | 숫자 |
|---|---|---|
| 입장 알림 `닉네임 님이 N번 호숫가에 들어왔어요 (지금 N명)` | **새 방문**일 때만 | 지금 N명 = 그 방 현재 인원(나 포함) |
| 하루 요약 `N월 N일 방문 N회 (닉네임 기준 N명)` + `방별 입장 1번 N · …` | 매일 23:59 | 방문 수 = 그날 입장 알림 수와 같다(알림 전송 실패 제외). 방별 입장 = 방마다 입장 수(새로고침·방 이동 포함) |

보통 **방별 입장 합계 ≥ 방문 수 ≥ 사람 수**.

### GA4와 다른 점

숫자가 정확히 같지 않은 게 정상이다.

| | GA4 | 서버 |
|---|---|---|
| 누구 기준 | 브라우저(쿠키 client_id) | 닉네임 |
| 같은 사람이 폰·PC로 | 2명 | 1명 |
| 다른 사람이 같은 닉네임 | 2명 | 1명 |
| 페이지만 열고 입장 안 함 | 세션으로 셈 | 안 셈 |
| 세션/방문이 끊기는 기준 | 마지막 **이벤트** 뒤 30분 | 마지막 **입장·퇴장** 뒤 30분 |
| localhost | 안 보냄 | 로컬 서버엔 웹훅이 없어 안 보냄 |

활용: **GA4 세션 − 서버 방문** ≈ 페이지를 열었지만 입장하지 않고 나간 수(입장 화면 이탈).

### 한계

- 하루 요약은 23:59에 보내므로 23:59~24:00 입장은 어느 요약에도 안 들어간다
- 지난 날짜 기록은 요약을 보낼 때 지운다(날짜별로 쌓으려면 D1 필요)
- 집계는 2026-11-08 서버 배포 이후부터. 방문 기준(30분)은 같은 날 저녁 배포부터 적용

UTM 운영 규칙은 노션 GA4 페이지에 있다(저장소 사본: [marketing/utm-guide.md](marketing/utm-guide.md)).
