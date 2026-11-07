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
b.send({ t: 'move', x: 2, z: 3, ry: 1, vx: 1, vz: 0.5, tx: 4, tz: 3 });
const mv2 = await a.next('move');
ok(mv2 && mv2.vx === 1 && mv2.tx === 4, '속도·목적지도 전달');
b.send({ t: 'move', x: 2, z: 3, ry: 1, vx: 99, vz: 0, tx: 50, tz: 3 });
const mv3 = await a.next('move');
ok(mv3 && !('vx' in mv3) && !('tx' in mv3), '말이 안 되는 속도·공원 밖 목적지는 빼고 전달');
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

b.send({ t: 'name', name: '유자' });
const nm = await a.next('name');
ok(nm && nm.id === wb.id && nm.name === '유자#2', `닉네임 변경도 중복이면 #2 (${nm && nm.name})`);

console.log('채팅');
b.send({ t: 'chat', text: '  안녕   하세요  ' + 'ㅋ'.repeat(80) });
const ch = await a.next('chat');
ok(ch && ch.id === wb.id && ch.text.startsWith('안녕 하세요') && ch.text.length === 60, `A가 B 채팅 받음(공백 정리, 60자: ${ch && ch.text.length})`);
b.send({ t: 'chat', text: '또 보내기' });
const fast = await b.next('chat');
ok(fast && fast.ok === false && fast.why === 'fast', '1초 안에 또 보내면 거절');
ok(!(await a.next('chat', 300)), '거절된 채팅은 안 감');
await sleep(1000);
b.send({ t: 'chat', text: '시 1 발' });
const bad = await b.next('chat');
ok(bad && bad.why === 'word' && !(await a.next('chat', 300)), '띄어쓰기·숫자 끼운 욕설도 거절');
await sleep(1000);
b.send({ t: 'chat', text: '여기로 와 open.kakao.com/xx' });
ok((await b.next('chat'))?.why === 'link', '링크 거절');
await sleep(1000);
b.send({ t: 'chat', text: '오늘 폴 웨어 섹시하다 sexy 시바견 귀여워 해보지 뭐' });
ok((await a.next('chat'))?.text.includes('시바견'), '정상 문장(섹시하다, 시바견)은 통과');
b.send({ t: 'name', name: '개새끼' });
ok((await b.next('name'))?.ok === false, '금칙어 닉네임 변경 거절');

console.log('같이 타기');
a.send({ t: 'invite', to: wb.id });
const inv = await b.next('invite');
ok(inv && inv.from === wa.id && inv.name === '유자' && inv.size === 2, 'B가 A의 같이 타기 요청 받음(2명이 됨)');
b.send({ t: 'accept', from: wa.id, i: 1 });
const da = await a.next('duo'), db = await b.next('duo');
ok(da && da.ok && da.i === 1 && da.members.join() === [wa.id, wb.id].join() && db && db.members.length === 2, '수락하면 둘이 1번 폴 그룹(들어온 순서)');
await sleep(200); b.inbox.length = 0;
b.send({ t: 'pole', i: 1 });
ok((await b.next('pole'))?.ok === true, '그룹은 같은 폴을 잡을 수 있음');
a.send({ t: 'duoMove', kind: 'stack' });
const dm = await b.next('duoMove');
ok(dm && dm.kind === 'stack' && dm.from === wa.id, 'B가 A의 더블 기술(눈사람) 받음');
b.send({ t: 'duoSpin', on: true });
const ds = await a.next('duoSpin');
ok(ds && ds.on === true && ds.from === wb.id, 'A가 B의 스핀 켜기 받음');
b.send({ t: 'accept', from: wa.id, i: 2 });
ok((await b.next('duo'))?.ok === false, '요청 없이 수락은 거절');
a.send({ t: 'unpole' });
ok(!!(await b.next('duoEnd')), 'A가 내려오면 B에게 같이 타기 끝 알림');
await sleep(200);
b.send({ t: 'unpole' });
await sleep(200);
a.inbox.length = 0; b.inbox.length = 0;
a.send({ t: 'invite', to: wb.id });
ok(!(await b.next('invite', 400)), '3초 안에 또 요청하면 무시');

