# 사용자 안내서

이 안내서는 처음 사용하는 사람이 로컬 컴퓨터에 코퍼스를 준비하고 Codex에 MCP 서버를
연결하는 절차를 설명한다.

## 1. 설치

Git과 Node.js 20 이상이 필요하다. GitHub 저장소의 **Code** 버튼에서 URL을 복사한 뒤
PowerShell, 터미널 또는 명령 프롬프트에서 실행한다.

```powershell
git clone <복사한 GitHub URL>
cd korean-special-education-curriculum-mcp
npm install
npm run sources:prepare
npm run build
```

공식 바이너리와 추출 코퍼스는 GitHub 저장소에 포함되지 않는다. `sources:prepare`가 공식
URL에서 공개 자료를 내려받아 로컬에서 변환한다. 이 과정은 문서 수와 컴퓨터 성능에 따라
시간이 걸리고 수백 MB의 디스크 공간을 사용한다.

게시기관 로그인이나 사용자 직접 다운로드가 필요한 보충자료는 없어도 서버를 사용할 수
있다. 누락 자료는 `get_coverage_report`에 표시된다. 전체 보충자료까지 사용하려면 수집기가
출력한 원래 파일을 직접 확보하여 안내된 영문 파일명으로 `sources/official/files/`에 둔 뒤
다시 `npm run sources:prepare`를 실행한다.

## 2. Codex 연결

Codex의 **Settings → MCP servers → Add server**에서 STDIO 서버를 추가한다.

- 이름: `korean-special-education-curriculum`
- 명령: `node`
- 인수: 이 저장소의 `dist/src/server.js` 절대 경로

Windows 설정 파일 예시:

```toml
[mcp_servers.korean-special-education-curriculum]
command = "C:\\Program Files\\nodejs\\node.exe"
args = ["C:\\absolute\\path\\korean-special-education-curriculum-mcp\\dist\\src\\server.js"]
```

macOS·Linux 설정 파일 예시:

```toml
[mcp_servers.korean-special-education-curriculum]
command = "node"
args = ["/absolute/path/korean-special-education-curriculum-mcp/dist/src/server.js"]
```

저장한 뒤 서버의 **Restart**를 누른다. STDIO 서버는 별도 로그인이나 OAuth 인증이 필요하지
않으므로 화면의 “인증 미지원” 표시는 오류가 아니다.

## 3. 첫 확인

다음 질문으로 서버와 코퍼스 상태를 확인한다.

```text
특수교육 MCP의 get_coverage_report를 실행하고 누락 자료가 있으면 구분해서 알려줘.
```

개발 단계에서 직접 검증하려면 다음을 실행한다.

```powershell
npm run check
npm run test:mcp
```

수동 보충자료를 포함한 전체 코퍼스 검증은 `npm run check:full`을 사용한다.

## 4. 권장 질문 방식

검색할 때 학교급, 교육과정 유형, 교과와 자료 종류를 함께 지정하면 결과가 정확해진다.

```text
고등학교 기본 교육과정 국어에서 듣기·말하기 성취기준을 고시 원문만 대상으로 찾아줘.
결과마다 성취기준 코드, 원문, 문서명, 쪽수, 공식 URL을 표시해줘.
```

자료 종류는 다음과 같이 구분된다.

- `statutory`: 고시 원문
- `commentary`: 교육과정 해설
- `achievement`: 성취수준과 평가 도움자료
- `research`: 연구·점검 보고서

고시 원문과 교사가 재구성한 수업 목표를 섞지 않는 것이 중요하다. 수업 설계에 사용할
때는 “공식 성취기준 원문”과 “교사 재구성 목표”를 별도 항목으로 작성하도록 요청한다.

## 5. 문제 해결

### 추출 데이터가 없다는 오류

저장소 루트에서 `npm run sources:prepare`와 `npm run build`를 차례로 실행하고 MCP 서버를
다시 시작한다.

### 일부 자료가 누락되었다는 보고

공개 URL 자료의 다운로드 오류인지, `manualAcquisition` 보충자료인지
`get_coverage_report`와 수집기 출력에서 확인한다. 수동 자료가 없어도 준비된 범위의 검색은
계속 사용할 수 있다.

### 코드 수정이 반영되지 않음

`npm run build` 후 Codex 설정에서 해당 MCP 서버의 **Restart**를 누른다.

### 인증 미지원 표시

이 서버는 로컬 STDIO 방식이므로 인증을 사용하지 않는다. 서버가 사용함으로 표시되고 도구
목록이 나타나면 정상이다.
