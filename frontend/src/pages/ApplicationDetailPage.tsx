import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { changeApplicationStatus, getApplication } from "../api/applications";
import { apiErrorMessage } from "../api/http";
import { AppLayout } from "../components/AppLayout";
import { ApplicationResultEmailModal } from "../components/ApplicationResultEmailModal";
import { ApplicationResultStatus } from "../components/ApplicationResultStatus";
import { ApplicationStatusCorrectionModal } from "../components/ApplicationStatusCorrectionModal";
import type { ApplicationDetail, ApplicationStatus } from "../types/application";

const statusConfig: Record<ApplicationStatus, { label: string; cls: string }> = {
  SUBMITTED: { label: "접수", cls: "bg-blue-50 text-blue-700" },
  REVIEWING: { label: "검토 중", cls: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  ACCEPTED: { label: "합격", cls: "bg-[var(--success-soft)] text-[var(--success)]" },
  REJECTED: { label: "불합격", cls: "bg-[var(--danger-soft)] text-[var(--danger)]" },
  CANCELED: { label: "취소", cls: "bg-[var(--panel-muted)] text-[var(--text-secondary)]" },
};

// 상태 전이 정책의 원본은 docs/product/requirements.md, 강제 주체는 백엔드 Application.changeStatus().
// 이 목록은 확인 대화상자·버튼 노출용 UI 파생값이다.
export function ApplicationDetailPage() {
  const { clubId = "", applicationId = "" } = useParams();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const emailButtonRef = useRef<HTMLButtonElement>(null);
  const correctionButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getApplication(applicationId)
      .then(setApplication)
      .catch(requestError => setError(apiErrorMessage(requestError, "지원서를 불러오지 못했습니다.")));
  }, [applicationId]);

  const handleStatus = async (status: ApplicationStatus, reason?: string) => {
    if (["ACCEPTED", "REJECTED", "CANCELED"].includes(status) && !reason) {
      const confirmed = window.confirm(
        `지원 상태를 '${statusConfig[status].label}'(으)로 변경할까요?`,
      );
      if (!confirmed) return;
    }
    setUpdating(true);
    setError("");
    try {
      setApplication(await changeApplicationStatus(applicationId, status, reason));
      setCorrectionModalOpen(false);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "상태를 변경하지 못했습니다."));
    } finally {
      setUpdating(false);
    }
  };

  const isDecision = application?.status === "ACCEPTED" || application?.status === "REJECTED";
  const canCorrect = isDecision
    && !application.generationMemberId
    && (application.resultEmailStatus === "NOT_SENT" || application.resultEmailStatus === "FAILED");
  const canSendEmail = isDecision
    && (application.resultEmailStatus === "NOT_SENT" || application.resultEmailStatus === "FAILED");

  return (
    <AppLayout clubId={clubId}>
      <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-white px-4 py-4 md:px-8">
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
        <div className="mx-4 mt-6 rounded-xl bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)] md:mx-8">
          {error}
        </div>
      )}
      {!application && !error && (
        <p className="m-4 text-sm text-[var(--text-secondary)] md:m-8">불러오는 중...</p>
      )}

      {application && (
        <div className="flex flex-col gap-5 p-4 md:flex-row md:items-start md:p-8">
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

            {(application.statusHistory?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-6">
                <h2 className="font-extrabold">결과 변경 이력</h2>
                <ul className="mt-4 space-y-3">
                  {(application.statusHistory ?? []).map(history => (
                    <li key={history.id} className="rounded-lg bg-[var(--panel-muted)] p-3 text-xs">
                      <p className="font-bold">{statusConfig[history.previousStatus].label} → {statusConfig[history.newStatus].label}</p>
                      <p className="mt-1 text-[var(--text-secondary)]">{history.reason ?? "사유 없음"} · {history.changedByName} · {new Date(history.changedAt).toLocaleString("ko-KR")}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="w-full md:w-72 md:shrink-0">
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

              {application.status !== "CANCELED" && !isDecision ? (
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
                  <p className="mt-1 text-[10px] text-[var(--text-secondary)]">합격 선택 후 메일 전송이 완료되어야 부원으로 등록됩니다.</p>
                </div>
              ) : isDecision ? (
                <div className="mt-4 space-y-3">
                  <ApplicationResultStatus status={application.status} emailStatus={application.resultEmailStatus} />
                  {canSendEmail && (
                    <button ref={emailButtonRef} type="button" onClick={() => setEmailModalOpen(true)} className="h-10 w-full rounded-lg bg-[var(--navy)] text-xs font-bold text-white">
                      {application.resultEmailStatus === "FAILED" ? "결과 메일 다시 보내기" : "결과 메일 보내기"}
                    </button>
                  )}
                  {canCorrect && (
                    <button ref={correctionButtonRef} type="button" onClick={() => setCorrectionModalOpen(true)} className="h-10 w-full rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)]">
                      {application.status === "ACCEPTED" ? "불합격으로 정정" : "합격으로 정정"}
                    </button>
                  )}
                  {!canCorrect && <p className="rounded-lg bg-[var(--panel-muted)] p-3 text-xs text-[var(--text-secondary)]">{application.generationMemberId ? "기존 방식으로 이미 부원 등록된 결과는 변경할 수 없습니다." : "메일 전송을 시작했거나 완료하여 결과가 확정되었습니다."}</p>}
                  {application.generationMemberStatus && <p className="rounded-lg bg-[var(--success-soft)] p-3 text-xs font-bold text-[var(--success)]">부원 등록 완료 · {application.generationMemberStatus === "REGULAR" ? "회원" : application.generationMemberStatus === "ASSOCIATE" ? "준회원" : application.generationMemberStatus === "INACTIVE" ? "비활동" : "탈퇴"}</p>}
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-[var(--panel-muted)] p-3 text-xs text-[var(--text-secondary)]">취소된 지원서는 상태를 변경할 수 없습니다.</p>
              )}
            </section>
          </div>
        </div>
      )}
      {application && emailModalOpen && isDecision && (
        <ApplicationResultEmailModal
          clubId={clubId}
          generationId={application.generationId}
          generationName={application.generationName}
          decision={application.status === "ACCEPTED" ? "ACCEPTED" : "REJECTED"}
          eligibleCount={1}
          excludedCount={0}
          retryCount={application.resultEmailStatus === "FAILED" ? 1 : 0}
          unknownCount={0}
          applicationIds={[application.id]}
          individualRecipientName={application.name}
          returnFocusRef={emailButtonRef}
          onClose={() => setEmailModalOpen(false)}
          onCompleted={async () => setApplication(await getApplication(applicationId))}
        />
      )}
      {application && correctionModalOpen && isDecision && (
        <ApplicationStatusCorrectionModal
          currentStatus={application.status === "ACCEPTED" ? "ACCEPTED" : "REJECTED"}
          returnFocusRef={correctionButtonRef}
          submitting={updating}
          onClose={() => setCorrectionModalOpen(false)}
          onSubmit={handleStatus}
        />
      )}
    </AppLayout>
  );
}
