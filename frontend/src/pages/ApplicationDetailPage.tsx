import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { changeApplicationStatus, getApplication } from "../api/applications";
import { ApiError } from "../api/http";
import { ClubNavigation } from "../components/ClubNavigation";
import type { ApplicationDetail, ApplicationStatus } from "../types/application";

const statusLabel: Record<ApplicationStatus, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토 중",
  ACCEPTED: "합격",
  REJECTED: "불합격",
  CANCELED: "취소",
};

export function ApplicationDetailPage() {
  const { clubId = "", applicationId = "" } = useParams();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getApplication(applicationId)
      .then(setApplication)
      .catch(() => setError("지원서를 불러오지 못했습니다."));
  }, [applicationId]);

  const handleStatus = async (status: ApplicationStatus) => {
    setUpdating(true);
    setError("");
    try {
      setApplication(await changeApplicationStatus(applicationId, status));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "지원 상태를 변경하지 못했습니다.");
    } finally {
      setUpdating(false);
    }
  };

  const terminal = application
    ? ["ACCEPTED", "REJECTED", "CANCELED"].includes(application.status)
    : false;

  return (
    <div className="min-h-full bg-[var(--surface)] font-body">
      <ClubNavigation clubId={clubId} />
      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to={`/clubs/${clubId}/applications`} className="text-xs font-bold text-[var(--text-secondary)]">← 지원자 목록</Link>
        {error && <p role="alert" className="mt-5 rounded-[7px] bg-[var(--danger-soft)] p-3 text-xs font-bold text-[var(--danger)]">{error}</p>}
        {!application && !error && <p className="mt-6 text-sm text-[var(--text-secondary)]">불러오는 중...</p>}
        {application && (
          <>
            <section className="mt-5 rounded-[10px] border border-[var(--border-subtle)] bg-white p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <span className="rounded-[5px] bg-[var(--panel-muted)] px-2.5 py-1.5 text-[10px] font-extrabold">{statusLabel[application.status]}</span>
                  <h1 className="mt-4 text-2xl font-extrabold">{application.name}</h1>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{application.generationName} · 학번 {application.studentNumber}</p>
                </div>
                {!terminal && (
                  <div className="flex flex-wrap gap-2">
                    {application.status === "SUBMITTED" && <button disabled={updating} onClick={() => handleStatus("REVIEWING")} className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-xs font-extrabold">검토 시작</button>}
                    <button disabled={updating} onClick={() => handleStatus("ACCEPTED")} className="rounded-[6px] bg-[var(--success)] px-3 py-2 text-xs font-extrabold text-white">합격</button>
                    <button disabled={updating} onClick={() => handleStatus("REJECTED")} className="rounded-[6px] bg-[var(--danger)] px-3 py-2 text-xs font-extrabold text-white">불합격</button>
                    <button disabled={updating} onClick={() => handleStatus("CANCELED")} className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-xs font-extrabold">취소</button>
                  </div>
                )}
              </div>
              {terminal && (
                <p className="mt-5 rounded-[7px] bg-[var(--panel-muted)] p-3 text-xs font-bold text-[var(--text-secondary)]">
                  최종 처리된 지원서는 상태를 다시 변경할 수 없습니다.
                </p>
              )}
              <dl className="mt-7 grid gap-4 border-t border-[var(--border-subtle)] pt-5 text-xs sm:grid-cols-2">
                <div><dt className="font-bold text-[var(--text-secondary)]">이메일</dt><dd className="mt-1">{application.email}</dd></div>
                <div><dt className="font-bold text-[var(--text-secondary)]">연락처</dt><dd className="mt-1">{application.phone || "-"}</dd></div>
                <div><dt className="font-bold text-[var(--text-secondary)]">등록 방식</dt><dd className="mt-1">{application.sourceType === "MANUAL" ? "수동 등록" : "Google Form"}</dd></div>
                <div><dt className="font-bold text-[var(--text-secondary)]">제출일</dt><dd className="mt-1">{new Date(application.submittedAt).toLocaleString("ko-KR")}</dd></div>
              </dl>
            </section>
            <section className="mt-5 rounded-[10px] border border-[var(--border-subtle)] bg-white p-6 sm:p-8">
              <h2 className="text-lg font-extrabold">지원서 답변</h2>
              <div className="mt-5 grid gap-5">
                {application.applicationAnswers.map(answer => (
                  <div key={answer.id} className="border-b border-[var(--border-subtle)] pb-5 last:border-0 last:pb-0">
                    <b className="text-sm">{answer.questionLabel}</b>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{answer.answerValue}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
