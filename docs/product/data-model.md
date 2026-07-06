# ClubFlow 인증·동아리 데이터 모델

## 관계

```text
users 1 ── N club_staffs N ── 1 clubs
  │                                │
  └──────── created_by_user_id ────┘
```

- `users`: Google 로그인을 완료한 서비스 사용자
- `clubs`: 사용자가 생성한 동아리
- `club_staffs`: 사용자가 특정 동아리에서 가진 운영진 권한
- 로그인 사용자와 지원자·부원 정보는 서로 다른 도메인이다.

## users

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| google_sub | VARCHAR(255) | NOT NULL, UNIQUE |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| name | VARCHAR(100) | NOT NULL |
| profile_image_url | TEXT | NULL 허용 |
| created_at | TIMESTAMPTZ | NOT NULL |
| last_login_at | TIMESTAMPTZ | NOT NULL |

사용자 식별 기준은 이메일이 아니라 `google_sub`이다.

## clubs

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| description | TEXT | NULL 허용 |
| created_by_user_id | UUID | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

## club_staffs

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| club_id | UUID | FK → clubs.id |
| user_id | UUID | FK → users.id |
| role | VARCHAR(30) | PRESIDENT, VICE_PRESIDENT, STAFF |
| status | VARCHAR(30) | PENDING, APPROVED, REJECTED, REVOKED |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

- 한 사용자는 같은 동아리에 한 번만 등록된다.
- 대시보드 접근은 `status=APPROVED`인 경우만 허용한다.
- 동아리 생성자는 `PRESIDENT/APPROVED`로 즉시 등록된다.

## generations

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| club_id | UUID | FK → clubs.id |
| name | VARCHAR(100) | NOT NULL |
| status | VARCHAR(20) | ACTIVE, CLOSED |
| start_date | DATE | NOT NULL |
| end_date | DATE | NOT NULL, 시작일 이후 |
| created_by_user_id | UUID | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| closed_at | TIMESTAMPTZ | NULL 허용 |

- 동아리별 `ACTIVE` 학기는 하나만 허용한다.
- 종료된 학기는 다시 활성화하지 않는다.

## persons

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| club_id | UUID | FK → clubs.id |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, 소문자 저장 |
| phone | VARCHAR(30) | NULL 허용 |
| student_number | VARCHAR(50) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

- 지원자와 부원은 같은 `persons` 정보를 참조한다.
- `UNIQUE(club_id, email)`로 동아리 안의 중복 인물을 방지한다.

## applications

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| generation_id | UUID | FK → generations.id |
| person_id | UUID | FK → persons.id |
| status | VARCHAR(20) | SUBMITTED, REVIEWING, ACCEPTED, REJECTED, CANCELED |
| source_type | VARCHAR(20) | MANUAL, GOOGLE_FORM |
| submitted_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

- `UNIQUE(generation_id, person_id)`로 같은 학기의 중복 지원을 방지한다.
- `ACCEPTED`, `REJECTED`, `CANCELED`은 MVP의 최종 상태이며 다시 변경하지 않는다.
- 동아리는 generation을 통해 판별하므로 중복 `club_id`를 저장하지 않는다.

## application_answers

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| application_id | UUID | FK → applications.id |
| question_key | VARCHAR(100) | NOT NULL |
| question_label | VARCHAR(500) | NOT NULL |
| answer_value | TEXT | NULL 허용 |
| answer_json | JSONB | NULL 허용 |
| display_order | INTEGER | 0 이상 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

- `UNIQUE(application_id, question_key)`로 같은 지원서의 문항 중복을 방지한다.
- `answer_value`와 `answer_json` 중 하나는 반드시 존재해야 한다.

## generation_members

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| generation_id | UUID | FK → generations.id |
| person_id | UUID | FK → persons.id |
| joined_source | VARCHAR(30) | APPLICATION_ACCEPT, MANUAL, RETENTION |
| status | VARCHAR(20) | ACTIVE, INACTIVE, WITHDRAWN |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

- `UNIQUE(generation_id, person_id)`로 같은 학기의 중복 부원을 방지한다.
- 지원서를 합격 처리하면 `APPLICATION_ACCEPT/ACTIVE`로 생성한다.
- 동아리는 generation을 통해 판별하므로 중복 `club_id`를 저장하지 않는다.

## 외부 데이터 동기화

Google Form/Sheet 실제 연동과 외부 동기화 테이블은 현재 MVP에서 제외한다. 수동 지원자 등록 흐름이 안정된 뒤 별도 마이그레이션으로 추가한다.
