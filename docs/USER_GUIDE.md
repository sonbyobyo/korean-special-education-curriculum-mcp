# 사용자 안내서

## 1. 어떤 방법을 선택할까

- Claude Desktop만 사용한다면 GitHub Releases의 `.mcpb` 파일 설치가 가장 간단합니다. Node.js가 필요 없습니다.
- Codex 또는 Claude Code를 사용한다면 Node.js 20 이상에서 npm 패키지를 `npx`로 등록합니다.
- 해설·평가·연구자료까지 필요하거나 개발에 참여한다면 저장소를 복제해 전체 자료 파이프라인을 실행합니다.

기본 설치에는 현행 법정 교육과정 29개가 이미 들어 있으므로 교육과정 파일을 따로 내려받지 않습니다.

## 2. 연결

### Claude Desktop

1. 릴리스의 `.mcpb` 파일을 내려받습니다.
2. **Settings → Extensions → Advanced settings → Install Extension…**에서 파일을 선택합니다.
3. 설치 후 새 대화에서 도구를 확인합니다.

### Codex

```shell
codex mcp add korean-special-education -- npx -y korean-special-education-curriculum-mcp
codex mcp list
```

Codex 앱·CLI·IDE 확장은 같은 호스트의 MCP 설정을 공유합니다. 앱에서는 **Settings → MCP servers** 또는 `/mcp`에서 서버를 확인하고 필요하면 Restart를 누릅니다.

### Claude Code

macOS·Linux:

```shell
claude mcp add korean-special-education --scope user -- npx -y korean-special-education-curriculum-mcp
```

Windows:

```powershell
claude mcp add korean-special-education --scope user -- cmd /c npx -y korean-special-education-curriculum-mcp
```

`claude mcp list` 또는 `/mcp`로 확인합니다.

## 3. 정상 작동 확인

```text
특수교육 MCP의 get_coverage_report를 실행해 법정 교육과정 준비 상태와 보충자료 상태를 각각 알려줘.
```

정상이면 법정 교육과정이 `complete`, 예상·준비 출처가 모두 29개로 표시됩니다. 기본 배포에서 보충자료가 `partially-indexed`로 보이는 것은 의도된 동작입니다.

## 4. 과목별 작업에서 쓰는 법

연간교육과정이나 학교 수업안 파일과 함께 아래처럼 요청합니다.

```text
첨부한 연간교육과정의 3월 단원을 확인하고, 특수교육 MCP에서 연결되는 공식 성취기준을 찾아줘.
각 기준마다 원문, 출처 문서, 쪽수, 공식 URL을 표시한 뒤 4차시 수업안을 작성해줘.
공식 원문과 교사가 재구성한 목표는 별도 열로 구분해줘.
```

성취기준 코드가 있으면 더 정확합니다.

```text
[12국어01-02]를 find_achievement_standard로 확인하고, 학생 수준별 활동 3단계와 관찰평가 문항을 만들어줘.
```

## 5. 문제 해결

### 인증 미지원

이 서버는 로그인 없는 로컬 STDIO 방식입니다. 서버가 사용함으로 표시되고 도구 목록이 나타나면 정상입니다.

### Claude Desktop에서 도구가 보이지 않음

Claude Desktop을 최신 버전으로 업데이트하고 Extensions에서 설치 상태와 로그를 확인한 뒤 앱을 다시 시작합니다.

### Codex·Claude Code에서 연결 종료

Node.js 20 이상인지 확인합니다. Windows Claude Code는 명령 앞에 `cmd /c`가 있어야 합니다. `npx -y korean-special-education-curriculum-mcp`를 터미널에서 실행했을 때 조용히 대기하면 STDIO 서버가 정상 실행된 것입니다.

### 보충자료가 누락으로 표시됨

기본 패키지는 법정 원문만 포함합니다. 해설·평가·연구자료가 꼭 필요할 때만 저장소를 복제해 `npm run sources:prepare`를 실행합니다. 로그인 자료는 사용자가 적법하게 확보한 파일만 로컬에서 처리합니다.
