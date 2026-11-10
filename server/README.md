# 폴크닉 서버: 켜기 · 테스트 · 배포

실시간 서버(방·채팅)와 게시판 API를 한 Worker에서 돌린다. 구조·프로토콜은 [docs/MULTIPLAYER.md](../docs/MULTIPLAYER.md) "서버", 게시판은 [docs/BOARD.md](../docs/BOARD.md). 이 문서는 명령만 모아 둔다.

명령은 모두 `server/` 폴더에서 실행한다.

## 처음 한 번 준비

```bash
nvm use
npm i
npx wrangler d1 migrations apply polknic-board --local
echo 'ADMIN_KEY=아무_시험값' > .dev.vars
```

- Node 24가 필요하다(`nvm install 24`). `server/.nvmrc`에 24가 적혀 있어서 이 폴더에서는 `nvm use`만 치면 된다. 새 터미널 창은 기본 Node(18)로 돌아가므로 창을 열 때마다 `nvm use`부터 한다(18이면 wrangler가 "requires at least Node.js v22"로 멈춤).
- 두 번째 줄 `migrations apply --local`은 게시판용 로컬 DB(`.wrangler/`)에 표를 만든다. `server/migrations/`에 새 파일이 생겼을 때도 다시 실행한다.
- `.dev.vars`는 로컬에서만 쓰는 비밀값이다(git에 안 올라감). `ADMIN_KEY`가 있어야 운영자 페이지 `http://localhost:8787/admin`과 "내 글 지우기"가 동작한다.

## 로컬에서 켜기

```bash
nvm use
npm run dev
```

- `http://localhost:8787`에 뜬다(`npm run dev` = `wrangler dev --port 8787`).
- 게임은 저장소 루트에서 정적 서버를 따로 띄워 `http://localhost:5173/index.html`로 연다. localhost에서 연 게임은 자동으로 이 로컬 서버(`ws://localhost:8787/ws`)에 붙는다.
- Claude 앱에서는 `.claude/launch.json`의 `server`(8787, `--ip 0.0.0.0`이라 같은 와이파이의 폰에서도 접속됨)와 `static`(5173)을 띄우면 된다. 폰은 `lan`(5174)으로 `http://맥IP:5174/index.html`.
- 로컬에서는 슬랙 알림이 안 간다(`SLACK_WEBHOOK` 없음).

## 테스트

테스트마다 서버를 띄우는 옵션이 다르다. 서버를 띄운 터미널은 그대로 두고 다른 터미널에서 테스트를 돌린다.

| 테스트 | 서버 띄우기 | 테스트 실행 | 확인하는 것 |
|---|---|---|---|
| 기본 | `npx wrangler dev --port 8787 --var ROOM_CAP:3` | `npm test` | 입장·이동·폴 잠금·채팅·정원 초과(정원을 3명으로 줄여서 시험) |
| 유령 정리 | `npx wrangler dev --port 8790 --var IDLE_SEC:4` | `WS_URL=ws://127.0.0.1:8790 npm run test:idle` | 조용한 접속은 내보내고 ping 보내는 접속은 남기는지 ([docs/GHOST_PLAYERS.md](../docs/GHOST_PLAYERS.md)) |
| 게시판 | `npm run dev` | `ADMIN_KEY=아무_시험값 npm run test:board` | 방명록·기술 요청·문의, 내 글 지우기, 운영자 기능. `ADMIN_KEY`는 `.dev.vars`와 같은 값 |

- 게시판 테스트를 같은 날 다시 돌리면 하루 글 수 제한에 걸린다. `.wrangler/`의 로컬 DB를 지우고 준비의 `migrations apply --local`을 다시 하거나 `limits` 표를 비운다.
- 매일 23:59 예약 작업(하루 방문 요약, 연락처 90일 삭제)은 `npx wrangler dev --port 8788 --test-scheduled`로 띄우고 `curl 'http://127.0.0.1:8788/__scheduled?cron=59+14+*+*+*'`로 바로 실행해 본다.
- 입장 슬랙 알림은 가짜 웹훅으로 본다: `--var SLACK_WEBHOOK:http://127.0.0.1:포트/ --var VISIT_GAP_SEC:3`.

