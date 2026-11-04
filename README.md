# 태번 도구함 (Tavern Toolkit) v0.1.0

독립형 SillyTavern 프런트엔드 확장. 첫 릴리스는 **디자인 모듈**만 구현한 개발/테스트 버전입니다.
ST-Interpres와 관계없는 자체 작성 코드이며 ST-Interpres 코드를 포함하지 않습니다.

## 기능
- 디자인 ON/OFF (OFF시 확장 전용 스타일 제거, 원래 ST 테마는 건드리지 않음)
- Paper / Midnight / Sage 3개 프리셋
- 폰트: 시스템 Pretendard 우선, Noto Sans KR / Nanum Myeongjo / Gowun Batang 무료 웹폰트
- 본문 폰트 크기, 줄간격, 자간, 문단 간격, 7종 색상 변경
- 변경 즉시 적용, ST 확장 설정으로 저장
- 디자인 설정 JSON 내보내기/가져오기
- 한글화 / 번역 / QR / 조회는 **미구현**이므로 스위치가 잠겨 있습니다. 후속 버전에서 각각 독립적으로 제공할 예정입니다.

## 설치
1. ZIP을 압축 해제합니다.
2. `tavern-toolkit` 폴더(그 안에 `manifest.json`이 바로 있어야 함)를 SillyTavern의 `data/<사용자>/extensions/` 에 복사합니다. 다중 사용자 또는 서버용 설치에서는 서버 설정에 따라 다른 설치 위치를 사용해야 할 수 있습니다.
3. SillyTavern을 새로고침합니다.
4. **확장 → 확장 설정 → 태번 도구함**에서 디자인을 설정합니다.

공식 확장 설치 UI는 Git 저장소 URL을 받으므로, 이 ZIP을 먼저 GitHub 저장소의 루트에 올리면 해당 저장소 주소로 설치할 수도 있습니다. ZIP 파일 주소를 저장소 URL 대신 붙여 넣는 방식은 지원하지 않습니다.

## 웹폰트 연결
Noto Sans KR, Nanum Myeongjo, Gowun Batang 선택 시 Google Fonts CSS를 브라우저에서 요청합니다. 연결이 안 되면 시스템 글꼴이 사용됩니다. Pretendard는 내장 파일이 아니라 **설치된 경우에만** 적용되고 그렇지 않으면 시스템 기본 한글 글꼴로 대체됩니다. 폰트 파일은 ZIP에 포함하지 않았습니다.

## 주의
- UI 요소의 ID와 DOM 구조는 SillyTavern 버전에 따라 달라질 수 있습니다. 실제 사용 중인 ST 버전의 화면에서 확인이 필요합니다.
- 이 개발 빌드는 실사용 서버와의 통합 테스트를 거치지 않았습니다. 테스트 전 설정을 백업하세요.
- 원래 ST 테마의 저장 프리셋, 프롬프트, 채팅 데이터, ST-Interpres 설정을 수정하지 않습니다.
