// 게시판 HTTP API. 원본은 D1(env.DB) 한 곳. 설명은 docs/BOARD.md
// - 공개: GET /board, POST /board/guest·req·heart·del
// - 비공개: POST /board/inbox(쓰기만), /admin(운영자 페이지, ADMIN_KEY 필요)
import { badText } from './words.js';
import { ADMIN_HTML } from './admin.js';

const GUEST_LEN = 40, TITLE_LEN = 20, INBOX_LEN = 200, CONTACT_LEN = 60, MEMO_LEN = 200;
const LIMITS = { guest: 3, req: 2, inbox: 5 };   // 브라우저 하나가 하루에 쓸 수 있는 수
const IP_LIMIT = 20;                             // 같은 IP의 하루 상한(와이파이를 같이 쓰는 학원 때문에 넉넉히)
const HEART_PER_MIN = 30;                        // 같은 IP의 분당 하트. 접속당 1회는 클라이언트가 지킴
const MAX_BODY = 4096, LIST_MAX = 60;
export const CONTACT_DAYS = 90;

const kstDay = (t = Date.now()) => new Date(t + 9*3600*1000).toISOString().slice(0, 10);
const oneLine = (v, n) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '';
// 슬랙 문법(<!channel> 등)이 글자로만 보이게
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// 글쓴이가 이번 접속에서 자기 글을 지울 때 쓰는 표. 서버에 저장하지 않고 (종류, 글 번호)를 서명해서 만든다.
// 클라이언트는 메모리에만 들고 있어서 새로고침하면 사라진다. ADMIN_KEY가 없으면 표도 없음
async function delKey(env, kind, id) {
  if (!env.ADMIN_KEY) return '';
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode('board-del:' + env.ADMIN_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, enc.encode(kind + ':' + id));
  return [...new Uint8Array(s)].slice(0, 16).map(x => x.toString(16).padStart(2, '0')).join('');
}

