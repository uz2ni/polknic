// 유령 정리 확인: 조용한 접속은 내보내고, ping을 보내는 접속은 남긴다(docs/GHOST_PLAYERS.md).
// 정리 시간을 짧게 해서 띄운다:
//   npx wrangler dev --port 8790 --var IDLE_SEC:4   그 다음   WS_URL=ws://127.0.0.1:8790 npm run test:idle
import WebSocket from 'ws';

const BASE = process.env.WS_URL || 'ws://127.0.0.1:8790';
const ORIGIN = 'http://localhost:5173';
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg); if (!cond) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function client(room = 2) {
  const ws = new WebSocket(`${BASE}/ws?room=${room}`, { origin: ORIGIN });
  const inbox = [];
  const c = { ws, inbox, closed: null,
    send: m => ws.send(typeof m === 'string' ? m : JSON.stringify(m)),
    async next(t, ms = 2000) {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const i = inbox.findIndex(m => m.t === t);
        if (i >= 0) return inbox.splice(i, 1)[0];
        await sleep(20);
      }
      return null;
    },
  };
  ws.on('message', d => { const s = d.toString(); inbox.push(s === 'pong' ? { t: 'pong' } : JSON.parse(s)); });
  ws.on('close', code => { c.closed = code; });
  c.open = new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  return c;
}

console.log('조용한 접속 정리 (IDLE_SEC 4초로 띄운 서버)');
const quiet = client(); await quiet.open;
quiet.send({ t: 'join', name: '조용', x: 1, z: 2, ry: 0 });
const wq = await quiet.next('welcome');
quiet.send({ t: 'pole', i: 1 });
const pq = await quiet.next('pole');
ok(wq && pq && pq.by === wq.id, '조용한 사람이 폴 1을 잡음');

const busy = client(); await busy.open;
busy.send({ t: 'join', name: '바쁨', x: 2, z: 2, ry: 0 });
const wb = await busy.next('welcome');
ok(wb && wb.players.length === 1, '바쁜 사람 입장, 조용한 사람이 보임');
const lurker = client(); await lurker.open;   // 연결만 하고 join을 안 보내는 접속(있어도 다른 정리가 잘 되는지)

// 바쁜 사람만 1초마다 ping (Cloudflare가 대신 답하는 ping도 소식으로 쳐야 함)
const pinger = setInterval(() => { if (busy.ws.readyState === 1) busy.send('ping'); }, 1000);
const leave = await busy.next('leave', 12000);
ok(leave && leave.id === wq.id, '조용한 사람이 나갔다는 알림이 옴');
const free = await busy.next('pole', 2000);
ok(free && free.i === 1 && free.by === null, '조용한 사람이 잡던 폴이 풀림');
await sleep(500);
ok(quiet.closed === 4003, `조용한 접속은 4003(idle)으로 닫힘 (${quiet.closed})`);
// 입장 안 한 접속(lurker)도 서버는 같은 훑기에서 정리 목록·정원에서 빼고 close(4003)를 부른다(서버 로그로 확인).
// 다만 로컬 wrangler dev에서는 메시지를 한 번도 안 보낸 소켓의 닫힘이 클라이언트까지 오지 않아서 여기선 확인하지 않는다
await sleep(5000);
ok(busy.closed === null, 'ping을 보내는 접속은 그대로 남음');
clearInterval(pinger);

// 다시 들어오면 정상 입장
const back = client(); await back.open;
back.send({ t: 'join', name: '조용', x: 1, z: 2, ry: 0 });
const wbk = await back.next('welcome');
ok(wbk && wbk.players.length === 1 && wbk.poles[1] === null, '다시 들어오면 정상 입장(남은 사람 1명, 폴 비어 있음)');

[busy, back].forEach(c => c.ws.close());
console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exit(failed ? 1 : 0);
