# 알림판 (방명록 · 기술 요청 · 운영자에게)

오른쪽 위 핀 아이콘(`#boardBtn`)을 누르면 열리는 코르크판 패널. 실시간이 아니라 HTTP로 Cloudflare D1을 읽고 쓴다. 방에 들어가지 않아도 동작하고, 패널을 열 때 새로 읽는다. 왜 이렇게 정했는지는 [DECISIONS.md](DECISIONS.md) 2026-11-09.

| 탭 | 공개 | 입력 | 제한 | 운영자 |
|---|---|---|---|---|
| 방명록 | 공개 | 40자, 닉네임은 자동 | 금칙어·링크 거절, 브라우저당 하루 3장 | 내리기 |
| 기술 요청 | 공개 | 기술 이름 20자 | 금칙어·링크 거절, 브라우저당 하루 2개 | 내리기, 도장(만드는 중·추가됨) |
| 운영자에게 | 운영자만 | 문의/제안, 200자, 연락처(선택) | 브라우저당 하루 5건(문의+제안). 금칙어·링크 검사 없음 | 메모, 처리 완료, 연락처 삭제, 글 삭제 |

공통으로 같은 IP는 종류별 하루 20건까지(학원처럼 와이파이를 같이 쓰는 사람을 막지 않게 브라우저 기준이 먼저). 신고 기능은 넣지 않는다.

## 동작 규칙

- **방명록 색**: 글 번호로 정해서 누구에게나 같은 색. 고르는 칸·기울기 없음
- **같은 기술 이름**: 띄어쓰기·대소문자만 무시하고 비교해서(`norm`) 기존 글에 합친다. 결과별 안내 문구는 `REQ_DONE_MSG`

  | 서버 `result` | 경우 | 하트 |
  |---|---|---|
  | `new` | 새 요청 | 새 글(1개로 시작) |
  | `merged` | 이미 있음 | +1 |
  | `liked` | 이번 접속에 이미 하트 누름 | 그대로 |
  | `making` | 만드는 중 | +1 |
  | `done` | 이미 추가됨 | 그대로 |

- **운영자가 내린 기술 이름**은 다시 올리지 못한다(`bad`로 거절)
- **하트**: 페이지를 새로 열 때까지 글마다 1회(`boardLiked`, 메모리). 새로고침하면 다시 누를 수 있으므로 하트 수는 사람 수가 아니라 공감 횟수. 서버는 IP당 분당 30회만 막는다
- **연락처**: D1에만 저장하고 슬랙에는 보내지 않는다("답장 요청 있음"만). 지우는 경우는 셋
  - 운영자가 처리 완료를 누를 때(확인창 후 바로)
  - 운영자가 연락처 삭제를 누를 때
  - 받은 지 90일이 지났을 때: 매일 23:59(한국 시간) `scheduled` → `boardCleanup`. 운영자 페이지의 문의·제안 구간 맨 위와 글마다 날짜로 표시
- **새 글 점**: 공개 글의 최신 시각이 `pole-board-seen`보다 나중이면 표시. 패널을 열면 지움
- 글 수 제한 카운터(`limits`)는 브라우저·IP를 날짜를 섞은 해시로만 두고, 지난 날짜는 매일 지운다

## 서버 API ([server/src/board.js](../server/src/board.js))

허용된 출처(`PROD_ORIGIN`, `DEV_ORIGIN`)만. 오류는 `{ error }`: `empty` 400, `bad` 422, `limit` 429, `gone` 404, `off` 503(D1 없음).

| 경로 | 본문 | 응답 |
|---|---|---|
| `GET /board` | | `{ guest:[{id,name,text,at}], req:[{id,title,hearts,status,at}] }` 각 최대 60개 |
| `POST /board/guest` | `{name,text,bid}` | `{id}` |
| `POST /board/req` | `{title,bid,liked:[id]}` | `{id,result}` |
| `POST /board/heart` | `{id}` | `{hearts}` |
| `POST /board/inbox` | `{kind:'ask'\|'idea',text,contact,name,bid}` | `{ok}` |

`bid`는 브라우저별 무작위 값(`pole-board-id`). 표는 [server/migrations/0001_board.sql](../server/migrations/0001_board.sql).

## 운영자 페이지

`https://polknic-ws.yujamong.com/admin` ([server/src/admin.js](../server/src/admin.js)). 비밀번호는 secret `ADMIN_KEY`, 페이지는 `noindex`이고 비밀번호는 그 탭의 sessionStorage에만 남는다. 글은 `textContent`로만 그린다.

## 배포

```bash
cd server
npx wrangler d1 create polknic-board
```

출력된 `database_id`를 [server/wrangler.toml](../server/wrangler.toml)의 `REPLACE_WITH_D1_ID`에 넣고:

```bash
npx wrangler d1 migrations apply polknic-board --remote
npx wrangler secret put ADMIN_KEY
npm run deploy
```

표를 바꿀 땐 `server/migrations/`에 새 파일을 더하고 `migrations apply`를 다시 실행. 서버를 먼저 배포한 뒤 `main`에 합칠 것(거꾸로면 알림판이 잠깐 "불러올 수 없어요"로 보임).

## 로컬 확인

```bash
cd server
npx wrangler d1 migrations apply polknic-board --local
echo 'ADMIN_KEY=아무_시험값' > .dev.vars
```

`.claude/launch.json`의 `server`와 `static`을 띄운 뒤:

```bash
cd server && ADMIN_KEY=아무_시험값 npm run test:board
```

같은 날 다시 돌리면 글 수 제한에 걸릴 수 있으니 `.wrangler/`의 로컬 D1을 지우거나 `limits` 표를 비운다. 90일 삭제 시험은 `npx wrangler dev --port 8788 --test-scheduled` 후 `curl 'http://127.0.0.1:8788/__scheduled?cron=59+14+*+*+*'`.
