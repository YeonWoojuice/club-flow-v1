# ClubFlow

동아리 운영진의 반복적인 학기 운영 업무를 체계화하기 위한 MVP 설계 및 구현 프로젝트입니다.

## Why

동아리 운영을 하다 보면 지원서, 합격자 명단, 부원 정보, 회비, 활동 기록이 Google Form, Excel, 카카오톡, Notion 등에 흩어지는 경우가 많습니다.

현재 MVP는 운영진 로그인, 동아리와 학기 관리, 지원서 검토, 합격자 부원 전환을 하나의 흐름으로 제공합니다. 회비와 활동 기록, Google Form 동기화는 후속 범위입니다.

## What I Focused On

* 운영진 로그인 계정과 지원자·부원 정보 분리
* 학기별 지원서 검토와 합격자 부원 전환
* 중복 지원·중복 부원 방지를 위한 DB 제약조건

## Tech Stack

| 구분       | 사용 기술                                                          |
| -------- | -------------------------------------------------------------- |
| Frontend | React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4, React Router 7 |
| Backend  | Java 21, Spring Boot, Spring Security (OAuth2/OIDC), Spring Data JPA, springdoc OpenAPI |
| Database | PostgreSQL, Flyway                                              |
| Testing  | Vitest, Testing Library, JUnit 5, Testcontainers                |
| Infra    | Docker Compose                                                  |

세부 버전의 기준은 [AGENTS.md](./AGENTS.md#기술-스택-버전의-유일한-기준)를 따릅니다.

## Documentation

### Product

* [Requirements Analysis](./docs/product/requirements.md)
* [Data Model](./docs/product/data-model.md)

### Authentication

* [Authentication Flow](./docs/features/auth/auth_flow.md)

### Development

* [Backend Rules](./docs/development/backend-rules.md)
* [Frontend Rules](./docs/development/frontend-rules.md)
* [Infra Rules](./docs/development/infra-rules.md)

### Engineering

* [Decision Log](./docs/decisions/decision-log.md) — 설계 결정과 트레이드오프 기록
* [AGENTS.md](./AGENTS.md) — 개발 규칙 단일 소스이자 AI 협업 운영 가이드

### API

백엔드 실행 중에 확인합니다.

* [Swagger UI](http://localhost:8080/swagger-ui.html)
* [OpenAPI JSON](http://localhost:8080/v3/api-docs)

## Local Auth Setup

Google Cloud Console의 OAuth 웹 클라이언트에 다음 Redirect URI를 등록합니다.

```text
http://localhost:8080/login/oauth2/code/google
```

백엔드 로컬 환경 파일을 만들고 Google OAuth 인증 정보를 입력합니다.

```bash
cp -n backend/.env.example backend/.env.local
```

생성된 `backend/.env.local`에 Google OAuth 값을 입력합니다. Docker PostgreSQL은 로컬 PostgreSQL과 충돌하지 않도록 호스트 `15432` 포트를 사용합니다.

로컬 실행 순서:

```bash
docker compose -f Infra/docker-compose.yml up -d postgres
(cd backend && ./gradlew bootRun)
(cd frontend && npm run dev)
```

변경 검증:

```bash
./verify.sh   # 백엔드 테스트 + 프론트 린트·테스트·빌드
```

최초 로그인 후 접근 가능한 동아리가 없으면 동아리 생성 화면으로 이동합니다. 동아리를 생성하면 `PRESIDENT/APPROVED` 권한이 함께 생성되고 대시보드로 이동합니다.

동아리 생성 후에는 활성 학기를 만들고, 지원자를 수동 등록한 다음 지원서 상세에서 합격 처리할 수 있습니다. 합격자는 해당 학기의 부원 목록에 자동으로 한 번만 등록됩니다.

Google Form/Sheet 실제 동기화는 현재 MVP 범위에 포함하지 않습니다.
