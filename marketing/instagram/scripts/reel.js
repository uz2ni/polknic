// reels/<name>.js의 릴스를 1080×1920 영상으로: 게임을 한 프레임씩 직접 진행하며 캡처(컴퓨터가 느려도 같은 결과) → ffmpeg로 out/reel-<name>.mp4
// node scripts/reel.js tanghulu          전체
// node scripts/reel.js tanghulu 3.5 8    3.5초·8초 장면만 out/reel-<name>-<초>.png로(구도 확인용)
// node scripts/reel.js tanghulu cover  표지 out/reel-<name>-cover.png (cover 뒤에 숫자를 주면 그 카메라 각도들로 하나씩: 각도 고르기용)
// ffmpeg가 PATH에 없으면 FFMPEG=/경로/ffmpeg
// reels/<name>.js: { look, dur, fps, html(겹쳐 그릴 글자·패널), css, scene(페이지 안에서 돌아갈 함수, window.__reel.frame(t)·cover(opts)를 만듦),
//                    cover: { at(이 초까지 진행한 장면으로), html, css, opts(__reel.cover에 넘길 카메라 값) } }
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { launch, openGame } = require('./common');

const ROOT = path.join(__dirname, '..');
const W = 1080, H = 1920;

(async () => {
  const [name, ...stills] = process.argv.slice(2);
  const reel = require(path.join(ROOT, 'reels', name + '.js'));
  const { looks } = JSON.parse(fs.readFileSync(path.join(ROOT, 'shots.json'), 'utf8'));
  const fps = reel.fps || 30, n = Math.round(reel.dur*fps);
  const isCover = stills[0] === 'cover', yaws = isCover ? stills.slice(1).map(Number) : [];
  const want = isCover ? [Math.round(reel.cover.at*fps)] : stills.length ? stills.map(s => Math.round(+s*fps)) : null;

  const browser = await launch();
  const page = await openGame(browser, { w: W, h: H, look: looks[reel.look], looks });
  await page.addStyleTag({ url: 'http://polknic.local/marketing/instagram/tokens.css' });
  await page.addStyleTag({ url: 'http://polknic.local/marketing/instagram/reels/reel.css' });
  if (reel.css) await page.addStyleTag({ content: reel.css });
  await page.evaluate(html => { const d = document.createElement('div'); d.id = 'reel'; d.innerHTML = html; document.body.append(d); }, reel.html);
  await page.evaluate(() => document.fonts.ready);
  // 겹친 글자: data-in(초)에 살짝 튕기며 나타나고 data-out(초)에 사라짐. CSS 애니메이션은 실제 시간으로 돌아서 프레임과 안 맞으므로 t로 직접 그림
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('#reel [data-in]')];
    const pop = k => 1 + 2.4*Math.pow(k - 1, 3) + 1.4*Math.pow(k - 1, 2);
    window.__reelUI = t => els.forEach(el => {
      const a = +el.dataset.in, b = el.dataset.out ? +el.dataset.out : Infinity;
      const k = t < a || t >= b ? -1 : Math.min(1, (t - a)/0.3);
      el.style.opacity = k < 0 ? 0 : Math.min(1, k*1.8);
      el.style.transform = k < 0 ? '' : `scale(${0.8 + 0.2*pop(k)})`;
    });
  });
  await page.evaluate(`(${reel.scene})(${fps})`);

  const frames = path.join(ROOT, 'reels/frames', name);
  if (!want) { fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true }); }
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => __reel.frame(t), i/fps);   // 장면은 앞에서부터 차례로만 진행되므로 구도 확인도 처음부터 돌림
    if (want && !want.includes(i)) continue;
    if (isCover) {
      // 표지: 영상 글자를 표지용으로 바꾸고 카메라만 다시 잡아 한 장
      if (reel.cover.css) await page.addStyleTag({ content: reel.cover.css });
      await page.evaluate(html => { const d = document.getElementById('reel'); d.className = 'cover'; d.innerHTML = html; }, reel.cover.html);
      for (const y of yaws.length ? yaws : [null]) {
        await page.evaluate(o => __reel.cover(o), y == null ? reel.cover.opts : { ...reel.cover.opts, yaw: y });
        const file = path.join(ROOT, 'out', `reel-${name}-cover${y == null ? '' : '-' + y}.png`);
        await page.screenshot({ path: file });
        console.log('cover', file);
      }
      break;
    }
    const file = want ? path.join(ROOT, 'out', `reel-${name}-${(i/fps).toFixed(1)}.png`) : path.join(frames, String(i).padStart(4, '0') + '.jpg');
    await page.screenshot(want ? { path: file } : { path: file, type: 'jpeg', quality: 92 });
    if (want) console.log('still', file);
    else if (i % fps === 0) process.stdout.write(`\r${(i/fps).toFixed(0)}/${reel.dur}초`);
    if (want && i >= Math.max(...want)) break;
  }
  await browser.close();
  if (want) return;
  const out = path.join(ROOT, 'out', `reel-${name}.mp4`);
  execFileSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, '%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out]);
  console.log(`\nreel ${out} (${((Date.now() - t0)/1000).toFixed(0)}초 걸림)`);
})();
