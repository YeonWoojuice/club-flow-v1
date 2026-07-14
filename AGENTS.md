# CrewCat — 개발 가이드 (단일 소스)

> 이 문서가 모든 AI 도구와 개발자의 공통 진입점입니다.
> CLAUDE.md 등 도구별 파일은 이 문서를 참조만 하며, 규칙 내용을 중복 작성하지 않습니다.

## 프로젝트 개요

**CrewCat**는 대학 동아리 운영진을 위한 웹 기반 관리 툴입니다.
현재 MVP는 학기별 지원자 수동 등록·Google Sheet 가져오기·심사, 부원 이력·이월, 운영진 초대·권한 관리를 제공하며 활동 기록은 후속 범위입니다.

## 레포지토리 구조

```
club-flow-responsive/
├── frontend/              # React + TypeScript + Vite + Tailwind CSS
├── backend/               # Spring Boot + JPA + Flyway + PostgreSQL
├── Infra/
│   └── docker-compose.yml # 로컬 개발용 PostgreSQL 컨테이너
├── club_flow_v2.pen       # 현행 디자인 파일 (pencil MCP 도구로만 접근)
├── club_manage.pen        # 구버전 디자인 파일 (참고용)
├── docs/
│   ├── features/          # 기능 관통 문서 (프론트+백을 아우르는 흐름)
│   │   └── auth/          # Google 로그인과 동아리 진입 흐름
│   ├── product/           # 요구사항과 데이터 모델
│   ├── development/       # 프론트엔드·백엔드·인프라 코딩 규칙
│   ├── decisions/         # 결정 기록 (decision-log.md)
│   └── review/            # 구조 검토 보고서
├── AGENTS.md              # 이 파일 (단일 소스)
└── CLAUDE.md              # AGENTS.md 참조 스텁
```

## 핵심 도메인 개념

| 개념 | 설명 |
|------|------|
| **Generation (학기)** | 동아리 활동 단위(예: 26-1 학기). 상태: `ACTIVE` / `CLOSED` |
| **Person** | 이메일로 식별되는 고유 인물. 여러 학기에 걸쳐 재사용됨 |
| **Application** | 특정 학기의 지원 기록. 수동 등록과 Google Form 응답/일반 Google Sheet 가져오기를 지원 |
| **GenerationMember** | 특정 인물의 특정 학기 참여 기록 |
| **ClubStaff** | 동아리에 접근할 수 있는 운영진 권한과 승인 상태 |

변수명·API 경로·필드명에는 반드시 이 용어를 사용합니다
(`generation`, `application`, `generationMember`, `person`, `clubStaff`).

## 기술 스택 (버전의 유일한 기준)

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4 (`@tailwindcss/vite`), React Router 7 |
| 프론트 도구 | ESLint 10, Vitest 4, Testing Library |
| 백엔드 | Spring Boot 4.0.7, Java 21, Spring Data JPA, Spring Web, Spring Validation, Actuator, springdoc OpenAPI |
| DB | PostgreSQL 18 (런타임), Flyway (마이그레이션), Testcontainers (테스트) |
| 빌드 | Gradle (Groovy DSL), 패키지 루트 `com.clubflow.backend` |
| 인프라 | Docker Compose — DB `clubflow`, 유저 `clubflow_user`, 호스트 포트 `15432` |

다른 문서(README, 영역 규칙)에는 버전을 중복 표기하지 않고 이 표를 링크합니다.

## API 계약의 단일 소스

- 실행 중인 계약의 기준은 백엔드 OpenAPI 스펙 `/v3/api-docs` (UI: `/swagger-ui.html`).
- 프론트엔드 타입은 손으로 미러링하지 않고 생성합니다:
  백엔드 기동 후 `cd frontend && npm run gen:api` → `src/types/api.gen.ts` 갱신.
- Spring Security 필터가 처리하는 엔드포인트(`POST /api/auth/logout`, `/oauth2/**`)는
  OpenAPI에 나타나지 않으므로 [`docs/features/auth/auth_flow.md`](docs/features/auth/auth_flow.md)가 공식 문서입니다.
- 지원 상태 전이 정책의 원본은 [`docs/product/requirements.md`](docs/product/requirements.md)의
  "상태 정책" 절이며, 강제 주체는 백엔드 `Application.changeStatus()`입니다.
  프론트엔드의 상태 분기는 UI 편의용 파생입니다.

