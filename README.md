# 한국 특수교육 교육과정 MCP

대한민국 2022 개정 특수교육 교육과정 중 중학교·고등학교의 기본·공통·선택 중심
교육과정을 출처와 함께 탐색하는 읽기 전용 MCP 서버다.

현재 버전은 `v0.1.0-candidate`다. 공식 원문을 저장소에 배포하지 않고,
고시·별책·파일 해시·페이지 위치에 연결된 로컬 검색 코퍼스를 재현한다.

## 빠른 시작

준비물은 Git과 Node.js 20 이상이다. 저장소를 내려받은 뒤 다음 명령을 실행한다.

```powershell
git clone <이 저장소의 GitHub URL>
cd korean-special-education-curriculum-mcp
npm install
npm run sources:prepare
npm run check
npm run test:mcp
```

`sources:prepare`는 공개 URL에서 받을 수 있는 자료를 자동으로 내려받고 구조화한다. 게시기관
로그인이 필요한 선택적 보충자료가 없으면 경고만 출력하고 나머지 자료 준비를 계속한다.
서버가 사용할 수 있는 실제 범위와 누락 자료는 `get_coverage_report`로 확인한다.

처음 설치하는 사용자를 위한 운영체제별 연결 방법과 예시는
[`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)에 정리했다.

## 범위

- 중학교와 고등학교
- 기본 교육과정
- 공통 교육과정
- 선택 중심 교육과정
- 교육부 고시 제2022-34호와 후속 개정 고시

현행 기준일은 2026-08-19이며 국가교육위원회 고시 제2026-2호를 특수교육 기준선으로
삼는다. 공통·선택 중심 일반 교과의 적용 관계를 확인하기 위해 제2024-3호도 함께
수집한다.

## 현재 구현

- 공식 출처 81건 준비: 법정 교육과정 35건, 해설 1건, 평가자료 17건, 연구·점검자료 28건
- 현행 법정 범위 29건: 특수교육 별책 1·2·3과 중·고등학교에 준용되는 일반교육과정 별책 26건
- 파일 시그니처 검사, SHA-256, 최종 URL 및 수집 시각 기록
- `kordoc`을 이용한 HWP/HWPX/PDF → Markdown·구조 청크 변환
- 26,354쪽, 112,889개 청크의 로컬 검색 코퍼스
- 중학교·고등학교 및 기본·공통·선택 중심 필터
- 법정 원문·해설·성취/평가·연구자료를 분리하는 `materialKind` 필터
- 출처 URL·고시번호·쪽수·목차 경로를 포함하는 읽기 전용 STDIO MCP

## 개발

```powershell
npm install
npm run sources:prepare
npm run check
npm run test:mcp
npm run serve
```

공식 문서 다운로드와 추출 결과는 `.gitignore` 대상이다. 재현 정보는
`sources/official/source-receipts.json`에 기록한다.

법정 교육과정과 공개 보충자료는 따로 내려받을 필요가 없다. `npm run sources:prepare`가
공식 URL에서 다운로드하고 검증한 뒤 변환한다. 에듀에이블 회원 접근 자료는 선택 사항이며 카탈로그의
`manualAcquisition`에 원래 파일명과 ZIP 내부 경로를 기록하며, 해당 원본을 직접 확보해
`sources/official/files/`의 지정된 영문 파일명으로 두면 전체 코퍼스에 포함된다. 누락 시
수집기가 필요한 파일과 대상 이름을 출력한 뒤 자동 수집 가능한 나머지 자료를 계속 처리한다.

로컬에 전체 자료가 준비되었는지는 다음 명령으로 엄격하게 확인한다.

```powershell
npm run check:full
```

## MCP 도구

- `list_official_sources`: 현행 기준선, 출처, 준비 상태와 청크 수
- `get_coverage_report`: 현행 법정 원문과 보충자료의 준비·누락 상태
- `search_curriculum`: 검색어·학교급·교육과정 유형·교과·자료 종류 필터 검색
- `get_curriculum_chunk`: 검색 결과의 원문 문맥과 위치 조회
- `find_achievement_standard`: 성취기준 코드 검색

## MCP 연결

로컬 STDIO 서버로 실행한다. 빌드 후 프로젝트 범위의 `.codex/config.toml` 또는
Codex MCP 설정에서 다음 명령을 사용한다.

```text
node <absolute-project-path>/dist/src/server.js
```

Codex 프로젝트 설정 예시는 다음과 같다.

```toml
[mcp_servers.korean-special-education-curriculum]
command = "node"
args = ["<absolute-project-path>/dist/src/server.js"]
```

서버를 연결하기 전에 `npm run sources:prepare`와 `npm run build`를 한 번 실행한다.

연결 후에는 먼저 다음과 같이 요청해 범위를 확인하는 것이 좋다.

```text
특수교육 MCP의 get_coverage_report로 현재 수록 범위를 확인해줘.
```

이후의 질문 예시는 다음과 같다.

```text
고등학교 기본 교육과정 국어 성취기준을 고시 원문, 쪽수, URL과 함께 찾아줘.
[12국어01-02]의 원문과 성취기준 해설을 구분해서 보여줘.
진로와 직업 과목에서 안전과 관련된 내용을 고시 원문만 대상으로 검색해줘.
```

## 데이터 해석 범위

국가교육위원회 고시 제2026-2호 별책 2가 준용하는 일반교육과정 가운데 중·고등학교
범위인 별책 3·4·7·12·14·18·19·22·23~39·41을 모두 포함한다. 현행 법정 원문 29건은
`get_coverage_report`에서 독립적으로 완전성 검사를 받는다. 이전 고시 6건은 변경 이력과
출처 확인용으로 보존하지만 기본 검색에서는 제외한다.

해설·평가·연구자료는 법정 교육과정과 같은 효력을 갖는 문서가 아니므로 별도 자료 종류로
표시한다. 국립특수교육원의 2022년 특수교육 교육과정 시안 연구 중 중·고등학교 범위 26종,
2025년 국가교육과정 특수교육 조사·점검 보고서, 평가 가이드와 기본 교육과정 평가자료,
2026년 고등학교 성취수준 자료, 이료·직업생활 성취수준과 최소 성취수준 보장지도 자료까지
색인한다. 에듀에이블 회원 접근 자료는 사용자가 직접 확보한 원본만 로컬에서 처리하며 Git에는
포함하지 않는다. 정의한 특수교육 전용 보충자료 범위의 알려진 누락은
`get_coverage_report`에서 0건으로 확인할 수 있다.

## 권리와 비승인 고지

이 프로젝트는 교육부·국가교육위원회·NCIC의 공식 제품이 아니다. 공식 문서는 각
원 출처의 이용조건을 따르며, 이 저장소의 MIT 라이선스가 공식 문서에 적용되는 것은
아니다. 자세한 내용은 `PROVENANCE.md`, `ACKNOWLEDGEMENTS.md`,
`THIRD_PARTY_NOTICES.md`를 참조한다.

오류 제보와 개선 기여 방법은 [`CONTRIBUTING.md`](CONTRIBUTING.md), 보안 문제 신고는
[`SECURITY.md`](SECURITY.md)를 참조한다.
