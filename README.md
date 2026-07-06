# ClubFlow

동아리 운영진의 반복적인 학기 운영 업무를 체계화하기 위한 MVP 설계 및 구현 프로젝트입니다.

## Why

동아리 운영을 하다 보면 지원서, 합격자 명단, 부원 정보, 회비, 활동 기록이 Google Form, Excel, 카카오톡, Notion 등에 흩어지는 경우가 많습니다.

ClubFlow는 이런 운영 데이터를 학기 단위로 정리하고, 모집부터 부원 관리, 회비 관리, 활동 기록까지 이어지는 흐름을 하나의 서비스 안에서 관리할 수 있도록 설계한 프로젝트입니다.

## What I Focused On

* 운영진 로그인 계정과 지원자·부원 정보 분리
* 학기별 지원서 검토와 합격자 부원 전환
* 중복 지원·중복 부원 방지를 위한 DB 제약조건

## Tech Stack

| 구분       | 사용 기술                                                  |
| -------- | ------------------------------------------------------ |
| Frontend | React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4       |
| Backend  | Java 21, Spring Boot, Spring Security, Spring Data JPA |
| Database | PostgreSQL, Flyway                                     |
| Infra    | Docker, Docker Compose, Kubernetes, AWS                |

## Documentation

### Product

* [Requirements Analysis](./docs/product/requirements.md)
* [Data Model](./docs/product/data-model.md)

### Development

* [Backend Rules](./docs/development/backend-rules.md)
* [Frontend Rules](./docs/development/frontend-rules.md)
* [Infra Rules](./docs/development/infra-rules.md)

## Local Auth Setup

Google Cloud Console의 OAuth 웹 클라이언트에 다음 Redirect URI를 등록합니다.

```text
http://localhost:8080/login/oauth2/code/google
```

백엔드 실행 전에 인증 정보를 환경 변수로 설정합니다.

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export FRONTEND_URL="http://localhost:5173"
```

로컬 실행 순서:

```bash
docker compose -f Infra/docker-compose.yml up -d postgres
(cd backend && ./gradlew bootRun)
(cd frontend && npm run dev)
```

최초 로그인 후 접근 가능한 동아리가 없으면 동아리 생성 화면으로 이동합니다. 동아리를 생성하면 `PRESIDENT/APPROVED` 권한이 함께 생성되고 대시보드로 이동합니다.

동아리 생성 후에는 활성 학기를 만들고, 지원자를 수동 등록한 다음 지원서 상세에서 합격 처리할 수 있습니다. 합격자는 해당 학기의 부원 목록에 자동으로 한 번만 등록됩니다.

Google Form/Sheet 실제 동기화는 현재 MVP 범위에 포함하지 않습니다.
