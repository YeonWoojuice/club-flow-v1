import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listApplications } from "../api/applications";
import { ClubNavigation } from "../components/ClubNavigation";
import type { ApplicationStatus, ApplicationSummary } from "../types/application";

const statusLabel: Record<ApplicationStatus, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토 중",
  ACCEPTED: "합격",
  REJECTED: "불합격",
  CANCELED: "취소",
};

export function ApplicationListPage() {
  const { clubId = "" } = useParams();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listApplications(clubId)
      .then(setApplications)
      .catch(() => setError("지원자 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [clubId]);

  return (
    <div className="min-h-full bg-[var(--surface)] font-body">
      <ClubNavigation clubId={clubId} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold">지원자</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">수동 등록된 지원자와 처리 상태를 확인합니다.</p>
          </div>
          <Link to={`/clubs/${clubId}/applications/new`} className="rounded-[7px] bg-[var(--navy)] px-4 py-3 text-xs font-extrabold text-white">
            지원자 수동 등록
          </Link>
        </div>
        {loading && <p className="mt-6 text-sm text-[var(--text-secondary)]">불러오는 중...</p>}
        {error && <p role="alert" className="mt-6 text-sm font-bold text-[var(--danger)]">{error}</p>}
        {!loading && !error && applications.length === 0 && (
          <p className="mt-6 rounded-[9px] border border-[var(--border-subtle)] bg-white p-6 text-sm text-[var(--text-secondary)]">등록된 지원자가 없습니다.</p>
        )}
        <div className="mt-6 grid gap-3">
          {applications.map(application => (
            <Link key={application.id} to={`/clubs/${clubId}/applications/${application.id}`} className="grid gap-3 rounded-[9px] border border-[var(--border-subtle)] bg-white p-5 transition hover:border-[var(--navy)] sm:grid-cols-[1fr_1fr_160px_90px] sm:items-center">
              <span><b className="block">{application.name}</b><span className="mt-1 block text-xs text-[var(--text-secondary)]">{application.email}</span></span>
              <span className="text-xs text-[var(--text-secondary)]">{application.generationName}<br />학번 {application.studentNumber}</span>
              <time className="text-xs text-[var(--text-secondary)]">{new Date(application.submittedAt).toLocaleDateString("ko-KR")}</time>
              <span className="w-fit rounded-[5px] bg-[var(--panel-muted)] px-2.5 py-1.5 text-[10px] font-extrabold">{statusLabel[application.status]}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
