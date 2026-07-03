# 인프라 코딩 규칙

> 이 문서는 `docker-compose.yml` 및 향후 추가될 인프라 파일 전체에 적용됩니다.

---

## 현재 인프라 구성

| 구성 요소 | 기술 | 역할 |
|-----------|------|------|
| Database | PostgreSQL 18 (Docker) | 애플리케이션 데이터 저장 |
| Backend | Spring Boot 4 (JVM) | REST API 서버 (포트 8080) |
| Frontend | Vite dev server | 개발용 정적 파일 서버 (포트 5173) |

로컬 개발 환경은 `docker-compose.yml`로 DB만 컨테이너화하고, 앱은 직접 실행한다.

---

## Docker Compose 규칙

### 서비스 정의 원칙

```yaml
services:
  postgres:
    image: postgres:18        # 이미지 태그를 latest가 아닌 구체적 버전으로 고정
    container_name: clubflow-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: clubflow
      POSTGRES_USER: clubflow_user
      POSTGRES_PASSWORD: clubflow_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped   # 새 서비스 추가 시 기본값

volumes:
  postgres_data:
```

- **이미지 태그는 구체적 버전으로 고정한다.** `latest` 사용 금지.
- `container_name` 은 `clubflow-{서비스명}` 형식을 따른다.
- 모든 볼륨은 named volume으로 선언한다. bind mount는 개발 소스 마운트에만 허용.
- 포트는 `"호스트:컨테이너"` 형식으로 명시한다.

### 환경 변수 관리

```yaml
# docker-compose.yml — 로컬 개발용 값은 여기에 직접 기재해도 됨
environment:
  POSTGRES_PASSWORD: clubflow_pass   # 로컬 개발 전용

# docker-compose.prod.yml — 프로덕션
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # 반드시 외부 주입
```

- 로컬 개발용 `docker-compose.yml` 에는 편의상 평문 값을 허용한다.
- 프로덕션 파일에서는 `${VAR}` 참조만 허용한다.
- `.env` 파일을 사용하는 경우 `.gitignore` 에 등록하고 `.env.example`을 제공한다.

### 헬스체크

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U clubflow_user -d clubflow"]
  interval: 10s
  timeout: 5s
  retries: 5
```

- 새로운 서비스를 추가할 때 `healthcheck`를 반드시 정의한다.
- 다른 서비스에 의존하는 서비스는 `depends_on.condition: service_healthy`를 사용한다.

---

## 네트워크 규칙

```yaml
networks:
  clubflow-net:
    driver: bridge

services:
  postgres:
    networks:
      - clubflow-net
  backend:
    networks:
      - clubflow-net
```

- 서비스가 2개 이상이면 명시적 네트워크를 정의한다.
- 컨테이너 간 통신은 `localhost` 대신 서비스명을 호스트로 사용한다(`postgres:5432`).
- 외부에 노출할 필요 없는 포트는 `ports` 에 매핑하지 않는다.

---

## 포트 할당

| 서비스 | 포트 | 비고 |
|--------|------|------|
| PostgreSQL | 5432 | 외부 노출 (로컬 개발용) |
| Backend (Spring Boot) | 8080 | |
| Frontend (Vite dev) | 5173 | |

- 새 서비스를 추가할 때 위 표를 업데이트하고 충돌 여부를 확인한다.
- 프로덕션에서는 DB 포트를 외부에 노출하지 않는다.

---

## 로컬 개발 환경 규칙

### 시작 순서

```bash
# 1. DB 먼저 실행
docker compose up -d

# 2. DB 준비 확인 후 백엔드 실행
cd backend && ./gradlew bootRun

# 3. 프론트엔드 실행 (백엔드와 무관하게 독립 실행 가능)
cd frontend && npm run dev
```

- DB가 완전히 기동되기 전에 Spring Boot를 실행하면 Flyway 마이그레이션이 실패한다.
  → `docker compose up -d && sleep 3` 또는 Spring의 DB 재시도 설정으로 완화한다.

### 데이터 초기화

```bash
# 볼륨까지 삭제 (DB 전체 초기화)
docker compose down -v

# 컨테이너만 중지 (데이터 유지)
docker compose down
```

- 개발 중 스키마 변경으로 Flyway 오류가 발생하면 `docker compose down -v` 후 재시작한다.
- 프로덕션 데이터를 로컬에서 절대 `down -v` 하지 않는다.

---

## 향후 인프라 확장 가이드

현재 로컬 개발 환경만 정의되어 있다. 아래는 확장 시 따라야 할 원칙이다.

### CI/CD

- `docker-compose.ci.yml` 파일을 별도로 생성한다.
- CI에서 테스트할 때 Testcontainers를 사용하므로 별도 DB 서비스 불필요.
- 빌드 아티팩트: `./gradlew bootJar` → `backend/build/libs/*.jar`

### 컨테이너 이미지 빌드 (추후)

```dockerfile
# backend/Dockerfile (예시)
FROM eclipse-temurin:21-jre-alpine
COPY build/libs/backend-*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

- 베이스 이미지는 JRE만 포함된 경량 이미지를 사용한다 (`jre-alpine`).
- 이미지 태그는 git SHA 또는 시맨틱 버전을 사용한다.

### 환경별 설정 파일

```
docker-compose.yml          # 로컬 개발 (현재)
docker-compose.ci.yml       # CI 테스트용
docker-compose.prod.yml     # 프로덕션 (추후)
```

- `docker-compose.override.yml` 은 사용하지 않는다. 환경별 파일을 명시적으로 지정한다.

---

## 보안 규칙

- 프로덕션에서 DB 포트(`5432`)를 공개 인터넷에 노출하지 않는다.
- `POSTGRES_PASSWORD`, JWT 시크릿 등 민감 값은 환경 변수 또는 시크릿 관리 서비스로 주입한다.
- Docker 이미지는 `root` 가 아닌 전용 사용자로 실행한다.
- `.env` 파일은 반드시 `.gitignore`에 포함한다.

---

## 금지 사항

- `image: postgres:latest` — 구체적 버전 태그 사용.
- 컨테이너 내부에서 직접 파일 편집 (`docker exec ... vi`) — 이미지 빌드 또는 볼륨 마운트로 해결.
- 프로덕션 `docker-compose.yml` 에 평문 시크릿 커밋.
- `docker compose up` 없이 Spring Boot 실행 (Flyway 실패).
