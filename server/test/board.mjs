// 로컬 서버(npm run dev) 대상 알림판 확인. 먼저 npx wrangler d1 migrations apply polknic-board --local
//   ADMIN_KEY=... node test/board.mjs   (ADMIN_KEY는 server/.dev.vars와 같은 값)
const BASE = process.env.HTTP_URL || 'http://127.0.0.1:8787';
const ORIGIN = 'http://localhost:5173', KEY = process.env.ADMIN_KEY || '';
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg); if (!cond) failed++; };
const tag = Date.now().toString(36);
const bid = s => (`test-${s}-${tag}`).padEnd(8, 'x');
const post = async (path, body, origin = ORIGIN) => {
  const r = await fetch(`${BASE}/board/${path}`, { method:'POST', headers:{ origin, 'content-type':'application/json' }, body:JSON.stringify(body) });
  return { status:r.status, j:await r.json().catch(() => ({})) };
};
const read = async () => (await fetch(`${BASE}/board`, { headers:{ origin:ORIGIN } })).json();
const admin = async (body, key = KEY) => {
  const r = await fetch(`${BASE}/admin/api`, { method:'POST', headers:{ 'x-admin-key':key, 'content-type':'application/json' }, body:JSON.stringify(body) });
  return { status:r.status, j:await r.json().catch(() => ({})) };
};

console.log('출처·입력 검사');
ok((await fetch(`${BASE}/board`, { headers:{ origin:'https://evil.example' } })).status === 403, '다른 사이트에서 읽기 거절');
ok((await post('guest', { name:'a', text:'' })).status === 400, '빈 방명록 거절');
ok((await post('guest', { name:'유자', text:'시발', bid:bid('g') })).status === 422, '금칙어 방명록 거절');
ok((await post('guest', { name:'유자', text:'여기 https://a.com', bid:bid('g') })).status === 422, '링크 방명록 거절');

console.log('방명록');
const g = await post('guest', { name:'유자', text:`  안녕   ${tag}  `, bid:bid('g') });
ok(g.status === 200 && g.j.id, `저장 (id ${g.j.id})`);
const gRow = (await read()).guest.find(n => n.id === g.j.id);
ok(gRow && gRow.text === `안녕 ${tag}`, '공백 정리 후 공개 목록에 보임');
ok(gRow && !('hidden' in gRow), '공개 목록에 관리 값 없음');
await post('guest', { name:'유자', text:'둘', bid:bid('g') }); await post('guest', { name:'유자', text:'셋', bid:bid('g') });
ok((await post('guest', { name:'유자', text:'넷', bid:bid('g') })).status === 429, '브라우저당 하루 3장 제한');

console.log('기술 요청');
const title = `아이언 ${tag}`.slice(0, 20);
const r1 = await post('req', { title, bid:bid('r') });
ok(r1.j.result === 'new', '새 요청');
const r2 = await post('req', { title:title.replace(' ', '').toUpperCase(), bid:bid('r2') });
ok(r2.j.result === 'merged' && r2.j.id === r1.j.id, '띄어쓰기·대소문자 달라도 같은 요청 → 하트 +1');
const r3 = await post('req', { title, bid:bid('r2'), liked:[r1.j.id] });
ok(r3.j.result === 'liked', '이번 접속에 이미 눌렀으면 그대로');
let row = (await read()).req.find(n => n.id === r1.j.id);
ok(row.hearts === 2, `하트 2개 (${row.hearts})`);
ok((await post('heart', { id:r1.j.id })).j.hearts === 3, '하트 버튼 +1');

console.log('문의·제안');
const secret = `contact-${tag}@example.com`;
ok((await post('inbox', { kind:'ask', text:'', bid:bid('i') })).status === 400, '빈 문의 거절');
const m = await post('inbox', { kind:'idea', name:'유자', text:'=1+1 여기 링크 https://a.com', contact:secret, bid:bid('i') });
ok(m.j.ok, '문의는 링크가 있어도 저장');
ok(!JSON.stringify(await read()).includes(secret), '공개 목록에 문의·연락처 없음');

