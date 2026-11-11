// 릴스: 홍보용 "퍼피레드 감성 그리운 사람?" 폴크닉에서 할 수 있는 걸 2초씩 빠르게(꾸미기 → 폴 → 같이 타기 → 간식·수다 → 밤 무대), 끝에 입장 안내
// node scripts/reel.js cozy
// 다른 게임은 첫 제목의 이름으로만 언급. 화면은 전부 폴크닉 렌더(다른 게임 로고·화면·글꼴 없음)
const DRESS = 2.3, POLE = 4.6, DUO = 6.9, SNACK = 9.2, NIGHT = 11.6, END = 13.8;

module.exports = {
  look: 'sky', dur: END + 2.8, fps: 30,
  css: `
    .bubble,.nameTag,#toast,.toast,#shopMenu{display:none!important}
    #reel .head .title em{font-style:normal;color:var(--butter)}
    #reel .say{position:absolute;left:0;top:0;width:0;height:0}
    #reel .say span{position:absolute;bottom:26px;left:-120px;white-space:nowrap;background:#fff;border-radius:34px;padding:16px 30px;font-family:var(--f-d);font-size:38px;box-shadow:var(--drop)}
    #reel .say span::after{content:"";position:absolute;bottom:-20px;left:104px;border:15px solid transparent;border-top:22px solid #fff;border-bottom:0}
    #reel .end{left:150px;right:150px;bottom:340px;padding:28px 30px;transform-origin:50% 100%}   /* 릴스 박스 공통 자리: 가운데, 조금 아래 */
    #reel .end .btn{padding:18px 24px}
  `,
  html: `
    <span class="series news" data-in="0">폴크닉</span>
    <div class="head" data-in="0" data-out="${DRESS}"><h1 class="title on-photo">퍼피레드 감성<br><em>그리운 사람?</em></h1></div>
    <div class="head" data-in="${DRESS}" data-out="${POLE}"><h1 class="title on-photo">내 캐릭터<br><em>꾸미고</em></h1></div>
    <div class="head" data-in="${POLE}" data-out="${DUO}"><h1 class="title on-photo">호숫가에서<br><em>폴 타고</em></h1></div>
    <div class="head" data-in="${DUO}" data-out="${SNACK}"><h1 class="title on-photo">친구랑<br><em>같이 타고</em></h1></div>
    <div class="head" data-in="${SNACK}" data-out="${NIGHT}"><h1 class="title on-photo">간식 먹으며<br><em>수다 떨고</em></h1></div>
    <div class="say" id="say1" data-in="${SNACK + 0.5}" data-out="${NIGHT}"><span>이따 같이 폴 탈래?</span></div>
    <div class="head" data-in="${NIGHT}" data-out="${END}"><h1 class="title on-photo">밤엔<br><em>반짝 무대</em></h1></div>
    <div class="head" data-in="${END}"><h1 class="title on-photo">설치 없이<br><em>바로 놀러 와!</em></h1></div>
    <div class="end panel" data-in="${END + 0.45}">
      <div><img class="word" src="http://polknic.local/marketing/logo/v2/wordmark.svg" alt="폴크닉"><div class="t">온라인 폴댄스 놀이터</div><div class="d">프로필 링크에서 바로 입장</div></div>
      <div class="btn pink">놀러 가기</div>
    </div>
  `,
  // 표지: 첫 장면(호숫가에 다 같이)에 큰 제목
  cover: {
    at: 1.6, opts: {},
    css: `
      #reel.cover .series{top:300px;font-size:38px}
      #reel.cover .head{top:390px;right:auto}
      #reel.cover .title{font-size:132px}
      #reel.cover .title em{font-style:normal;color:var(--butter)}
    `,
    html: `
      <span class="series news">폴크닉</span>
      <div class="head"><h1 class="title on-photo">퍼피레드 감성<br><em>그리운 사람?</em></h1></div>
    `
  },
  // 페이지 안에서 실행됨(위 상수는 문자열로 넘어가지 않으므로 다시 적음)
  scene: function (fps) {
    const DRESS = 2.3, POLE = 4.6, DUO = 6.9, SNACK = 9.2, NIGHT = 11.6, END = 13.8;
    const d = __poleDebug, x = d._x, me = x.me, dt = 1/fps, T = x.THREE, L = window.__LOOKS, P = x.POLES;
    const $ = id => document.getElementById(id), HALF = Math.tan(45/2*Math.PI/180);
    d.pause(true);
    d.sky(13);
    const pal = (look, face = 'joy') => { const av = x.createAvatar(Object.assign({}, L[look])); av.nameShown = false; av.faceMode = face; av.pose = 'stand'; x.others.push(av); return av; };
    const place = (av, px, pz, rot, pose = 'stand') => { av.holder.position.set(px, 0, pz); av.holder.rotation.y = rot; av.pose = pose; av.onPole = false; av.holder.visible = true; };
    const onPole = (av, i, pose) => { av.holder.position.copy(P[i]); av.pose = pose; av.onPole = true; av.holder.visible = true; };
    const coral = pal('coral'), lilac = pal('lilac', 'wink'), ivory = pal('ivory'), sage = pal('sage', 'wink');
    const crew = [coral, lilac, ivory, sage];
    const spinners = new Set();
    // 첫 장면: 가운데 무대 앞에 나·친구 셋, 무대 폴에 하나
    me.holder.position.set(0.1, 0, 2.35); me.holder.rotation.y = 0.1;
    place(coral, -0.75, 2.1, 0.4); place(lilac, 0.72, 2.0, -0.25); place(sage, -1.3, 1.55, 0.6);
    onPole(ivory, 0, 'chair'); spinners.add(ivory);

    // 장면별 카메라: 보는 곳 c(x, z), 담을 높이 h(m)가 fit(px) 안에, yaw/pitch
    const VIEW = {
      hook:  () => ({ cx: -0.35, cz: 1.3, h: [0, 2.2], fit: [640, 1480], yaw: 0.1, p: 0.12 }),
      dress: () => ({ cx: me.holder.position.x, cz: me.holder.position.z, h: [0, 1.12], fit: [640, 1480], yaw: 0.15, p: 0.06 }),
      pole:  () => ({ cx: P[0].x, cz: P[0].z, h: [0.5, 2.5], fit: [640, 1480], yaw: 0.35 + 0.05*(clockT - POLE), p: 0.1 }),
      duo:   () => ({ cx: P[0].x, cz: P[0].z, h: [0.2, 3.3], fit: [640, 1480], yaw: 0.8 + 0.04*(clockT - DUO), p: 0.1 }),
      snack: () => ({ cx: x.TABLE.x, cz: x.TABLE.z, h: [0, 1.2], fit: [860, 1560], yaw: 3.54, p: 0.22 }),
      night: () => ({ cx: 0, cz: 0.6, h: [0, 2.7], fit: [680, 1500], yaw: 0.0 + 0.02*(clockT - NIGHT), p: 0.14 }),
      end:   () => ({ cx: 0, cz: 0.6, h: [0, 3.0], fit: [640, 1240], yaw: 0.0 + 0.02*(clockT - NIGHT), p: 0.14 }),
    };
    function target(v) {
      const [lo, hi] = v.h, view = (hi - lo)*1920/(v.fit[1] - v.fit[0]);
      return { x: v.cx, z: v.cz, y: (lo + hi)/2 + ((v.fit[0] + v.fit[1])/2 - 960)/1920*view, d: view/2/HALF, yaw: v.yaw, p: v.p };
    }
    let clockT = 0, scene = '', cam = null, bit = false;
    const LOOKS = ['ivory', 'coral', 'lilac', 'sageShorts', 'rose', 'sky'];
    let dressed = -1;
    const v3 = new T.Vector3();
    function sayAt(id, av) {
      av.skull.getWorldPosition(v3); v3.y += 0.3; v3.project(x.camera);
      const el = $(id); el.style.left = (v3.x + 1)/2*1080 + 'px'; el.style.top = (1 - v3.y)/2*1920 + 'px';
    }
    function removeFollowers() { x.others.filter(a => a.follow).forEach(a => { x.removeAvatar(a); x.others.splice(x.others.indexOf(a), 1); }); }
    function enter(s) {
      scene = s; cam = null;   // 장면마다 딱 끊어서 전환
      if (s === 'dress') {
        crew.forEach(a => { a.holder.visible = false; }); spinners.clear();
        me.holder.position.set(2.2, 0, 3.4); me.holder.rotation.y = 0.15;
      }
      if (s === 'pole') { d.pose('brass'); x.setSpin(true); x.showEmote(me, 'sparkle'); }
      if (s === 'duo') { d.ball(3, Math.PI/2); x.setSpin(true); const f = x.others.filter(a => a.follow); x.showEmote(f[f.length - 1], 'heart'); }
      if (s === 'snack') {
        removeFollowers(); x.setSpin(false); me.ballLift = 0;
        d.table(0, 'tanghulu'); me.faceMode = 'joy';
        const ch = x.BENCHES.filter(b => b.chair);
        place(coral, ch[1].x, ch[1].z, ch[1].rot, 'sitBench'); x.setSnack(coral, 'coffee');
        place(lilac, ch[2].x, ch[2].z, ch[2].rot, 'sitBench'); x.setSnack(lilac, 'shake');
      }
      if (s === 'night') {
        d.sky(21);
        [coral, lilac].forEach(a => x.setSnack(a, null));
        onPole(coral, 0, 'hera'); spinners.add(coral); ivory.holder.visible = false;   // 나는 테이블에 앉아 있으니 숨기고 친구 둘이 구경
        crew.forEach(a => a.faceMode = 'joy');
        place(lilac, 0.75, 1.9, -0.3); place(sage, -0.7, 1.95, 0.35); me.holder.visible = false;
      }
    }
    window.__reel = {
      cover() {
        const g = target(VIEW.hook());
        x.camera.position.set(g.x + Math.sin(g.yaw)*Math.cos(g.p)*g.d, g.y + Math.sin(g.p)*g.d, g.z + Math.cos(g.yaw)*Math.cos(g.p)*g.d);
        x.camera.lookAt(g.x, g.y, g.z);
        x.renderer.render(x.scene, x.camera);
      },
      frame(t) {
        clockT = t;
        const s = t < DRESS ? 'hook' : t < POLE ? 'dress' : t < DUO ? 'pole' : t < SNACK ? 'duo' : t < NIGHT ? 'snack' : t < END ? 'night' : 'end';
        if (s !== scene && !(s === 'end' && scene === 'night')) enter(s);
        if (s === 'end') scene = 'end';
        if (t < 0.05 || (t > 0.8 && t < 0.8 + dt)) { x.showEmote(coral, 'heart'); }
        if (t > 1.2 && t < 1.2 + dt) x.showEmote(lilac, 'note');
        if (s === 'dress') {
          const k = Math.min(LOOKS.length - 1, Math.floor((t - DRESS)/0.38));
          if (k !== dressed) { dressed = k; me.outfit = Object.assign({}, L[LOOKS[k]]); x.dressAvatar(me); if (k === LOOKS.length - 1) x.showEmote(me, 'sparkle'); }
        }
        if (s === 'snack' && !bit && t >= SNACK + 0.9) { bit = true; x.takeBite(); }
        spinners.forEach(a => { a.holder.rotation.y -= 0.65*dt; a.spinVel = -0.65; });
        x.update(dt);
        const g = target(VIEW[s]());
        if (!cam) cam = Object.assign({}, g);
        const c = 1 - Math.exp(-4*dt);
        ['x', 'y', 'z', 'd', 'yaw', 'p'].forEach(k => { cam[k] += (g[k] - cam[k])*c; });
        x.camera.position.set(cam.x + Math.sin(cam.yaw)*Math.cos(cam.p)*cam.d, cam.y + Math.sin(cam.p)*cam.d, cam.z + Math.cos(cam.yaw)*Math.cos(cam.p)*cam.d);
        x.camera.lookAt(cam.x, cam.y, cam.z);
        x.renderer.render(x.scene, x.camera);
        x.camera.updateMatrixWorld();
        sayAt('say1', coral);
        __reelUI(t);
      }
    };
  }
};
