import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listMembers } from "../api/members";
import { ClubNavigation } from "../components/ClubNavigation";
import type { GenerationMember } from "../types/member";

const sourceLabel = {
  APPLICATION_ACCEPT: "지원 합격",
  MANUAL: "수동 등록",
  RETENTION: "잔류",
} as const;

export function MemberListPage() {
  const { clubId = "" } = useParams();
  const [members, setMembers] = useState<GenerationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listMembers(clubId)
      .then(setMembers)
      .catch(() => setError("부원 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [clubId]);

  return (
    <div className="min-h-full bg-[var(--surface)] font-body">
      <ClubNavigation clubId={clubId} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-2xl font-extrabold">부원</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">학기별 부원 등록 기록을 확인합니다.</p>
        {loading && <p className="mt-6 text-sm text-[var(--text-secondary)]">불러오는 중...</p>}
        {error && <p role="alert" className="mt-6 text-sm font-bold text-[var(--danger)]">{error}</p>}
        {!loading && !error && members.length === 0 && (
          <p className="mt-6 rounded-[9px] border border-[var(--border-subtle)] bg-white p-6 text-sm text-[var(--text-secondary)]">등록된 부원이 없습니다. 지원자를 합격 처리하면 자동으로 추가됩니다.</p>
        )}
        <div className="mt-6 grid gap-3">
          {members.map(member => (
            <article key={member.id} className="grid gap-3 rounded-[9px] border border-[var(--border-subtle)] bg-white p-5 sm:grid-cols-[1fr_1fr_150px_100px] sm:items-center">
              <span><b className="block">{member.name}</b><span className="mt-1 block text-xs text-[var(--text-secondary)]">{member.email}</span></span>
              <span className="text-xs text-[var(--text-secondary)]">{member.generationName}<br />학번 {member.studentNumber}</span>
              <span className="text-xs font-bold">{sourceLabel[member.joinedSource]}</span>
              <span className="w-fit rounded-[5px] bg-[var(--success-soft)] px-2.5 py-1.5 text-[10px] font-extrabold text-[var(--success)]">{member.status === "ACTIVE" ? "활동 중" : member.status}</span>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
