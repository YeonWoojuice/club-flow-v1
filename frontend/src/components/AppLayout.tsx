import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../api/auth";
import { getClub } from "../api/clubs";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import type { Club, ClubStaffRole } from "../types/club";
import { BrandLogo } from "./Brand";
import { ErrorToast } from "./ErrorToast";
import {
  clearCachedClubs,
  deleteCachedClub,
  getCachedClub,
  setCachedClub,
} from "./appLayoutClubCache";

const roleLabel: Record<ClubStaffRole, string> = {
  PRESIDENT: "회장",
  VICE_PRESIDENT: "부회장",
  STAFF: "운영진",
};

interface AppLayoutProps {
  clubId: string;
  children: React.ReactNode;
}

type NavigationItem = {
  label: string;
  to: string;
  exact?: boolean;
};

function NavigationLinks({
  items,
  pathname,
  direction,
}: {
  items: NavigationItem[];
  pathname: string;
  direction: "vertical" | "horizontal";
}) {
  return items.map(item => {
    const active = item.exact
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`);
    const horizontal = direction === "horizontal";

    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? "page" : undefined}
        className={`flex h-10 items-center rounded-lg text-sm transition-colors ${
          horizontal ? "shrink-0 px-3" : "px-3"
        } ${
          active
            ? horizontal
              ? "bg-[var(--navy)] font-bold text-white"
              : "bg-[var(--sidebar-active)] font-bold text-white"
            : horizontal
              ? "text-[var(--text-secondary)] hover:bg-[var(--panel-muted)] hover:text-[var(--text-primary)]"
              : "text-[var(--sidebar-text)] hover:text-white"
        }`}
      >
        {item.label}
      </Link>
    );
  });
}

export function AppLayout({ clubId, children }: AppLayoutProps) {
  const { user, clear } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loadedClub, setLoadedClub] = useState<{ clubId: string; club: Club } | null>(() => {
    const cachedClub = getCachedClub(clubId);
    return cachedClub ? { clubId, club: cachedClub } : null;
  });
  const [failedProfileImageUrl, setFailedProfileImageUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;
    getClub(clubId)
      .then(nextClub => {
        setCachedClub(clubId, nextClub);
        if (active) {
          setLoadedClub({ clubId, club: nextClub });
        }
      })
      .catch(err => {
        if (err instanceof ApiError && err.status === 403) {
          deleteCachedClub(clubId);
          navigate("/clubs", { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [clubId, navigate]);

  const club = loadedClub?.clubId === clubId ? loadedClub.club : getCachedClub(clubId);
  const profileImageUrl = user?.profileImageUrl ?? null;
  const showProfileImage = profileImageUrl && failedProfileImageUrl !== profileImageUrl;

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      clearCachedClubs();
      clear();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("로그아웃에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoggingOut(false);
    }
  };

  const nav: NavigationItem[] = [
    { label: "대시보드", to: `/clubs/${clubId}/dashboard` },
    { label: "학기/기수", to: `/clubs/${clubId}/generations` },
    { label: "지원자 관리", to: `/clubs/${clubId}/applications` },
    { label: "부원 관리", to: `/clubs/${clubId}/members`, exact: true },
    { label: "잔류 부원 이월", to: `/clubs/${clubId}/members/retention` },
    ...(club?.role === "PRESIDENT"
      ? [{ label: "운영진 관리", to: `/clubs/${clubId}/staff` }]
      : []),
    { label: "받은 초대", to: `/clubs/${clubId}/staff-invitations`, exact: true },
  ];

  const initials = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex h-dvh min-w-0 overflow-hidden font-body">
      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className="hidden h-full w-60 shrink-0 flex-col bg-[var(--sidebar-bg)] px-5 py-6 lg:flex"
      >
        <div className="flex items-center gap-2.5">
          <BrandLogo className="h-7 w-7" variant="navigation" />
          <span className="text-sm font-bold text-white">CrewCat</span>
        </div>

        <div className="my-4 h-px bg-[var(--sidebar-border)]" />

        <div className="min-h-[64px] rounded-xl bg-[var(--sidebar-info)] px-3 py-3">
          {club && (
            <>
              <p className="text-xs font-bold leading-5 text-white">{club.name}</p>
              <p className="text-[11px] text-[var(--sidebar-text)]">{roleLabel[club.role]}</p>
            </>
          )}
        </div>

        <nav aria-label="사이드 메뉴" className="mt-4 flex flex-1 flex-col gap-1">
          <NavigationLinks items={nav} pathname={location.pathname} direction="vertical" />
        </nav>

        <div className="border-t border-[var(--sidebar-border)] pt-4">
          <div className="flex items-center gap-2.5">
            {showProfileImage ? (
              <img
                src={profileImageUrl}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setFailedProfileImageUrl(profileImageUrl)}
                className="h-8 w-8 shrink-0 rounded-full bg-white object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-active)] text-xs font-bold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{user?.name}</p>
              <p className="truncate text-[10px] text-[var(--sidebar-text-muted)]">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="shrink-0 text-[10px] text-[var(--sidebar-text-muted)] transition-colors hover:text-white"
            >
              {loggingOut ? "처리 중" : "나가기"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)]">
        {/* Narrow-screen top navigation */}
        <header data-testid="mobile-top-navigation" className="sticky top-0 z-30 shrink-0 border-b border-[var(--border-subtle)] bg-white lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo className="h-7 w-7 shrink-0" variant="navigation" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--navy)]">CrewCat</p>
                {club && <p className="truncate text-[10px] text-[var(--text-secondary)]">{club.name}</p>}
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2.5">
              {showProfileImage ? (
                <img
                  src={profileImageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setFailedProfileImageUrl(profileImageUrl)}
                  className="h-7 w-7 shrink-0 rounded-full bg-white object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-[10px] font-bold text-white">
                  {initials}
                </div>
              )}
              <span className="hidden max-w-24 truncate text-xs font-bold text-[var(--text-primary)] sm:block">{user?.name}</span>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="shrink-0 text-[10px] font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--navy)] disabled:opacity-50"
              >
                {loggingOut ? "처리 중" : "나가기"}
              </button>
            </div>
          </div>
          <nav aria-label="상단 메뉴" className="overflow-x-auto border-t border-[var(--border-subtle)] px-2 [scrollbar-width:none]">
            <div className="flex min-w-max gap-1 py-1">
              <NavigationLinks items={nav} pathname={location.pathname} direction="horizontal" />
            </div>
          </nav>
        </header>

        {children}
      </div>

      {logoutError && (
        <ErrorToast message={logoutError} onDismiss={() => setLogoutError("")} />
      )}
    </div>
  );
}