console.log('요가 매트');
a.send({ t: 'mat', i: 3 });
ok((await a.next('mat'))?.ok === true, 'A 3번 매트에 앉기');
const mb = await b.next('mat');
ok(mb && mb.i === 3 && mb.by === wa.id, 'B가 "3번 매트 A 사용 중" 알림 받음');
b.send({ t: 'mat', i: 3 });
ok((await b.next('mat'))?.ok === false, 'B 3번 매트는 거절');
b.send({ t: 'state', pose: 'matPlank' });
ok((await a.next('state'))?.pose === 'matPlank', '스트레칭 자세(플랭크) 전달');
a.send({ t: 'unmat' });
ok((await b.next('mat'))?.by === null, 'A가 일어나면 3번 매트 풀림');
b.send({ t: 'state', pose: 'stand' }); await a.next('state');
await sleep(200); a.inbox.length = 0; b.inbox.length = 0;

console.log('폴 잠금');
a.send({ t: 'pole', i: 2 });
const pa = await a.next('pole');
ok(pa && pa.ok === true && pa.i === 2, 'A 2번 폴 잡기 성공');
const pn = await b.next('pole');
ok(pn && pn.i === 2 && pn.by === wa.id, 'B가 "2번 폴 A가 사용 중" 알림 받음');
b.send({ t: 'pole', i: 2 });
const pb = await b.next('pole');
ok(pb && pb.ok === false && pb.i === 2 && pb.by === wa.id, 'B 2번 폴 잡기 거절');
b.send({ t: 'pole', i: 0 });
ok((await b.next('pole'))?.ok === true, 'B는 0번 폴은 잡을 수 있음');
await a.next('pole');   // A가 받은 "3번 B" 알림
b.send({ t: 'pole', i: 1 });
await b.next('pole');
const sw = [await a.next('pole'), await a.next('pole')];
ok(sw.some(p => p && p.i === 0 && p.by === null) && sw.some(p => p && p.i === 1 && p.by === wb.id), 'B가 1번으로 옮기면 0번은 풀림');
b.send({ t: 'pole', i: 9 });
ok(!(await b.next('pole', 300)), '없는 폴 번호는 무시');

console.log('ping');
a.send('ping');
ok(!!(await a.next('pong')), 'ping → pong(방을 깨우지 않는 자동 응답)');

console.log('정원(3명)');
const c = client(); await c.open;
c.send({ t: 'join', name: '셋째', look });
const wc = await c.next('welcome');
ok(wc && wc.poles[2] === wa.id && wc.poles[1] === wb.id && wc.players.length === 2, '세 번째 입장, 스냅샷에 폴별 사용자 포함');
const d = client(); await d.open;
ok(!!(await d.next('full')), '네 번째는 full');
for (let i = 0; i < 50 && d.closed === null; i++) await sleep(100);
ok(d.closed === 4001, `full 후 연결 끊김(${d.closed})`);

