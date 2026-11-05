# 폴크닉 인스타 게시물

게임 렌더(캐릭터·호숫가) + HTML/CSS 템플릿(글자·패널·칩) → 1080×1440 PNG.

```
cd marketing/instagram
npm install          # 처음 한 번 (playwright-core, 맥 크롬을 그대로 씀)
npm run build        # 렌더 + 내보내기
npm run export       # 문구·레이아웃만 고쳤을 때 (렌더 재사용)
npm run render -- hello-ppose   # 렌더 하나만 다시
```

| 파일 | 역할 |
|---|---|
| `tokens.css` | 색·글꼴·여백·그림자 토큰과 공용 컴포넌트(시리즈 라벨, 헤드라인, 칩, 말풍선, 패널, 버튼) |
| `posts.html` | 게시물 템플릿. `<section class="ab" id="pNN-이름">` 하나가 한 장. 브라우저로 열면 축소 미리보기 |
| `shots.json` | 게임 렌더 목록(옷 `looks`, 포즈·카메라 `js` = `__poleDebug` 호출) |
| `scripts/render.js` | `../../index.html`을 헤드리스 크롬으로 열어 `renders/`에 저장. 실제 서버·GA 요청은 막음 |
| `scripts/export.js` | `posts.html?export`의 각 section을 `out/<id>.png`로 |

- 캔버스 3:4. 제목·얼굴은 1:1 영역(위아래 180px 안쪽) 안에 둬야 그리드 미리보기에서 안 잘림
- 시리즈 색: 소식 `.series.news`(핑크), 폴 기술 도감 `.move`(하늘), 폴메이트 `.mate`(버터), 옷장 `.closet`(라일락)
- 이미지 소재는 게임 렌더만(외부 에셋 금지 원칙 그대로)
- 다른 경로의 크롬은 `CHROME=/path/to/chrome npm run build`
