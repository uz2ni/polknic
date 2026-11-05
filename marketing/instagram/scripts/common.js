// 맥에 설치된 크롬을 그대로 씀(playwright 브라우저 따로 안 받음). 다른 경로면 CHROME 환경 변수로
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// --use-angle=metal: 헤드리스 기본값으론 WebGL 컨텍스트가 안 만들어짐
exports.launch = () => chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
