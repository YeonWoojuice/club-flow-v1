# 프론트엔드 코딩 규칙

> 이 문서는 `frontend/` 디렉터리 내 모든 코드에 적용됩니다.

---

## 기술 제약

| 항목 | 현재 스택 | 금지 |
|------|-----------|------|
| 프레임워크 | React 19 (함수형 컴포넌트) | 클래스 컴포넌트 |
| 언어 | TypeScript 5.8 — strict 모드 | `any` 타입 |
| 빌드 | Vite 7 | CRA, webpack 직접 조작 |
| 스타일 | Tailwind CSS 4 + CSS Variables | CSS-in-JS, Styled Components, SCSS |
| 라우팅 | `useState<Page>` 내부 상태 | React Router, Next.js 등 외부 라우터 |
| 상태 관리 | `useState`, `useMemo` | Redux, Zustand, Jotai 등 |

---

## 파일 구조 규칙

현재 구조는 단일 파일(`src/App.tsx`)이지만, 기능 분리 시 아래 원칙을 따른다.

```
frontend/src/
├── App.tsx            # 루트 컴포넌트 + 전역 상태
├── main.tsx           # React 진입점
├── styles.css         # CSS Custom Properties + Tailwind base
├── components/        # 재사용 UI 컴포넌트 (Button, Badge, Panel 등)
├── pages/             # 페이지 단위 컴포넌트 (DashboardPage, MembersPage 등)
├── types/             # 공유 TypeScript 타입
└── utils/             # 순수 유틸 함수 (normalizeEmail 등)
```

- 파일 1개당 컴포넌트 1개가 기본이지만, 긴밀하게 연결된 서브컴포넌트는 같은 파일에 두어도 된다.
- `index.ts` 배럴 파일은 필요할 때만 추가한다.

---

## 컴포넌트 규칙

### Props 타입

```tsx
// 인라인 타입 선언 — 별도 interface 불필요
function Button({ children, primary = false, onClick }: {
  children: ReactNode;
  primary?: boolean;
  onClick?: () => void;
}) { ... }
```

- `interface` 대신 인라인 객체 타입을 기본으로 사용한다.
- 컴포넌트 파일 외부에서 재사용하는 타입만 `types/` 로 분리한다.

### 도메인 타입

```tsx
// 기존 패턴 유지
type Page = "dashboard" | "sync" | "applications" | "member" | "members" | "staff" | "logs";
type GenerationStatus = "모집 중" | "활동 중" | "종료";
type MembershipOrigin = "carryover" | "application" | "form" | "manual";
```

- 상태값은 실제 한국어 문자열 리터럴 유니온으로 정의한다.
- 새 상태 추가 시 기존 리터럴 유니온을 확장한다.

### 이벤트 핸들러

```tsx
// 인라인 화살표 함수 허용 (짧은 경우)
<button onClick={() => setPage("dashboard")}>대시보드</button>

// 핸들러가 3줄 이상이면 별도 함수로 분리
const handleSync = () => {
  setSyncing(true);
  window.setTimeout(() => { setSyncing(false); notify("동기화 완료"); }, 650);
};
```

---

## 스타일 규칙

### CSS Custom Properties (디자인 토큰)

`styles.css`에 정의된 변수만 색상·그림자에 사용한다. 하드코딩 금지.

```tsx
// 올바름
<div className="bg-[var(--panel-muted)] text-[var(--text-primary)]">

// 금지 — 토큰 외 색상 하드코딩
<div className="bg-gray-100 text-gray-900">
```

예외: 다크 배너 섹션(`#111827`, `#D1D5DB`)처럼 디자인 파일에서 명시적으로 지정된 경우.

### Tailwind 클래스 작성 순서

1. 레이아웃 (`flex`, `grid`, `block`)
2. 크기 (`w-`, `h-`, `min-w-`, `max-w-`)
3. 여백 (`p-`, `m-`, `gap-`, `px-`, `py-`)
4. 타이포그래피 (`text-`, `font-`, `leading-`)
5. 색상·배경 (`bg-`, `text-color`, `border-`)
6. 반응형 (`sm:`, `xl:`)
7. 상태 (`hover:`, `active:`, `disabled:`, `focus-visible:`)

### 반응형 기준점

```
기본(모바일): 320px ~
sm: 640px (데스크톱 레이아웃 전환)
xl: 1280px (여백 확장)
```

- 모바일 우선으로 작성하고 `sm:` 으로 데스크톱을 덮는다.
- 숨김 패턴: 모바일 전용 `sm:hidden`, 데스크톱 전용 `hidden sm:block`.

### 폰트 클래스

```tsx
font-body   // Inter, Pretendard — 일반 텍스트, UI 레이블
font-data   // Geist Mono, IBM Plex Mono — 숫자, 날짜, 코드성 데이터
```

---

## 공통 UI 컴포넌트 사용법

기존 컴포넌트를 반드시 재사용한다. 비슷한 새 컴포넌트를 만들기 전에 먼저 확인한다.

| 컴포넌트 | 용도 | 주요 prop |
|----------|------|-----------|
| `Button` | 모든 액션 버튼 | `primary`, `danger`, `disabled` |
| `Badge` | 상태 표시 레이블 | `tone: Tone` |
| `Panel` | 흰색 카드 컨테이너 | `className` |
| `Segmented` | 토글형 탭 선택 | `value`, `options`, `onChange` |
| `DataTable` | 목록 테이블 (데스크톱) | `header`, `rows`, `onRowClick` |
| `PageTitle` | 페이지 헤더 | `title`, `description`, `action` |

### Tone 시스템

```tsx
type Tone = "neutral" | "success" | "warning" | "danger" | "navy";
```

`statusTone()` 유틸로 문자열에서 tone을 도출한다. 직접 하드코딩하지 않는다.

---

## 상태 관리 규칙

### 전역 상태 (`App.tsx`)

- `generations`, `people`, `memberships`, `applicants`, `forms` — 서버 연동 전까지 `useState`로 관리.
- 파생 상태(필터, 집계)는 `useMemo`로 계산한다.
- 페이지 전환: `setPage()`만 사용하고, `window.history` 직접 조작 금지.

### 로컬 상태

- 모달 open/close, 검색 쿼리, 폼 입력값 — 해당 컴포넌트 안에서 `useState`.
- 부모에게 올릴 필요가 없는 상태는 올리지 않는다.

### 알림 (Toast)

```tsx
notify("메시지 텍스트");  // 2600ms 후 자동 소멸
```

사용자 액션 완료 후 항상 `notify`로 피드백한다.

---

## API 연동 준비 규칙

현재 프론트엔드는 목업 데이터로 동작한다. 백엔드 연동 시:

- fetch/axios 호출은 `src/api/` 디렉터리에 도메인별로 분리한다.
- 로딩·에러 상태는 각 호출 레벨에서 `useState`로 처리한다.
- 서버 에러 메시지는 `notify()`로 표시한다.

---

## 금지 사항

- `console.log` 를 커밋에 포함하지 않는다.
- `as any` 캐스팅 금지 — 타입 단언이 필요하면 타입 가드나 제네릭으로 해결한다.
- 인라인 스타일(`style={{}}`) 금지 — Tailwind 또는 CSS Variable로 대체한다.
- `window.location` 직접 변경 금지 — 페이지 이동은 `setPage()`로.
- `setTimeout` 없이 즉시 상태 변경으로 해결되는 경우에는 `window.setTimeout` 사용 금지.
