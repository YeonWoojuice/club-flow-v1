import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listMembers } from "../api/members";
import { AppLayout } from "../components/AppLayout";
import type { GenerationMember, GenerationMemberStatus, MemberJoinedSource } from "../types/member";

const sourceLabel: Record<MemberJoinedSource, string> = {
  APPLICATION_ACCEPT: "지원 합격",
  MANUAL: "수동 등록",
  RETENTION: "잔류",
};

function StatusBadge({ status }: { status: GenerationMemberStatus }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center rounded-md bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--success)]">
        활동 중
      </span>
    );
  }
  if (status === "INACTIVE") {
    return (
      <span className="inline-flex items-center rounded-md bg-[var(--warning-soft)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--warning)]">
        비활동
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--panel-muted)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--text-secondary)]">
      탈퇴
    </span>
  );
}

function MemberRow({ member }: { member: GenerationMember }) {
  return (
    <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--panel-muted)]">
      <td className="px-5 py-3.5">
        <span className="block text-sm font-bold text-[var(--text-primary)]">{member.name}</span>
        <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{member.email}</span>
      </td>
      <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">{member.generationName}</td>
      <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">{sourceLabel[member.joinedSource]}</td>
      <td className="px-5 py-3.5">
        <StatusBadge status={member.status} />
      </td>
    </tr>
  );
}

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
    <AppLayout clubId={clubId}>
      {/* Page header */}
      <div className="border-b border-[var(--border-subtle)] bg-white px-8 py-5">
        <h1 className="text-xl font-extrabold text-[var(--text-primary)]">부원 관리</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">학기별 부원 등록 기록을 확인합니다.</p>
      </div>

      <div className="px-8 py-6">
        {loading && (
          <p className="text-sm text-[var(--text-secondary)]">불러오는 중...</p>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-bold text-[var(--danger)]">
            {error}
          </p>
        )}

        {!loading && !error && members.length === 0 && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">등록된 부원이 없습니다.</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">지원자를 합격 처리하면 자동으로 추가됩니다.</p>
          </div>
        )}

        {!loading && !error && members.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--panel-muted)]">
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">이름/이메일</th>
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">학기</th>
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">가입 경로</th>
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">상태</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
