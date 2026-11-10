// 폴크닉 실시간 서버
// - Worker: /ws?room=N 접속을 방 N(Durable Object "room-N")으로 넘긴다
// - Room: 방 하나. WebSocket Hibernation API를 써서 조용할 땐 잠들고(요금 없음), 메시지가 오면 깬다.
//   잠들면 메모리가 사라지므로 접속자 정보는 소켓마다 serializeAttachment()에 둔다(최대 2KB).
// 메시지 형식은 docs/MULTIPLAYER.md "서버 프로토콜" 참고.
import { DurableObject } from 'cloudflare:workers';
import { badText } from './words.js';
import { boardRoute, adminRoute, boardCleanup } from './board.js';

const PROD_ORIGIN = 'https://polknic.yujamong.com';
// 개발 중 맥(localhost)과 같은 와이파이의 폰(사설 IP)에서 여는 페이지도 허용
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/') return new Response('polknic-server ok');
    if (url.pathname === '/admin' || url.pathname === '/admin/api') return adminRoute(req, env, url);
    const origin = req.headers.get('Origin') || '';
    const allowed = origin === PROD_ORIGIN || DEV_ORIGIN.test(origin);
    if (url.pathname === '/board' || url.pathname.startsWith('/board/')) return boardRoute(req, env, ctx, url, origin, allowed);
    // 방 고르는 화면용: 방마다 지금 인원. 잠든 방도 잠깐 깨워서 물어본다(요청이 적어 무료 한도 안)
    if (url.pathname === '/rooms') {
      if (!allowed) return new Response('forbidden origin', { status: 403 });
      const rooms = await Promise.all(Array.from({ length: +env.MAX_ROOMS }, (_, i) =>
        env.ROOMS.get(env.ROOMS.idFromName('room-' + (i + 1))).fetch('https://room/count').then(r => r.json()).then(j => j.n).catch(() => null)));
      return Response.json({ cap: +env.ROOM_CAP, rooms }, { headers: { 'Access-Control-Allow-Origin': origin, 'Cache-Control': 'no-store' } });
    }
    if (url.pathname !== '/ws') return new Response('not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    if (!allowed) return new Response('forbidden origin', { status: 403 });
    const n = parseInt(url.searchParams.get('room'), 10);
    if (!(n >= 1 && n <= +env.MAX_ROOMS)) return new Response('no such room', { status: 404 });
    const room = env.ROOMS.get(env.ROOMS.idFromName('room-' + n));
    return room.fetch(req);
  },

  // 매일 23:59(한국 시간, wrangler.toml의 crons) 게시판 정리(90일 지난 연락처 삭제) 후, 오늘 입장 수를 방마다 모아 슬랙으로
  async scheduled(event, env, ctx) {
    await boardCleanup(env).catch(e => console.error('board cleanup', e));   // 실패해도 하루 요약은 보낸다
    const day = kstDay();
    const v = await statsHub(env).fetch('https://stats/day?day=' + day).then(r => r.json()).catch(() => ({ visits: 0, names: [] }));
    const rooms = await Promise.all(Array.from({ length: +env.MAX_ROOMS }, (_, i) =>
      env.ROOMS.get(env.ROOMS.idFromName('room-' + (i + 1))).fetch('https://room/stats?day=' + day).then(r => r.json()).then(j => j.n).catch(() => 0)));
    const [, m, d] = day.split('-').map(Number);
    await slack(env, `:bar_chart: *${m}월 ${d}일 방문 ${v.visits}회* (닉네임 기준 ${v.names.length}명)\n방별 입장 ${rooms.map((n, i) => `${i + 1}번 ${n}`).join(' · ')}`);
  },
};

