# 폴크닉 UTM 설정 가이드

폴크닉(https://polknic.yujamong.com)으로 들어오는 광고·유입 링크의 UTM 규칙. 링크를 새로 만들거나 바꿀 때는 이 문서를 따르고, 맨 아래 변경 이력에 남긴다.

## 한눈에 보기

모든 링크의 `utm_source`는 `instagram`. 예외: 홈 화면 아이콘(앱)으로 연 접속은 `manifest.webmanifest`의 `start_url`이 `utm_source=homescreen&utm_medium=pwa`로 들어옴(인스타 링크가 아니라 다시 찾아온 사람)

| 경로 | medium | campaign | content | term |
|---|---|---|---|---|
| 공식 프로필 | `social` | `profile` | `yujamong.pole` | 없음 |
| 공식 홍보하기 광고 | `paid_social` | `ad_app` | `yujamong.pole` | `YYMMDD_소재_내용` |
| 공식 스토리 | `social` | `story` | `yujamong.pole` | 없음 |
| 개인 스토리 | `social` | `story` | `uz2ning_pole` | 없음 |
| 개인 프로필 | `social` | `profile` | `uz2ning_pole` | 없음 |

### 바로 복사할 링크

공식 프로필

```text
https://polknic.yujamong.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile&utm_content=yujamong.pole
```

공식 홍보하기 광고 (예시, `utm_term`은 광고마다 바꾼다)

```text
https://polknic.yujamong.com/?utm_source=instagram&utm_medium=paid_social&utm_campaign=ad_app&utm_content=yujamong.pole&utm_term=261107_cardnews_open
```

공식 스토리

```text
https://polknic.yujamong.com/?utm_source=instagram&utm_medium=social&utm_campaign=story&utm_content=yujamong.pole
```

개인 스토리

```text
https://polknic.yujamong.com/?utm_source=instagram&utm_medium=social&utm_campaign=story&utm_content=uz2ning_pole
```

개인 프로필

```text
https://polknic.yujamong.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile&utm_content=uz2ning_pole
```

## 배경

- GA4로 유입 경로를 분석 중이다. 속성: polknic
- 과거 공식 계정 프로필 링크가 `utm_medium=bio`로 걸려 있어서 GA4 기본 채널 그룹에서 Unassigned로 분류됐다. 그래서 표준 medium 값으로 다시 정의했다.
- 현재 유입 경로: 공식 인스타 계정 프로필, 공식 계정 게시물 홍보하기(인스타 앱에서 바로 광고), 개인 폴 계정의 스토리·프로필

## 계정

| 구분 | 계정 |
|---|---|
| 공식 | `yujamong.pole` |
| 개인 | `uz2ning_pole` |

## 파라미터 규칙

| 파라미터 | 폴크닉에서의 용도 | 값 | GA4 차원 |
|---|---|---|---|
| `utm_source` | 플랫폼 | `instagram` | 세션 소스 |
| `utm_medium` | 유료/무료 | 무료 `social` / 광고 `paid_social` | 세션 매체 |
| `utm_campaign` | 링크 위치 | `profile` / `story` / `ad_app` | 세션 캠페인 |
| `utm_content` | 계정 | `yujamong.pole` / `uz2ning_pole` | 세션 수동 광고 콘텐츠 |
| `utm_term` | 광고 게시물(광고에만 사용) | `YYMMDD_소재_내용` (예: `261107_cardnews_open`) | 세션 수동 검색어 |

## 공통 규칙

- 모든 값은 소문자, 공백 없이 쓴다. 대소문자가 다르면 별도 값으로 집계된다.
- 같은 도메인 내부 링크에는 UTM을 붙이지 않는다. 세션이 끊기고 유입 정보가 덮어써진다.
- 피드 게시물·릴스 캡션의 링크는 클릭되지 않는다. 게시물 유입은 스토리 링크 스티커나 프로필 링크로 유도한다.
- 새 플랫폼을 추가할 때는 `utm_source`만 바꾸고 나머지 규칙은 유지한다.

## 왜 이렇게 정했나

- **`utm_medium`은 GA4가 인식하는 표준 값(`social`, `paid_social` 등)만 쓴다.** 기본 채널 그룹에서 Organic Social / Paid Social로 자동 분류되게 하기 위해서다. 직접 정의한 값(`bio`, `story` 등)은 수집은 되지만 Unassigned로 빠진다.
- **`utm_campaign`은 GA4가 의미를 해석하지 않는 라벨이다.** 광고 여부는 medium(`paid_social`)이 담당한다.
- **`ad_app`은 인스타 앱 "홍보하기"로 건 광고다.** 나중에 Meta 광고 관리자를 쓰면 `ad_manager` 등으로 구분할 예정이다.
- **`utm_content`는 계정 구분에 쓴다.** 원래는 같은 캠페인 안의 소재를 구분하는 용도다.
- **`utm_user_id` 같은 커스텀 파라미터는 쓰지 않는다.** GA4가 자동 수집하지 않고, GA4 User-ID 기능과 이름이 겹친다.
- **`utm_term`에 연도를 넣는다(YYMMDD).** 해가 바뀌어도 겹치지 않고 시간순으로 정렬된다.
- **인스타 앱 홍보하기에서는 `{{ad.name}}` 같은 Meta 동적 매개변수를 쓰지 않고 값을 직접 입력한다.** 치환되지 않고 글자 그대로 찍힐 수 있다.

## 새 광고를 걸 때 체크리스트

- [ ] `utm_term` 작명: `YYMMDD_소재_내용` (소문자, 공백 없이)
- [ ] 위 "공식 홍보하기 광고" 링크에서 `utm_term`만 바꿔 링크 생성
- [ ] 시크릿 창으로 링크 접속 테스트
- [ ] GA4 실시간 보고서에서 값 확인
- [ ] 아래 변경 이력에 기록

## GA4에서 확인하는 방법

- 보고서 → 획득 → 트래픽 획득으로 들어가 표 차원을 "세션 소스/매체", "세션 캠페인" 등으로 바꾼다.
- 보조 차원(+)으로 "세션 수동 광고 콘텐츠"(계정), "세션 수동 검색어"(광고 게시물)를 추가한다.
- 링크를 바꾼 뒤에는 시크릿 창으로 접속해서 실시간 보고서에서 값을 확인한다.
- 일반 보고서는 반영까지 24~48시간 걸릴 수 있다.
- 과거 데이터(`instagram / bio`, `instagram / story`)는 소급 변경되지 않는다. 합쳐 보려면 "세션 소스 = instagram"으로 필터한다.

## 링크 변경 이력

| 날짜 | 위치 | 링크 | 비고 |
|---|---|---|---|
| 2026-11-07 | 공식 프로필 | `https://polknic.yujamong.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile&utm_content=yujamong.pole` | medium `bio` → `social` 변경 |
| 2026-11-07 | 개인 프로필 | `https://polknic.yujamong.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile&utm_content=uz2ning_pole` | 새로 추가 |
| 2026-11-08 | 공식 스토리 | `https://polknic.yujamong.com/?utm_source=instagram&utm_medium=social&utm_campaign=story&utm_content=yujamong.pole` | 새로 추가(스트레칭존·사진 찍기 릴스 홍보) |
| 2026-11-12 | 홈 화면 아이콘(manifest `start_url`) | `https://polknic.yujamong.com/?utm_source=homescreen&utm_medium=pwa` | 새로 추가(홈 화면에 추가 카드뉴스와 함께) |
