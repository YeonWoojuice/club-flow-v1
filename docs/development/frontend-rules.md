# 프론트엔드 코딩 규칙

> 이 문서는 `frontend/` 디렉터리 내 모든 코드에 적용됩니다.

## 기술 기준

| 항목 | 기준 |
|---|---|
| 프레임워크 | React 19 함수형 컴포넌트 |
| 언어 | TypeScript 5.8 strict |
| 빌드 | Vite 7 |
| 라우팅 | React Router 7 |
| 스타일 | Tailwind CSS 4 + CSS Variables |
| 서버 상태 | 도메인별 API 모듈과 컴포넌트 상태 |

## 디렉터리

```text
src/
├── api/         fetch 공통 처리와 도메인 API
├── auth/        로그인 상태와 보호 경로
├── components/  재사용 UI
├── pages/       URL 단위 페이지
├── router/      앱 라우팅
├── types/       서버 응답 공유 타입
├── App.tsx
├── main.tsx
└── styles.css
```

## 라우팅

```text
/login                       Google 로그인
/auth/callback               로그인 완료 후 동아리 분기
/clubs                       내 동아리 목록
/clubs/new                   동아리 생성
/clubs/:clubId/dashboard     승인된 운영진 대시보드
```

- 인증·동아리 경계는 실제 URL로 표현한다.
- 보호 페이지는 `RequireAuth` 아래에 둔다.
- 접근 가능한 동아리가 없으면 `/clubs/new`로 이동한다.
- 한 개면 해당 대시보드, 여러 개면 `/clubs`로 이동한다.
- 페이지 이동은 React Router의 `Link`, `Navigate`, `useNavigate`를 사용한다.

## API

- 모든 API 호출은 `src/api/`에 둔다.
- `credentials: include`를 유지해 서버 세션 쿠키를 사용한다.
- 쓰기 요청 전 `/api/auth/csrf`에서 토큰을 받아 헤더로 전달한다.
- `401`은 로그인 화면, `403`은 동아리 목록으로 처리한다.
- 서버 오류의 `message`를 사용자에게 표시한다.

## 타입과 컴포넌트

- `any`를 사용하지 않는다.
- 서버 응답 타입은 `src/types/`에 둔다.
- 페이지 내부에서만 쓰는 입력 상태는 해당 페이지에 둔다.
- 인증 사용자 상태는 `AuthProvider`에서 관리한다.
- 색상은 `styles.css`의 CSS Custom Properties를 우선 사용한다.

## 금지 사항

- `window.location`을 이용한 앱 내부 페이지 이동
- 컴포넌트에서 직접 중복 `fetch` 설정 작성
- OAuth access token 또는 ID token을 브라우저 저장소에 보관
- `console.log` 커밋
- `as any` 캐스팅
- 인라인 스타일