console.log('운영자');
ok((await admin({ do:'list' }, 'wrong')).status === 403, '틀린 비밀번호 거절');
ok((await fetch(`${BASE}/admin`)).headers.get('x-robots-tag') === 'noindex', '페이지 noindex');
let list = (await admin({ do:'list' })).j;
let item = list.inbox.find(x => x.contact === secret);
ok(item && item.kind === 'idea', '문의함에 보임');
await admin({ do:'memo', id:item.id, memo:'메모' });
await admin({ do:'status', id:r1.j.id, status:'making' });
ok((await post('req', { title, bid:bid('r3') })).j.result === 'making', '만드는 중 안내');
await admin({ do:'status', id:r1.j.id, status:'done' });
ok((await post('req', { title, bid:bid('r3') })).j.result === 'done', '추가됨은 하트 없이 안내');
ok((await post('heart', { id:r1.j.id })).status === 404, '추가된 요청에 하트 거절');
await admin({ do:'hideGuest', id:g.j.id, on:true });
ok(!(await read()).guest.some(n => n.id === g.j.id), '내린 방명록은 안 보임');
await admin({ do:'hideReq', id:r1.j.id, on:true });
ok((await post('req', { title, bid:bid('r3') })).status === 422, '내린 기술 이름은 다시 못 올림');
await admin({ do:'done', id:item.id, on:true });
list = (await admin({ do:'list' })).j; item = list.inbox.find(x => x.id === item.id);
ok(item.done === 1 && item.contact === '' && item.memo === '메모', '처리 완료 → 연락처 바로 삭제, 메모 유지');

console.log('내 글 지우기');
ok(typeof r1.j.key === 'string' && r1.j.key.length === 32 && !r2.j.key, '새 요청엔 지우기 표, 합쳐진 요청엔 없음');
ok((await post('del', { kind:'req', id:r1.j.id, key:r1.j.key })).status === 404, '도장 찍힌(내린) 요청은 못 지움');
const g2 = await post('guest', { name:'유자', text:`지울 글 ${tag}`, bid:bid('g2') });
ok((await post('del', { kind:'guest', id:g2.j.id, key:'0'.repeat(32) })).status === 403, '틀린 표로는 못 지움');
ok((await post('del', { kind:'req', id:g2.j.id, key:g2.j.key })).status === 403, '다른 종류 글의 표로는 못 지움');
ok((await post('del', { kind:'guest', id:g2.j.id, key:g2.j.key })).j.ok, '내 방명록 지우기');
ok(!(await read()).guest.some(n => n.id === g2.j.id), '지운 방명록은 목록에 없음');
ok((await post('del', { kind:'guest', id:g2.j.id, key:g2.j.key })).status === 404, '두 번 지우면 없음');
const r4 = await post('req', { title:`지울 요청 ${tag}`.slice(0, 20), bid:bid('r4') });
ok((await post('del', { kind:'req', id:r4.j.id, key:r4.j.key })).j.ok, '내 기술 요청 지우기');
ok(!(await read()).req.some(n => n.id === r4.j.id), '지운 요청은 목록에 없음');

console.log('운영자 완전 삭제');
await admin({ do:'delGuest', id:g.j.id });
await admin({ do:'delReq', id:r1.j.id });
list = (await admin({ do:'list' })).j;
ok(!list.guest.some(x => x.id === g.j.id) && !list.req.some(x => x.id === r1.j.id), '방명록·기술 요청 완전 삭제');
ok((await post('req', { title, bid:bid('r5') })).j.result === 'new', '내린 이름을 완전 삭제하면 다시 올릴 수 있음');

console.log(failed ? `실패 ${failed}개` : '전부 통과');
process.exit(failed ? 1 : 0);
