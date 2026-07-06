import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout } from "../api/auth";
import { getClub } from "../api/clubs";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../components/Brand";
import { LoadingScreen } from "../components/LoadingScreen";
import type { Club } from "../types/club";

const roleLabel = { PRESIDENT: "회장", VICE_PRESIDENT: "부회장", STAFF: "운영진" } as const;

export function ClubDashboardPage() {
  const { clubId = "" } = useParams();
  const navigate = useNavigate();
  const { user, clear } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getClub(clubId)
      .then(setClub)
      .catch(requestError => {
        if (requestError instanceof ApiError && requestError.status === 403) {
          navigate("/clubs", { replace: true });
          return;
        }
        setError("대시보드를 불러오지 못했습니다.");
      });
  }, [clubId, navigate]);

  const handleLogout = async () => {
    await logout();
    clear();
    navigate("/login", { replace: true });
  };

  if (!club && !error) {
    return <LoadingScreen message="동아리 접근 권한을 확인하고 있습니다." />;
  }

  return (
    <div className="min-h-full bg-[var(--surface)] font-body">
      <header className="border-b border-[var(--chrome-border)] bg-[var(--chrome-header)] px-5 py-4 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <span className="[&_b]:text-white"><Brand /></span>
          <div className="flex items-center gap-4 text-xs"><span className="hidden text-[var(--chrome-text-muted)] sm:inline">{user?.name}</span><button onClick={handleLogout} className="font-bold">로그아웃</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        {error ? <p role="alert" className="rounded-[8px] bg-[var(--danger-soft)] p-5 text-sm font-bold text-[var(--danger)]">{error}</p> : club && (
          <>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div><span className="text-xs font-extrabold text-[var(--success)]">{roleLabel[club.role]} · 승인됨</span><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.6px]">{club.name} 대시보드</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">{club.description || "ClubFlow 운영 공간이 준비되었습니다."}</p></div>
              <Link to="/clubs" className="rounded-[7px] border border-[var(--border)] bg-white px-4 py-3 text-xs font-extrabold">동아리 전환</Link>
            </div>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-[10px] border border-[var(--border-subtle)] bg-white p-5"><span className="text-xs font-bold text-[var(--text-secondary)]">인증 상태</span><b className="mt-3 block text-lg text-[var(--success)]">연결 완료</b><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Google 로그인과 자동 회원가입이 적용되었습니다.</p></article>
              <article className="rounded-[10px] border border-[var(--border-subtle)] bg-white p-5"><span className="text-xs font-bold text-[var(--text-secondary)]">내 권한</span><b className="mt-3 block text-lg">{roleLabel[club.role]}</b><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">동아리 생성과 동시에 승인된 회장 권한입니다.</p></article>
              <article className="rounded-[10px] border border-[var(--border-subtle)] bg-white p-5"><span className="text-xs font-bold text-[var(--text-secondary)]">다음 작업</span><b className="mt-3 block text-lg">학기 설정</b><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">다음 단계에서 학기·부원 도메인을 연결합니다.</p></article>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
