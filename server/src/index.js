// 폴크닉 실시간 서버
// - Worker: /ws?room=N 접속을 방 N(Durable Object "room-N")으로 넘긴다
// - Room: 방 하나. WebSocket Hibernation API를 써서 조용할 땐 잠들고(요금 없음), 메시지가 오면 깬다.
//   잠들면 메모리가 사라지므로 접속자 정보는 소켓마다 serializeAttachment()에 둔다(최대 2KB).
// 메시지 형식은 docs/MULTIPLAYER.md "서버 프로토콜" 참고.
import { DurableObject } from 'cloudflare:workers';

const PROD_ORIGIN = 'https://polknic.yujamong.com';
// 개발 중 맥(localhost)과 같은 와이파이의 폰(사설 IP)에서 여는 페이지도 허용
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/') return new Response('polknic-server ok');
    if (url.pathname !== '/ws') return new Response('not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const origin = req.headers.get('Origin') || '';
    if (origin !== PROD_ORIGIN && !DEV_ORIGIN.test(origin)) return new Response('forbidden origin', { status: 403 });
    const n = parseInt(url.searchParams.get('room'), 10);
    if (!(n >= 1 && n <= +env.MAX_ROOMS)) return new Response('no such room', { status: 404 });
    const room = env.ROOMS.get(env.ROOMS.idFromName('room-' + n));
    return room.fetch(req);
  },
};

/* ---------- 검증 ---------- */
const POSES = new Set(['stand', 'ready', 'sitGround', 'sitBench', 'chair', 'ppose', 'hera', 'brass', 'split']);
const FACES = new Set(['auto', 'open', 'wink', 'joy', 'wow']);
const EMOTES = new Set(['heart', 'note', 'wow', 'sparkle']);
const LOOK_KEYS = ['top', 'topColor', 'bottom', 'bottomColor', 'shoes', 'hair', 'acc', 'hairColor', 'eyeColor', 'skin'];
const MAX_MSG = 2048, MAX_PER_SEC = 30;

const num = (v, lim) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim;
const round = v => Math.round(v*1000)/1000;
// 닉네임: 공백 정리, 12자. 금칙어 검사는 채팅 작업(5번) 때 추가
const cleanName = v => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 12) : '';
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
    // 연결 유지용 ping은 방을 깨우지 않고 Cloudflare가 바로 답한다
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(req) {
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    if (this.ctx.getWebSockets().length >= this.cap) {
      // 꽉 참: 방에 등록하지 않는 일반 소켓으로 받아 알리고 바로 닫는다(hibernation 소켓으로 받으면 닫힘이 전달되지 않음)
      server.accept();
      server.send(JSON.stringify({ t: 'full' }));
      server.close(4001, 'full');
    } else {
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ joined: false, rl: [0, 0] });
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  // 접속해 있는(join을 마친) 다른 사람들
  others(except) {
    return this.ctx.getWebSockets().filter(ws => ws !== except && ws.deserializeAttachment()?.joined);
  }
  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    this.others(except).forEach(ws => { try { ws.send(s); } catch (e) {} });
  }
  poleBy() {
    const ws = this.ctx.getWebSockets().find(w => w.deserializeAttachment()?.pole);
    return ws ? ws.deserializeAttachment().id : null;
  }
  // 다른 사람에게 보이는 내 상태(snapshot / join 알림용)
  static pub(a) {
    const { id, name, look, x, z, ry, pose, sit, face, spin } = a;
    return { id, name, look, x, z, ry, pose, sit, face, spin };
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return ws.close(1009, 'too big');
    const a = ws.deserializeAttachment();
    if (!a) return;
    // 초당 메시지 수 제한(도배·폭주 방지)
    const sec = Math.floor(Date.now()/1000);
    if (a.rl[0] !== sec) a.rl = [sec, 0];
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
        const out = { t: 'state', id: a.id, pose: a.pose, sit: a.sit, face: a.face, spin: a.spin };
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
        if (!name) break;
        a.name = name;
        this.broadcast({ t: 'name', id: a.id, name }, ws);
        break;
      }
      case 'pole': {
        // 폴은 하나라 한 명만. 먼저 잡은 사람이 내려오거나 나갈 때까지 잠금
        const by = this.poleBy();
        if (by && by !== a.id) { ws.send(JSON.stringify({ t: 'pole', ok: false, by })); break; }
        a.pole = true; ws.serializeAttachment(a);
        ws.send(JSON.stringify({ t: 'pole', ok: true, by: a.id }));
        if (!by) this.broadcast({ t: 'pole', by: a.id }, ws);
        return;
      }
      case 'unpole': {
        if (!a.pole) break;
        a.pole = false; ws.serializeAttachment(a);
        this.broadcast({ t: 'pole', by: null }, ws);
        return;
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
      face: FACES.has(m.face) ? m.face : 'auto', spin: false, pole: false,
    });
    ws.serializeAttachment(a);
    ws.send(JSON.stringify({
      t: 'welcome', id: a.id, name: a.name, cap: this.cap, poleBy: this.poleBy(),
      players: this.others(ws).map(w => Room.pub(w.deserializeAttachment())),
    }));
    this.broadcast({ t: 'join', p: Room.pub(a) }, ws);
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
    ws.serializeAttachment({ ...a, joined: false, pole: false });
    this.broadcast({ t: 'leave', id: a.id }, ws);
    if (a.pole) this.broadcast({ t: 'pole', by: null }, ws);
  }
}
