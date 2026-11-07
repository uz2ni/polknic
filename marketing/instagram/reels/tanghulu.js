// 릴스: 탕후루 몇 명까지? 혼자 → 2·3·4명이 차례로 폴짝 올라오고, 회전폴로 다 같이 빙글, 끝에 입장 안내
// node scripts/reel.js tanghulu
const STEPS = [[0, 1], [1.8, 2], [3.4, 3], [5.0, 4]];   // [초, 인원]
const SPIN = 7.0, END = 9.6;

module.exports = {
  look: 'sageShorts', dur: 12.4, fps: 30,
  css: `
    #reel .head .title em{font-style:normal;color:var(--butter)}
    #reel .count{position:absolute;left:var(--pad);top:620px;gap:14px;transform-origin:0 50%}
    #reel .count i{width:34px;height:34px;border-radius:50%;background:#eadfcb;display:block}
    #reel .count i.on{background:var(--butter);box-shadow:inset 0 -5px 0 var(--butter-d)}
    #reel .count b{font-weight:400;margin-left:8px}
    #reel .end{transform-origin:50% 100%}
  `,
  html: `
    <span class="series mate" data-in="0">폴메이트</span>
    <div class="head" data-in="0" data-out="${STEPS[1][0]}"><h1 class="title on-photo">폴 하나에<br>몇 명까지 탈까?</h1></div>
    <div class="head" data-in="${STEPS[1][0]}" data-out="${STEPS[2][0]}"><h1 class="title on-photo">둘이 타면<br><em>2단</em> 꼬치!</h1></div>
    <div class="head" data-in="${STEPS[2][0]}" data-out="${STEPS[3][0]}"><h1 class="title on-photo">셋이 타면<br><em>3단</em> 꼬치!</h1></div>
    <div class="head" data-in="${STEPS[3][0]}" data-out="${SPIN}"><h1 class="title on-photo">넷이 타면<br><em>탕후루</em> 완성!</h1></div>
    <div class="head" data-in="${SPIN}" data-out="${END}"><h1 class="title on-photo">회전폴 켜고<br>다 같이 <em>빙글~</em></h1></div>
    <div class="head" data-in="${END}"><h1 class="title on-photo">친구 셋만<br>데려와요!</h1></div>
    <div class="count chip" data-in="${STEPS[1][0]}" data-out="${END}"><i></i><i></i><i></i><i></i><b id="cnt"></b></div>
    <div class="end panel" data-in="${END + 0.45}">
      <div><img class="word" src="http://polknic.local/marketing/logo/v2/wordmark.svg" alt="폴크닉"><div class="t">같은 방번호에서 만나요</div><div class="d">프로필 링크에서 바로 입장</div></div>
      <div class="btn pink">놀러 가기</div>
    </div>
  `,
  // 표지(릴스 커버, 사진첩에서 따로 올림): 4명 다 모인 장면, 오른쪽에 크게 + 왼쪽에 큰 제목. 프로필 그리드는 가운데 3:4(위아래 240px 잘림)만 보이므로 그 안에
  cover: {
    at: 6.6, opts: { yaw: 0.8 },   // 각도 0.8: 뒤가 호수, 위 두 사람 얼굴이 정면
    css: `
      #reel.cover .series{top:300px;font-size:38px}
      #reel.cover .head{top:390px;right:auto}
      #reel.cover .title{font-size:132px}
      #reel.cover .title em{font-style:normal;color:var(--butter)}
      #reel.cover .ans{position:absolute;left:var(--pad);top:1400px;display:flex;flex-direction:column;align-items:flex-start;gap:20px}
      #reel.cover .ans .chip{font-size:42px}
      #reel.cover .ans .count{position:static;gap:14px}
      #reel.cover .ans .count i{width:38px;height:38px;border-radius:50%;background:var(--butter);box-shadow:inset 0 -5px 0 var(--butter-d);display:block}
    `,
    html: `
      <span class="series mate">폴메이트</span>
      <div class="head"><h1 class="title on-photo">폴 하나에<br>몇 명까지<br><em>탈까?</em></h1></div>
      <div class="ans"><span class="chip count"><i></i><i></i><i></i><i></i></span><span class="chip">탕후루 꼬치 완성!</span></div>
    `
  },
  // 페이지 안에서 실행됨(위 상수는 문자열로 넘어가지 않으므로 다시 적음)
  scene: function (fps) {
    const STEPS = [[0, 1], [1.8, 2], [3.4, 3], [5.0, 4]], SPIN = 7.0, END = 9.6;
    // 카메라: 쌓인 사람 전체(맨 위 머리 ~ 맨 아래 발)가 제목 아래(위에서 720px)부터 인스타 글자 영역 전(1600px)까지 들어오게
    const FIT = [720, 1600], FIT_END = [720, 1290], HALF = Math.tan(45/2*Math.PI/180);   // 게임 카메라 세로 화각 45°
    function cam(k, fit = FIT) {   // 마지막엔 입장 안내 패널 위로(FIT_END)
      const top = x.ballHeight(0, k) + 0.06 + 0.45, bot = x.ballHeight(k - 1, k) + 0.06 - 0.3;
      const view = Math.max(2.6, (top - bot)*1920/(fit[1] - fit[0]));   // 화면 세로가 담는 높이(m)
      return [(top + bot)/2 + ((fit[0] + fit[1])/2 - 960)/1920*view, view/2/HALF];   // [보는 높이, 거리]
    }
    const d = __poleDebug, x = d._x, me = x.me, dt = 1/fps, YAW = 0.05;
    const backOut = k => 1 + 2.2*Math.pow(k - 1, 3) + 1.2*Math.pow(k - 1, 2);
    const stack = () => [me, ...x.others.filter(a => a.follow)];
    let n = 0, tw = [], since = 0, spun = false, camY, camD;
    d.pause(true);
    function grow(k) {
      const prev = stack().map(a => a.ballLift || 0);
      d.ball(k, Math.PI/2, YAW, 0.1);   // 게임과 같은 높이·90°씩 돌린 자리
      const s = stack();
      // 있던 사람은 새 높이로 미끄러지고, 새로 온 사람은 위에서 폴짝 떨어짐
      tw = k === 1 ? [] : s.map((a, i) => ({ a, from: i < prev.length ? prev[i] : a.ballLift + 0.9, to: a.ballLift }));
      since = 0; n = k;
      if (k > 1) x.showEmote(s[s.length - 1], 'heart');
      document.querySelectorAll('#reel .count i').forEach((el, i) => el.classList.toggle('on', i < k));
      document.getElementById('cnt').textContent = k + '/4명';
    }
    window.__reel = {
      // 표지 카메라: 쌓인 사람을 fit(px) 높이에 꽉 차게, 폴이 화면 x=px에 오게(왼쪽은 제목 자리)
      cover({ yaw = 0, fit = [330, 1660], px = 760 } = {}) {
        const [cy, cd] = cam(n, fit), view = cd*2*HALF, shift = (px - 540)/1920*view;
        const yw = YAW + yaw, pitch = 0.1, P = me.holder.position;
        const lx = P.x - Math.cos(yw)*shift, lz = P.z + Math.sin(yw)*shift;   // 카메라 오른쪽 방향 (cos, 0, -sin)의 반대로 옮겨 봄
        x.camera.position.set(lx + Math.sin(yw)*Math.cos(pitch)*cd, cy + Math.sin(pitch)*cd, lz + Math.cos(yw)*Math.cos(pitch)*cd);
        x.camera.lookAt(lx, cy, lz);
        x.renderer.render(x.scene, x.camera);
      },
      frame(t) {
        for (const [at, k] of STEPS) if (t >= at - 1e-6 && n < k) grow(k);
        if (!spun && t >= SPIN) { x.setSpin(true); spun = true; }
        since += dt;
        const e = Math.min(1, since/0.38);
        tw.forEach(o => { o.a.ballLift = o.from + (o.to - o.from)*backOut(e); });
        x.update(dt);
        // 게임 카메라는 맨 위 사람을 따라가서 직접 잡음
        const [ty, td] = cam(n, t >= END ? FIT_END : FIT);
        if (camY == null) { camY = ty; camD = td; }
        const c = 1 - Math.exp(-5*dt);
        camY += (ty - camY)*c; camD += (td - camD)*c;
        const P = me.holder.position, yaw = YAW + 0.04*t, pitch = 0.1;
        x.camera.position.set(P.x + Math.sin(yaw)*Math.cos(pitch)*camD, camY + Math.sin(pitch)*camD, P.z + Math.cos(yaw)*Math.cos(pitch)*camD);
        x.camera.lookAt(P.x, camY, P.z);
        x.renderer.render(x.scene, x.camera);
        __reelUI(t);
      }
    };
  }
};
