// 운영자 페이지(/admin). 글은 모두 textContent로만 그린다. 비밀번호는 이 탭의 sessionStorage에만 둔다
export const ADMIN_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>폴크닉 운영자</title>
<style>
:root{--ink:#5a4237;--muted:#8b7468;--line:rgba(90,66,55,.16);--accent:#f0789a;--bg:#fff7e8}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}
main{max-width:760px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:4px 0 12px}
h2{font-size:16px;margin:0}
nav,.filters,.acts{display:flex;flex-wrap:wrap;gap:6px}
nav{margin-bottom:14px}
button{font:inherit;font-size:13px;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 11px;cursor:pointer}
button.on{background:var(--accent);border-color:var(--accent);color:#fff}
button.danger{color:#b4385a}
input,textarea{font:inherit;font-size:16px;color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:#fff;width:100%}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:10px}
.card.dim{opacity:.6}
.meta{font-size:12.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:4px}
.tag{font-weight:600;color:var(--accent)}
.text{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 8px}
.contact{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13.5px;background:var(--bg);border-radius:10px;padding:7px 10px;margin-bottom:8px}
.contact b{font-weight:600;overflow-wrap:anywhere}
.contact small{color:var(--muted)}
.notice{font-size:13px;color:var(--muted);background:#fff;border:1px dashed var(--line);border-radius:10px;padding:8px 10px;margin:10px 0}
.notice b{color:var(--ink);font-weight:600}
.row{display:flex;gap:6px;margin-bottom:8px}
.row button{flex:0 0 auto}
.empty{color:var(--muted);padding:18px 0;text-align:center}
#err{color:#b4385a;font-size:13px;min-height:18px;margin:6px 0}
#login{max-width:340px;margin:18vh auto 0}
</style></head><body><main>
<div id="login"><h1>폴크닉 운영자</h1><input id="key" type="password" aria-label="운영자 비밀번호" placeholder="운영자 비밀번호" autocomplete="current-password"><div id="err"></div><button id="enter" class="on" type="button">들어가기</button></div>
<div id="app" hidden>
  <h1>폴크닉 운영자</h1>
  <nav id="tabs"></nav>
  <div id="view"></div>
</div>
</main>
<script>
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const btn = (label, fn, cls) => { const b = el('button', cls, label); b.type = 'button'; b.onclick = fn; return b; };
const stamp = t => { const d = new Date(t + 9*3600000); return (d.getUTCMonth()+1) + '/' + d.getUTCDate() + ' ' + String(d.getUTCHours()).padStart(2,'0') + ':' + String(d.getUTCMinutes()).padStart(2,'0'); };
const dayOnly = t => { const d = new Date(t + 9*3600000); return d.getUTCFullYear() + '. ' + (d.getUTCMonth()+1) + '. ' + d.getUTCDate() + '.'; };
let key = '', data = null, tab = 'inbox', filter = 'open';
try { key = sessionStorage.getItem('polk-admin') || ''; } catch (e) {}

async function api(body) {
  const r = await fetch('/admin/api', { method:'POST', headers:{ 'x-admin-key': key, 'content-type':'application/json' }, body: JSON.stringify(body) });
  if (r.status === 403) { logout('비밀번호가 맞지 않아요'); throw new Error('denied'); }
  if (!r.ok) throw new Error('서버 오류 ' + r.status);
  return r.json();
}
function logout(msg) { key = ''; try { sessionStorage.removeItem('polk-admin'); } catch (e) {} $('app').hidden = true; $('login').hidden = false; $('err').textContent = msg || ''; }
async function load() { data = await api({ do:'list' }); $('login').hidden = true; $('app').hidden = false; draw(); }
async function act(body, confirmMsg) { if (confirmMsg && !confirm(confirmMsg)) return; await api(body); await load(); }
$('enter').onclick = () => { key = $('key').value; try { sessionStorage.setItem('polk-admin', key); } catch (e) {} load().catch(e => { if (e.message !== 'denied') $('err').textContent = e.message; }); };
$('key').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });

function draw() {
  const t = $('tabs'); t.textContent = '';
  const open = data.inbox.filter(x => !x.done).length;
  [['inbox','문의·제안 ' + open], ['req','기술 요청 ' + data.req.length], ['guest','방명록 ' + data.guest.length]].forEach(([k, label]) => t.append(btn(label, () => { tab = k; draw(); }, tab === k ? 'on' : '')));
  const v = $('view'); v.textContent = '';
  ({ inbox: drawInbox, req: drawReq, guest: drawGuest })[tab](v);
}

function drawInbox(v) {
  const f = el('div', 'filters');
  [['open','처리 안 함'], ['all','전체'], ['ask','문의'], ['idea','제안']].forEach(([k, label]) => f.append(btn(label, () => { filter = k; draw(); }, filter === k ? 'on' : '')));
  v.append(f);
  const n = el('p', 'notice');
  n.append(el('b', '', '연락처 자동 삭제: '), data.contactDays + '일이 지난 연락처는 매일 23:59(한국 시간) 서버 예약 작업이 Cloudflare D1에서 지워요. 처리 완료를 누르면 바로 지워져요. 슬랙에는 보내지 않아요.');
  v.append(n);
  const list = data.inbox.filter(x => filter === 'all' ? true : filter === 'open' ? !x.done : x.kind === filter);
  if (!list.length) v.append(el('p', 'empty', '해당하는 글이 없어요'));
  list.forEach(x => {
    const c = el('div', 'card' + (x.done ? ' dim' : ''));
    const m = el('div', 'meta');
    m.append(el('span', 'tag', x.kind === 'idea' ? '제안' : '문의'), el('span', '', x.name || '이름 없음'), el('span', '', stamp(x.at)));
    if (x.done) m.append(el('span', '', '처리 완료'));
    c.append(m, el('p', 'text', x.text));
    if (x.contact) {
      const k = el('div', 'contact');
      k.append(el('b', '', x.contact), el('small', '', dayOnly(x.at + data.contactDays*86400000) + ' 23:59 자동 삭제'), btn('연락처 삭제', () => act({ do:'delContact', id:x.id }, '이 연락처를 지울까요? 되돌릴 수 없어요.'), 'danger'));
      c.append(k);
    }
    const r = el('div', 'row'), memo = el('input');
    memo.value = x.memo; memo.maxLength = 200; memo.placeholder = '처리 메모'; memo.setAttribute('aria-label', '처리 메모');
    r.append(memo, btn('메모 저장', () => act({ do:'memo', id:x.id, memo:memo.value })));
    c.append(r);
    const a = el('div', 'acts');
    a.append(x.done
      ? btn('처리 취소', () => act({ do:'done', id:x.id, on:false }))
      : btn('처리 완료', () => act({ do:'done', id:x.id, on:true }, x.contact ? '처리 완료하면 연락처가 바로 지워져요. 답장을 마쳤나요?' : null)));
    a.append(btn('글 삭제', () => act({ do:'delInbox', id:x.id }, '이 글을 지울까요? 되돌릴 수 없어요.'), 'danger'));
    c.append(a);
    v.append(c);
  });
}

function drawReq(v) {
  if (!data.req.length) v.append(el('p', 'empty', '아직 요청이 없어요'));
  data.req.forEach(x => {
    const c = el('div', 'card' + (x.hidden ? ' dim' : ''));
    const m = el('div', 'meta');
    m.append(el('span', 'tag', '하트 ' + x.hearts), el('span', '', stamp(x.at)));
    if (x.hidden) m.append(el('span', '', '내림'));
    c.append(m, el('p', 'text', x.title));
    const a = el('div', 'acts');
    [['', '도장 없음'], ['making', '만드는 중'], ['done', '추가됨']].forEach(([s, label]) => a.append(btn(label, () => act({ do:'status', id:x.id, status:s }), x.status === s ? 'on' : '')));
    a.append(btn(x.hidden ? '되돌리기' : '내리기', () => act({ do:'hideReq', id:x.id, on:!x.hidden }), 'danger'));
    c.append(a);
    v.append(c);
  });
}

function drawGuest(v) {
  if (!data.guest.length) v.append(el('p', 'empty', '아직 방명록이 없어요'));
  data.guest.forEach(x => {
    const c = el('div', 'card' + (x.hidden ? ' dim' : ''));
    const m = el('div', 'meta');
    m.append(el('span', 'tag', x.name), el('span', '', stamp(x.at)));
    if (x.hidden) m.append(el('span', '', '내림'));
    c.append(m, el('p', 'text', x.text));
    c.append(btn(x.hidden ? '되돌리기' : '내리기', () => act({ do:'hideGuest', id:x.id, on:!x.hidden }), 'danger'));
    v.append(c);
  });
}

if (key) load().catch(() => {});
</script></body></html>`;
