# 인증과 동아리 진입 흐름

## 목적

운영진은 Google 계정으로 로그인하고, 승인된 동아리 권한에 따라 관리 화면에 진입합니다. 지원자와 부원은 로그인 대상이 아닙니다.

## 로그인 흐름

```text
React 로그인 화면
  → GET /oauth2/authorization/google
  → Google 로그인 및 동의
  → GET /login/oauth2/code/google
  → GoogleOidcUserService
  → users 생성 또는 프로필 갱신
  → 서버 세션(JSESSIONID) 생성
  → http://localhost:5173/auth/callback
```

![Google 로그인과 동아리 진입 흐름](./club_flow.drawio.png)

## 로그인 후 분기

프론트엔드는 `GET /api/auth/me`로 로그인 상태를 확인한 뒤 접근 가능한 동아리를 조회합니다.

```text
대기 중인 운영진 초대 있음 → /staff-invitations
대기 초대 없음 + 동아리 0개 → /clubs/new
동아리 1개 → /clubs/{clubId}/dashboard
동아리 2개 이상 → /clubs
```

동아리를 처음 생성하면 생성자에게 `PRESIDENT/APPROVED` 권한이 같은 트랜잭션에서 부여됩니다.

## 보안 정책

- Google 사용자는 이메일이 아니라 OIDC `sub`로 식별합니다.
- `email_verified=true`인 Google 계정만 허용합니다.
- 인증 정보는 브라우저 저장소가 아니라 서버 세션으로 관리합니다.
- API 요청은 `JSESSIONID` 쿠키를 포함합니다.
- 쓰기 요청은 `GET /api/auth/csrf`에서 받은 CSRF 토큰을 헤더에 포함합니다.
- `club_staffs.status=APPROVED`인 운영진만 해당 동아리 데이터에 접근합니다.
- 로그아웃은 `POST /api/auth/logout`으로 처리하고 세션과 쿠키를 제거합니다.

## Google Sheet 읽기 권한

관리 화면 로그인과 Google Sheet 읽기는 별도 흐름입니다. 로그인할 때는 사용자 식별에 필요한
`openid/profile/email`만 요청하고, 잔류 부원 이월 화면에서 Sheet를 처음 사용할 때 읽기 전용 권한을
추가로 요청합니다.

```text
잔류 부원 이월 화면
  → GET /api/google-data/oauth/authorization-url
  → Google에서 spreadsheets.readonly 동의
  → GET /api/google-data/oauth/callback
  → 접근·갱신 토큰을 암호화해 google_connections에 저장
  → 원래 잔류 부원 이월 화면으로 복귀
```

- OAuth 요청의 `state`는 서버 세션에 저장해 콜백 위조를 막습니다.
- 토큰은 `GOOGLE_TOKEN_ENCRYPTION_KEY`로 AES-256-GCM 암호화하며 브라우저에 전달하지 않습니다.
- Sheet API 호출 전에 만료된 접근 토큰을 갱신합니다.
- `GET /api/google-data/status`는 연결 여부와 연결된 Google 이메일만 반환합니다.
- 사용자가 연결 해제를 요청하면 서버에 저장한 암호화 토큰 연결을 삭제합니다. 이미 연결이 없어도 성공으로 처리합니다.
- 서버에는 `GOOGLE_DATA_CLIENT_ID`, `GOOGLE_DATA_CLIENT_SECRET`, `GOOGLE_DATA_REDIRECT_URI`,
  `GOOGLE_TOKEN_ENCRYPTION_KEY` 설정이 필요합니다.

## 관련 코드

- 백엔드: `backend/src/main/java/com/clubflow/backend/auth/`
- 프론트엔드: `frontend/src/auth/`, `frontend/src/api/auth.ts`
- 권한 모델: `docs/product/data-model.md`
- 잔류 부원 이월: `docs/features/member-retention/retention_flow.md`
