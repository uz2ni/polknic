// 릴스: "난 속세를 떠나 폴을 타…" 요즘 유행하는 온라인 절 밈을 비튼 힐링 무드. 호숫가의 하루(아침 산책 → 회전폴 → 108배 대신 아기자세 → 노을 커피 → 밤 달 보며 멍), 끝에 입장 안내
// node scripts/reel.js retreat
// 혼자 조용히: 다른 캐릭터 없이 나만. 절·불상 같은 그림은 넣지 않고 문구로만 밈을 씀
const POLE = 2.6, MAT = 5.2, CAFE = 7.8, NIGHT = 10.4, END = 13.2;

module.exports = {
  look: 'ivory', dur: END + 2.8, fps: 30,
  css: `
    .bubble,.nameTag,#toast,.toast,#shopMenu{display:none!important}
    #reel .head .title em{font-style:normal;color:var(--butter)}
    #reel .end{left:150px;right:150px;bottom:340px;padding:28px 30px;transform-origin:50% 100%}   /* 릴스 박스 공통 자리: 가운데, 조금 아래 */
    #reel .end .btn{padding:18px 24px}
  `,
  html: `
    <span class="series closet" data-in="0">폴크닉</span>
    <div class="head" data-in="0" data-out="${POLE}"><h1 class="title on-photo">난 속세를 떠나<br><em>폴을 타…</em></h1></div>
    <div class="head" data-in="${POLE}" data-out="${MAT}"><h1 class="title on-photo">회전폴 돌며<br><em>번뇌도 빙글</em></h1></div>
    <div class="head" data-in="${MAT}" data-out="${CAFE}"><h1 class="title on-photo">108배 대신<br><em>아기자세</em></h1></div>
    <div class="head" data-in="${CAFE}" data-out="${NIGHT}"><h1 class="title on-photo">노을 보며<br><em>커피 한 잔</em></h1></div>
    <div class="head" data-in="${NIGHT}" data-out="${END}"><h1 class="title on-photo">밤엔 달 보며<br><em>멍…</em></h1></div>
    <div class="head" data-in="${END}"><h1 class="title on-photo">번뇌는 내려놓고<br><em>폴크닉으로</em></h1></div>
    <div class="end panel" data-in="${END + 0.45}">
      <div><img class="word" src="http://polknic.local/marketing/logo/v2/wordmark.svg" alt="폴크닉"><div class="t">온라인 폴댄스 놀이터</div><div class="d">프로필 링크에서 바로 입장</div></div>
      <div class="btn pink">놀러 가기</div>
    </div>
  `,
  // 표지: 밤 호숫가에 앉아 달을 보는 뒷모습 + 큰 제목
  cover: {
    at: 12.4, opts: {},
    css: `
      #reel.cover .series{top:300px;font-size:38px}
      #reel.cover .head{top:390px;right:auto}
      #reel.cover .title{font-size:132px}
      #reel.cover .title em{font-style:normal;color:var(--butter)}
    `,
    html: `
      <span class="series closet">폴크닉</span>
      <div class="head"><h1 class="title on-photo">난 속세를 떠나<br><em>폴을 타…</em></h1></div>
    `
  },
  // 페이지 안에서 실행됨(위 상수는 문자열로 넘어가지 않으므로 다시 적음)
  scene: function (fps) {
    const POLE = 2.6, MAT = 5.2, CAFE = 7.8, NIGHT = 10.4, END = 13.2;
    const d = __poleDebug, x = d._x, me = x.me, dt = 1/fps, L = window.__LOOKS, P = x.POLES, HALF = Math.tan(45/2*Math.PI/180);
    d.pause(true);
    const SEAT = { x: -1.3, z: -5.4 }, MOON = 0.43;   // 밤: 호숫가 앞에 앉아 달(왼쪽 앞 하늘) 쪽을 봄
    // 첫 장면: 나와 같은 옷의 대역이 징검돌을 따라 무대 쪽으로 걸어감(뒷모습). 내 캐릭터는 게임이 걷게 하므로 대역을 씀
    const solo = x.createAvatar(Object.assign({}, L.ivory)); solo.nameShown = false; solo.pose = 'stand'; solo.faceMode = 'open';
    solo.holder.position.set(0.25, 0, 5.6); solo.holder.rotation.y = Math.PI + 0.05; x.others.push(solo);
    const goal = { x: 0.05, z: 2.4 };
    me.holder.visible = false;
    const VIEW = {
      walk:  () => ({ cx: solo.holder.position.x, cz: solo.holder.position.z - 1.6, h: [0, 2.2], fit: [700, 1500], yaw: 0.08, p: 0.12 }),
      pole:  () => ({ cx: P[0].x, cz: P[0].z, h: [0.2, 2.2], fit: [640, 1480], yaw: 0.3 + 0.05*(T - POLE), p: 0.1 }),
      mat:   () => ({ cx: x.MAT_SPOTS[1].x, cz: x.MAT_SPOTS[1].z, h: [0, 0.75], fit: [760, 1460], yaw: x.MAT_SPOTS[1].rot - Math.PI/2 - 0.25, p: 0.16, min: 3.4 }),
      cafe:  () => ({ cx: x.TABLE.x, cz: x.TABLE.z, h: [0, 1.2], fit: [860, 1560], yaw: 3.54, p: 0.2 }),
      night: () => ({ cx: SEAT.x, cz: SEAT.z, h: [0, 2.4], fit: [760, 1500], yaw: MOON + 0.02*(T - NIGHT), p: -0.12 }),
      end:   () => ({ cx: SEAT.x, cz: SEAT.z, h: [0, 2.4], fit: [540, 1280], yaw: MOON + 0.02*(T - NIGHT), p: -0.12 }),
    };
    function target(v) {
      const [lo, hi] = v.h, view = Math.max(v.min || 0, (hi - lo)*1920/(v.fit[1] - v.fit[0]));
      return { x: v.cx, z: v.cz, y: (lo + hi)/2 + ((v.fit[0] + v.fit[1])/2 - 960)/1920*view, d: view/2/HALF, yaw: v.yaw, p: v.p };
    }
    let T = 0, scene = '', cam = null, sipped = false;
    function enter(s) {
      scene = s; cam = null;
      if (s === 'walk') d.sky(7);
      if (s === 'pole') {
        d.sky(10.5); x.removeAvatar(solo); x.others.splice(x.others.indexOf(solo), 1); me.holder.visible = true;
        d.pose('chair'); x.setSpin(true); x.faceMode = 'joy';
      }
      if (s === 'mat') {
        d.sky(14); x.setSpin(false);
        d.mat(1, 'matChild'); x.showEmote(me, 'sparkle');
      }
      if (s === 'cafe') { d.sky(17.4); d.table(0, 'coffee'); x.faceMode = 'joy'; d.step(0.6); }   // step: 의자로 미끄러지는 모습이 컷 첫 프레임에 안 보이게
      if (s === 'night') {
        d.sky(21.5); x.setSnack(me, null); x.faceMode = 'open';
        me.holder.position.set(SEAT.x, 0, SEAT.z); me.holder.rotation.y = MOON + Math.PI; x.sitDown('ground');
        d.step(0.5);
      }
    }
    window.__reel = {
      cover() {
        const g = target(VIEW.night());
        x.camera.position.set(g.x + Math.sin(g.yaw)*Math.cos(g.p)*g.d, g.y + Math.sin(g.p)*g.d, g.z + Math.cos(g.yaw)*Math.cos(g.p)*g.d);
        x.camera.lookAt(g.x, g.y, g.z);
        x.renderer.render(x.scene, x.camera);
      },
      frame(t) {
        T = t;
        const s = t < POLE ? 'walk' : t < MAT ? 'pole' : t < CAFE ? 'mat' : t < NIGHT ? 'cafe' : t < END ? 'night' : 'end';
        if (s === 'end') scene = 'end';
        else if (s !== scene) enter(s);
        if (s === 'walk') {   // 천천히 걷기
          const h = solo.holder.position, dx = goal.x - h.x, dz = goal.z - h.z, l = Math.hypot(dx, dz), go = l > 0.03;
          if (go) { const st = Math.min(dt*0.8, l); h.x += dx/l*st; h.z += dz/l*st; }
          solo.moveAmp += ((go ? 0.8 : 0) - solo.moveAmp)*(1 - Math.exp(-8*dt));
          solo.walkPhase += dt*9*solo.moveAmp;
        }
        if (s === 'cafe' && !sipped && t >= CAFE + 0.8) { sipped = true; x.takeBite(); }
        x.update(dt);
        const g = target(VIEW[s]());
        if (!cam) cam = Object.assign({}, g);
        const c = 1 - Math.exp(-3*dt);
        ['x', 'y', 'z', 'd', 'yaw', 'p'].forEach(k => { cam[k] += (g[k] - cam[k])*c; });
        x.camera.position.set(cam.x + Math.sin(cam.yaw)*Math.cos(cam.p)*cam.d, cam.y + Math.sin(cam.p)*cam.d, cam.z + Math.cos(cam.yaw)*Math.cos(cam.p)*cam.d);
        x.camera.lookAt(cam.x, cam.y, cam.z);
        x.renderer.render(x.scene, x.camera);
        __reelUI(t);
      }
    };
  }
};