async function slack(env, text) {
  if (env.SLACK_WEBHOOK) await fetch(env.SLACK_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
}

async function bump(env, key, day) {
  const r = await env.DB.prepare('INSERT INTO limits(k, n, day) VALUES(?1, 1, ?2) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n').bind(key, day).first();
  return r.n;
}
// 제한을 넘으면 true
async function overLimit(env, req, scope, bid) {
  const day = kstDay(), ip = req.headers.get('CF-Connecting-IP') || '';
  const b = typeof bid === 'string' && /^[\w-]{8,40}$/.test(bid) ? bid : ip;
  if (await bump(env, `${scope}:b:${await sha(day + b)}`, day) > LIMITS[scope]) return true;
  return await bump(env, `${scope}:i:${await sha(day + ip)}`, day) > IP_LIMIT;
}

async function readBoard(env) {
  const [g, r] = await env.DB.batch([
    env.DB.prepare('SELECT id, name, text, at FROM guest WHERE hidden = 0 ORDER BY at DESC LIMIT ?1').bind(LIST_MAX),
    env.DB.prepare('SELECT id, title, hearts, at FROM req WHERE hidden = 0 ORDER BY hearts DESC, at DESC LIMIT ?1').bind(LIST_MAX),
  ]);
  return { guest: g.results, req: r.results };
}

export async function boardRoute(req, env, ctx, url, origin, allowed) {
  const cors = { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Cache-Control': 'no-store' };
  const send = (o, status = 200) => Response.json(o, { status, headers: cors });
  if (!allowed) return new Response('forbidden origin', { status: 403 });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400' } });
  if (!env.DB) return send({ error: 'off' }, 503);
  if (url.pathname === '/board' && req.method === 'GET') return send(await readBoard(env));
  if (req.method !== 'POST') return send({ error: 'method' }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return send({ error: 'big' }, 413);
  let b;
  try { b = JSON.parse(raw); } catch (e) { return send({ error: 'json' }, 400); }
  const now = Date.now();
  const later = p => ctx.waitUntil(p.catch(() => {}));   // 알림이 실패해도 글은 저장된다
  const adminUrl = new URL('/admin', req.url).href;

  if (url.pathname === '/board/guest') {
    const name = oneLine(b.name, 12), text = oneLine(b.text, GUEST_LEN);
    if (!name || !text) return send({ error: 'empty' }, 400);
    if (badText(name) || badText(text)) return send({ error: 'bad' }, 422);
    if (await overLimit(env, req, 'guest', b.bid)) return send({ error: 'limit' }, 429);
    const row = await env.DB.prepare('INSERT INTO guest(name, text, at) VALUES(?1, ?2, ?3) RETURNING id').bind(name, text, now).first();
    later(slack(env, `:memo: 방명록 *${esc(name)}*: ${esc(text)}\n내리기: ${adminUrl}`));
    return send({ id: row.id, key: await delKey(env, 'guest', row.id) });
  }

  if (url.pathname === '/board/req') {
    const title = oneLine(b.title, TITLE_LEN), norm = title.toLowerCase().replace(/\s+/g, '');
    if (!title) return send({ error: 'empty' }, 400);
    if (badText(title)) return send({ error: 'bad' }, 422);
    const old = await env.DB.prepare('SELECT id, hidden FROM req WHERE norm = ?1').bind(norm).first();
    if (old) {
      if (old.hidden) return send({ error: 'bad' }, 422);   // 운영자가 내린 이름은 다시 올리지 못함
      if (Array.isArray(b.liked) && b.liked.includes(old.id)) return send({ id: old.id, result: 'liked' });
      if (await heartLimited(env, req)) return send({ error: 'limit' }, 429);
      await env.DB.prepare('UPDATE req SET hearts = hearts + 1 WHERE id = ?1').bind(old.id).run();
      return send({ id: old.id, result: 'merged' });
    }
    if (await overLimit(env, req, 'req', b.bid)) return send({ error: 'limit' }, 429);
    const row = await env.DB.prepare('INSERT INTO req(title, norm, at) VALUES(?1, ?2, ?3) RETURNING id').bind(title, norm, now).first();
    later(slack(env, `:sparkles: 기술 요청: ${esc(title)}\n관리: ${adminUrl}`));
    return send({ id: row.id, result: 'new', key: await delKey(env, 'req', row.id) });
  }

  // 내 글 지우기: 이번 접속에서 쓴 글만(새로 붙인 기술 요청 포함, 합쳐진 요청은 표가 없음).
  // 운영자가 내린 글(다시 못 올리게 막아 둔 이름)은 지우지 못함
  if (url.pathname === '/board/del') {
    const kind = b.kind === 'req' ? 'req' : b.kind === 'guest' ? 'guest' : '';
    if (!kind || !Number.isInteger(b.id)) return send({ error: 'id' }, 400);
    const want = await delKey(env, kind, b.id);
    if (!want || typeof b.key !== 'string' || await sha(b.key) !== await sha(want)) return send({ error: 'denied' }, 403);
    const r = await env.DB.prepare(`DELETE FROM ${kind} WHERE id = ?1 AND hidden = 0`).bind(b.id).run();
    return r.meta.changes ? send({ ok: true }) : send({ error: 'gone' }, 404);
  }

  if (url.pathname === '/board/heart') {
    if (!Number.isInteger(b.id)) return send({ error: 'id' }, 400);
    if (await heartLimited(env, req)) return send({ error: 'limit' }, 429);
    const row = await env.DB.prepare('UPDATE req SET hearts = hearts + 1 WHERE id = ?1 AND hidden = 0 RETURNING hearts').bind(b.id).first();
    return row ? send({ hearts: row.hearts }) : send({ error: 'gone' }, 404);
  }

  if (url.pathname === '/board/inbox') {
    const kind = b.kind === 'idea' ? 'idea' : 'ask', text = typeof b.text === 'string' ? b.text.trim().slice(0, INBOX_LEN) : '';
    const contact = oneLine(b.contact, CONTACT_LEN), name = oneLine(b.name, 12);
    if (!text) return send({ error: 'empty' }, 400);
    if (await overLimit(env, req, 'inbox', b.bid)) return send({ error: 'limit' }, 429);
    await env.DB.prepare('INSERT INTO inbox(kind, name, text, contact, at) VALUES(?1, ?2, ?3, ?4, ?5)').bind(kind, name, text, contact, now).run();
    // 연락처는 슬랙에 보내지 않는다(슬랙에 남으면 90일 뒤 지울 수 없음)
    later(slack(env, `:mailbox: ${kind === 'idea' ? '제안' : '문의'} *${esc(name || '이름 없음')}*${contact ? ' (답장 요청 있음)' : ''}: ${esc(text)}\n보기: ${adminUrl}`));
    return send({ ok: true });
  }
  return send({ error: 'not found' }, 404);
}

async function heartLimited(env, req) {
  const now = Date.now(), ip = req.headers.get('CF-Connecting-IP') || '';
  return await bump(env, `heart:${await sha(kstDay(now) + ip)}:${Math.floor(now/60000)}`, kstDay(now)) > HEART_PER_MIN;
}

/* ---------- 운영자 페이지 ---------- */
export async function adminRoute(req, env, url) {
  const secure = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
  if (url.pathname === '/admin') {
    return new Response(ADMIN_HTML, { headers: { ...secure, 'content-type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'" } });
  }
  if (url.pathname !== '/admin/api' || req.method !== 'POST') return new Response('not found', { status: 404 });
  const send = (o, status = 200) => Response.json(o, { status, headers: secure });
  if (!env.ADMIN_KEY || !env.DB) return send({ error: 'off' }, 503);
  const key = req.headers.get('x-admin-key') || '';
  if (await sha(key) !== await sha(env.ADMIN_KEY)) return send({ error: 'denied' }, 403);

  let b;
  try { b = JSON.parse((await req.text()).slice(0, MAX_BODY)); } catch (e) { return send({ error: 'json' }, 400); }
  const db = env.DB, id = b.id;
  const run = (sql, ...args) => db.prepare(sql).bind(...args).run();
  if (b.do === 'list') {
    const [i, g, r] = await db.batch([
      db.prepare('SELECT * FROM inbox ORDER BY at DESC LIMIT 300'),
      db.prepare('SELECT * FROM guest ORDER BY at DESC LIMIT 200'),
      db.prepare('SELECT id, title, hearts, at, hidden FROM req ORDER BY hearts DESC, at DESC LIMIT 200'),
    ]);
    return send({ inbox: i.results, guest: g.results, req: r.results, contactDays: CONTACT_DAYS });
  }
  if (!Number.isInteger(id)) return send({ error: 'id' }, 400);
  if (b.do === 'memo') await run('UPDATE inbox SET memo = ?1 WHERE id = ?2', String(b.memo || '').slice(0, MEMO_LEN), id);
  else if (b.do === 'done') await run("UPDATE inbox SET done = ?1, contact = CASE WHEN ?1 = 1 THEN '' ELSE contact END WHERE id = ?2", b.on ? 1 : 0, id);
  else if (b.do === 'delContact') await run("UPDATE inbox SET contact = '' WHERE id = ?1", id);
  else if (b.do === 'delInbox') await run('DELETE FROM inbox WHERE id = ?1', id);
  else if (b.do === 'hideGuest') await run('UPDATE guest SET hidden = ?1 WHERE id = ?2', b.on ? 1 : 0, id);
  else if (b.do === 'hideReq') await run('UPDATE req SET hidden = ?1 WHERE id = ?2', b.on ? 1 : 0, id);
  else if (b.do === 'delGuest') await run('DELETE FROM guest WHERE id = ?1', id);
  else if (b.do === 'delReq') await run('DELETE FROM req WHERE id = ?1', id);   // 내린 이름이면 막아 둔 것도 풀림
  else return send({ error: 'do' }, 400);
  return send({ ok: true });
}

/* ---------- 매일 정리 (cron) ---------- */
export async function boardCleanup(env, now = Date.now()) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare("UPDATE inbox SET contact = '' WHERE contact <> '' AND at < ?1").bind(now - CONTACT_DAYS*86400000),
    env.DB.prepare('DELETE FROM limits WHERE day < ?1').bind(kstDay(now)),
  ]);
}
