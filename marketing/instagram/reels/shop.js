// 릴스: 폴짝 매점. 줄 서기 → 메뉴 고르기 → 직원이 뚝딱 → 탕후루 세 입 → 배불러서 활짝, 끝에 입장 안내
// node scripts/reel.js shop
// 줄 서기·주문·한 입은 게임 함수(goShop, buySnack, takeBite) 그대로. 메뉴판과 말풍선만 릴스 크기로 다시 그림. 가격·무료 문구는 넣지 않음(나중에 유료화할 수 있어서)
const MENU = 2.8, BUY = 4.9, READY = 7.4, BITES = [7.9, 9.1, 10.3], FULL = 11.4, END = 13.2;
const ITEMS = ['아메리카노', '단백질 쉐이크', '이온음료', '닭가슴살', '탕후루'];

module.exports = {
  look: 'sky', dur: END + 2.8, fps: 30,
  css: `
    #shopMenu,.bubble,.nameTag,#toast,.toast{display:none!important}
    #reel .head .title em{font-style:normal;color:var(--butter)}
    #reel .menu{position:absolute;left:150px;right:150px;bottom:340px;padding:28px 30px 32px;transform-origin:50% 100%}   /* 끝 안내 박스와 같은 자리 */
    #reel .menu .h{font-family:var(--f-d);font-size:40px;margin:0 0 20px 8px}
    #reel .menu .list{display:flex;flex-wrap:wrap;gap:14px}
    #reel .menu .it{font-family:var(--f-d);font-size:38px;padding:13px 26px;border-radius:999px;background:#fff;box-shadow:var(--drop)}
    #reel .menu .it.on{background:var(--pink);color:#fff;box-shadow:0 6px 0 var(--pink-d)}
    #reel .finger{position:absolute;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;background:rgba(255,255,255,.55);border:5px solid #fff;box-shadow:0 6px 20px rgba(40,70,90,.25);opacity:0}
    #reel .say{position:absolute;left:0;top:0;width:0;height:0}
    #reel .say span{position:absolute;bottom:26px;left:-120px;white-space:nowrap;background:#fff;border-radius:34px;padding:16px 30px;font-family:var(--f-d);font-size:38px;box-shadow:var(--drop)}
    #reel .say span::after{content:"";position:absolute;bottom:-20px;left:104px;border:15px solid transparent;border-top:22px solid #fff;border-bottom:0}
    #reel .fruits{position:absolute;left:var(--pad);top:446px;gap:12px;transform-origin:0 50%}
    #reel .fruits u{width:32px;height:32px;border-radius:50%;display:block;background:#eadfcb}
    #reel .end{left:150px;right:150px;bottom:340px;padding:28px 30px;transform-origin:50% 100%}   /* 가운데, 공용 위치(bottom 400)보다 조금 아래 */
    #reel .end .btn{padding:18px 24px}
  `,
  html: `
    <span class="series shop" data-in="0">폴짝 매점</span>
    <div class="head" data-in="0" data-out="${MENU}"><h1 class="title on-photo">폴 타다<br><em>출출할 땐?</em></h1></div>
    <div class="head" data-in="${MENU}" data-out="${BUY}"><h1 class="title on-photo">오늘은<br><em>뭐 먹을까?</em></h1></div>
    <div class="menu panel" data-in="${MENU + 0.25}" data-out="${BUY + 0.3}"><div class="h">폴짝 매점 메뉴</div><div class="list">${ITEMS.map((n, i) => `<span class="it" id="it${i}">${n}</span>`).join('')}</div></div>
    <div class="head" data-in="${BUY}" data-out="${BITES[0]}"><h1 class="title on-photo">직원이<br><em>뚝딱!</em></h1></div>
    <div class="say" id="say1" data-in="${BUY + 0.3}" data-out="${READY}"><span>탕후루 만드는 중이에요!</span></div>
    <div class="say" id="say2" data-in="${READY}" data-out="7.6"><span>맛있게 드세요!</span></div>
    <div class="head" data-in="${BITES[0]}" data-out="${BITES[1]}"><h1 class="title on-photo">한 입!</h1></div>
    <div class="head" data-in="${BITES[1]}" data-out="${BITES[2]}"><h1 class="title on-photo">두 입!</h1></div>
    <div class="head" data-in="${BITES[2]}" data-out="${FULL}"><h1 class="title on-photo">세 입!</h1></div>
    <div class="fruits chip" data-in="${BITES[0]}" data-out="${FULL}"><u id="f0"></u><u id="f1"></u><u id="f2"></u></div>
    <div class="head" data-in="${FULL}" data-out="${END}"><h1 class="title on-photo">배불러서<br><em>활짝!</em></h1></div>
    <div class="head" data-in="${END}"><h1 class="title on-photo">출출할 땐<br><em>폴짝 매점!</em></h1></div>
    <div class="end panel" data-in="${END + 0.45}">
      <div><img class="word" src="http://polknic.local/marketing/logo/v2/wordmark.svg" alt="폴크닉"><div class="t">폴 타고 간식 한 입</div><div class="d">프로필 링크에서 바로 입장</div></div>
      <div class="btn pink">놀러 가기</div>
    </div>
    <div class="finger" id="finger"></div>
  `,
  // 표지: 탕후루를 받은 직후, 아래쪽에 캐릭터 + 위에 큰 제목
  cover: {
    at: 7.8, opts: { yaw: 0 },   // 0: 먹는 장면과 같은 각도. 매점 쪽으로 돌리면 간판이 제목과 겹침
    css: `
      #reel.cover .series{top:300px;font-size:38px}
      #reel.cover .head{top:390px;right:auto}
      #reel.cover .title{font-size:132px}
      #reel.cover .title em{font-style:normal;color:var(--butter)}
    `,
    html: `
      <span class="series shop">폴짝 매점</span>
      <div class="head"><h1 class="title on-photo">폴 타다<br><em>출출할 땐?</em></h1></div>
    `
  },
  // 페이지 안에서 실행됨(위 상수는 문자열로 넘어가지 않으므로 다시 적음)
  scene: function (fps) {
    const MENU = 2.8, BUY = 4.9, READY = 7.4, CUT = 7.6, BITES = [7.9, 9.1, 10.3], FULL = 11.4, END = 13.2;
    const d = __poleDebug, x = d._x, me = x.me, dt = 1/fps, T = x.THREE, S = x.SHOP, L = window.__LOOKS;
    const $ = id => document.getElementById(id), HALF = Math.tan(45/2*Math.PI/180);
    const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k*k*(3 - 2*k);
    d.pause(true);
    const spot = i => x.shopSpot(i), front = spot(0), SIDE = 0.55, BASE = S.rot + SIDE, EAT = BASE + 0.8;   // EAT: 먹는 장면은 매점 간판이 제목과 겹치지 않게 옆으로 돌아서 봄
    me.holder.position.copy(spot(2.6)); me.holder.rotation.y = S.rot + Math.PI;
    x.goShop();
    // 뒤따라와 줄 서는 친구 둘: 게임의 봇처럼 직접 걷게 함
    const pals = [['coral', 3.8, 1], ['rose', 5.0, 2]].map(([look, from, to]) => {
      const av = x.createAvatar(Object.assign({}, L[look]));
      av.holder.position.copy(spot(from)); av.holder.rotation.y = S.rot + Math.PI; av.pose = 'stand'; av.faceMode = 'joy'; av.nameShown = false;
      x.others.push(av); av.to = spot(to);
      return av;
    });
    function walkPal(av, t) {
      const h = av.holder.position, dx = av.to.x - h.x, dz = av.to.z - h.z, l = Math.hypot(dx, dz), go = l > 0.03;
      if (go) { const s = Math.min(dt*1.05, l); h.x += dx/l*s; h.z += dz/l*s; }
      av.moveAmp += ((go ? 1 : 0) - av.moveAmp)*(1 - Math.exp(-8*dt));
      av.walkPhase += dt*11*av.moveAmp;
    }
    // 장면별 카메라: 담을 높이 h(m)가 fit(px) 안에, 보는 쪽 yaw, 보는 곳은 매점 앞에서 m만큼(앞이 +)
    const VIEW = {
      walk: { yaw: BASE, pitch: 0.08, h: [0, 2.4], fit: [640, 1480], m: 0.8 },
      menu: { yaw: BASE, pitch: 0.08, h: [0.45, 2.2], fit: [600, 1130], m: 0.75 },
      make: { yaw: BASE - 0.1, pitch: 0.08, h: [0, 1.9], fit: [680, 1500], m: 0.6 },
      eat:  { yaw: EAT, pitch: 0.07, h: [0.3, 1.14], fit: [600, 1480], m: 1.0, me: true },
      full: { yaw: EAT, pitch: 0.07, h: [0, 1.14], fit: [640, 1500], m: 1.0, me: true },
      end:  { yaw: BASE, pitch: 0.08, h: [0, 2.4], fit: [640, 1270], m: 1.1 },
    };
    function target(v) {
      const [lo, hi] = v.h, view = (hi - lo)*1920/(v.fit[1] - v.fit[0]), cd = view/2/HALF;
      return { y: (lo + hi)/2 + ((v.fit[0] + v.fit[1])/2 - 960)/1920*view, d: cd, yaw: v.yaw, p: v.pitch,
        x: v.me ? me.holder.position.x : S.x + Math.sin(S.rot)*v.m, z: v.me ? me.holder.position.z : S.z + Math.cos(S.rot)*v.m };
    }
    let cam = null, bought = false, moved = false;
    const bit = [false, false, false];
    const v3 = new T.Vector3();
    function sayAt(id) {   // 말풍선을 직원 머리 위 화면 좌표에
      x.clerk.skull.getWorldPosition(v3); v3.y += 0.26; v3.project(x.camera);
      const el = $(id); el.style.left = (v3.x + 1)/2*1080 + 'px'; el.style.top = (1 - v3.y)/2*1920 + 'px';
    }
    window.__reel = {
      // 표지 카메라: 나를 화면 아래쪽(860~1660px)에. yaw는 먹는 장면의 보는 쪽에 더함
      cover({ yaw = 0, h = [0, 1.14], fit = [860, 1660] } = {}) {
        const [lo, hi] = h, view = (hi - lo)*1920/(fit[1] - fit[0]), cd = view/2/HALF, yw = EAT + yaw, p = 0.07, P = me.holder.position;
        me.holder.rotation.y = yw + 0.32; d.step(0.05);   // 카메라 쪽을 보게(step은 포즈를 다시 그림)
        const y = (lo + hi)/2 + ((fit[0] + fit[1])/2 - 960)/1920*view;
        x.camera.position.set(P.x + Math.sin(yw)*Math.cos(p)*cd, y + Math.sin(p)*cd, P.z + Math.cos(yw)*Math.cos(p)*cd);
        x.camera.lookAt(P.x, y, P.z);
        x.renderer.render(x.scene, x.camera);
      },
      frame(t) {
        if (!bought && t >= BUY) { bought = true; x.buySnack('tanghulu'); $('it4').classList.add('on'); }
        BITES.forEach((b, i) => { if (!bit[i] && t >= b) { bit[i] = true; x.takeBite(); $('f' + (2 - i)).style.background = '#eadfcb'; } });
        pals.forEach(av => walkPal(av, t));
        x.update(dt);
        // 도착한 친구들은 카메라 쪽을 돌아봄
        pals.forEach(av => { if (t > 1.5 && av.moveAmp < 0.5) av.holder.rotation.y = x.angTo(av.holder.rotation.y, BASE - 0.3, 1 - Math.exp(-5*dt)); });
        // 받은 뒤 장면 전환: 줄 옆 빈자리에서 카메라를 보고 먹음(그대로 두면 뒤 친구 머리가 가림)
        if (!moved && t >= CUT) {
          moved = true; cam = null;
          const s = spot(1.0), px = Math.cos(S.rot), pz = -Math.sin(S.rot);
          me.holder.position.set(s.x + px*1.3, 0, s.z + pz*1.3);
          me.holder.rotation.y = EAT + 0.32;
        }
        const v = VIEW[t < MENU ? 'walk' : t < BUY ? 'menu' : t < CUT ? 'make' : t < FULL ? 'eat' : t < END ? 'full' : 'end'], g = target(v);
        if (!cam) cam = Object.assign({}, g);
        const c = 1 - Math.exp(-4*dt);
        ['x', 'y', 'z', 'd', 'yaw', 'p'].forEach(k => { cam[k] += (g[k] - cam[k])*c; });
        x.camera.position.set(cam.x + Math.sin(cam.yaw)*Math.cos(cam.p)*cam.d, cam.y + Math.sin(cam.p)*cam.d, cam.z + Math.cos(cam.yaw)*Math.cos(cam.p)*cam.d);
        x.camera.lookAt(cam.x, cam.y, cam.z);
        x.renderer.render(x.scene, x.camera);
        x.camera.updateMatrixWorld();
        sayAt('say1'); sayAt('say2');
        __reelUI(t);
        // 손가락: 탕후루 톡
        const f = $('finger'), fs = f.style, r = $('it4').getBoundingClientRect();
        if (t > BUY - 0.7 && t < BUY + 0.3) { const u = (t - BUY)/0.25; fs.left = (r.left + r.width/2) + 'px'; fs.top = (r.top + r.height/2 + 8) + 'px'; fs.opacity = 1; fs.transform = `scale(${1 - 0.25*(u > 0 && u < 1 ? Math.sin(u*Math.PI) : 0)})`; }
        else fs.opacity = 0;
        // 남은 탕후루 알 표시
        if (t < BITES[0]) { $('f0').style.background = '#e8475f'; $('f1').style.background = '#7cc36a'; $('f2').style.background = '#8c55b8'; }
      }
    };
  }
};
