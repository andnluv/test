# Tavern Toolkit v0.2.3

## 변경사항
- 본문 최대 폭·메시지 간격 옵션 제거 (이전 버전에서 저장한 값도 더 이상 사용하지 않음)
- 색상 패널 기본 펼침, 테마별 색상 9개 항목의 컬러 피커와 강조색 빠른 선택 칩 제공
- 미리보기 별도 영역: 테마·색상·본문·대사 폰트·크기·행간·자간·문단 간격 변경 시 즉시 갱신
- 설정 확장 아코디언 헤더의 남는 어두운 배경 및 텍스트 대비 보완
- 내장 폰트 선택지의 `(내장)` 표기 삭제
- 지문 폰트/대사 폰트 별도 선택. 대사는 렌더링된 채팅의 한 텍스트 노드 안에 짝이 맞는 “...” / 「...」 / "..." 구간만 감지해 `span`으로 래핑. 원본 채팅·프롬프트는 변경하지 않음.
- 디자인 모듈 OFF 시 동적으로 넣은 CSS와 대사 래핑 제거

## 설치
ZIP의 **내용물**을 GitHub 저장소 최상위에 업로드하세요. `manifest.json`, `index.js`, `design.js`, `style.css`, `fonts/`가 루트에 있어야 합니다. 이후 SillyTavern에서 확장을 업데이트하고 새로고침하세요.

## 제약
대사/지문 구분은 자연어 의미 분석이 아닌 인용부호 기반 표시입니다. 인용부호가 여러 HTML 요소로 나뉘거나 대사에 인용부호가 없으면 지문 폰트로 표시될 수 있습니다. 타사 테마 CSS가 더 높은 우선순위로 색상을 지정하면 일부 영역은 별도 조정이 필요할 수 있습니다. 실제 SillyTavern UI에서의 호환성은 아직 검증되지 않았습니다.

## 포함 파일
`manifest.json`, `index.js`, `design.js`, `style.css`, `fonts/`, `README.md`, `package.json`, `design.test.mjs`


### 추가 폰트 (v0.2.3)
기존 내장 3종 외에 눈누에 소개된 웹폰트 6종을 지문/대사 선택기에 추가했습니다: 프리텐다드, 눈누 기초고딕, 마루 부리, 리디바탕, 서울한강체, 연성체.
이 6종은 확장에 폰트 파일을 포함하지 않고 각 제공처의 CDN에서 로드합니다. 네트워크/차단 환경에서는 기존 폰트로 대체됩니다.
- 프리텐다드: https://noonnu.cc/font_page/694
- 눈누 기초고딕: https://noonnu.cc/font_page/1496
- 마루 부리: https://noonnu.cc/font_page/487
- 리디바탕: https://noonnu.cc/font_page/324
- 서울한강체: https://noonnu.cc/font_page/60
- 연성체: https://noonnu.cc/font_page/54
각 글꼴의 저작권과 라이선스는 해당 제작자에게 있으며, CDN 자산은 수정/재배포하지 않습니다.


## 글꼴 라이브러리 (v0.2.3)

지문과 대사는 각각 독립적인 글꼴을 지정할 수 있으며, `고딕 / 명조·바탕 / 꾸밈`으로 분류됩니다. 기본 포함 나눔 폰트 3종 외에 사용자가 선택한 13종을 목록에 등록했습니다. **등록 = 파일 동봉은 아닙니다.**

| 계열 | 글꼴 | 제공 방식 | 안내 |
|---|---|---|---|
| 고딕 | 프리텐다드 | 외부 CDN | OFL 1.1, https://github.com/orioncactus/pretendard |
| 고딕 | KoPub 돋움 | 로컬 설치 | ZIP 미포함, 재배포 허가 미확정, https://www.kopus.org |
| 고딕 | 나눔스퀘어라운드 | 로컬 설치 | ZIP 미포함(공식 파일/라이선스 취득 경로 확인 필요) |
| 고딕 | IBM Plex Sans KR | Google Fonts | OFL 1.1, https://github.com/IBM/plex |
| 명조 | 리디바탕 | 외부 CDN | 공식 라이선스 재확인 권장, https://noonnu.cc/font_page/324 |
| 명조 | KoPub 바탕 | 로컬 설치 | ZIP 미포함, 재배포 허가 미확정, https://www.kopus.org |
| 명조 | 함렡 (을유1945 대체) | Google Fonts | OFL 1.1, https://github.com/hyper-type/hahmlet |
| 명조 | 부산단디명조 | 로컬 설치 | ZIP 미포함, 출처 부산광역시 https://www.busan.go.kr |
| 명조 | Zen Old Mincho | Google Fonts | OFL 1.1; 한글은 나눔명조로 대체될 수 있음, https://github.com/googlefonts/zen-oldmincho |
| 꾸밈 | 모나12 | 공식 CDN | OFL 1.1, https://github.com/MonadABXY/mona-font |
| 꾸밈 | 산하엽 | 로컬 설치 | ZIP 미포함, https://noonnu.cc/font_page/1346 |
| 꾸밈 | 강원교육새음체 | 로컬 설치 | ZIP 미포함, 파일 재배포 제한 주의, https://noonnu.cc/font_page/806 |
| 꾸밈 | 그리운X국한박 글방구리체 | 로컬 설치 | ZIP 미포함, 정확한 공식 배포 조건 미확정 |

기존 동봉 나눔 폰트 3종은 `fonts/`의 각 파일과 `fonts/OFL-1.1.txt`를 참조합니다. 외부 웹폰트는 인터넷 및 CDN 접근이 필요하며, 확장 설치 ZIP에 들어 있지 않습니다. 로컬 글꼴은 운영체제에 설치되어 있어야 합니다. 미설치 시 브라우저가 대체 폰트를 표시할 수 있습니다.

공개 배포 전에 폰트별 저작권 고지·라이선스 원문·배포처를 다시 확인하고, `FONT_LICENSES.md`의 감사 기록을 함께 검토하세요.
