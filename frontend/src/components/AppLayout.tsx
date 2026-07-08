import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../api/auth";
import { getClub } from "../api/clubs";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import type { Club, ClubRole } from "../types/club";

const roleLabel: Record<ClubRole, string> = {
  PRESIDENT: "회장",
  VICE_PRESIDENT: "부회장",
  STAFF: "운영진",
};

interface AppLayoutProps {
  clubId: string;
  children: React.ReactNode;
}

export function AppLayout({ clubId, children }: AppLayoutProps) {
  const { user, clear } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);

  useEffect(() => {
    getClub(clubId)
      .then(setClub)
      .catch(err => {
        if (err instanceof ApiError && err.status === 403) {
          navigate("/clubs", { replace: true });
        }
      });
  }, [clubId, navigate]);

  const handleLogout = async () => {
    await logout();
    clear();
    navigate("/login", { replace: true });
  };

  const nav = [
    { label: "대시보드", to: `/clubs/${clubId}/dashboard` },
    { label: "학기/기수", to: `/clubs/${clubId}/generations` },
    { label: "지원자 관리", to: `/clubs/${clubId}/applications` },
    { label: "부원 관리", to: `/clubs/${clubId}/members` },
  ];

  const initials = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex h-screen overflow-hidden font-body">
      <aside className="flex h-full w-60 shrink-0 flex-col bg-[var(--sidebar-bg)] px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-active)] text-xs font-bold text-white">
            동
          </div>
          <span className="text-sm font-bold text-white">동아리허브</span>
        </div>

        <div className="my-4 h-px bg-[var(--sidebar-border)]" />

        {club && (
          <div className="rounded-xl bg-[var(--sidebar-info)] px-3 py-3">
            <p className="text-xs font-bold leading-5 text-white">{club.name}</p>
            <p className="text-[11px] text-[var(--sidebar-text)]">{roleLabel[club.role]}</p>
          </div>
        )}

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {nav.map(item => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex h-10 items-center rounded-lg px-3 text-sm transition-colors ${
                  active
                    ? "bg-[var(--sidebar-active)] font-bold text-white"
                    : "text-[var(--sidebar-text)] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {/* TODO: 폼 연동 – API 미제공 */}
          <span className="flex h-10 cursor-not-allowed items-center rounded-lg px-3 text-sm text-[var(--sidebar-text-muted)] opacity-50">
            폼 연동
          </span>
          {/* TODO: 운영진 관리 – API 미제공 */}
          <span className="flex h-10 cursor-not-allowed items-center rounded-lg px-3 text-sm text-[var(--sidebar-text-muted)] opacity-50">
            운영진 관리
          </span>
        </nav>

        <div className="border-t border-[var(--sidebar-border)] pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-active)] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{user?.name}</p>
              <p className="truncate text-[10px] text-[var(--sidebar-text-muted)]">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 text-[10px] text-[var(--sidebar-text-muted)] transition-colors hover:text-white"
            >
              나가기
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-y-auto bg-[var(--surface)]">
        {children}
      </div>
    </div>
  );
}