// 운영자 슬랙으로 보내기. SLACK_WEBHOOK(wrangler secret)이 없으면(로컬 개발 등) 보내지 않는다
async function slack(env, text) {
  if (!env.SLACK_WEBHOOK) return;
  await fetch(env.SLACK_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
}
// 방문 집계는 방 5개를 통틀어 한 곳(Stats "main")에서
const statsHub = env => env.STATS.get(env.STATS.idFromName('main'));
// 한국 날짜 'YYYY-MM-DD'
const kstDay = (t = Date.now()) => new Date(t + 9*3600*1000).toISOString().slice(0, 10);

/* ---------- 검증 ---------- */
const POSES = new Set(['stand', 'ready', 'sitGround', 'sitBench', 'chair', 'ppose', 'hera', 'brass', 'split',
  'duoStackTop', 'duoStackBase', 'duoFlyTop', 'duoFlyBase', 'duoBall',
  'matSit', 'matChild', 'matSplit', 'matSquat', 'matPlank', 'matDog', 'matCobra', 'matLegRaise']);
const SHOP_HOLD = 45000;   // 매점 카운터 맨 앞에서 이만큼(ms) 넘게 있으면 줄에서 뺌(웹은 25초에 스스로 나감)
const MATS = 6;   // 요가 매트 6개(index.html MATS와 같은 수), 한 매트에 한 명
const DUO = new Set(['stack', 'fly', 'ball']);   // 같이 타기 기술(stack·fly는 2명, ball은 2~4명)
const GROUP_MAX = 4;
const INVITE_GAP = 3000;
const FACES = new Set(['auto', 'open', 'wink', 'joy', 'wow', 'pant']);
const EMOTES = new Set(['heart', 'note', 'wow', 'sparkle', 'sweat']);
const SNACKS = new Set(['coffee', 'shake', 'ion', 'chicken', 'tanghulu']);   // 매점 간식(손에 든 것, 웹 index.html SNACKS와 맞출 것)
const LOOK_KEYS = ['top', 'topColor', 'bottom', 'bottomColor', 'shoes', 'hair', 'acc', 'hairColor', 'eyeColor', 'skin'];
const POLES = 3;   // 호숫가마다 폴 3개(index.html POLES와 같은 수)
const MAX_MSG = 2048, MAX_PER_SEC = 30, CHAT_LEN = 60, CHAT_GAP = 1000;
// 이만큼 아무 소식(메시지·ping)이 없으면 나간 것으로 본다. 클라이언트는 화면이 켜져 있는 동안 25초마다 ping
const IDLE_SEC = 60;
// 방문: 같은 닉네임이 마지막 입장·퇴장 뒤 이 시간 안에 다시 들어오면 같은 방문(GA4 세션 제한 시간 30분과 맞춤, docs/analytics.md)
const VISIT_GAP_SEC = 30*60;

const num = (v, lim) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim;
const round = v => Math.round(v*1000)/1000;
// 닉네임: 공백 정리, 12자, 금칙어면 빈 값
const cleanName = v => { const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 12) : ''; return s && !badText(s) ? s : ''; };
// 채팅: 공백 정리, 60자. 본문은 저장하지 않고 전달만
const cleanChat = v => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, CHAT_LEN) : '';
// 옷: 아는 키만, 짧은 문자열만. 값이 실제 옵션인지는 클라이언트가 그릴 때 다시 확인한다
function cleanLook(v) {
  const o = {};
  if (v && typeof v === 'object') LOOK_KEYS.forEach(k => { if (typeof v[k] === 'string' && v[k].length <= 16) o[k] = v[k]; });
  return o;
}
// 호숫가 걸을 수 있는 범위(클라이언트 walkable과 같은 원: 중심 (0, 1), 반지름 8.5)보다 조금 넓게
const inPark = (x, z) => Math.hypot(x, z - 1) <= 9;

