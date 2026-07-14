import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { changeApplicationStatus, listApplications } from "../api/applications";
import { listGenerations } from "../api/generations";
import { apiErrorMessage } from "../api/http";
import { AppLayout } from "../components/AppLayout";
import type {
  ApplicationSourceType,
  ApplicationStatus,
  ApplicationSummary,
} from "../types/application";
import type { Generation } from "../types/generation";

type SourceFilter = ApplicationSourceType | "ALL";
type StatusFilter = ApplicationStatus | "ALL";

const sourceTabs: { value: SourceFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "MANUAL", label: "수동 등록" },
  { value: "GOOGLE_FORM", label: "Google Form" },
];

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "SUBMITTED", label: "접수" },
  { value: "REVIEWING", label: "검토 중" },
  { value: "ACCEPTED", label: "합격" },
  { value: "REJECTED", label: "불합격" },
  { value: "CANCELED", label: "취소" },
];

const statusConfig: Record<ApplicationStatus, { label: string; cls: string }> = {
  SUBMITTED: { label: "접수", cls: "bg-blue-50 text-blue-700" },
  REVIEWING: { label: "검토 중", cls: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  ACCEPTED: { label: "합격", cls: "bg-[var(--success-soft)] text-[var(--success)]" },
  REJECTED: { label: "불합격", cls: "bg-[var(--danger-soft)] text-[var(--danger)]" },
  CANCELED: { label: "취소", cls: "bg-[var(--panel-muted)] text-[var(--text-secondary)]" },
};

export function ApplicationListPage() {
  const { clubId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedGenerationId = searchParams.get("generationId");
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generationsLoading, setGenerationsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeGenerationId, setActiveGenerationId] = useState("");
  const [activeGenerationName, setActiveGenerationName] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkAccepting, setBulkAccepting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkSetupError, setBulkSetupError] = useState("");

  useEffect(() => {
    listApplications(clubId)
      .then(setApplications)
      .catch(requestError => setError(apiErrorMessage(requestError, "지원자 목록을 불러오지 못했습니다.")))
      .finally(() => setLoading(false));

    listGenerations(clubId)
      .then(generations => {
        setGenerations(generations);
        const activeGeneration = generations.find(generation => generation.status === "ACTIVE");
        setActiveGenerationId(activeGeneration?.id ?? "");
        setActiveGenerationName(activeGeneration?.name ?? "");
      })
      .catch(requestError => setBulkSetupError(apiErrorMessage(requestError, "활성 학기를 확인하지 못해 일괄 합격 기능을 사용할 수 없습니다.")))
      .finally(() => setGenerationsLoading(false));
  }, [clubId]);

  const selectedGeneration = generations.find(generation => generation.id === requestedGenerationId)
    ?? generations.find(generation => generation.status === "ACTIVE")
    ?? generations[0];
  const generationId = selectedGeneration?.id ?? "";

  const bulkAcceptTargets = applications.filter(application =>
    generationId === activeGenerationId
    && application.generationId === generationId
    && (application.status === "SUBMITTED" || application.status === "REVIEWING"),
  );

  const selectGeneration = (nextGenerationId: string) => {
    setSourceFilter("ALL");
    setStatusFilter("ALL");
    setBulkConfirmOpen(false);
    setBulkMessage("");
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set("generationId", nextGenerationId);
      return next;
    }, { replace: true });
  };

  const acceptAllExceptRejected = async () => {
    if (bulkAccepting || bulkAcceptTargets.length === 0) return;
    setBulkAccepting(true);
    setError("");
    setBulkMessage("");

    const acceptedIds: string[] = [];
    let firstError = "";
    for (const application of bulkAcceptTargets) {
      try {
        await changeApplicationStatus(application.id, "ACCEPTED");
        acceptedIds.push(application.id);
      } catch (requestError) {
        if (!firstError) firstError = apiErrorMessage(requestError, "일부 지원자를 합격 처리하지 못했습니다.");
      }
    }

    if (acceptedIds.length > 0) {
      const acceptedIdSet = new Set(acceptedIds);
      setApplications(current => current.map(application =>
        acceptedIdSet.has(application.id) ? { ...application, status: "ACCEPTED" } : application,
      ));
    }
    setBulkConfirmOpen(false);
    setBulkAccepting(false);

    if (firstError) {
      setError(`${acceptedIds.length}명은 합격 처리했지만, ${bulkAcceptTargets.length - acceptedIds.length}명은 처리하지 못했습니다. ${firstError}`);
      return;
    }
    setBulkMessage(`${activeGenerationName} 지원자 ${acceptedIds.length}명을 합격 처리했습니다.`);
  };

  const filtered = applications.filter(app => {
    if (generationId && app.generationId !== generationId) return false;
    if (sourceFilter !== "ALL" && app.sourceType !== sourceFilter) return false;
    if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
    return true;
  });
  const pageLoading = loading || generationsLoading;

  return (
    <AppLayout clubId={clubId}>
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] bg-white px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div>
          <h1 className="text-xl font-extrabold">지원자 관리</h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">수동 등록 및 Google Form 지원자를 관리합니다.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pageLoading || bulkAccepting || bulkAcceptTargets.length === 0}
            onClick={() => { setBulkMessage(""); setBulkConfirmOpen(true); }}
            className="rounded-lg border border-[var(--success)] px-4 py-2.5 text-center text-xs font-extrabold text-[var(--success)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            불합격 제외 전원 합격처리
          </button>
          <Link
            to={`/clubs/${clubId}/applications/import`}
            className="rounded-lg border border-[var(--navy)] px-4 py-2.5 text-center text-xs font-extrabold text-[var(--navy)]"
          >
            Google Sheet 가져오기
          </Link>
          <Link
            to={`/clubs/${clubId}/applications/new`}
            className="rounded-lg bg-[var(--navy)] px-4 py-2.5 text-center text-xs font-extrabold text-white"
          >
            + 수동 등록
          </Link>
        </div>
      </header>

      <main className="p-4 md:p-8">
        {bulkSetupError && (
          <p role="status" className="mb-4 rounded-lg bg-[var(--warning-soft)] px-4 py-3 text-xs font-bold text-[var(--warning)]">
            {bulkSetupError}
          </p>
        )}
        <div className="mb-5 rounded-xl border border-[var(--border-subtle)] bg-white p-4">
          <label className="grid max-w-sm gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            조회할 학기
            <select
              className="control"
              value={generationId}
              onChange={event => selectGeneration(event.target.value)}
              disabled={generations.length === 0}
            >
              {generations.length === 0 && <option value="">등록된 학기가 없습니다</option>}
              {generations.map(generation => (
                <option key={generation.id} value={generation.id}>
                  {generation.name} {generation.status === "ACTIVE" ? "(활성)" : "(종료)"}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">선택한 학기의 지원자만 표시합니다.</p>
        </div>
        <div className="mb-4 flex flex-col gap-2 md:mb-6 md:flex-row md:flex-wrap md:items-center md:gap-3">
          <div className="overflow-x-auto">
            <div className="flex w-max overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white">
              {sourceTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSourceFilter(tab.value)}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${
                    sourceFilter === tab.value
                      ? "bg-[var(--navy)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--panel-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="flex w-max overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white">
              {statusTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${
                    statusFilter === tab.value
                      ? "bg-[var(--navy)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--panel-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {(sourceFilter !== "ALL" || statusFilter !== "ALL") && (
            <span className="text-xs text-[var(--text-secondary)]">{filtered.length}건 표시</span>
          )}
        </div>

        {pageLoading && <p className="text-sm text-[var(--text-secondary)]">불러오는 중...</p>}
        {error && <p role="alert" className="text-sm font-bold text-[var(--danger)]">{error}</p>}

        {!pageLoading && !error && filtered.length === 0 && (
          <p className="rounded-xl border border-[var(--border-subtle)] bg-white p-8 text-center text-sm text-[var(--text-secondary)]">
            {applications.length === 0
              ? "등록된 지원자가 없습니다."
              : "선택한 학기 또는 필터 조건에 맞는 지원자가 없습니다."}
          </p>
        )}

        {!pageLoading && !error && filtered.length > 0 && (
          <>
            {/* Mobile: card list */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map(app => (
                <Link
                  key={app.id}
                  to={`/clubs/${clubId}/applications/${app.id}`}
                  className="block rounded-xl border border-[var(--border-subtle)] bg-white p-4 transition hover:border-[var(--navy)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <b className="block text-sm">{app.name}</b>
                      <span className="mt-0.5 block truncate text-xs text-[var(--text-secondary)]">{app.email}</span>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${statusConfig[app.status].cls}`}>
                      {statusConfig[app.status].label}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span>{app.generationName}</span>
                    <span>·</span>
                    <time>{new Date(app.submittedAt).toLocaleDateString("ko-KR")}</time>
                    <span>·</span>
                    {app.sourceType === "MANUAL" ? (
                      <span className="rounded-md bg-[var(--panel-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">수동 등록</span>
                    ) : (
                      <span className="rounded-md bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">Google Form</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: grid table */}
            <div className="hidden overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white md:block">
              <div className="grid grid-cols-[1fr_140px_130px_110px_100px] border-b border-[var(--border-subtle)] px-5 py-3">
                <span className="text-xs font-bold text-[var(--text-secondary)]">이름 / 이메일</span>
                <span className="text-xs font-bold text-[var(--text-secondary)]">학기</span>
                <span className="text-xs font-bold text-[var(--text-secondary)]">제출일</span>
                <span className="text-xs font-bold text-[var(--text-secondary)]">출처</span>
                <span className="text-xs font-bold text-[var(--text-secondary)]">상태</span>
              </div>
              {filtered.map(app => (
                <Link
                  key={app.id}
                  to={`/clubs/${clubId}/applications/${app.id}`}
                  className="grid grid-cols-[1fr_140px_130px_110px_100px] items-center border-b border-[var(--border-subtle)] px-5 py-4 last:border-0 transition-colors hover:bg-[var(--panel-muted)]"
                >
                  <span>
                    <b className="block text-sm">{app.name}</b>
                    <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{app.email}</span>
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">{app.generationName}</span>
                  <time className="text-xs text-[var(--text-secondary)]">
                    {new Date(app.submittedAt).toLocaleDateString("ko-KR")}
                  </time>
                  <span>
                    {app.sourceType === "MANUAL" ? (
                      <span className="inline-block rounded-md bg-[var(--panel-muted)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
                        수동 등록
                      </span>
                    ) : (
                      <span className="inline-block rounded-md bg-[var(--success-soft)] px-2 py-1 text-[10px] font-bold text-[var(--success)]">
                        Google Form
                      </span>
                    )}
                  </span>
                  <span>
                    <span className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold ${statusConfig[app.status].cls}`}>
                      {statusConfig[app.status].label}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {bulkConfirmOpen && (
        <section
          role="alertdialog"
          aria-labelledby="bulk-accept-title"
          aria-describedby="bulk-accept-description"
          className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-xl sm:left-auto sm:right-5 sm:w-full sm:max-w-md"
        >
          <h2 id="bulk-accept-title" className="text-sm font-extrabold text-[var(--text-primary)]">지원자 일괄 합격 처리</h2>
          <p id="bulk-accept-description" className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            현재까지 불합격 처리 인원 제외 전원 합격처리됩니다. 진행하시겠습니까?
          </p>
          <p className="mt-2 text-xs font-bold text-[var(--text-primary)]">
            대상: {activeGenerationName || "활성 학기"} · {bulkAcceptTargets.length}명
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" disabled={bulkAccepting} onClick={() => setBulkConfirmOpen(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40">
              취소
            </button>
            <button type="button" disabled={bulkAccepting} onClick={() => void acceptAllExceptRejected()} className="rounded-lg bg-[var(--success)] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40">
              {bulkAccepting ? "합격 처리 중..." : "전원 합격 처리"}
            </button>
          </div>
        </section>
      )}
      {bulkMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl bg-[var(--success)] px-4 py-3 text-xs font-bold text-white shadow-lg">
          {bulkMessage}
        </div>
      )}
    </AppLayout>
  );
}
