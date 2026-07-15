import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthErrorScreen } from "../auth/AuthErrorScreen";
import { Brand } from "../components/Brand";
import { LoadingScreen } from "../components/LoadingScreen";

export function LoginPage() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();
  const googleLoginUrl = import.meta.env.DEV
    ? "http://localhost:8080/oauth2/authorization/google"
    : "/oauth2/authorization/google";

  if (status === "loading") {
    return <LoadingScreen message="로그인 상태를 확인하고 있습니다." />;
  }
  if (status === "error") {
    return <AuthErrorScreen />;
  }
  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="flex min-h-full items-center justify-center bg-white px-5 py-10 font-body">
      <div className="grid w-full max-w-md lg:max-w-4xl lg:grid-cols-2 lg:items-stretch lg:gap-5">
        <section className="hidden min-h-[420px] overflow-hidden bg-white lg:block" aria-label="CrewCat 소개 이미지">
          <img
            src="/crewcat-login-cat.png?v=20260715-cafe"
            alt="카페에서 노트북으로 동아리를 관리하는 CrewCat 고양이"
            className="h-full w-full object-cover"
          />
        </section>

        <section className="min-h-[420px] bg-white p-7 sm:p-10">
          <Brand />
          <h1 className="mt-10 text-2xl font-extrabold tracking-[-0.5px]">동아리 운영을 한곳에서</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Google 계정으로 시작하고 동아리의 지원자, 부원, 운영 기록을 이어서 관리하세요.
          </p>
          {searchParams.get("error") && (
            <p role="alert" className="mt-5 rounded-[7px] bg-[var(--danger-soft)] px-3 py-2.5 text-xs font-bold text-[var(--danger)]">
              Google 로그인에 실패했습니다. 다시 시도해 주세요.
            </p>
          )}
          <a href={googleLoginUrl} className="mt-8 flex h-12 w-full items-center justify-center rounded-[7px] border border-[var(--border)] bg-white text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--navy)] hover:bg-[var(--panel-muted)]">
            Google로 시작하기
          </a>
          <p className="mt-5 text-center text-[10px] leading-4 text-[var(--text-tertiary)]">
            최초 로그인 시 CrewCat 계정이 자동으로 생성됩니다.
          </p>
        </section>
      </div>
    </main>
  );
}
