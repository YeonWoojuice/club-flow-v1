# 백엔드 코딩 규칙

> 이 문서는 `backend/` 디렉터리 내 모든 코드에 적용됩니다.

## 기술 기준

| 항목 | 기준 |
|---|---|
| 프레임워크 | Spring Boot 4.0.7 |
| 언어 | Java 21 |
| 인증 | Spring Security OAuth2 Login + OIDC + 서버 세션 |
| ORM | Spring Data JPA + Hibernate |
| DB | PostgreSQL 18 |
| 마이그레이션 | Flyway |
| 테스트 | JUnit 5, Mockito, Testcontainers PostgreSQL |

- 비밀번호 로그인과 자체 JWT 발급은 현재 범위에 포함하지 않는다.
- Google 사용자는 이메일이 아닌 OIDC `sub`로 식별한다.
- JPA가 스키마를 생성하지 않는다. `ddl-auto=validate`를 유지한다.

## 패키지 구조

```text
com.clubflow.backend/
├── auth/       OAuth2/OIDC, Security 설정, 현재 사용자 API
├── user/       서비스 로그인 사용자
├── club/       동아리, 운영진 권한, 동아리 API
└── common/     공통 예외와 오류 응답
```

- 레이어가 아닌 도메인 단위로 패키지를 나눈다.
- DTO는 각 도메인의 `dto/` 아래에 둔다.
- Controller끼리 직접 호출하지 않는다.
- Controller는 Entity를 반환하지 않는다.

## Entity와 DB

- 인증·동아리 도메인의 PK는 UUID를 사용한다.
- Enum은 `EnumType.STRING`으로 저장한다.
- 연관관계는 기본 단방향이며 `FetchType.LAZY`를 사용한다.
- 모든 외래키 조회 경로에 인덱스를 둔다.
- 운영진 중복 등록은 `UNIQUE(club_id, user_id)`로 막는다.
- `users`와 부원·지원자용 인물 테이블은 같은 개념으로 합치지 않는다.

## 트랜잭션

- Service 클래스는 `@Transactional(readOnly = true)`를 기본으로 한다.
- 쓰기 메서드에만 `@Transactional`을 선언한다.
- 동아리 생성과 `PRESIDENT/APPROVED` 권한 생성은 반드시 같은 트랜잭션에서 처리한다.
- Controller에는 `@Transactional`을 붙이지 않는다.

## 인증과 권한

- 첫 Google 로그인에서 `users`를 생성하고 재로그인에서는 프로필과 `last_login_at`을 갱신한다.
- Google 이메일의 `email_verified=true`를 확인한다.
- 클라이언트가 `userId`, `role`, `status`를 임의로 제출하게 하지 않는다.
- 동아리 접근은 현재 로그인 사용자와 `club_staffs.status=APPROVED`를 함께 검사한다.
- POST/PATCH/DELETE 요청에서 CSRF 보호를 끄지 않는다.

## API

```text
GET  /api/auth/me          현재 로그인 사용자
GET  /api/auth/csrf        CSRF 토큰
POST /api/auth/logout      로그아웃
GET  /api/clubs            접근 가능한 동아리 목록
GET  /api/clubs/{clubId}   동아리 접근 권한 확인
POST /api/clubs            동아리와 회장 권한 생성
```

- 요청 DTO는 Java `record`와 Jakarta Validation을 사용한다.
- 성공 응답은 별도 `data` 래퍼 없이 DTO를 직접 반환한다.
- 오류 응답은 `{ "code": "...", "message": "..." }` 형식을 사용한다.

## Flyway

```text
V1__create_users.sql
V2__create_clubs.sql
V3__create_club_staffs.sql
```

- 파일명은 `V{버전}__{설명}.sql` 형식을 사용한다.
- 현재 재구축 기준 V1~V3가 최초 마이그레이션이다.
- 이 기준이 공유되거나 배포된 후에는 기존 마이그레이션을 수정하지 않고 새 버전을 추가한다.
- DDL에 `IF NOT EXISTS`를 사용하지 않는다.

## 테스트

- 비즈니스 분기는 빠른 단위 테스트로 검증한다.
- Repository, Flyway, 제약조건은 Testcontainers PostgreSQL 통합 테스트로 검증한다.
- Docker가 없는 환경에서는 통합 테스트를 명시적으로 건너뛸 수 있지만 CI에서는 반드시 실행한다.
- 테스트 메서드명은 한국어로 작성한다.

## 금지 사항

- `BackendApplication` 수정
- Entity 직접 API 반환
- `Optional.get()` 직접 호출
- Controller/Service 내부의 반복적인 `try-catch`
- H2 결과만으로 PostgreSQL 동작을 확정하는 것
- OAuth Client Secret을 저장소에 커밋하는 것