## 지시 우선순위 (모든 영역 공통)

작업 중 지시가 충돌하면 다음 순서를 따릅니다.

1. 현재 사용자가 명시한 요청과 제한 사항
2. 실행 중인 API 계약(`/v3/api-docs`)과 제품 요구사항(`docs/product/`)
3. 영역별 규칙 문서(`docs/development/`)
4. 프레임워크의 일반적인 관례

충돌 여부가 불분명하면 임의로 결정하지 않고 관련 파일을 확인한 뒤 사용자에게 보고합니다.

## 영역별 규칙

코드를 작성하기 전에 반드시 해당 영역의 규칙 문서를 확인합니다.

- **프론트엔드** → [`docs/development/frontend-rules.md`](docs/development/frontend-rules.md)
- **백엔드** → [`docs/development/backend-rules.md`](docs/development/backend-rules.md)
- **인프라** → [`docs/development/infra-rules.md`](docs/development/infra-rules.md)

## 로컬 개발 시작

```bash
# 1. DB 실행
docker compose -f Infra/docker-compose.yml up -d postgres

# 2. 백엔드 실행 (별도 터미널)
cp -n backend/.env.example backend/.env.local  # 최초 1회 후 OAuth 값 입력
(cd backend && ./gradlew bootRun)

# 3. 프론트엔드 실행 (별도 터미널)
(cd frontend && npm run dev)
```

## 변경 검증

기능 단위 작업은 프론트와 백엔드를 함께 건드리므로 항상 전체를 검증합니다.

```bash
./verify.sh            # 루트에서 한 번에 (백엔드 테스트 + 프론트 린트·테스트·빌드)
```

개별 실행:

```bash
(cd backend && ./gradlew test)
(cd frontend && npm run lint && npm test && npm run build)
```

## 작업 원칙

1. **기능 단위로 생각한다** — 한 기능의 변경은 백엔드 도메인 패키지, 프론트 API 모듈·페이지,
   관련 문서를 한 흐름으로 다루고, 완료 시 양쪽 검증을 모두 통과시킨다.
2. **도메인 용어를 유지한다** — 위 핵심 도메인 개념의 용어를 그대로 사용한다.
3. **현재 패턴을 먼저 파악한다** — 새 기능을 추가하기 전에 기존 코드에서 패턴을 찾아 일관되게 따른다.
4. **UI 변경 시 디자인 파일 우선** — `club_flow_v2.pen`을 pencil MCP로 확인하고 스펙을 맞춘다.
5. **마이그레이션은 되돌릴 수 없다** — Flyway SQL 파일을 한 번 커밋하면 절대 수정하지 않는다.
6. **계약은 생성한다, 베끼지 않는다** — 서버 응답 타입 변경 시 `npm run gen:api`로 재생성한다.

## AI 협업 방식

역할은 레이어(UI/백엔드)가 아니라 **작업 성격**으로 나눈다.

| 도구 | 역할 |
|---|---|
| Claude | 설계, 코드 리뷰, 막힌 문제 해결 |
| Codex | Claude의 설계를 받아 실제 구현 (프론트+백 모두) |

- 한 기능은 시작한 도구가 끝까지 구현한다. 중간에 도구를 바꾸지 않는다.
- 설계 전달은 대화 중계가 아니라 문서로 한다. Claude가 설계를 파일(docs/ 또는 이슈)로 남기면 Codex는 그 문서와 AGENTS.md만 읽고 시작한다.
- 계약 변경·인증·마이그레이션이 포함된 구현은 완료 후 Claude 리뷰를 거친다.

### 완료 정의 (Definition of Done)

- `./verify.sh` 통과 없이 완료를 선언하지 않는다.
- 실행이 불가능한 환경이면 결과 보고에 **"미검증"** 라벨과 사용자가 돌려야 할 명령을 명시한다.

## 에러 처리 계약 (프론트·백 공통 합의)

- 백엔드 오류 응답은 `{ "code": "...", "message": "..." }` 형식이며,
  `message`는 사용자에게 그대로 보여줄 수 있는 한국어 문구다. (에러 문구의 단일 소스 = 백엔드)
- 프론트엔드는 조회·쓰기 모두 서버 `message`가 있으면 우선 표시하고, 없을 때만 기본 문구를 쓴다.
- 프론트엔드 분기는 HTTP status(401/403/그 외)로만 한다. `code`는 로깅·디버깅용이며 분기에 쓰지 않는다.
