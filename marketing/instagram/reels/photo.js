// 릴스: 사진 찍기. 카메라 아이콘 톡 → 드래그로 구도 → 셔터(하얀 반짝) → 워터마크 찍힌 결과 사진, 끝에 입장 안내
// node scripts/reel.js photo
// 아이콘·셔터는 게임 UI(#photoBtn, #shutter)를 릴스 크기로 다시 그린 것. 결과 사진은 게임의 takePhoto()가 만든 그대로
const TAP = 1.7, MODE = 2.4, SHOT = 5.8, RES = 6.4, END = 10.4;
const CAM_SVG = '<svg viewBox="0 0 24 24"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.4-2h6.2l1.4 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.3"/></svg>';

module.exports = {
  look: 'lilac', dur: END + 2.8, fps: 30,
  css: `
    #reel .head .title em{font-style:normal;color:var(--butter)}
    #reel .icon{position:absolute;right:200px;top:640px;width:150px;height:150px}
    #reel .icon .b{position:absolute;inset:0;border-radius:50%;background:rgba(255,250,238,.9);border:5px solid #fff;box-shadow:0 8px 0 rgba(90,66,55,.12),0 20px 40px rgba(60,110,130,.2);display:grid;place-items:center;color:var(--ink)}
    #reel .icon svg,#reel .ex svg{width:72px;height:72px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    #reel .ring{position:absolute;inset:0;border-radius:50%;border:6px solid #fff;opacity:0}
    #reel .finger{position:absolute;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;background:rgba(255,255,255,.55);border:5px solid #fff;box-shadow:0 6px 20px rgba(40,70,90,.25);opacity:0}
    #reel .hint{position:absolute;right:200px;top:830px;transform-origin:100% 50%}
    #reel .shutter{position:absolute;left:50%;top:1280px;width:170px;height:170px;margin-left:-85px}
    #reel .shutter .b{position:absolute;inset:0;border-radius:50%;border:11px solid #fff;background:rgba(255,255,255,.5);box-shadow:0 6px 0 rgba(90,66,55,.18),0 10px 34px rgba(40,70,90,.35)}
    #reel .shutter .b::after{content:"";position:absolute;inset:11px;border-radius:50%;background:#fff}
    #reel .flash{position:absolute;inset:0;background:#fff;opacity:0}
    #reel .card{position:absolute;left:50%;top:600px;width:500px;margin-left:-250px;transform-origin:50% 40%}
    #reel .card .f{position:relative;background:#fff;padding:16px;border-radius:28px;box-shadow:0 10px 0 rgba(90,66,55,.14),0 30px 60px rgba(40,70,90,.3);transform:rotate(-3deg)}
    #reel .card img{display:block;width:100%;border-radius:16px}
    #reel .ring2{position:absolute;right:14px;bottom:12px;width:194px;height:40px;border:5px solid var(--pink);border-radius:999px}
    #reel .mark{position:absolute;left:var(--pad);top:1300px;transform-origin:0 50%}
    #reel .end{transform-origin:50% 100%}
  `,
  html: `
    <span class="series news" data-in="0">사진 찍기</span>
    <div class="head" data-in="0" data-out="${MODE}"><h1 class="title on-photo">폴 타는 내 모습<br><em>찍어 볼까?</em></h1></div>
    <div class="icon" data-in="0.5" data-out="${MODE}"><div class="b" id="icon">${CAM_SVG}</div><div class="ring" id="ring"></div></div>
    <span class="hint chip" data-in="0.8" data-out="${MODE}">오른쪽 위 카메라 아이콘</span>
    <div class="head" data-in="${MODE}" data-out="${SHOT}"><h1 class="title on-photo">드래그로<br><em>구도</em> 잡고</h1></div>
    <div class="shutter" data-in="${MODE + 0.3}" data-out="${SHOT + 0.35}"><div class="b" id="shutter"></div></div>
    <div class="head" data-in="${SHOT}" data-out="${RES}"><h1 class="title on-photo">찰칵!</h1></div>
    <div class="head" data-in="${RES}" data-out="${END}"><h1 class="title on-photo">워터마크까지<br><em>쏙</em> 들어가요</h1></div>
    <div class="card" data-in="${RES}" data-out="${END}"><div class="f"><img id="shot" alt=""><div class="ring2" data-in="${RES + 0.8}"></div></div></div>
    <span class="mark chip" data-in="${RES + 1.4}" data-out="${END}">저장하면 사진첩에 쏙!</span>
    <div class="head" data-in="${END}"><h1 class="title on-photo">나만의 폴 사진<br><em>찍으러</em> 와요!</h1></div>
    <div class="end panel" data-in="${END + 0.45}">
      <div><img class="word" src="http://polknic.local/marketing/logo/v2/wordmark.svg" alt="폴크닉"><div class="t">카메라 아이콘으로 찰칵</div><div class="d">프로필 링크에서 바로 입장</div></div>
      <div class="btn pink">놀러 가기</div>
    </div>
    <div class="finger" id="finger"></div>
    <div class="flash" id="flash"></div>
  `,
  // 표지: 셔터 누르기 직전(체어, 윙크) 장면, 오른쪽 아래 캐릭터 + 왼쪽 위 큰 제목 + 카메라 아이콘
  cover: {
    at: 5.6, opts: { yaw: 0 },
    css: `
      #reel.cover .series{top:300px;font-size:38px}
      #reel.cover .head{top:390px;right:auto}
      #reel.cover .title{font-size:124px}
      #reel.cover .title em{font-style:normal;color:var(--butter)}
      #reel.cover .ans{position:absolute;left:var(--pad);top:1440px;display:flex;align-items:center;gap:20px}
      #reel.cover .ans .chip{font-size:42px}
      #reel.cover .ans .b{width:120px;height:120px;border-radius:50%;background:rgba(255,250,238,.92);border:5px solid #fff;box-shadow:0 8px 0 rgba(90,66,55,.12);display:grid;place-items:center;color:var(--ink)}
      #reel.cover .ans svg{width:60px;height:60px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    `,
    html: `
      <span class="series news">사진 찍기</span>
      <div class="head"><h1 class="title on-photo">폴 타는<br>내 모습<br><em>찍어 볼까?</em></h1></div>
      <div class="ans"><div class="b">${CAM_SVG}</div><span class="chip">버튼 하나로 인생샷</span></div>
    `
  },
  // 페이지 안에서 실행됨(위 상수는 문자열로 넘어가지 않으므로 다시 적음)
  scene: function (fps) {
    const TAP = 1.7, MODE = 2.4, SHOT = 5.8, RES = 6.4, END = 10.4;
    const d = __poleDebug, x = d._x, me = x.me, dt = 1/fps, Y = 0.35, T = x.THREE;
    const $ = id => document.getElementById(id);
    const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k*k*(3 - 2*k);
    d.pose('chair', Y, 0.12, 4);
    d.pause(true);
    const c = new T.Vector3();
    let cy, cd, cyaw, shot = false;
    window.__reel = {
      // 표지 카메라: 캐릭터를 오른쪽(화면 x=px)·가운데 아래쪽에, yaw는 정면(Y-0.95)에 더함
      cover({ yaw = 0, dist = 3.0, px = 700 } = {}) {
        x.me.char.getWorldPosition(c);
        const yw = Y - 0.95 + yaw, pitch = 0.12, view = dist*2*Math.tan(45/2*Math.PI/180), shift = (px - 540)/1920*view;
        const lx = c.x - Math.cos(yw)*shift, lz = c.z + Math.sin(yw)*shift, ty = c.y + 0.62;
        x.camera.position.set(lx + Math.sin(yw)*Math.cos(pitch)*dist, ty + Math.sin(pitch)*dist, lz + Math.cos(yw)*Math.cos(pitch)*dist);
        x.camera.lookAt(lx, ty, lz);
        x.renderer.render(x.scene, x.camera);
      },
      frame(t) {
        x.update(dt);
        // 카메라: 처음엔 폴 전체(아이콘 아래로 캐릭터를 내림), 사진 모드부터는 가까이(게임은 2.3m, 제목과 셔터 사이에 들어오게 조금 더 뺌. 드래그로 왼쪽→오른쪽), 끝엔 다시 빼서 패널 위로
        const drag = ease((t - 3.0)/1.6);
        let tyaw = (t < MODE ? Y - 0.6 : Y - 0.35) - 0.6*drag, td = t < MODE ? 4.6 : 2.9, tyy = t < MODE ? 0.45 : 0.17;   // 체어는 Y에서 -0.9쯤 돌아야 얼굴이 정면
        if (t >= END) { td = 4.4; tyy = -0.25; tyaw = Y - 0.8; }
        if (cd == null) { cd = td; cyaw = tyaw; cy = tyy; }
        const k = 1 - Math.exp(-(t >= MODE && t < MODE + 0.6 ? 6 : 4)*dt);
        cd += (td - cd)*k; cyaw += (tyaw - cyaw)*(t >= 3.0 && t < 4.8 ? 1 : k); cy += (tyy - cy)*k;
        x.me.char.getWorldPosition(c);
        // 글자(위 ~600px)와 셔터(1280px) 사이에 캐릭터가 오게: 엉덩이보다 조금 위를 봄
        const ty = c.y + 0.1 + cy, pitch = 0.12;
        x.camera.position.set(c.x + Math.sin(cyaw)*Math.cos(pitch)*cd, ty + Math.sin(pitch)*cd, c.z + Math.cos(cyaw)*Math.cos(pitch)*cd);
        x.camera.lookAt(c.x, ty, c.z);
        x.renderer.render(x.scene, x.camera);
        if (!shot && t >= SHOT) { shot = true; $('shot').src = x.takePhoto().toDataURL('image/jpeg', 0.92); }
        __reelUI(t);
        // 손가락: 아이콘 톡 → 화면 드래그 → 셔터 톡
        const f = $('finger'), fs = f.style;
        const tapK = (t0) => { const u = (t - t0)/0.25; return u > 0 && u < 1 ? Math.sin(u*Math.PI) : 0; };
        if (t > TAP - 0.5 && t < TAP + 0.35) { fs.left = (1080 - 200 - 75) + 'px'; fs.top = (640 + 75) + 'px'; fs.opacity = 1; fs.transform = `scale(${1 - 0.25*tapK(TAP)})`; }
        else if (t > 2.9 && t < 4.8) { fs.left = (300 + 480*drag) + 'px'; fs.top = '1080px'; fs.opacity = Math.min(1, (t - 2.9)/0.2, (4.8 - t)/0.2); fs.transform = 'scale(.9)'; }
        else if (t > SHOT - 0.5 && t < SHOT + 0.35) { fs.left = '540px'; fs.top = (1280 + 85) + 'px'; fs.opacity = 1; fs.transform = `scale(${1 - 0.25*tapK(SHOT)})`; }
        else fs.opacity = 0;
        $('icon').style.transform = `scale(${1 - 0.12*tapK(TAP)})`;
        $('shutter').style.transform = `scale(${1 - 0.12*tapK(SHOT)})`;
        const r = (t - TAP)/0.5; $('ring').style.opacity = r > 0 && r < 1 ? 1 - r : 0; $('ring').style.transform = `scale(${1 + 0.6*Math.max(0, r)})`;
        const fl = (t - SHOT)/0.45; $('flash').style.opacity = fl >= 0 && fl < 1 ? 0.95*(1 - fl) : 0;
      }
    };
  }
};
