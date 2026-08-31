# Cloud Run 배포 안내

이 프로젝트는 Cloud Run의 공개 HTTPS 주소를 ChatGPT의 원격 MCP URL로 사용합니다. 별도 도메인은 필요하지 않습니다.

## 배포 전 준비

1. Google Cloud Console에서 프로젝트를 만들고 결제 계정을 연결합니다.
2. GitHub에 이 변경사항을 올립니다.
3. Google Cloud Console에서 Cloud Shell을 엽니다.
4. 저장소를 복제한 뒤 프로젝트 폴더로 이동합니다.

```bash
git clone https://github.com/sonbyobyo/korean-special-education-curriculum-mcp.git
cd korean-special-education-curriculum-mcp
```

기본 브랜치에 아직 병합하지 않았다면 `git clone --branch 브랜치이름 …` 형식으로 복제합니다.

## 배포

Cloud Shell에서 다음을 실행합니다.

```bash
bash scripts/deploy-cloud-run.sh
```

스크립트는 필요한 API를 활성화하고 서울 리전(`asia-northeast3`)에 다음 설정으로 배포합니다.

- 메모리 512MiB, CPU 1개
- 유휴 인스턴스 0개: 요청이 없으면 인스턴스가 내려가 비용을 줄입니다.
- 최대 인스턴스 2개, 인스턴스당 동시 요청 10개
- 공개 호출 허용: ChatGPT가 서버에 접근할 수 있도록 필요합니다.
- 프로세스별 분당 120회 기본 요청 제한

완료되면 `Health check`와 `ChatGPT MCP URL`이 출력됩니다. 먼저 다음과 같이 상태를 확인합니다.

```bash
curl "https://출력된-서비스-주소/healthz"
```

`{"status":"ok"}`가 나오면 준비된 것입니다.

## ChatGPT 등록

ChatGPT 웹의 **Settings → Apps → Create custom app**에서 출력된 `ChatGPT MCP URL`을 입력하고 인증 방식으로 **No authentication**을 선택합니다. **Scan tools**로 다섯 도구가 보이는지 확인한 뒤 앱을 생성합니다.

학교 워크스페이스에 배포할 때는 관리자에게 앱 게시 권한과 커스텀 MCP 앱 허용 여부를 확인합니다. 교사에게는 학생 이름, 연락처, 개별화교육계획 원문 같은 개인정보를 검색어에 입력하지 않도록 안내합니다.

## 업데이트

GitHub에 새 커밋을 올린 다음 Cloud Shell에서 다음을 실행하면 새 Cloud Run 리비전이 배포됩니다.

```bash
git pull
bash scripts/deploy-cloud-run.sh
```

Cloud Billing의 **Budgets & alerts**에서 월별 알림을 설정합니다. 예산 알림은 자동 차단 장치가 아니므로, 사용량 추이를 확인하며 `MCP_RATE_LIMIT_PER_MINUTE`, 최대 인스턴스, 요청 제한 정책을 조정하세요.
