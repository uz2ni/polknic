// 릴스: 스트레칭존 오픈, 몸풀기 30초. 매트 위에서 스트레칭 7가지를 하나씩(자세 이름 자막), 끝은 헥헥 표정 "오늘도 수고했어요", 입장 안내
// node scripts/reel.js stretch
const INTRO = 3.0, EACH = 3.0, REST = INTRO + 7*EACH, END = REST + 3.2;
const MOVES = [['다리 찢기', '옆으로 쭈욱~'], ['스쿼트', '엉덩이 뒤로, 하나 둘!'], ['플랭크', '배에 힘 꽉!'], ['레그레이즈', '다리 올렸다 천천히'],
               ['다운독', '엉덩이를 하늘로'], ['코브라', '가슴을 활짝'], ['아기자세', '숨 크게 쉬고 휴~']];

module.exports = {
  look: 'coral', dur: END + 2.8, fps: 30,
  css: `
    #reel .head .title em{font-style:normal;color:var(--butter)}
    #reel .sub{position:absolute;left:var(--pad);top:570px;transform-origin:0 50%}
    #reel .count{position:absolute;left:var(--pad);top:452px;gap:12px;transform-origin:0 50%}
    #reel .count i{width:26px;height:26px;border-radius:50%;background:#eadfcb;display:block}
    #reel .count i.on{background:var(--pink);box-shadow:inset 0 -4px 0 var(--pink-d)}
    #reel .count b{font-weight:400;margin-left:6px}
    #reel .tip{position:absolute;left:var(--pad);top:546px;transform-origin:0 50%}
    #reel .end{transform-origin:50% 100%}
  `,
  html: `
    <span class="series news" data-in="0">새 소식</span>
    <div class="head" data-in="0" data-out="${INTRO}"><h1 class="title on-photo">스트레칭존<br><em>새로</em> 열었어요!</h1></div>
    <span class="sub chip" data-in="0.5" data-out="${INTRO}">폴 타기 전 몸풀기 30초</span>
    ${MOVES.map(([name, tip], i) => `
    <div class="head" data-in="${INTRO + i*EACH}" data-out="${INTRO + (i + 1)*EACH}"><h1 class="title on-photo">${name}</h1></div>
    <span class="tip chip" data-in="${INTRO + i*EACH + 0.25}" data-out="${INTRO + (i + 1)*EACH}">${tip}</span>`).join('')}
    <div class="count chip" data-in="${INTRO}" data-out="${REST}">${MOVES.map(() => '<i></i>').join('')}<b id="cnt"></b></div>
    <div class="head" data-in="${REST}"><h1 class="title on-photo">헥헥…<br>오늘도 <em>수고했어요!</em></h1></div>
    <div class="end panel" data-in="${END + 0.45}">
      <div><img class="word" src="http://polknic.local/marketing/logo/v2/wordmark.svg" alt="폴크닉"><div class="t">매트를 누르면 스트레칭 시작</div><div class="d">프로필 링크에서 바로 입장</div></div>
      <div class="btn pink">놀러 가기</div>
    </div>
  `,
  // 표지: 다리 찢기(활짝 웃는 얼굴) 장면, 아래쪽에 캐릭터 + 위에 큰 제목. 프로필 그리드는 가운데 3:4(위아래 240px 잘림)만 보이므로 그 안에
  cover: {
    at: 4.9, opts: { yaw: -0.4 },   // -0.4: 뒤가 숲, 매트가 비스듬히
    css: `
      #reel.cover .series{top:300px;font-size:38px}
      #reel.cover .head{top:390px;right:auto}
      #reel.cover .title{font-size:132px}
      #reel.cover .title em{font-style:normal;color:var(--butter)}
      #reel.cover .ans{position:absolute;left:var(--pad);top:760px}
      #reel.cover .ans .chip{font-size:42px}
    `,
    html: `
      <span class="series news">새 소식</span>
      <div class="head"><h1 class="title on-photo">스트레칭존<br><em>오픈!</em></h1></div>
      <div class="ans"><span class="chip">폴 타기 전 몸풀기 30초</span></div>
    `
  },
  // 페이지 안에서 실행됨(위 상수는 문자열로 넘어가지 않으므로 다시 적음)
  scene: function (fps) {
    const INTRO = 3.0, EACH = 3.0, REST = INTRO + 7*EACH, END = REST + 3.2;
    const POSES = ['matSplit', 'matSquat', 'matPlank', 'matLegRaise', 'matDog', 'matCobra', 'matChild'];
    // 자세마다 보는 쪽(yaw: 0이면 캐릭터 뒤, π면 정면), 담을 높이(m, 매트 위)
    const VIEW = {
      intro:      { yaw: Math.PI + 0.42, pitch: 0.2, h: [0, 0.75], min: 4.9, at: [-0.25, 0.75] },
      matSplit:   { yaw: Math.PI*1.5 + 0.35,   // -π/2와 같은 쪽이지만 인트로(π+0.42)에서 짧은 쪽으로 돌게
                     pitch: 0.12, h: [0, 0.75], min: 2.5 },
      matSquat:   { yaw: Math.PI - 0.4, pitch: 0.1, h: [0, 0.85], min: 2.3 },
      matPlank:   { yaw: Math.PI/2 - 0.12, pitch: 0.14, h: [0, 0.6], min: 2.5 },
      matLegRaise:{ yaw: Math.PI/2 - 0.12, pitch: 0.18, h: [0, 0.6], min: 2.5 },
      matDog:     { yaw: Math.PI/2 - 0.12, pitch: 0.1, h: [0, 0.75], min: 2.5 },
      matCobra:   { yaw: Math.PI/2 + 0.15, pitch: 0.12, h: [0, 0.6], min: 2.5 },
      matChild:   { yaw: Math.PI/2 + 0.2, pitch: 0.2, h: [0, 0.55], min: 2.5 },
      rest:       { yaw: Math.PI - 0.15, pitch: 0.08, h: [0.15, 0.8], min: 2.2 },
    };
    const FIT = [660, 1480], FIT_END = [660, 1280], HALF = Math.tan(45/2*Math.PI/180);
    const d = __poleDebug, x = d._x, me = x.me, dt = 1/fps, ME = 2, PALS = [[5, 'sky'], [4, 'lilac']];
    d.pause(true);
    x.sitDown(x.MAT_SPOTS[ME]);
    const spot = x.MAT_SPOTS[ME];
    // 옆 매트 친구 둘: 나보다 조금 늦게 같은 자세를 따라 함
    const pals = PALS.map(([m, look], i) => {
      const av = x.createAvatar(Object.assign({}, __LOOKS[look]));
      const s = x.MAT_SPOTS[m];
      av.holder.position.set(s.x, 0, s.z); av.holder.rotation.y = s.rot; av.pose = 'matSit'; av.nameShown = false; av.lag = 0.35 + 0.25*i;
      x.others.push(av);
      return av;
    });
    let step = -1, camY, camD, camYaw, camP, wide = 1;
    function cam(v, fit) {   // 매트 위 높이 h 범위가 fit(px) 안에 들어오게
      const [lo, hi] = v.h, view = Math.max(v.min, (hi - lo)*1920/(fit[1] - fit[0]));
      return [0.032 + (lo + hi)/2 + ((fit[0] + fit[1])/2 - 960)/1920*view, view/2/HALF];
    }
    window.__reel = {
      // 표지 카메라: 내 매트를 화면 아래쪽(가운데 900~1600px)에, yaw는 지금 자세의 보는 쪽에 더함
      cover({ yaw = 0 } = {}) {
        const v = VIEW[POSES[Math.max(0, step)]] || VIEW.matSplit, [cy, cd] = cam(v, [900, 1600]), yw = v.yaw + yaw;
        x.camera.position.set(spot.x + Math.sin(yw)*Math.cos(v.pitch)*cd, cy + Math.sin(v.pitch)*cd, spot.z + Math.cos(yw)*Math.cos(v.pitch)*cd);
        x.camera.lookAt(spot.x, cy, spot.z);
        x.renderer.render(x.scene, x.camera);
      },
      frame(t) {
        const k = t < INTRO ? -1 : Math.min(6, Math.floor((t - INTRO)/EACH));
        const s = t >= REST ? 7 : k;
        if (s !== step) {
          step = s;
          if (s >= 0 && s < 7) {
            x.startStretch(POSES[s]);
            if (s === 0 || s === 4) x.showEmote(me, 'sparkle');
            document.querySelectorAll('#reel .count i').forEach((el, i) => el.classList.toggle('on', i <= s));
            document.getElementById('cnt').textContent = (s + 1) + '/7';
          }
          if (s === 7) { camY = null;   // 아기자세 쪽에서 돌아오면 울타리 기둥을 스쳐서 바로 장면 전환
            x.sitDown(spot); x.faceMode = 'pant'; x.showEmote(me, 'sweat'); }
        }
        pals.forEach(av => {
          const tt = t - av.lag, kk = tt < INTRO ? -1 : Math.min(6, Math.floor((tt - INTRO)/EACH));
          av.pose = tt >= REST ? 'matSit' : kk < 0 ? 'matSit' : POSES[kk];
          if (tt >= REST && !av.panted) { av.panted = true; av.faceMode = 'pant'; x.showEmote(av, 'sweat'); }
        });
        x.update(dt);
        const v = VIEW[s < 0 ? 'intro' : s === 7 ? 'rest' : POSES[s]];
        const [ty, td] = cam(v, t >= END ? FIT_END : FIT);
        const tYaw = v.yaw, tP = v.pitch;
        if (camY == null) { camY = ty; camD = td; camYaw = tYaw; camP = tP; }
        const c = 1 - Math.exp(-4*dt);
        camY += (ty - camY)*c; camD += (td - camD)*c; camYaw += (tYaw - camYaw)*c; camP += (tP - camP)*c;
        // 처음엔 매트 여러 개(at만큼 옮긴 곳)를, 자세부터는 내 매트 가운데를 봄
        wide += ((s < 0 ? 1 : 0) - wide)*c;
        const yw = camYaw + 0.03*Math.sin(t*0.7);
        const cx = spot.x + wide*VIEW.intro.at[0], cz = spot.z + wide*VIEW.intro.at[1];
        x.camera.position.set(cx + Math.sin(yw)*Math.cos(camP)*camD, camY + Math.sin(camP)*camD, cz + Math.cos(yw)*Math.cos(camP)*camD);
        x.camera.lookAt(cx, camY, cz);
        x.renderer.render(x.scene, x.camera);
        __reelUI(t);
      }
    };
  }
};
