# CrewCat MVP 데이터 모델

## 관계

```text
users 1 ── N club_staffs N ── 1 clubs
  │                                │
  ├── 0..1 google_connections      │
  ├── N club_staff_invitations N ──┤
  └──────── created_by_user_id ────┤
                                   ├── N generations
                                   └── N persons

generations 1 ── N applications N ── 1 persons
      │                 │
      │                 └── N application_answers
      │
      └── N generation_members N ── 1 persons
                    │
                    └── N generation_member_status_histories
```

- `users`는 Google 로그인을 완료한 운영진 사용자다.
- `club_staffs`는 사용자와 동아리의 접근 권한을 연결한다.
- `persons`는 지원자와 부원이 공유하는 인물 정보다.
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

## google_connections

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, UNIQUE |
| google_account_email | VARCHAR(255) | NOT NULL |
| encrypted_access_token | TEXT | NOT NULL |
| encrypted_refresh_token | TEXT | NULL 허용 |
| scope | TEXT | NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

- Google Sheet 읽기용 별도 OAuth 연결이며 사용자 한 명당 하나만 저장한다.
- 접근·갱신 토큰은 AES-256-GCM으로 암호화된 값만 저장한다.
- Sheet 원본 데이터는 이 테이블에 저장하지 않는다.

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

## club_staff_invitations

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| club_id | UUID | FK → clubs.id |
| email | VARCHAR(255) | NOT NULL, 소문자 저장 |
| role | VARCHAR(30) | VICE_PRESIDENT, STAFF |
| status | VARCHAR(30) | PENDING, ACCEPTED, REJECTED, CANCELED |
| invited_by_user_id | UUID | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL |
| responded_at | TIMESTAMPTZ | NULL 허용 |

- 아직 CrewCat에 로그인하지 않은 사람도 Google 이메일로 미리 초대할 수 있다.
- 같은 동아리·이메일에는 `PENDING` 초대가 하나만 존재할 수 있다.
- 로그인으로 확인된 이메일과 초대 이메일이 같은 사용자만 수락하거나 거절할 수 있다.
- 초대 수락 시 기존에 해제된 `club_staffs` 행이 있으면 새 행을 만들지 않고 다시 승인한다.

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
- 종료된 학기를 다시 활성화할 수 있다. 이때 기존 활성 학기는 같은 작업 안에서 종료한다.
- 재활성화된 학기의 `closed_at`은 비우며, 종료 학기도 조회 대상으로 선택할 수 있다.

## persons

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| club_id | UUID | FK → clubs.id |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, 소문자 저장 |
| phone | VARCHAR(30) | NULL 허용 |
| student_number | VARCHAR(50) | NOT NULL |
| discord_name | VARCHAR(100) | NULL 허용 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

- 지원자와 부원은 같은 `persons` 정보를 참조한다.
- `UNIQUE(club_id, email)`로 동아리 안의 중복 인물을 방지한다.
- `discord_name`은 이전 버전 호환을 위해 DB에만 남아 있으며 신규 화면과 API에서는 사용하지 않는다.

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
- `ACCEPTED`, `REJECTED`는 현재 결과의 메일이 `NOT_SENT` 또는 `FAILED`일 때만 서로 정정할 수 있다.
- `CANCELED`은 최종 상태이며 다시 변경하지 않는다.
- 동아리는 generation을 통해 판별하므로 중복 `club_id`를 저장하지 않는다.

## application_status_histories

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| application_id | UUID | FK → applications.id |
| previous_status | VARCHAR(20) | 지원 상태 |
| new_status | VARCHAR(20) | 지원 상태 |
| reason | VARCHAR(500) | NULL 허용, 결과 정정 시 필수 |
| changed_by_user_id | UUID | FK → users.id |
| changed_at | TIMESTAMPTZ | NOT NULL |

- 실제 상태가 바뀔 때만 변경자·시각·사유를 기록한다.
- 합격과 불합격을 서로 정정할 때는 사유가 필수다.

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

## application_result_email_batches

| 컬럼 | 설명 |
|---|---|
| club_id / generation_id | 전송한 동아리와 학기 |
| requested_by_user_id | 전송을 요청한 운영진 |
| decision | ACCEPTED 또는 REJECTED |
| status | PENDING, COMPLETED, PARTIAL_FAILED, FAILED, UNKNOWN |
| subject_template / body_template | 전송 당시의 공통 템플릿 |
| kakao_link | 전송 당시의 선택 링크 |

- 한 번의 일괄 전송 요청을 나타내며, 100명을 넘으면 외부 메일 제공자 요청만 여러 묶음으로 나눈다.

## application_result_email_messages

