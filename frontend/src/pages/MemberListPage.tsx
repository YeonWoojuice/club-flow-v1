import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  changeGenerationMemberDuesStatus,
  changeGenerationMemberStatus,
  listGenerationMemberStatusHistory,
  listMembers,
} from "../api/members";
import { listGenerations } from "../api/generations";
import { apiErrorMessage } from "../api/http";
import { AppLayout } from "../components/AppLayout";
import type {
  GenerationMember,
  GenerationMemberDuesStatus,
  GenerationMemberStatus,
  GenerationMemberStatusHistory,
  MemberJoinedSource,
} from "../types/member";
import type { Generation } from "../types/generation";

const sourceLabel: Record<MemberJoinedSource, string> = {
  APPLICATION_ACCEPT: "지원 합격",
  MANUAL: "수동 등록",
  RETENTION: "잔류",
};

const statusLabel: Record<GenerationMemberStatus, string> = {
  ACTIVE: "활동 중",
  INACTIVE: "비활동",
  WITHDRAWN: "탈퇴",
};

const statusActionLabel: Record<GenerationMemberStatus, string> = {
  ACTIVE: "활동 중으로 변경",
  INACTIVE: "비활동으로 변경",
  WITHDRAWN: "탈퇴 처리",
};

const duesStatusLabel: Record<GenerationMemberDuesStatus, string> = {
  UNKNOWN: "확인 필요",
  UNPAID: "미납",
  PAID: "납부",
  EXEMPT: "면제",
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

function formatChangedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type MemberRowProps = {
  member: GenerationMember;
  onUpdated: (member: GenerationMember) => void;
};

function MemberRow({ member, onUpdated }: MemberRowProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<GenerationMemberStatus>(
    member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<GenerationMemberStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [duesSubmitting, setDuesSubmitting] = useState(false);
  const [duesError, setDuesError] = useState("");

  const formId = `member-status-form-${member.id}`;
  const historyId = `member-status-history-${member.id}`;

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      setHistory(await listGenerationMemberStatusHistory(member.id));
    } catch (requestError) {
      setHistoryError(apiErrorMessage(requestError, "상태 변경 이력을 불러오지 못했습니다."));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function toggleHistory() {
    const willOpen = !historyOpen;
    setHistoryOpen(willOpen);
    if (willOpen && history.length === 0) await loadHistory();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (targetStatus === "WITHDRAWN" && !trimmedReason) {
      setFormError("탈퇴 사유를 입력해 주세요.");
      return;
    }
    if (trimmedReason.length > 500) {
      setFormError("사유는 500자 이내로 입력해 주세요.");
      return;
    }
    if (targetStatus === "WITHDRAWN" && !window.confirm("탈퇴 처리 후에는 상태를 되돌릴 수 없습니다. 계속할까요?")) {
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const updated = await changeGenerationMemberStatus(member.id, {
        status: targetStatus,
        ...(trimmedReason ? { reason: trimmedReason } : {}),
      });
      onUpdated(updated);
      setFormOpen(false);
      setReason("");
      if (historyOpen) await loadHistory();
    } catch (requestError) {
      setFormError(apiErrorMessage(requestError, "부원 상태를 변경하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  function toggleForm() {
    setFormError("");
    setReason("");
    setTargetStatus(member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    setFormOpen(open => !open);
  }

  async function handleDuesStatusChange(duesStatus: GenerationMemberDuesStatus) {
    setDuesSubmitting(true);
    setDuesError("");
    try {
      onUpdated(await changeGenerationMemberDuesStatus(member.id, duesStatus));
    } catch (requestError) {
      setDuesError(apiErrorMessage(requestError, "회비 상태를 변경하지 못했습니다."));
    } finally {
      setDuesSubmitting(false);
    }
  }

  return (
    <>
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
        <td className="px-5 py-3.5">
          <label className="grid min-w-24 gap-1 text-[10px] font-bold text-[var(--text-secondary)]">
            <span className="sr-only">{member.name} 회비 상태</span>
            <select
              aria-label={`${member.name} 회비 상태`}
              value={member.duesStatus}
              disabled={duesSubmitting}
              onChange={event => void handleDuesStatusChange(event.target.value as GenerationMemberDuesStatus)}
              className="rounded-lg border border-[var(--border-subtle)] bg-white px-2 py-1.5 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"
            >
              {Object.entries(duesStatusLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {member.duesStatusUpdatedByName && member.duesStatusUpdatedAt && (
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              {member.duesStatusUpdatedByName} · {formatChangedAt(member.duesStatusUpdatedAt)}
            </p>
          )}
          {duesError && <p role="alert" className="mt-1 text-[10px] font-bold text-[var(--danger)]">{duesError}</p>}
        </td>
        <td className="px-5 py-3.5">
          <div className="flex flex-wrap gap-2">
            {member.status !== "WITHDRAWN" && (
              <button
                type="button"
                onClick={toggleForm}
                aria-expanded={formOpen}
                aria-controls={formId}
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
              >
                {formOpen ? "변경 닫기" : "상태 변경"}
              </button>
            )}
            <button
              type="button"
              onClick={toggleHistory}
              aria-expanded={historyOpen}
              aria-controls={historyId}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--panel-muted)]"
            >
              {historyOpen ? "이력 닫기" : "변경 이력"}
            </button>
          </div>
        </td>
      </tr>
      {(formOpen || historyOpen) && (
        <tr className="border-t border-[var(--border-subtle)] bg-[var(--panel-muted)]">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {formOpen && member.status !== "WITHDRAWN" && (
                <form id={formId} onSubmit={handleSubmit} className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)]">{member.name} 상태 변경</h3>
                  <div className="mt-3 grid gap-3">
                    <label className="grid gap-1 text-xs font-bold text-[var(--text-secondary)]">
                      변경할 상태
                      <select
                        value={targetStatus}
                        onChange={event => {
                          setTargetStatus(event.target.value as GenerationMemberStatus);
                          setFormError("");
                        }}
                        disabled={submitting}
                        className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--text-primary)]"
                      >
                        {member.status === "ACTIVE" && <option value="INACTIVE">비활동</option>}
                        {member.status === "INACTIVE" && <option value="ACTIVE">활동 중</option>}
                        <option value="WITHDRAWN">탈퇴</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-[var(--text-secondary)]">
                      사유 {targetStatus === "WITHDRAWN" ? "(필수)" : "(선택)"}
                      <textarea
                        value={reason}
                        onChange={event => setReason(event.target.value)}
                        maxLength={500}
                        rows={3}
                        disabled={submitting}
                        aria-required={targetStatus === "WITHDRAWN"}
                        className="resize-y rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--text-primary)]"
                        placeholder={targetStatus === "WITHDRAWN" ? "탈퇴 사유를 입력해 주세요." : "필요한 경우 사유를 입력해 주세요."}
                      />
                    </label>
                    <p className="text-right text-[10px] text-[var(--text-secondary)]">{reason.length}/500자</p>
                    {formError && (
                      <p role="alert" className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-bold text-[var(--danger)]">
                        {formError}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={toggleForm}
                        disabled={submitting}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-50"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? "변경 중..." : statusActionLabel[targetStatus]}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {historyOpen && (
                <section id={historyId} aria-label={`${member.name} 상태 변경 이력`} className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-extrabold text-[var(--text-primary)]">상태 변경 이력</h3>
                    {historyError && (
                      <button type="button" onClick={loadHistory} className="text-xs font-bold text-[var(--brand)]">
                        다시 시도
                      </button>
                    )}
                  </div>
                  {historyLoading && <p className="mt-3 text-xs text-[var(--text-secondary)]">이력을 불러오는 중...</p>}
                  {!historyLoading && historyError && (
                    <p role="alert" className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-bold text-[var(--danger)]">
                      {historyError}
                    </p>
                  )}
                  {!historyLoading && !historyError && history.length === 0 && (
                    <p className="mt-3 text-xs text-[var(--text-secondary)]">아직 상태 변경 이력이 없습니다.</p>
                  )}
                  {!historyLoading && !historyError && history.length > 0 && (
                    <ul className="mt-3 grid gap-2">
                      {history.map(item => (
                        <li key={item.id} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                          <p className="text-xs font-bold text-[var(--text-primary)]">
                            {statusLabel[item.previousStatus]} → {statusLabel[item.newStatus]}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                            {item.changedByName} · {formatChangedAt(item.changedAt)}
                          </p>
                          {item.reason && <p className="mt-1 text-xs text-[var(--text-secondary)]">사유: {item.reason}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function MemberListPage() {
  const { clubId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requestedGenerationId] = useState(() => searchParams.get("generationId"));
  const initializedClubId = useRef<string | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [generationId, setGenerationId] = useState("");
  const [members, setMembers] = useState<GenerationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initializedClubId.current === clubId) return;
    initializedClubId.current = clubId;
    setLoading(true);
    setError("");
    listGenerations(clubId)
      .then(items => {
        setGenerations(items);
        const selected = items.find(item => item.id === requestedGenerationId)
          ?? items.find(item => item.status === "ACTIVE")
          ?? items[0];
        const nextId = selected?.id ?? "";
        setGenerationId(nextId);
        if (nextId && requestedGenerationId !== nextId) {
          setSearchParams(current => {
            const next = new URLSearchParams(current);
            next.set("generationId", nextId);
            return next;
          }, { replace: true });
        }
        if (!nextId) {
          setMembers([]);
          setLoading(false);
          return;
        }
        listMembers(clubId, nextId)
          .then(setMembers)
          .catch(requestError => setError(apiErrorMessage(requestError, "부원 목록을 불러오지 못했습니다.")))
          .finally(() => setLoading(false));
      })
      .catch(requestError => {
        initializedClubId.current = null;
        setError(apiErrorMessage(requestError, "학기 목록을 불러오지 못했습니다."));
        setLoading(false);
      });
  }, [clubId, requestedGenerationId, setSearchParams]);

  function selectGeneration(nextId: string) {
    setGenerationId(nextId);
    setLoading(true);
    setError("");
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set("generationId", nextId);
      return next;
    }, { replace: true });
    listMembers(clubId, nextId)
      .then(setMembers)
      .catch(requestError => setError(apiErrorMessage(requestError, "부원 목록을 불러오지 못했습니다.")))
      .finally(() => setLoading(false));
  }

  function handleMemberUpdated(updated: GenerationMember) {
    setMembers(current => current.map(member => member.id === updated.id ? updated : member));
  }

  return (
    <AppLayout clubId={clubId}>
      <div className="border-b border-[var(--border-subtle)] bg-white px-4 py-5 md:px-8">
        <h1 className="text-xl font-extrabold text-[var(--text-primary)]">부원 관리</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">학기별 부원 등록 기록을 확인합니다.</p>
      </div>

      <div className="px-4 py-6 md:px-8">
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid max-w-sm flex-1 gap-1.5 text-xs font-bold text-[var(--text-primary)]">
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
          <p className="text-xs text-[var(--text-secondary)]">선택한 학기의 부원과 회비 확인 상태만 표시합니다.</p>
        </div>
        {loading && <p className="text-sm text-[var(--text-secondary)]">불러오는 중...</p>}

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
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-white">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="bg-[var(--panel-muted)]">
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">이름/이메일</th>
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">학기</th>
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">가입 경로</th>
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">상태</th>
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">회비 확인</th>
                  <th className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">관리</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <MemberRow key={member.id} member={member} onUpdated={handleMemberUpdated} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
