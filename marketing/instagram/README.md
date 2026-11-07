# 폴크닉 인스타 게시물

게임 렌더(캐릭터·호숫가) + HTML/CSS 템플릿(글자·패널·칩) → 1080×1440 PNG.

기획부터 캡션까지의 작업 순서와 판단 기준은 Claude skill [instagram-content](../../.claude/skills/instagram-content/SKILL.md)에 있다.

```
cd marketing/instagram
npm install          # 처음 한 번 (playwright-core, 맥 크롬을 그대로 씀)
npm run build        # 렌더 + 내보내기
npm run export       # 문구·레이아웃만 고쳤을 때 (렌더 재사용)
npm run render -- hello-ppose   # 렌더 하나만 다시
npm run reel -- tanghulu        # 릴스 영상 out/reel-tanghulu.mp4 (ffmpeg 필요: brew install ffmpeg)
npm run reel -- tanghulu 3 8    # 3초·8초 장면만 PNG로(구도 확인)
```

| 파일 | 역할 |
|---|---|
| `tokens.css` | 색·글꼴·여백·그림자 토큰과 공용 컴포넌트(시리즈 라벨, 헤드라인, 칩, 말풍선, 패널, 버튼) |
| `posts.html` | 게시물 템플릿. `<section class="ab" id="pNN-이름">` 하나가 한 장. 브라우저로 열면 축소 미리보기 |
| `shots.json` | 게임 렌더 목록(옷 `looks`, 포즈·카메라 `js` = `__poleDebug` 호출) |
| `scripts/render.js` | `../../index.html`을 헤드리스 크롬으로 열어 `renders/`에 저장. 실제 서버·GA 요청은 막음 |
| `scripts/export.js` | `posts.html?export`의 각 section을 `out/<id>.png`로 |
| `reels/<이름>.js` | 릴스 한 편: 겹칠 글자(`html`, `data-in`/`data-out` 초에 나타났다 사라짐), 장면 연출(`scene`, 매 프레임 `frame(t)`) |
| `reels/reel.css` | 릴스 공용 배치(1080×1920, 인스타가 가리는 위·아래·오른쪽 피해서) |
| `scripts/reel.js` | 게임을 1/30초씩 직접 진행하며 캡처(`reels/frames/`, 커밋 안 함) → ffmpeg로 `out/reel-<이름>.mp4`. 컴퓨터가 느려도 결과가 같음 |

- 캔버스 3:4. 제목·얼굴은 1:1 영역(위아래 180px 안쪽) 안에 둬야 그리드 미리보기에서 안 잘림
- 시리즈 색: 소식 `.series.news`(핑크), 폴 기술 도감 `.move`(하늘), 폴메이트 `.mate`(버터), 옷장 `.closet`(라일락)
- 이미지 소재는 게임 렌더만(외부 에셋 금지 원칙 그대로)
- 릴스 글자는 위 210px·아래 400px·오른쪽 150px 안쪽에(인스타 UI가 가림). 소리는 넣지 않음: 인스타 앱에서 음원을 얹는다
- 다른 경로의 크롬은 `CHROME=/path/to/chrome npm run build`
