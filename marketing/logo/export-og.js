// og.html의 시안을 PNG로. 배경은 ../instagram/renders/(npm run render -- og og-duo og-ppose)
// node export-og.js            og-duo(회전목마) → 루트 og-image.png
// node export-og.js og-duo ... 고른 시안 → out/<id>.png (실제 공유 이미지로 쓰려면 og-image.png로 복사)
const fs = require('fs');
const path = require('path');
const { launch } = require('../instagram/scripts/common');

const ids = process.argv.slice(2);

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file://' + path.join(__dirname, 'og.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  if (!ids.length) {
    await page.locator('#og-duo').screenshot({ path: path.join(__dirname, '../../og-image.png') });
    console.log('og-image.png');
  }
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  for (const id of ids) {
    await page.locator('#' + id).screenshot({ path: path.join(__dirname, 'out', id + '.png') });
    console.log('out/' + id + '.png');
  }
  await browser.close();
})();
