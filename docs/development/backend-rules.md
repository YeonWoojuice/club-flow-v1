# 백엔드 코딩 규칙

> 이 문서는 `backend/` 디렉터리 내 모든 코드에 적용됩니다.

---

## 기술 제약

| 항목 | 현재 스택 | 금지 |
|------|-----------|------|
| 프레임워크 | Spring Boot 4.0.7 | Spring Boot 2.x/3.x 혼용 |
| 언어 | Java 21 (LTS) | Kotlin, Groovy |
| 빌드 | Gradle (Groovy DSL) | Maven, Kotlin DSL |
| ORM | Spring Data JPA + Hibernate | MyBatis, JDBC 직접 사용 |
| DB | PostgreSQL 18 | H2 (테스트 제외) |
| 마이그레이션 | Flyway | Liquibase, JPA `ddl-auto=create` |
| 테스트 | JUnit 5 + Testcontainers | 인메모리 DB 테스트 |
| 패키지 루트 | `com.clubflow.backend` | 루트 패키지에 직접 클래스 추가 |

---

## 패키지 구조

```
com.clubflow.backend/
├── BackendApplication.java       # 진입점 — 수정하지 않는다
├── generation/                   # 학기 도메인
│   ├── Generation.java           # @Entity
│   ├── GenerationRepository.java # JpaRepository
│   ├── GenerationService.java    # 비즈니스 로직
│   └── GenerationController.java # REST 컨트롤러
├── person/                       # 인물 도메인
├── membership/                   # 부원 참여 도메인
├── applicant/                    # 지원자 도메인
├── form/                         # Google Form 연동 도메인
├── log/                          # 활동 기록 도메인
└── common/                       # 공통 유틸, 예외, 응답 래퍼
```

- **도메인 단위로 패키지를 나눈다.** 레이어(controller/service/repository)로 나누지 않는다.
- 각 도메인 패키지에 Entity, Repository, Service, Controller를 함께 둔다.
- 도메인 간 의존은 Service → Repository(타 도메인) 방향만 허용. Controller끼리 직접 호출 금지.

---

## 레이어 규칙

### Controller

```java
@RestController
@RequestMapping("/api/generations")
class GenerationController {

    private final GenerationService generationService;

    GenerationController(GenerationService generationService) {
        this.generationService = generationService;
    }

    @GetMapping
    List<GenerationResponse> list() {
        return generationService.list();
    }
}
```

- `@Autowired` 금지 — 생성자 주입만 사용한다.
- Controller는 요청 파라미터 수집과 응답 변환만 담당한다. 비즈니스 로직은 Service에 둔다.
- 반환 타입은 Entity가 아닌 Response DTO를 사용한다.
- `@RequestBody` 바인딩 객체에는 반드시 `@Valid`를 붙인다.

### Service

```java
@Service
@Transactional(readOnly = true)
class GenerationService {

    private final GenerationRepository generationRepository;

    GenerationService(GenerationRepository generationRepository) {
        this.generationRepository = generationRepository;
    }

    @Transactional
    public GenerationResponse create(CreateGenerationRequest request) { ... }

    public List<GenerationResponse> list() { ... }
}
```

- 클래스 레벨에 `@Transactional(readOnly = true)`, 쓰기 메서드에만 `@Transactional`을 추가한다.
- Entity를 외부로 직접 반환하지 않는다. 반드시 Response DTO로 변환한다.

### Repository

```java
interface GenerationRepository extends JpaRepository<Generation, Long> {
    List<Generation> findByStatusOrderByStartDateDesc(GenerationStatus status);
}
```

- 쿼리는 Spring Data 메서드명 규칙 → 필요하면 `@Query(JPQL)` → 마지막 수단으로 `@Query(nativeQuery = true)`.
- `EntityManager` 직접 조작은 복잡한 벌크 연산에만 허용한다.

---

## Entity 규칙

```java
@Entity
@Table(name = "generations")
class Generation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GenerationStatus status;

    // ...
}
```

- ID 전략: `IDENTITY` (PostgreSQL serial).
- Enum은 `EnumType.STRING` — 숫자 순서에 의존하지 않는다.
- `@Column(nullable = false)` 와 `length` 를 명시한다.
- Lombok 사용 시 `@Data` 금지 — `@Getter`, `@NoArgsConstructor` 등 필요한 것만 선언.
- JPA 연관관계에서 양방향이 필요한 경우에만 선언하고, 기본은 단방향.
- `FetchType.EAGER` 금지 — 모든 연관관계는 `LAZY`.

---

## DTO 규칙

```java
// 요청 DTO
record CreateGenerationRequest(
    @NotBlank String name,
    @NotNull GenerationStatus status,
    LocalDate startDate,
    LocalDate endDate
) {}

// 응답 DTO
record GenerationResponse(
    Long id,
    String name,
    GenerationStatus status,
    LocalDate startDate,
    LocalDate endDate
) {
    static GenerationResponse from(Generation generation) {
        return new GenerationResponse(
            generation.getId(),
            generation.getName(),
            generation.getStatus(),
            generation.getStartDate(),
            generation.getEndDate()
        );
    }
}
```