/* ---------- 방 ---------- */
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.cap = +env.ROOM_CAP;
    // 시험할 땐 --var IDLE_SEC:4 처럼 짧게. 훑는 간격은 그 절반(최대 30초)
    this.idleMs = (+env.IDLE_SEC || IDLE_SEC)*1000;
    this.sweepMs = Math.min(30000, this.idleMs/2);
    // 연결 유지용 ping은 방을 깨우지 않고 Cloudflare가 바로 답한다
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === '/count') return Response.json({ n: this.others(null).length });
    if (path === '/stats') return Response.json(await this.dayStats(new URL(req.url).searchParams.get('day')));
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    if (this.live().length >= this.cap) {
      // 꽉 참: 방에 등록하지 않는 일반 소켓으로 받아 알리고 바로 닫는다(hibernation 소켓으로 받으면 닫힘이 전달되지 않음)
      server.accept();
      server.send(JSON.stringify({ t: 'full' }));
      server.close(4001, 'full');
    } else {
      this.ctx.acceptWebSocket(server);
      const room = parseInt(new URL(req.url).searchParams.get('room'), 10) || 0;   // 입장 알림에 쓸 방 번호
      server.serializeAttachment({ joined: false, rl: [0, 0], seen: Date.now(), room });
      if (await this.ctx.storage.getAlarm() == null) await this.ctx.storage.setAlarm(Date.now() + this.sweepMs);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  /* 유령 정리: 앱을 그냥 내리거나 폰이 잠기면 소켓이 닫히지 않은 채 남아 캐릭터가 계속 보인다.
     ping은 Cloudflare가 방을 깨우지 않고 대신 답하므로 방은 그 사람이 조용해진 걸 모른다.
     그래서 사람이 있는 동안만 알람으로 훑어서, 마지막 메시지와 마지막 ping 중 늦은 쪽이 idleMs보다 오래된 접속을 내보낸다.
     자세한 경위는 docs/GHOST_PLAYERS.md */
  async alarm() {
    const now = Date.now();
    for (const ws of this.live()) {
      const a = ws.deserializeAttachment();
      const ping = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() || 0;
      if (now - Math.max(a.seen || 0, ping) < this.idleMs) continue;
      this.leave(ws);   // 다른 사람들에게 leave, 폴·매트·같이 타기 풀기
      ws.serializeAttachment({ ...ws.deserializeAttachment(), gone: true });   // 닫는 중인 소켓은 정원·다음 훑기에서 뺀다
      try { ws.close(4003, 'idle'); } catch (e) {}
    }
    if (this.live().length) await this.ctx.storage.setAlarm(Date.now() + this.sweepMs);   // 빈 방은 알람 없이 잠든다
  }
  // 아직 내보내지 않은 소켓(입장 전 포함)
  live() {
    return this.ctx.getWebSockets().filter(ws => !ws.deserializeAttachment()?.gone);
  }

  // 접속해 있는(join을 마친) 다른 사람들
  others(except) {
    return this.ctx.getWebSockets().filter(ws => ws !== except && ws.deserializeAttachment()?.joined);
  }
  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    this.others(except).forEach(ws => { try { ws.send(s); } catch (e) {} });
  }
  // 폴마다 잡은 사람 id(없으면 null). 잡은 폴 번호는 각자 소켓 attachment의 pole에 있어서 잠들었다 깨도 유지
  poles() {
    const by = Array(POLES).fill(null);
    this.others(null).forEach(w => { const a = w.deserializeAttachment(); if (Number.isInteger(a.pole)) by[a.pole] = a.id; });
    return by;
  }
  mats() {
    const by = Array(MATS).fill(null);
    this.others(null).forEach(w => { const a = w.deserializeAttachment(); if (Number.isInteger(a.mat)) by[a.mat] = a.id; });
    return by;
  }
  /* 매점 줄: 카운터는 한 명씩. 줄 선 시각 shopAt(각자 attachment)이 빠른 순서. 맨 앞 사람이 주문하고 받을 때까지 나머지는 대기.
     맨 앞이 된 시각 shopFront가 SHOP_HOLD보다 오래되면(창을 내려놓고 자리를 비움) 줄에서 뺀다 */
  shopQueue() {
    const ws = this.others(null).filter(w => w.deserializeAttachment().shopAt).sort((x, y) => x.deserializeAttachment().shopAt - y.deserializeAttachment().shopAt);
    const now = Date.now();
    while (ws.length) {
      const a = ws[0].deserializeAttachment();
      if (!a.shopFront) { a.shopFront = now; ws[0].serializeAttachment(a); break; }
      if (now - a.shopFront < SHOP_HOLD) break;
      a.shopAt = a.shopFront = null; ws[0].serializeAttachment(a); ws.shift();
    }
    return ws.map(w => w.deserializeAttachment().id);
  }
  byId(id) {
    return id ? this.others(null).find(w => w.deserializeAttachment().id === id) : null;
  }
  /* 같이 타기 그룹(최대 4명): 각자 attachment의 grp에 같은 멤버 id 목록(들어온 순서)과 같은 pole */
  setGroup(ids, pole) {
    ids.forEach(id => {
      const w = this.byId(id); if (!w) return;
      const p = w.deserializeAttachment();
      p.grp = ids.slice(); p.pole = pole; w.serializeAttachment(p);
      w.send(JSON.stringify({ t: 'duo', ok: true, i: pole, members: ids }));
    });
  }
  // 그룹에서 빠지기: 남은 사람이 2명 이상이면 그룹 갱신, 1명이면 끝(그 사람은 폴을 혼자 잡은 채로)
  leaveGroup(a) {
    const rest = (a.grp || []).filter(id => id !== a.id), pole = a.pole;
    a.grp = null;
    if (rest.length >= 2) this.setGroup(rest, pole);
    else if (rest.length === 1) {
      const w = this.byId(rest[0]);
      if (w) { const p = w.deserializeAttachment(); p.grp = null; w.serializeAttachment(p); w.send(JSON.stringify({ t: 'duoEnd' })); }
    }
    return rest;
  }
  inGroup(a, id) { return !!(a.grp && a.grp.includes(id)); }
  // 다른 사람에게 보이는 내 상태(snapshot / join 알림용)
  static pub(a) {
    const { id, name, look, x, z, ry, pose, sit, face, spin } = a;
    return { id, name, look, x, z, ry, pose, sit, face, spin, ball: a.ball || null, snack: a.snack || null, bite: a.bite || 0 };
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return ws.close(1009, 'too big');
    const a = ws.deserializeAttachment();
    if (!a) return;
    // 초당 메시지 수 제한(도배·폭주 방지)
    const sec = Math.floor(Date.now()/1000);
    if (a.rl[0] !== sec) a.rl = [sec, 0];
    a.seen = Date.now();   // 유령 정리용 마지막 소식(메시지 끝에서 attachment에 함께 저장)
    if (++a.rl[1] > MAX_PER_SEC) return ws.close(1008, 'too many messages');

    let m;
    try { m = JSON.parse(raw); } catch (e) { return ws.close(1007, 'bad json'); }
    if (!m || typeof m.t !== 'string') return;

    if (!a.joined) {
      if (m.t !== 'join') return;
      this.join(ws, a, m);
      return;
    }

    switch (m.t) {
      case 'move': {
        if (!num(m.x, 20) || !num(m.z, 20) || !num(m.ry, 100) || !inPark(m.x, m.z)) break;
        a.x = round(m.x); a.z = round(m.z); a.ry = round(m.ry);
        const out = { t: 'move', id: a.id, x: a.x, z: a.z, ry: a.ry };
        // 걷는 속도(m/s)와 클릭한 목적지: 받는 쪽이 지연만큼 앞을 예측해서 그린다. 저장하지 않고 전달만
        if (num(m.vx, 3) && num(m.vz, 3)) { out.vx = round(m.vx); out.vz = round(m.vz); }
        if (num(m.tx, 20) && num(m.tz, 20) && inPark(m.tx, m.tz)) { out.tx = round(m.tx); out.tz = round(m.tz); }
        this.broadcast(out, ws);
        break;
      }
      case 'state': {
        if (m.pose !== undefined && POSES.has(m.pose)) a.pose = m.pose;
        if (m.face !== undefined && FACES.has(m.face)) a.face = m.face;
        if (m.sit !== undefined) a.sit = Number.isInteger(m.sit) && m.sit >= 0 && m.sit < 10 ? m.sit : null;
        if (m.spin !== undefined) a.spin = !!m.spin;
        // 콩벌레 자리: [몇 번째, 몇 명 중] (다른 사람 화면에서 높이·방향을 맞추는 데 씀)
        if (m.ball !== undefined) a.ball = Array.isArray(m.ball) && Number.isInteger(m.ball[0]) && Number.isInteger(m.ball[1])
          && m.ball[1] >= 1 && m.ball[1] <= GROUP_MAX && m.ball[0] >= 0 && m.ball[0] < m.ball[1] ? [m.ball[0], m.ball[1]] : null;
        if (m.snack !== undefined) a.snack = SNACKS.has(m.snack) ? m.snack : null;
        if (m.bite !== undefined) a.bite = a.snack && Number.isInteger(m.bite) && m.bite >= 0 && m.bite <= 9 ? m.bite : 0;   // 간식을 몇 입 먹었는지
        const out = { t: 'state', id: a.id, pose: a.pose, sit: a.sit, face: a.face, spin: a.spin, ball: a.ball || null, snack: a.snack || null, bite: a.bite || 0 };
        if (EMOTES.has(m.emote)) out.emote = m.emote;   // 이모트는 한 번 뜨고 끝이라 저장하지 않음
        this.broadcast(out, ws);
        break;
      }
      case 'outfit': {
        a.look = cleanLook(m.look);
        this.broadcast({ t: 'outfit', id: a.id, look: a.look }, ws);
        break;
      }
      case 'name': {
        const name = this.uniqueName(cleanName(m.name), ws);
        if (!name) { ws.send(JSON.stringify({ t: 'name', ok: false })); break; }
        a.name = name;
        this.broadcast({ t: 'name', id: a.id, name }, ws);
        break;
      }
      case 'chat': {
        const text = cleanChat(m.text);
        if (!text) break;
        const now = Date.now();
        // 1초에 1개, 금칙어·링크는 보낸 사람에게만 거절을 알리고 다른 사람에겐 안 보냄
        const why = now - (a.chatAt || 0) < CHAT_GAP ? 'fast' : badText(text);
        if (why) { ws.send(JSON.stringify({ t: 'chat', ok: false, why })); break; }
        a.chatAt = now;
        this.broadcast({ t: 'chat', id: a.id, text }, ws);
        break;
      }
      case 'pole': {
        // 폴 하나에 한 명. 먼저 잡은 사람이 내려오거나 나갈 때까지 잠금. 한 사람은 폴 하나만(다른 폴을 잡으면 앞의 건 풀림)
        const i = m.i === undefined ? 0 : m.i;   // i 없이 보내던 예전 웹은 0번 폴
        if (!Number.isInteger(i) || i < 0 || i >= POLES) break;
        const by = this.poles()[i];
        if (by && by !== a.id && !this.inGroup(a, by)) { ws.send(JSON.stringify({ t: 'pole', ok: false, i, by })); break; }
        if (a.grp && a.pole !== i) this.leaveGroup(a);   // 그룹과 다른 폴로 가면 그룹에서 빠짐
        const old = a.pole;
        a.pole = i; ws.serializeAttachment(a);
        ws.send(JSON.stringify({ t: 'pole', ok: true, i, by: a.id }));
        if (Number.isInteger(old) && old !== i) this.broadcast({ t: 'pole', i: old, by: null }, ws);
        if (!by) this.broadcast({ t: 'pole', i, by: a.id }, ws);
        return;
      }
      case 'unpole': {
        if (!Number.isInteger(a.pole)) break;
        const i = a.pole;
        const rest = a.grp ? this.leaveGroup(a) : [];   // 남은 사람들은 그 폴에 그대로(내 폴 번호를 지우기 전에)
        a.pole = null;
        this.broadcast({ t: 'pole', i, by: rest[0] || null }, ws);
        ws.serializeAttachment(a);
        return;
      }
      case 'shop': {
        if (!a.shopAt) { a.shopAt = Date.now(); a.shopFront = null; ws.serializeAttachment(a); }
        const q = this.shopQueue();
        a.shopFront = ws.deserializeAttachment().shopFront;   // shopQueue() may have just made me the front: keep that when `a` is saved below
        this.broadcast({ t: 'shop', q }, null);
        break;
      }
      case 'unshop': {
        if (!a.shopAt) break;
        a.shopAt = a.shopFront = null; ws.serializeAttachment(a);
        this.broadcast({ t: 'shop', q: this.shopQueue() }, null);
        break;
      }
      case 'mat': {
        // 요가 매트: 한 명씩. 다른 매트에 앉으면 앞의 건 풀림
        const i = m.i;
        if (!Number.isInteger(i) || i < 0 || i >= MATS) break;
        const by = this.mats()[i];
        if (by && by !== a.id) { ws.send(JSON.stringify({ t: 'mat', ok: false, i, by })); break; }
        const old = a.mat;
        a.mat = i; ws.serializeAttachment(a);
        ws.send(JSON.stringify({ t: 'mat', ok: true, i, by: a.id }));
        if (Number.isInteger(old) && old !== i) this.broadcast({ t: 'mat', i: old, by: null }, ws);
        if (!by) this.broadcast({ t: 'mat', i, by: a.id }, ws);
        return;
      }
      case 'unmat': {
        if (!Number.isInteger(a.mat)) break;
        const i = a.mat;
        a.mat = null; ws.serializeAttachment(a);
        this.broadcast({ t: 'mat', i, by: null }, ws);
        return;
      }
      /* 같이 타기: invite → (받은 사람이) accept 또는 decline
         둘 다 혼자면 새 그룹(accept 때 받은 쪽 웹이 고른 빈 폴), 한쪽이 그룹이면 혼자인 쪽이 그 그룹 폴로 합류(최대 4명) */
      case 'invite': {
        const tw = this.byId(m.to), now = Date.now();
        if (!tw || tw === ws || now - (a.invAt || 0) < INVITE_GAP) break;
        const t = tw.deserializeAttachment(), grp = a.grp || t.grp;
        if (a.grp && t.grp) { ws.send(JSON.stringify({ t: 'decline', by: m.to, busy: true })); break; }
        if (grp && grp.length >= GROUP_MAX) { ws.send(JSON.stringify({ t: 'decline', by: m.to, full: true })); break; }
        a.invAt = now; a.inviteTo = m.to;
        tw.send(JSON.stringify({ t: 'invite', from: a.id, name: a.name, size: (grp ? grp.length : 1) + 1 }));
        break;
      }
      case 'decline': {
        const fw = this.byId(m.from);
        if (!fw) break;
        const f = fw.deserializeAttachment();
        if (f.inviteTo !== a.id) break;
        f.inviteTo = null; fw.serializeAttachment(f);
        fw.send(JSON.stringify({ t: 'decline', by: a.id }));
        break;
      }
      case 'accept': {
        const fw = this.byId(m.from), f = fw && fw.deserializeAttachment();
        const no = () => ws.send(JSON.stringify({ t: 'duo', ok: false }));
        if (!f || f.inviteTo !== a.id || (f.grp && a.grp)) { no(); break; }
        let ids, pole;
        if (f.grp || a.grp) {   // 혼자인 쪽이 그룹에 합류
          const g = f.grp || a.grp, owner = f.grp ? f : a;
          if (g.length >= GROUP_MAX) { no(); break; }
          ids = [...g, (f.grp ? a : f).id]; pole = owner.pole;
        } else {
          const i = m.i, by = Number.isInteger(i) && i >= 0 && i < POLES ? this.poles()[i] : 'x';
          if (by && by !== a.id && by !== f.id) { no(); break; }
          ids = [f.id, a.id]; pole = i;
        }
        // 들어오는 사람이 잡고 있던 다른 폴은 놓음
        [[ws, a], [fw, f]].forEach(([w, p]) => { if (Number.isInteger(p.pole) && p.pole !== pole && !p.grp) this.broadcast({ t: 'pole', i: p.pole, by: null }, null); });
        f.inviteTo = null; fw.serializeAttachment(f); ws.serializeAttachment(a);
        this.setGroup(ids, pole);
        this.broadcast({ t: 'pole', i: pole, by: ids[0] }, null);
        return;
      }
      case 'duoSpin': {
        // 같이 타는 중엔 한 명이 스핀을 켜고 끄면 모두 똑같이
        (a.grp || []).filter(id => id !== a.id).forEach(id => { const w = this.byId(id); if (w) w.send(JSON.stringify({ t: 'duoSpin', on: !!m.on, from: a.id })); });
        break;
      }
      case 'duoMove': {
        // 기술을 누른 사람 기준으로 그룹 모두에게(2인 기술은 누른 사람이 위, 짝이 아래)
        if (!DUO.has(m.kind) || !a.grp) break;
        a.grp.filter(id => id !== a.id).forEach(id => { const w = this.byId(id); if (w) w.send(JSON.stringify({ t: 'duoMove', kind: m.kind, from: a.id })); });
        break;
      }
    }
    ws.serializeAttachment(a);
  }

  // 같은 이름이 있으면 #2, #3 …
  uniqueName(name, ws) {
    if (!name) return '';
    const taken = new Set(this.others(ws).map(w => w.deserializeAttachment().name));
    if (taken.has(name)) { let i = 2; while (taken.has(`${name}#${i}`)) i++; name = `${name}#${i}`; }
    return name;
  }

  join(ws, a, m) {
    const name = this.uniqueName(cleanName(m.name), ws);
    if (!name) return ws.close(4002, 'bad name');
    Object.assign(a, {
      joined: true, id: crypto.randomUUID().slice(0, 8), name, look: cleanLook(m.look),
      x: num(m.x, 20) && num(m.z, 20) && inPark(m.x, m.z) ? round(m.x) : 0.9,
      z: num(m.x, 20) && num(m.z, 20) && inPark(m.x, m.z) ? round(m.z) : 1.6,
      ry: num(m.ry, 100) ? round(m.ry) : 0, pose: 'stand', sit: null,
      face: FACES.has(m.face) ? m.face : 'auto', spin: false, pole: null, mat: null, grp: null, ball: null, snack: null,
    });
    ws.serializeAttachment(a);
    ws.send(JSON.stringify({
      t: 'welcome', id: a.id, name: a.name, cap: this.cap, poles: this.poles(), mats: this.mats(), shop: this.shopQueue(),
      players: this.others(ws).map(w => Room.pub(w.deserializeAttachment())),
    }));
    this.broadcast({ t: 'join', p: Room.pub(a) }, ws);
    this.ctx.waitUntil(this.notifyJoin(a).catch(() => {}));   // 알림이 늦거나 실패해도 입장에는 영향 없게
  }

  // 입장 집계 + 새 방문이면 운영자 슬랙으로 알림.
  // NOTIFY_SKIP(쉼표로 구분한 닉네임)은 운영자 본인 테스트용으로 알림·집계에서 뺀다
  async notifyJoin(a) {
    if (this.skipped(a.name)) return;
    // 방별 날짜별 입장 수(새로고침·방 이동 포함, 요약의 "방별 입장")
    const key = 'joins:' + kstDay(), day = (await this.ctx.storage.get(key)) || { n: 0 };
    day.n++;
    await this.ctx.storage.put(key, day);
    const { visit } = await statsHub(this.env).fetch('https://stats/join', { method: 'POST', body: a.name.replace(/#\d+$/, '') }).then(r => r.json());
    if (!visit) return;
    // 닉네임에 <!channel> 같은 슬랙 문법이 들어가도 글자로만 보이게
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await slack(this.env, `:wave: *${esc(a.name)}* 님이 ${a.room || '?'}번 호숫가에 들어왔어요 (지금 ${this.others(null).length}명)`);
  }
  skipped(name) {
    return (this.env.NOTIFY_SKIP || '').split(',').map(s => s.trim()).includes(name.replace(/#\d+$/, ''));
  }
  // 그날 입장 수. 지난 날짜 기록은 이때 지운다
  async dayStats(day) {
    const all = await this.ctx.storage.list({ prefix: 'joins:' });
    for (const k of all.keys()) if (k < 'joins:' + day) await this.ctx.storage.delete(k);
    return all.get('joins:' + day) || { n: 0 };
  }

  async webSocketClose(ws, code, reason) {
    this.leave(ws);
    try { ws.close(code, reason); } catch (e) {}
  }
  async webSocketError(ws) {
    this.leave(ws);
  }
  leave(ws) {
    const a = ws.deserializeAttachment();
    if (!a?.joined) return;
    // 나간 시각부터 30분을 다시 잰다(오래 놀다 새로고침해도 같은 방문)
    if (!this.skipped(a.name)) this.ctx.waitUntil(statsHub(this.env).fetch('https://stats/leave', { method: 'POST', body: a.name.replace(/#\d+$/, '') }).catch(() => {}));
    const pole = a.pole, rest = a.grp ? this.leaveGroup(a) : [];
    ws.serializeAttachment({ ...a, joined: false, pole: null, mat: null, grp: null, shopAt: null, shopFront: null });
    if (a.shopAt) this.broadcast({ t: 'shop', q: this.shopQueue() }, ws);
    if (Number.isInteger(a.mat)) this.broadcast({ t: 'mat', i: a.mat, by: null }, ws);
    this.broadcast({ t: 'leave', id: a.id }, ws);
    if (Number.isInteger(pole)) this.broadcast({ t: 'pole', i: pole, by: rest[0] || null }, ws);
  }
}

/* ---------- 방문 집계 ----------
   방(DO)은 서로의 기록을 못 보므로, 방 이동까지 같은 방문으로 묶으려면 한 곳에서 센다.
   정의는 docs/analytics.md "서버 집계". 닉네임 기준이라 GA4(브라우저 쿠키 기준)와 정확히 같지는 않다 */
export class Stats extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.gapMs = (+env.VISIT_GAP_SEC || VISIT_GAP_SEC)*1000;   // 시험할 땐 --var VISIT_GAP_SEC:3
  }
  async fetch(req) {
    const url = new URL(req.url), now = Date.now();
    if (url.pathname === '/day') {
      const day = url.searchParams.get('day');
      const all = await this.ctx.storage.list({ prefix: 'day:' });
      for (const k of all.keys()) if (k < 'day:' + day) await this.ctx.storage.delete(k);
      return Response.json(all.get('day:' + day) || { visits: 0, names: [] });
    }
    const name = (await req.text()).slice(0, 20);
    // 닉네임별 마지막 입장·퇴장 시각. 30분 지난 건 지운다
    const last = (await this.ctx.storage.get('last')) || {};
    for (const k in last) if (now - last[k] >= this.gapMs) delete last[k];
    const visit = url.pathname === '/join' && !last[name];
    last[name] = now;
    await this.ctx.storage.put('last', last);
    if (visit) {
      const key = 'day:' + kstDay(), d = (await this.ctx.storage.get(key)) || { visits: 0, names: [] };
      d.visits++;
      if (!d.names.includes(name) && d.names.length < 2000) d.names.push(name);
      await this.ctx.storage.put(key, d);
    }
    return Response.json({ visit });
  }
}
