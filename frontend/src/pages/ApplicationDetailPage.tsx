import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { changeApplicationStatus, getApplication } from "../api/applications";
import { ApiError } from "../api/http";
import { AppLayout } from "../components/AppLayout";
import type { ApplicationDetail, ApplicationStatus } from "../types/application";

const statusConfig: Record<ApplicationStatus, { label: string; cls: string }> = {
  SUBMITTED: { label: "접수", cls: "bg-blue-50 text-blue-700" },
  REVIEWING: { label: "검토 중", cls: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  ACCEPTED: { label: "합격", cls: "bg-[var(--success-soft)] text-[var(--success)]" },
  REJECTED: { label: "불합격", cls: "bg-[var(--danger-soft)] text-[var(--danger)]" },
  CANCELED: { label: "취소", cls: "bg-[var(--panel-muted)] text-[var(--text-secondary)]" },
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
      setError(
        requestError instanceof ApiError ? requestError.message : "상태를 변경하지 못했습니다.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const isTerminal = application
    ? (["ACCEPTED", "REJECTED", "CANCELED"] as ApplicationStatus[]).includes(application.status)
    : false;

  return (
    <AppLayout clubId={clubId}>
      <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-white px-8 py-4">
        <Link
          to={`/clubs/${clubId}/applications`}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--panel-muted)]"
        >
          ← 목록
        </Link>
        {application && (
          <>
            <h1 className="text-base font-extrabold">{application.name}</h1>
            <span
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${statusConfig[application.status].cls}`}
            >
              {statusConfig[application.status].label}
            </span>
          </>
        )}
      </header>

      {error && (
        <div className="mx-8 mt-6 rounded-xl bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      )}
      {!application && !error && (
        <p className="m-8 text-sm text-[var(--text-secondary)]">불러오는 중...</p>
      )}

      {application && (
        <div className="flex items-start gap-5 p-8">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-6">
              <h2 className="font-extrabold">기본 정보</h2>
              <div className="mt-4 h-px bg-[var(--border-subtle)]" />
              <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
                {(
                  [
                    ["이름", application.name],
                    ["학번", application.studentNumber],
                    ["이메일", application.email],
                    ["연락처", application.phone ?? "-"],
                    ["등록 방식", application.sourceType === "MANUAL" ? "수동 등록" : "Google Form"],
                    ["제출일", new Date(application.submittedAt).toLocaleString("ko-KR")],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-bold text-[var(--text-secondary)]">{label}</dt>
                    <dd className="mt-1">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-6">
              <h2 className="font-extrabold">지원서 답변</h2>
              <div className="mt-5 space-y-5">
                {application.applicationAnswers.map(answer => (
                  <div
                    key={answer.id}
                    className="border-b border-[var(--border-subtle)] pb-5 last:border-0 last:pb-0"
                  >
                    <p className="text-xs font-bold">{answer.questionLabel}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                      {answer.answerValue}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="w-72 shrink-0">
            <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-6">
              <h2 className="font-extrabold">상태 변경</h2>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">현재 상태</span>
                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-bold ${statusConfig[application.status].cls}`}
                >
                  {statusConfig[application.status].label}
                </span>
              </div>

              {!isTerminal ? (
                <div className="mt-4 flex flex-col gap-2">
                  {application.status === "SUBMITTED" && (
                    <button
                      disabled={updating}
                      onClick={() => handleStatus("REVIEWING")}
                      className="h-10 rounded-lg border border-[var(--warning)] bg-[var(--warning-soft)] text-xs font-bold text-[var(--warning)] disabled:opacity-40"
                    >
                      검토 중으로 변경
                    </button>
                  )}
                  <button
                    disabled={updating}
                    onClick={() => handleStatus("ACCEPTED")}
                    className="h-10 rounded-lg bg-[var(--success)] text-xs font-bold text-white disabled:opacity-40"
                  >
                    합격 처리
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => handleStatus("REJECTED")}
                    className="h-10 rounded-lg border border-[var(--danger)] text-xs font-bold text-[var(--danger)] disabled:opacity-40"
                  >
                    불합격 처리
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => handleStatus("CANCELED")}
                    className="h-10 rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40"
                  >
                    취소
                  </button>
                  <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                    합격 처리 시 부원 목록에 자동 추가됩니다.
                  </p>
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-[var(--panel-muted)] p-3 text-xs text-[var(--text-secondary)]">
                  최종 처리된 지원서는 상태를 변경할 수 없습니다.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
