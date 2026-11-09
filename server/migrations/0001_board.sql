-- 알림판: 방명록, 기술 요청, 문의·제안(운영자만 봄). 시각은 모두 ms
CREATE TABLE guest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX guest_at ON guest(at DESC);

CREATE TABLE req (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  norm TEXT NOT NULL UNIQUE,         -- 띄어쓰기·대소문자를 뺀 이름. 같으면 같은 요청
  hearts INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT '',   -- '' / making(만드는 중) / done(추가됨)
  at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX req_hearts ON req(hearts DESC);

CREATE TABLE inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,                -- ask(문의) / idea(제안)
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',  -- 답장 받을 곳(선택). 처리 완료 또는 90일 뒤 비움
  memo TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  at INTEGER NOT NULL
);
CREATE INDEX inbox_at ON inbox(at DESC);

-- 글 수 제한 카운터. 키의 브라우저·IP는 날짜를 섞은 해시로만 두고, 지난 날짜는 매일 지운다
CREATE TABLE limits (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  day TEXT NOT NULL
);
