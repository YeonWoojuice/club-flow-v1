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
