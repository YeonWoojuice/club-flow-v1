# Club Flow — AI 개발 가이드

## 프로젝트 개요

**Club Flow**는 대학 동아리 운영진을 위한 웹 기반 관리 툴입니다.
Google Form 응답 연동, 학기별 지원서 관리, 부원 이력 추적, 활동 기록 조회를 핵심 기능으로 합니다.

---

## 레포지토리 구조

```
club-flow-responsive/
├── frontend/              # React 19 + TypeScript + Vite + Tailwind CSS 4
├── backend/               # Spring Boot 4 + Java 21 + JPA + Flyway + PostgreSQL
├── docker-compose.yml     # 로컬 개발용 PostgreSQL 컨테이너
├── club_manage.pen        # Pencil 디자인 파일 (pencil MCP 도구로만 접근)
├── docs/
│   ├── frontend-rules.md  # 프론트엔드 코딩 규칙
│   ├── backend-rules.md   # 백엔드 코딩 규칙
│   └── infra-rules.md     # 인프라 코딩 규칙
└── CLAUDE.md              # 이 파일
```

---

## 핵심 도메인 개념

| 개념 | 설명 |
|------|------|
| **Generation (학기)** | 동아리 활동 단위(예: 26-1 학기). 상태: `모집 중` / `활동 중` / `종료` |
| **Person** | 이메일로 식별되는 고유 인물. 여러 학기에 걸쳐 재사용됨 |
| **Membership** | 특정 인물의 특정 학기 참여 기록. origin: `carryover` / `application` / `form` / `manual` |
| **Applicant** | Google Form 지원서 응답으로 생성된 지원자 레코드 |
| **FormConfig** | 연결된 Google Form 메타데이터 (용도: `지원서` / `부원 명단`) |
| **ActivityLog** | 운영진 작업의 감사 로그 |

---

## 기술 스택 요약

### 프론트엔드
- React 19, TypeScript 5.8, Vite 7
- Tailwind CSS 4 (`@tailwindcss/vite` 플러그인 방식)
- 라우터 없음 — `useState<Page>` 로 화면 전환
- 상태 관리 라이브러리 없음 — `useState` / `useMemo` 만 사용
- 폰트: `font-body` (Inter/Pretendard), `font-data` (Geist Mono/IBM Plex Mono)
- 디자인 토큰: `styles.css`의 CSS Custom Properties (`--navy`, `--text-primary` 등)

### 백엔드
- Spring Boot 4.0.7, Java 21
- Spring Data JPA, Spring Web, Spring Validation, Spring Actuator
- Flyway (DB 마이그레이션)
- PostgreSQL (런타임), Testcontainers (테스트)
- 빌드: Gradle (Groovy DSL)
- 패키지 루트: `com.clubflow.backend`

### 인프라
- Docker Compose: PostgreSQL 18 단일 서비스
  - DB: `clubflow`, 유저: `clubflow_user`, 포트: `5432`
- 프론트엔드 개발 서버: `vite --host 0.0.0.0` (포트 5173)
- 백엔드 개발 서버: `./gradlew bootRun` (포트 8080)

---

## 영역별 규칙

코드를 작성하기 전에 반드시 해당 영역의 규칙 문서를 확인하세요.

- **프론트엔드** → [`docs/development/frontend-rules.md`](docs/frontend-rules.md)
- **백엔드** → [`docs/development/backend-rules.md`](docs/backend-rules.md)
- **인프라** → [`docs/development/infra-rules.md`](docs/infra-rules.md)

---

## 로컬 개발 시작

```bash
# 1. DB 실행
docker compose up -d

# 2. 백엔드 실행 (별도 터미널)
cd backend && ./gradlew bootRun

# 3. 프론트엔드 실행 (별도 터미널)
cd frontend && npm run dev
```

---

## AI 작업 원칙

1. **영역 경계를 지킨다** — 프론트는 프론트 규칙, 백엔드는 백엔드 규칙만 따른다.
2. **도메인 용어를 유지한다** — 변수명·API 경로·필드명에 위의 한국어 도메인 개념을 영어로 직역한다(`generation`, `membership`, `applicant`, `person`).
3. **현재 패턴을 먼저 파악한다** — 새 기능을 추가하기 전에 기존 코드에서 패턴을 찾아 일관되게 따른다.
4. **UI 변경 시 디자인 파일 우선** — `club_manage.pen`을 pencil MCP로 확인하고 스펙을 맞춘다.
5. **마이그레이션은 되돌릴 수 없다** — Flyway SQL 파일을 한 번 커밋하면 절대 수정하지 않는다.
