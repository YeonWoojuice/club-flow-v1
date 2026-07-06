import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listClubs } from "../api/clubs";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../components/Brand";
import type { Club } from "../types/club";

const roleLabel = { PRESIDENT: "회장", VICE_PRESIDENT: "부회장", STAFF: "운영진" } as const;

export function ClubListPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listClubs()
      .then(setClubs)
      .catch(() => setError("동아리 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-full bg-[var(--surface)] px-5 py-8 font-body sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4"><Brand /><span className="text-xs font-bold text-[var(--text-secondary)]">{user?.name}</span></div>
        <section className="mt-8 rounded-[12px] border border-[var(--border-subtle)] bg-white p-6 shadow-sm sm:p-9">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div><h1 className="text-2xl font-extrabold">내 동아리</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">승인된 운영진 권한이 있는 동아리입니다.</p></div>
            <Link to="/clubs/new" className="rounded-[7px] bg-[var(--navy)] px-4 py-3 text-xs font-extrabold text-white">새 동아리 만들기</Link>
          </div>
          {loading && <p className="mt-8 text-sm text-[var(--text-secondary)]">불러오는 중...</p>}
          {error && <p role="alert" className="mt-8 text-sm font-bold text-[var(--danger)]">{error}</p>}
          {!loading && !error && clubs.length === 0 && <p className="mt-8 rounded-[8px] bg-[var(--panel-muted)] p-5 text-sm text-[var(--text-secondary)]">아직 접근 가능한 동아리가 없습니다.</p>}
          <div className="mt-7 grid gap-3">
            {clubs.map(club => (
              <Link key={club.id} to={`/clubs/${club.id}/dashboard`} className="flex items-center justify-between gap-4 rounded-[9px] border border-[var(--border-subtle)] p-5 transition hover:border-[var(--navy)]">
                <span><b className="block text-base">{club.name}</b><span className="mt-1 block text-xs text-[var(--text-secondary)]">{club.description || "동아리 설명이 없습니다."}</span></span>
                <span className="shrink-0 rounded-[5px] bg-[var(--success-soft)] px-2.5 py-1.5 text-[10px] font-extrabold text-[var(--success)]">{roleLabel[club.role]}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