## 배포 (실제 서버)

실제 서버 `wss://polknic-ws.yujamong.com`은 Cloudflare에서 계속 돌고 있다. 켜는 게 아니라 바뀐 코드를 올린다.

```bash
npx wrangler login     # 처음 한 번, 브라우저로 Cloudflare 계정 로그인(dbwlsdlqh12@gmail.com)
npm run deploy
```

- **서버를 먼저 배포하고 그다음 `main`에 합친다.** 게임(`main`, GitHub Pages)이 새 서버 기능을 먼저 부르면 배포 사이트에서 그 기능이 잠깐 안 된다. 서버는 `main` 푸시로 배포되지 않으니 직접 올려야 한다.
- 게시판 표를 바꿨으면(새 `migrations/` 파일) 배포 전에 실제 DB에도 적용한다:

  ```bash
  npx wrangler d1 migrations apply polknic-board --remote
  ```

- 실제 서버 로그 보기: `npx wrangler tail`

### 비밀값 (secret)

공개 저장소라 `wrangler.toml`에 넣지 않고 `npx wrangler secret put 이름`으로 넣는다. 한 번 넣으면 배포해도 유지된다.

| 이름 | 쓰는 곳 |
|---|---|
| `ADMIN_KEY` | 운영자 페이지 `/admin` 비밀번호, 내 글 지우기 서명. 바꾸면 그 전에 받은 "내 글 지우기" 표는 못 씀 |
| `SLACK_WEBHOOK` | 입장 알림·하루 요약·게시판 새 글을 운영자 슬랙으로 |
| `NOTIFY_SKIP` | 알림·집계에서 뺄 닉네임(쉼표 구분, 운영자 본인 테스트용) |

방 정원 `ROOM_CAP`, 방 개수 `MAX_ROOMS`는 비밀값이 아니라 `wrangler.toml`의 `[vars]`에 있다.

### 운영자 비밀번호: 로컬과 배포는 따로

| | 운영자 페이지 | 비밀번호가 있는 곳 | 확인 방법 |
|---|---|---|---|
| 로컬 | `http://localhost:8787/admin` | `server/.dev.vars`의 `ADMIN_KEY=` 뒤 값 | 파일을 열어 본다(git에 안 올라감). 바꾸려면 파일을 고치고 `npm run dev`를 다시 켠다 |
| 배포 | `https://polknic-ws.yujamong.com/admin` | Cloudflare secret `ADMIN_KEY` | 넣은 뒤로는 Cloudflare 대시보드에서도 값을 다시 볼 수 없다. 처음 넣을 때 정한 비밀번호 |

배포 비밀번호를 잊었으면 새로 정해서 덮어쓴다. 바로 적용되고 재배포는 필요 없다:

```bash
npx wrangler secret put ADMIN_KEY
```

덮어쓰면 그 순간 이용자들이 이번 접속에서 받아 둔 "내 글 지우기" 표가 모두 무효가 된다(✕를 누르면 "지금은 보낼 수 없어요" 안내가 뜸). 이용자가 적을 때 바꾸는 게 좋다. 어떤 secret이 들어 있는지(값은 빼고 이름만)는 `npx wrangler secret list`로 본다.

### 처음부터 새로 만들 때만

게시판 DB는 2026-11-09에 만들어 `wrangler.toml`에 `database_id`를 넣어 뒀다. 새 계정 등으로 다시 만들 때만:

```bash
npx wrangler d1 create polknic-board
```

나온 `database_id`를 [wrangler.toml](wrangler.toml)에 넣고, `migrations apply --remote`와 비밀값을 다시 넣은 뒤 배포한다.