- Java 16+ `record`를 DTO로 사용한다.
- Request DTO: `@Valid` 검증 어노테이션 필수.
- Response DTO: `from(Entity)` 정적 팩토리 메서드로 변환.
- Entity ↔ DTO 변환 라이브러리(MapStruct 등)는 현재 추가하지 않는다.

---

## API 설계 규칙

### URL 경로

```
GET    /api/generations                    학기 목록
POST   /api/generations                    학기 생성
GET    /api/generations/{id}               학기 단건
PATCH  /api/generations/{id}               학기 수정
GET    /api/generations/{id}/memberships   학기 부원 목록
POST   /api/generations/{id}/carryover     이월 인원 변경
```

- 복수형 명사 사용 (`generations`, `memberships`, `applicants`).
- 동사 금지 — `POST /api/generations/{id}/carryover` 처럼 하위 리소스로 표현.
- 한국어 경로 금지.

### 응답 형식

```json
// 성공 (단건)
{ "id": 1, "name": "26-1 학기", "status": "활동 중" }

// 성공 (목록)
[{ ... }, { ... }]

// 에러
{ "code": "GENERATION_NOT_FOUND", "message": "해당 학기를 찾을 수 없습니다." }
```

- 성공 응답은 데이터를 직접 반환한다. `{ "data": ... }` 래퍼 불필요.
- 에러 응답은 `code`(영문 상수)와 `message`(한국어 설명)를 포함한다.

### HTTP 상태 코드

| 상황 | 코드 |
|------|------|
| 조회 성공 | 200 |
| 생성 성공 | 201 |
| 부분 수정 | 200 |
| 리소스 없음 | 404 |
| 유효성 실패 | 400 |
| 인증 필요 | 401 |
| 권한 없음 | 403 |
| 서버 오류 | 500 |

---

## 예외 처리

```java
// common/exception/NotFoundException.java
class NotFoundException extends RuntimeException {
    NotFoundException(String message) { super(message); }
}

// common/GlobalExceptionHandler.java
@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ErrorResponse handleNotFound(NotFoundException e) {
        return new ErrorResponse("NOT_FOUND", e.getMessage());
    }
}
```

- 도메인별 예외 대신 공통 예외 클래스(`NotFoundException`, `ConflictException` 등) 사용.
- `try-catch`를 Controller/Service에 직접 두지 않는다 — `@RestControllerAdvice`에서 일괄 처리.

---

## DB 마이그레이션 규칙 (Flyway)

```
backend/src/main/resources/db/migration/
├── V1__create_persons.sql
├── V2__create_generations.sql
├── V3__create_memberships.sql
└── V4__create_applicants.sql
```

- 파일명: `V{버전}__{설명}.sql` (언더스코어 2개).
- **한 번 커밋된 마이그레이션 파일은 절대 수정하지 않는다.** 변경이 필요하면 새 파일을 추가한다.
- 테이블명은 복수형 snake_case (`generations`, `memberships`).
- 모든 외래키에 인덱스를 추가한다.
- DDL은 `IF NOT EXISTS`를 사용하지 않는다 — Flyway가 순서를 보장한다.

---

## 테스트 규칙

```java
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class GenerationControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired GenerationRepository generationRepository;

    @BeforeEach
    void setUp() { generationRepository.deleteAll(); }

    @Test
    void 학기_생성_성공() throws Exception {
        mockMvc.perform(post("/api/generations")
            .contentType(APPLICATION_JSON)
            .content("""
                { "name": "26-1 학기", "status": "모집 중" }
            """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("26-1 학기"));
    }
}
```

- 테스트는 **Testcontainers**로 실제 PostgreSQL에서 실행한다. 인메모리 DB(H2) 금지.
- 테스트 메서드명은 한국어로 작성한다 (`학기_생성_성공`).
- 각 테스트는 독립적이어야 한다 — `@BeforeEach`로 데이터 초기화.
- `@Transactional`을 테스트 클래스에 붙여서 롤백하는 방식은 사용하지 않는다.

---

## 설정 파일 규칙

```yaml
# application.yaml 기본 구조
spring:
  application:
    name: backend
  datasource:
    url: jdbc:postgresql://localhost:5432/clubflow
    username: clubflow_user
    password: clubflow_pass
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true

server:
  port: 8080
```

- `spring.jpa.hibernate.ddl-auto` 는 반드시 `validate` 또는 `none`. `create`, `update` 금지.
- `spring.jpa.open-in-view` 는 `false`.
- 시크릿(패스워드, API 키)은 환경 변수로 주입한다. `application.yaml`에 하드코딩 금지.
- 프로파일: `local` (로컬 개발), `test` (CI), `prod` (배포). 기본값은 `local`.

---

## 금지 사항

- `@SpringBootApplication` 이 있는 `BackendApplication`을 수정하지 않는다.
- `System.out.println` 금지 — SLF4J Logger 사용 (`LoggerFactory.getLogger`).
- `@Transactional`을 Controller에 붙이지 않는다.
- JPA Entity를 `@ResponseBody`로 직접 반환하지 않는다.
- `Optional.get()` 을 `.orElseThrow()` 없이 호출하지 않는다.
