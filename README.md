# ClubFlow

동아리 운영진의 반복적인 학기 운영 업무를 체계화하기 위한 MVP 설계 및 구현 프로젝트입니다.

## Why

동아리 운영을 하다 보면 지원서, 합격자 명단, 부원 정보, 회비, 활동 기록이 Google Form, Excel, 카카오톡, Notion 등에 흩어지는 경우가 많습니다.

ClubFlow는 이런 운영 데이터를 학기 단위로 정리하고, 모집부터 부원 관리, 회비 관리, 활동 기록까지 이어지는 흐름을 하나의 서비스 안에서 관리할 수 있도록 설계한 프로젝트입니다.

## What I Focused On

* 운영진, 부원, 지원자 역할 분리
* 학기 중심 설계
* 회계 자동화와 보고서 출력 확장 예정

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