console.log('3명 그룹(밖에서 요청)');
await sleep(3100);
a.inbox.length = 0; b.inbox.length = 0; c.inbox.length = 0;
a.send({ t: 'invite', to: wb.id });                       // A(2번 폴)와 B가 그룹
await b.next('invite'); b.send({ t: 'accept', from: wa.id, i: 2 });
await a.next('duo'); await b.next('duo');
c.send({ t: 'invite', to: wb.id });                       // 밖에 있던 C가 그룹의 B에게 요청
const ci = await b.next('invite');
ok(ci && ci.from === wc.id && ci.size === 3, 'B가 밖에서 온 C의 요청 받음(3명이 됨)');
b.send({ t: 'accept', from: wc.id });
const g3 = [await a.next('duo'), await b.next('duo'), await c.next('duo')];
ok(g3.every(d => d && d.ok && d.i === 2 && d.members.join() === [wa.id, wb.id, wc.id].join()), 'C가 2번 폴 그룹에 3번째로 합류, 셋 다 알림');
c.send({ t: 'duoMove', kind: 'ball' });
const b1 = await a.next('duoMove'), b2 = await b.next('duoMove');
ok(b1?.kind === 'ball' && b2?.kind === 'ball', 'C의 콩벌레를 A·B 모두 받음');
c.send({ t: 'state', pose: 'duoBall', ball: [2, 3] });
const sb = await a.next('state');
ok(sb && sb.pose === 'duoBall' && sb.ball.join() === '2,3', '콩벌레 자리(3명 중 3번째) 전달');
c.send({ t: 'state', snack: 'coffee' });
const ss = await a.next('state');
ok(ss && ss.snack === 'coffee', '손에 든 간식(아메리카노) 전달');
c.send({ t: 'state', bite: 2 });
const sbite = await a.next('state');
ok(sbite && sbite.snack === 'coffee' && sbite.bite === 2, '몇 입 먹었는지 전달');
c.send({ t: 'state', snack: 'pizza' });
const sx = await a.next('state');
ok(sx && sx.snack === null, '메뉴에 없는 간식은 빈손으로');
// 매점 줄: 먼저 줄 선 사람이 맨 앞, 앞사람이 나가면 다음 사람 차례
const lastQ = async who => { await sleep(200); const q = who.inbox.filter(m => m.t === 'shop').pop(); return q ? q.q.join() : null; };
b.send({ t: 'shop' });
ok(await lastQ(a) === wb.id, 'B가 줄 서면 모두에게 줄 알림(B 맨 앞)');
c.send({ t: 'shop' });
ok(await lastQ(b) === [wb.id, wc.id].join(), 'C는 B 뒤에서 대기');
b.send({ t: 'shop' });
ok(await lastQ(c) === [wb.id, wc.id].join(), '같은 사람이 또 줄 서도 순서 그대로');
b.send({ t: 'unshop' });
ok(await lastQ(c) === wc.id, 'B가 받고 나가면 C 차례');
c.send({ t: 'unshop' });
ok(await lastQ(a) === '', 'C도 나가면 줄 빔');
b.send({ t: 'unpole' });
const g2 = await a.next('duo');
ok(g2 && g2.members.join() === [wa.id, wc.id].join(), 'B가 내려오면 A·C 둘이 그룹으로 남음');
c.send({ t: 'unpole' });
ok(!!(await a.next('duoEnd')), 'C도 내려오면 A 혼자(같이 타기 끝)');
await sleep(300);
a.inbox.length = 0; b.inbox.length = 0; c.inbox.length = 0;

console.log('퇴장하면 폴 풀림');
a.ws.close();
const lv = await b.next('leave');
ok(lv && lv.id === wa.id, 'B가 A 퇴장 받음');
const fr = await b.next('pole');
ok(fr && fr.i === 2 && fr.by === null, 'A가 나가자 2번 폴 잠금 해제 알림');
b.send({ t: 'pole', i: 2 });
ok((await b.next('pole'))?.ok === true, '이제 B가 2번 폴 잡기 성공');

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
const rr = await fetch(BASE.replace(/^ws/, 'http') + '/rooms', { headers: { origin: ORIGIN } }).then(r => r.json());
ok(rr.cap === 3 && rr.rooms.length === 5 && rr.rooms[0] === 1 && rr.rooms[1] === 0, `방별 인원 /rooms (방 1: ${rr.rooms[0]}명)`);
const rbad = await fetch(BASE.replace(/^ws/, 'http') + '/rooms', { headers: { origin: 'https://evil.example' } });
ok(rbad.status === 403, '/rooms도 다른 출처는 403');
let noRoom = false;
try { const g = client(99); await g.open; } catch (err) { noRoom = /404/.test(err.message); }
ok(noRoom, '없는 방 번호는 404');

b.ws.close();
await sleep(200);
console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exit(failed ? 1 : 0);
