# 분석 (GA4)

코드를 고칠 때 GA4 쪽과 같이 맞춰야 하는 것만 적는다.

## 설정 위치

- 측정 ID `G-P6T4ZLNN91`, [index.html](../index.html) `<head>`의 `window.GA_ID`
- gtag 로더도 같은 `<script>` 블록에 있다. 스크립트 로드와 `gtag('config')`는 한 번씩만 한다. localhost·127.0.0.1·`.local`·`file:`에서는 아무것도 보내지 않는다
- 이벤트는 `polkTrack(name, params)`로 보낸다. `gtag`를 직접 부르지 말 것(마지막 전송 시각 기록이 `window.gtag`에서 이뤄짐)

## GA4와 맞춰야 하는 값

| 코드 | GA4 | 바꾸면 |
|---|---|---|
| `SESSION_TIMEOUT_MS` = 30분 | 관리 > 데이터 스트림 > 태그 설정 > 세션 제한 시간(30분) | 둘을 같은 값으로 |
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
| `page_view` | `return_visit`(true) | 위 재방문 page_view |

닉네임·채팅 내용은 보내지 않는다. 그 밖의 `scroll`, `form_start`, `user_engagement` 등은 GA4 향상된 측정이 자동으로 보낸다(코드에 없음, 마지막 전송 시각에도 안 잡힘).

UTM 운영 규칙은 노션 GA4 페이지에 있다(저장소 사본: [marketing/utm-guide.md](marketing/utm-guide.md)).
