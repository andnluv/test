# Tavern Toolkit — 폰트 출처 및 라이선스

검토일: 2026-11-04

> 이 문서는 배포 전 라이선스 감사 기록입니다. **폰트 목록에 있다고 해서 해당 폰트 파일이 현재 ZIP에 포함되어 있다는 뜻은 아닙니다.** 실제 배포 시 포함한 파일의 정확한 버전과 저작권 표시, 원문 라이선스 파일을 `fonts/licenses/`에도 보관해야 합니다. 저작권자의 최신 조건이 우선합니다.

## 배포 정책

- **내장 가능**: 공식 OFL 또는 명시적인 재배포 허락을 확인한 원본 파일만 포함합니다. OFL 폰트마다 저작권 고지와 라이선스 전문을 동봉하고 폰트 파일 단독 판매는 하지 않습니다.
- **조건부**: 웹·앱 사용은 허용되더라도 ZIP 재배포가 명확하지 않거나 별도 승인 조건이 있으면 기본 ZIP에 파일을 포함하지 않습니다. 사용자 직접 설치 또는 적법한 공식 웹폰트 연동을 우선 검토합니다.
- **제외**: 임베딩·복제·재배포 금지 폰트는 ZIP에 포함하지 않습니다.
- **웹폰트**: 공개 CDN 주소 존재만으로 재호스팅·재배포 허가가 성립하지 않습니다. 외부 웹폰트 이용 시 네트워크 연결과 서비스 약관을 확인해야 합니다.

## 고딕

| 이름 | 확인 근거 | ZIP 동봉 판단 | 고지사항 |
|---|---|---|---|
| 프리텐다드 (Pretendard) | SIL OFL 1.1, https://github.com/orioncactus/pretendard | 가능 | 저작권·OFL 전문 동봉, Reserved Font Name 주의 |
| KoPub 돋움 | 문화체육관광부·한국출판인회의, https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200023&wrtSn=13287211 | 보류 | 무료 사용 허용. 재배포 및 서버 사용 조건의 명확한 승인 확인 전 미동봉 |
| 나눔스퀘어라운드 | 네이버·네이버문화재단, https://noonnu.cc/font_page/38 | 가능 | OFL 원문과 저작권 표시 동봉 |
| IBM Plex Sans KR | IBM, https://github.com/IBM/plex/blob/master/packages/plex-sans-kr/LICENSE.txt | 가능 | SIL OFL 1.1, Reserved Font Name Plex |

## 명조·바탕

| 이름 | 확인 근거 | ZIP 동봉 판단 | 고지사항 |
|---|---|---|---|
| 리디바탕 | 리디, https://noonnu.cc/font_page/324 | 가능 | SIL OFL 1.1, 리디 저작권 및 전문 동봉 |
| KoPub 바탕 | 문화체육관광부·한국출판인회의, https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200195&wrtSn=13287214 | 보류 | 무료 사용과 ZIP 파일 재배포를 구별하여 확인 |
| **함렡 (Hahmlet)** — 을유1945 대체 | Hypertype, https://github.com/hyper-type/hahmlet | 가능 | SIL OFL 1.1 및 저작권·라이선스 전문 동봉 |
| 부산단디명조 | 부산광역시, https://www.busan.go.kr/bhbusan | 조건부 가능 | 공공누리 제1유형 출처 표시. 무상 원본 재배포 해석은 배포 전 재확인, 유료 파일 판매/복사·배포 대가 수령 금지 |
| Zen Old Mincho *(기존 요청 'ZEN SERIF' 명칭 정규화 후보)* | Zen Project, https://github.com/googlefonts/zen-oldmincho | 가능 | SIL OFL 1.1. **일본어 중심 서체이므로 한글 글리프·대체 폰트 렌더링 시험 필요.** 정확한 요청 폰트 명칭 확인 전 자동 대체 금지 |

## 꾸밈

| 이름 | 확인 근거 | ZIP 동봉 판단 | 고지사항 |
|---|---|---|---|
| 모나12 (Mona12) | Monad ABXY, https://github.com/MonadABXY/mona-font | 가능 | SIL OFL 1.1, 관련 크레딧·라이선스 동봉, 픽셀 폰트 권장 크기 유의 |
| 산하엽 | 형민하·자모, https://noonnu.cc/font_page/1346 | 가능 | SIL OFL 기반 배포, 원본 OFL·저작권 고지 동봉 |
| 강원교육새음체 | 강원도교육청·헤움디자인, https://noonnu.cc/font_page/806 | 보류 | 무료 사용·웹폰트 제공 확인. 안내에서 폰트 파일 복제·배포 제한을 명시하므로 ZIP 미동봉 |
| 그리운X국한박 글방구리체 | 2차 자료 https://font.ptlink.co.kr/assets/fonts/font-1160-그리운x국한박-글방구리체.html | 보류 | 공식 원문을 직접 확인하지 못했고 2차 자료에 파일 재배포 금지 표기가 있어 미동봉 |

## 제외한 폰트

**을유1945** — 을유문화사, https://noonnu.cc/font_page/620 . 인쇄물·웹페이지 등 사용은 허용하나 서버·디바이스 임베딩, 수정, 복사, 배포가 제한되어 확장 ZIP에 넣지 않습니다. **함렡(Hahmlet)**으로 대체합니다.

## 배포할 때 확인할 사항

1. `fonts/`에 실제 존재하는 각 원본 폰트의 공식 다운로드 URL, 취득 일자와 버전을 기록합니다.
2. OFL 1.1 폰트의 `OFL.txt` 또는 해당 저작권·라이선스 원문을 폰트별로 동봉합니다.
3. 사용 조건이 불명확한 폰트는 드롭다운에는 설치된 로컬 폰트로만 보이게 하거나, 별도 확인 후에 활성화합니다. 폰트가 없는데도 적용됐다고 표시하지 않습니다.
4. 부산단디명조는 부산광역시 출처를 표시하고 무료 원본 파일 배포 범위를 다시 확인합니다.
5. KoPub·강원교육새음체·글방구리체는 별도 재배포 허가를 얻기 전 기본 ZIP에서 제외합니다.
6. Zen Old Mincho는 한글 표시의 실제 품질을 검사하기 전 한글 본문용 기본값으로 사용하지 않습니다.
7. 새 폰트마다 대사/지문 독립 선택, 미리보기, 글리프 누락, 폴백과 네트워크 오류를 시험합니다.

이 목록은 배포 정책에 관한 검토 결과이며 법률 자문은 아닙니다.