| 컬럼 | 설명 |
|---|---|
| batch_id / application_id | 전송 묶음과 지원서 |
| status | PENDING, SENT, FAILED, UNKNOWN |
| recipient_email_snapshot | 전송 당시 수신 주소 |
| member_name_snapshot | 변수 치환 당시 인물 정보 |
| club_name_snapshot / kakao_link_snapshot | 변수 치환 당시 동아리·링크 정보 |
| subject_snapshot / body_snapshot | 실제로 외부 제공자에 전달한 내용 |
| idempotency_key | 같은 외부 요청의 반복 처리를 막는 키 |
| provider_message_id / error_message | 제공자 접수 ID 또는 실패 정보 |
| sent_at | 외부 제공자가 요청을 접수한 시각 |

- `SENT`는 수신함 도착이나 열람이 아니라 외부 제공자가 전송 요청을 정상 접수했다는 뜻이다.
- 한 지원서에 `PENDING`, `SENT`, `UNKNOWN` 결과가 둘 이상 생기지 않게 DB 제약으로 막는다.
- `FAILED`만 재시도할 수 있고, `UNKNOWN`은 실제 발송 여부가 불분명하므로 자동 재시도하지 않는다.
- `discord_name_snapshot`은 이전 버전 호환을 위해 DB에만 남아 있으며 신규 발송에서는 사용하지 않는다.

## generation_members

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| generation_id | UUID | FK → generations.id |
| person_id | UUID | FK → persons.id |
| joined_source | VARCHAR(30) | APPLICATION_ACCEPT, MANUAL, RETENTION |
| status | VARCHAR(20) | REGULAR, ASSOCIATE, INACTIVE, WITHDRAWN |
| dues_status | VARCHAR(20) | UNKNOWN, UNPAID, PAID, EXEMPT |
| kakao_invited | BOOLEAN | NOT NULL, 기본값 FALSE |
| discord_invited | BOOLEAN | NOT NULL, 기본값 FALSE |
| dues_status_updated_at | TIMESTAMPTZ | NULL 허용 |
| dues_status_updated_by_user_id | UUID | FK → users.id, NULL 허용 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

- `UNIQUE(generation_id, person_id)`로 같은 학기의 중복 부원을 방지한다.
- 합격 결과 메일이 `SENT`로 기록될 때 `APPLICATION_ACCEPT/REGULAR`로 생성한다.
- 이전 학기 부원을 이월하면 `RETENTION/REGULAR`로 생성한다.
- 기존·신규 부원의 회비 상태는 `UNKNOWN`으로 시작하고 회계 담당 운영진이 직접 확인한다.
- 회비 상태는 납부 금액이나 회계 거래가 아니라 해당 학기의 확인 결과만 나타낸다.
- 동아리는 generation을 통해 판별하므로 중복 `club_id`를 저장하지 않는다.

## generation_member_status_histories

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK |
| generation_member_id | UUID | FK → generation_members.id |
| previous_status | VARCHAR(20) | REGULAR, ASSOCIATE, INACTIVE, WITHDRAWN |
| new_status | VARCHAR(20) | REGULAR, ASSOCIATE, INACTIVE, WITHDRAWN |
| reason | VARCHAR(500) | NULL 허용 |
| changed_by_user_id | UUID | FK → users.id |
| changed_at | TIMESTAMPTZ | NOT NULL |

- 상태가 실제로 바뀔 때만 이력을 한 건 저장한다.
- 탈퇴(`WITHDRAWN`) 처리에는 사유가 반드시 필요하다.
- 변경자와 변경 시간을 남겨 운영진이 상태 변경 경위를 확인할 수 있게 한다.
- 같은 상태를 다시 요청하면 이력을 중복 생성하지 않는다.
- `REGULAR`과 `ASSOCIATE`는 서로 변경할 수 있고 두 상태 모두 `INACTIVE`로 변경할 수 있다.
- `WITHDRAWN`으로 변경하려면 먼저 `INACTIVE`로 변경해야 한다.

## application_import_sources

| 컬럼 | 설명 |
|---|---|
| club_id | 설정을 공유하는 동아리 |
| display_name | 운영진에게 보이는 설정 이름 |
| spreadsheet_id | Google Sheet 문서 ID |
| sheet_id | 이름이 바뀌어도 유지되는 Google 탭 ID |
| sheet_title | 저장 당시 탭 이름 |
| name/email/student_number_header | 필수 열 연결 |
| phone/submitted_at_header | 선택 열 연결 |
| header_fingerprint | 저장 당시 열 구조의 지문 |

- OAuth 토큰과 Sheet 행은 저장하지 않는다.
- 버튼을 누른 운영진 자신의 Google 연결 권한으로 최신 데이터를 읽는다.
- 저장 이후 열 구조가 달라지면 자동으로 진행하지 않고 열 연결 재설정을 요구한다.
- 저장된 설정은 자동 동기화가 아니라 최신 응답을 다시 읽기 위한 바로가기다.

## 외부 데이터 동기화

Google Sheet 읽기 권한은 `google_connections`에 저장한다. 원본 파일과 Sheet 행은 별도로 보관하지 않는다.
주기 동기화와 가져오기 실행 이력은 후속 범위다.
