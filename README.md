# 한국 특수교육 교육과정 MCP

대한민국 2022 개정 특수교육 교육과정의 중학교·고등학교 기본·공통·선택 중심 내용을 공식 출처와 함께 검색하는 읽기 전용 MCP 서버입니다.

기본 설치에는 현행 법정 교육과정 29개 문서가 내장되어 있습니다. 사용자가 교육과정 파일을 따로 내려받거나 Kordoc을 실행할 필요가 없습니다.

## 가장 쉬운 설치

### Claude Desktop: 파일 하나로 설치

1. GitHub Releases에서 `korean-special-education-curriculum-mcp-0.1.0.mcpb`를 내려받습니다.
2. Claude Desktop의 **Settings → Extensions → Advanced settings → Install Extension…**을 엽니다.
3. 내려받은 `.mcpb` 파일을 선택합니다.

Claude Desktop에 포함된 Node.js로 실행되므로 Git·Node.js·Python을 별도로 설치하지 않아도 됩니다. 자세한 공식 절차는 [Claude의 로컬 MCP 설치 안내](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)를 참고하세요.

### Codex: 명령 한 줄

Node.js 20 이상이 필요합니다.

```shell
codex mcp add korean-special-education -- npx -y korean-special-education-curriculum-mcp
```

Codex를 다시 시작한 뒤 `/mcp`로 연결 상태를 확인합니다. Codex의 STDIO MCP 등록 형식은 [OpenAI 공식 MCP 문서](https://developers.openai.com/codex/mcp)에 맞췄습니다.

### Claude Code: 명령 한 줄

macOS·Linux:

```shell
claude mcp add korean-special-education --scope user -- npx -y korean-special-education-curriculum-mcp
```

Windows:

```powershell
claude mcp add korean-special-education --scope user -- cmd /c npx -y korean-special-education-curriculum-mcp
```

Claude Code에서 `/mcp`로 연결 상태를 확인합니다. Windows의 `cmd /c` 사용은 [Claude Code 공식 MCP 안내](https://docs.anthropic.com/en/docs/claude-code/mcp)를 따릅니다.

> npm 패키지가 공개되기 전 개발판을 시험하려면 저장소를 복제해 로컬 서버를 연결하세요. 릴리스된 `.mcpb`는 npm 공개 여부와 관계없이 Claude Desktop에서 설치할 수 있습니다.

## 설치 후 첫 질문

```text
특수교육 MCP의 get_coverage_report를 실행해서 현재 수록 범위를 알려줘.
```

이후에는 다음처럼 요청할 수 있습니다.

```text
2022 개정 특수교육 기본 교육과정에서 고등학교 국어 성취기준을 문서명, 쪽수, 공식 URL과 함께 찾아줘.
[12국어01-02]의 원문을 찾아서 수업 목표로 재구성하되 원문과 재구성안을 구분해줘.
진로와 직업에서 안전 관련 성취기준을 찾아 4차시 수업 흐름과 평가 루브릭 초안을 만들어줘.
```

## 무엇이 들어 있나

| 구분 | 기본 배포 | 내용 |
|---|---:|---|
| 현행 법정 교육과정 | 포함 | 특수교육 별책 1·2·3 및 중·고등학교 준용 일반교육과정 별책 26개 |
| 문서 규모 | 포함 | 29개 출처, 16,284쪽, 58,605개 검색 청크 |
| 공식 출처 추적 | 포함 | 고시 번호, 문서명, 쪽수, 목차 경로, 공식 원문 URL |
| 해설·성취수준·평가·연구자료 | 미포함 | 권리 조건과 설치 용량 때문에 개발자용 로컬 선택 자료로 분리 |
| 원본 HWP·HWPX·PDF | 미포함 | 검색용 기계 추출 데이터만 포함 |

현행 기준일은 2026-08-19이고 특수교육 기준선은 국가교육위원회 고시 제2026-2호입니다. 별책 2가 준용하는 일반교육과정 중 중·고등학교 범위인 별책 3·4·7·12·14·18·19·22·23~39·41을 포함합니다.

패키지 실측값은 npm 다운로드 약 8.0 MiB, 설치 후 약 54.4 MiB이며 Claude Desktop용 MCPB는 약 9.8 MiB입니다. 운영체제와 npm 캐시에 따라 조금 달라질 수 있습니다.

## MCP 도구

- `get_coverage_report`: 법정 원문과 선택형 보충자료의 수록·누락 상태 확인
- `list_official_sources`: 공식 출처, 고시 번호, URL, 준비 상태 나열
- `search_curriculum`: 검색어·학교급·교육과정 유형·교과·자료 종류 검색
- `get_curriculum_chunk`: 검색 결과의 더 긴 원문 문맥과 출처 위치 조회
- `find_achievement_standard`: `[12국어01-02]` 같은 성취기준 코드 검색

모든 도구는 읽기 전용이며 로그인이나 API 키가 필요하지 않습니다. 로컬 STDIO 서버이므로 클라이언트에 “인증 미지원”이 표시되는 것은 정상입니다.

## 수업 설계에서 권장하는 사용법

과목별 Codex·Claude 작업에서 먼저 연간교육과정이나 학교 양식 파일을 첨부하고 다음 순서로 요청하면 좋습니다.

1. `get_coverage_report`로 법정 자료 범위를 확인합니다.
2. `find_achievement_standard` 또는 `search_curriculum`으로 공식 성취기준을 찾습니다.
3. 응답에 `sourceId`, 쪽수와 공식 URL을 반드시 남깁니다.
4. 공식 원문, 교사 재구성 목표, 수업 활동, 평가 기준을 서로 다른 항목으로 작성합니다.
5. 완성된 수업안·활동지·루브릭은 해당 과목 작업의 기존 파일 형식에 맞춥니다.

## 개발과 선택형 보충자료

기본 사용자는 이 절차를 실행할 필요가 없습니다. 해설·평가·연구자료까지 로컬에서 색인하거나 데이터 갱신에 기여할 때만 사용합니다.

```shell
git clone https://github.com/sonbyobyo/korean-special-education-curriculum-mcp.git
cd korean-special-education-curriculum-mcp
npm ci
npm run sources:prepare
npm run check:full
```

`sources:prepare`는 공개 자료를 공식 URL에서 내려받아 Kordoc으로 구조화합니다. 게시기관 로그인이 필요한 보충자료는 사용자가 적법하게 확보해 수집기가 안내한 로컬 파일명으로 두어야 하며 Git이나 배포 패키지에 포함되지 않습니다.

배포 산출물 재생성:

```shell
npm run data:core
npm run mcpb:validate
npm run mcpb:pack
npm pack
```

## 권리와 출처

코드는 MIT 라이선스입니다. 내장 코어 데이터는 국가교육위원회가 공공누리 제1유형으로 제공한 공식 문서의 기계적 변환물이며 출처표시 조건을 따릅니다. 원문별 제목·고시 번호·공식 게시 페이지·SHA-256·변환 내용은 `data/core/manifest.json`에 기록합니다.

이 프로젝트와 응답은 교육부·국가교육위원회·NCIC의 공식 제품이나 공식 해석이 아닙니다. 실제 교육과정 편성·이수 판단에는 응답에 연결된 최신 공식 원문과 담당 기관 안내를 확인하세요.

상세 이용조건은 [`LICENSES.md`](LICENSES.md), 출처는 [`PROVENANCE.md`](PROVENANCE.md), 감사·제3자 고지는 [`ACKNOWLEDGEMENTS.md`](ACKNOWLEDGEMENTS.md)와 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)를 참고하세요. 오류 제보와 기여는 [`CONTRIBUTING.md`](CONTRIBUTING.md), 보안 문제는 [`SECURITY.md`](SECURITY.md)를 이용해 주세요.
