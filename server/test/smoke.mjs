// 로컬 서버(npm run dev, 정원 3명으로 띄움) 대상 동작 확인.
//   npx wrangler dev --port 8787 --var ROOM_CAP:3   그 다음   npm test
import WebSocket from 'ws';

const BASE = process.env.WS_URL || 'ws://127.0.0.1:8787';
const ORIGIN = 'http://localhost:5173';
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg); if (!cond) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 받은 메시지를 쌓아 두고, 원하는 종류가 올 때까지 기다리는 클라이언트
function client(room = 1, origin = ORIGIN) {
  const ws = new WebSocket(`${BASE}/ws?room=${room}`, { origin });
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
  ws.on('close', (code) => { c.closed = code; });
  c.open = new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); ws.on('unexpected-response', (q, r) => rej(new Error('HTTP ' + r.statusCode))); });
  return c;
}
const look = { top: 'lace', bottom: 'laceSkirt', hair: 'bun', acc: 'ribbon', shoes: 'bare', topColor: '#f4e9d2', bottomColor: '#f4e9d2', hairColor: '#2b1d16', eyeColor: '#7a4b32', skin: '#ffe2d2', hack: 'x'.repeat(50) };

console.log('입장·스냅샷·이름 중복');
const a = client(); await a.open;
a.send({ t: 'join', name: '  유자  ', look, x: 1, z: 2, ry: 0.5 });
const wa = await a.next('welcome');
ok(wa && wa.name === '유자' && wa.players.length === 0, `A welcome (${wa && wa.name}, 다른 사람 ${wa && wa.players.length}명)`);
const b = client(); await b.open;
b.send({ t: 'join', name: '유자', look });
const wb = await b.next('welcome');
ok(wb && wb.name === '유자#2', `같은 이름은 #2 (${wb && wb.name})`);
ok(wb && wb.players.length === 1 && wb.players[0].x === 1 && !('hack' in wb.players[0].look), 'B 스냅샷에 A 위치·옷(모르는 키 제거)');
const ja = await a.next('join');
ok(ja && ja.p.name === '유자#2', 'A가 B 입장 알림 받음');

console.log('이동·상태·옷');
b.send({ t: 'move', x: 2, z: 3, ry: 1 });
const mv = await a.next('move');
ok(mv && mv.id === wb.id && mv.x === 2, 'A가 B 이동 받음');
b.send({ t: 'move', x: 50, z: 3, ry: 1 });
ok(!(await a.next('move', 400)), '공원 밖 좌표는 무시');
b.send({ t: 'state', pose: 'sitGround', face: 'joy', emote: 'heart' });
const st = await a.next('state');
ok(st && st.pose === 'sitGround' && st.face === 'joy' && st.emote === 'heart', 'A가 B 상태·이모트 받음');
b.send({ t: 'state', pose: 'fly' });
const st2 = await a.next('state');
ok(st2 && st2.pose === 'sitGround', '모르는 포즈는 무시(이전 값 유지)');
b.send({ t: 'outfit', look: { hair: 'tail' } });
const of = await a.next('outfit');
ok(of && of.look.hair === 'tail', 'A가 B 옷 변경 받음');

console.log('폴 잠금');
a.send({ t: 'pole' });
const pa = await a.next('pole');
ok(pa && pa.ok === true, 'A 폴 잡기 성공');
ok((await b.next('pole'))?.by === wa.id, 'B가 "A가 폴 사용 중" 알림 받음');
b.send({ t: 'pole' });
const pb = await b.next('pole');
ok(pb && pb.ok === false && pb.by === wa.id, 'B 폴 잡기 거절');

console.log('ping');
a.send('ping');
ok(!!(await a.next('pong')), 'ping → pong(방을 깨우지 않는 자동 응답)');

console.log('정원(3명)');
const c = client(); await c.open;
c.send({ t: 'join', name: '셋째', look });
const wc = await c.next('welcome');
ok(wc && wc.poleBy === wa.id && wc.players.length === 2, '세 번째 입장, 스냅샷에 폴 사용자 포함');
const d = client(); await d.open;
ok(!!(await d.next('full')), '네 번째는 full');
for (let i = 0; i < 50 && d.closed === null; i++) await sleep(100);
ok(d.closed === 4001, `full 후 연결 끊김(${d.closed})`);

console.log('퇴장하면 폴 풀림');
a.ws.close();
const lv = await b.next('leave');
ok(lv && lv.id === wa.id, 'B가 A 퇴장 받음');
ok((await b.next('pole'))?.by === null, 'A가 나가자 폴 잠금 해제 알림');
b.send({ t: 'pole' });
ok((await b.next('pole'))?.ok === true, '이제 B가 폴 잡기 성공');

console.log('도배·크기·출처');
for (let i = 0; i < 40; i++) c.send({ t: 'move', x: 1, z: 1, ry: 0 });
await sleep(300);
ok(c.closed === 1008, `초당 30개 넘으면 끊김(${c.closed})`);
const e = client(); await e.open;
e.send('x'.repeat(3000));
await sleep(300);
ok(e.closed === 1009, `2KB 넘는 메시지는 끊김(${e.closed})`);
let blocked = false;
try { const f = client(1, 'https://evil.example'); await f.open; } catch (err) { blocked = /403/.test(err.message); }
ok(blocked, '허용 안 된 출처는 403');
let noRoom = false;
try { const g = client(99); await g.open; } catch (err) { noRoom = /404/.test(err.message); }
ok(noRoom, '없는 방 번호는 404');

b.ws.close();
await sleep(200);
console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exit(failed ? 1 : 0);
