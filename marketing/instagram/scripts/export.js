// posts.html의 게시물(<section class="ab" id=...>)을 각각 out/<id>.png(1080×1440)로 저장
// node scripts/export.js            전부
// node scripts/export.js p01-hello  id 고른 것만
const fs = require('fs');
const path = require('path');
const { launch } = require('./common');

const ROOT = path.join(__dirname, '..');

(async () => {
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.goto('file://' + path.join(ROOT, 'posts.html') + '?export');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const pick = process.argv.slice(2);
  const ids = (await page.$$eval('section.ab', els => els.map(e => e.id))).filter(id => !pick.length || pick.includes(id));
  for (const id of ids) {
    await page.locator('#' + id).screenshot({ path: path.join(ROOT, 'out', id + '.png') });
    console.log('export', id);
  }
  await browser.close();
})();
