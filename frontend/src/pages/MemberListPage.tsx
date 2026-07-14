import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
    <article className="border-t border-[var(--border-subtle)] first:border-t-0">
      <div className="grid gap-4 p-4 transition-colors hover:bg-[var(--panel-muted)] lg:grid-cols-[minmax(180px,1.6fr)_minmax(90px,0.8fr)_90px_80px_minmax(160px,1.2fr)_minmax(180px,1fr)] lg:items-center lg:px-5 lg:py-3.5">
        <div className="min-w-0">
          <span className="block text-sm font-bold text-[var(--text-primary)]">{member.name}</span>
          <span className="mt-0.5 block break-all text-xs text-[var(--text-secondary)]">{member.email}</span>
          <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">학번 {member.studentNumber}</span>
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">학기</span>
          <span className="text-xs text-[var(--text-secondary)]">{member.generationName}</span>
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">가입 경로</span>
          <span className="text-xs text-[var(--text-secondary)]">{sourceLabel[member.joinedSource]}</span>
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">상태</span>
          <StatusBadge status={member.status} />
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">회비 확인</span>
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
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">관리</span>
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
        </div>
      </div>
      {(formOpen || historyOpen) && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--panel-muted)] px-4 py-4 lg:px-5">
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
        </div>
      )}
    </article>
  );
}

type MemberFilterKey = "studentNumber" | "status" | "dues";
type MemberStatusFilter = GenerationMemberStatus | "ALL";
type MemberDuesFilter = GenerationMemberDuesStatus | "ALL";

type FilterHeaderProps = {
  label: string;
  applied: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function FilterHeader({ label, applied, open, onToggle, children }: FilterHeaderProps) {
  return (
    <div className={`relative px-5 py-3 ${applied ? "bg-[var(--panel-muted)]" : "bg-white"}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-extrabold text-[var(--text-secondary)]"
      >
        <span>{label}</span>
        <span aria-hidden="true" className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="absolute left-2 top-[calc(100%-2px)] z-30 min-w-52 rounded-lg border border-[var(--border-subtle)] bg-white p-3 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export function MemberListPage() {
  const { clubId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedGenerationId = searchParams.get("generationId");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [generationsLoading, setGenerationsLoading] = useState(true);
  const [generationId, setGenerationId] = useState("");
  const [members, setMembers] = useState<GenerationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentNumberFilter, setStudentNumberFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("ALL");
  const [duesFilter, setDuesFilter] = useState<MemberDuesFilter>("ALL");
  const [openFilter, setOpenFilter] = useState<MemberFilterKey | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setGenerationsLoading(true);
      setLoading(true);
      setError("");
      setGenerations([]);
      setGenerationId("");
      setMembers([]);
      try {
        const items = await listGenerations(clubId);
        if (cancelled) return;
        setGenerations(items);
        setGenerationsLoading(false);
        if (items.length === 0) setLoading(false);
      } catch (requestError) {
        if (cancelled) return;
        setError(apiErrorMessage(requestError, "학기 목록을 불러오지 못했습니다."));
        setGenerationsLoading(false);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [clubId]);

  useEffect(() => {
    if (generationsLoading) return;

    const selected = generations.find(item => item.id === requestedGenerationId)
      ?? generations.find(item => item.status === "ACTIVE")
      ?? generations[0];
    const nextId = selected?.id ?? "";

    if (!nextId) return;
    if (requestedGenerationId !== nextId) {
      setSearchParams(current => {
        const next = new URLSearchParams(current);
        next.set("generationId", nextId);
        return next;
      }, { replace: true });
      return;
    }

    let cancelled = false;

    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setGenerationId(nextId);
      setLoading(true);
      setError("");
      try {
        const items = await listMembers(clubId, nextId);
        if (!cancelled) setMembers(items);
      } catch (requestError) {
        if (!cancelled) {
          setError(apiErrorMessage(requestError, "부원 목록을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [clubId, generations, generationsLoading, requestedGenerationId, setSearchParams]);

  function selectGeneration(nextId: string) {
    setGenerationId(nextId);
    setStudentNumberFilter("");
    setStatusFilter("ALL");
    setDuesFilter("ALL");
    setOpenFilter(null);
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set("generationId", nextId);
      return next;
    }, { replace: true });
  }

  function handleMemberUpdated(updated: GenerationMember) {
    setMembers(current => current.map(member => member.id === updated.id ? updated : member));
  }

  const normalizedStudentNumber = studentNumberFilter.trim();
  const filteredMembers = members.filter(member => {
    if (normalizedStudentNumber && !member.studentNumber.includes(normalizedStudentNumber)) return false;
    if (statusFilter !== "ALL" && member.status !== statusFilter) return false;
    if (duesFilter !== "ALL" && member.duesStatus !== duesFilter) return false;
    return true;
  });
  const filterApplied = normalizedStudentNumber !== "" || statusFilter !== "ALL" || duesFilter !== "ALL";

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

        {members.length > 0 && (
          <div className="mb-4 grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-white p-4 lg:hidden sm:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-bold">
              학번 필터
              <input className="control" value={studentNumberFilter} onChange={event => setStudentNumberFilter(event.target.value)} placeholder="학번 입력" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold">
              상태 필터
              <select className="control" value={statusFilter} onChange={event => setStatusFilter(event.target.value as MemberStatusFilter)}>
                <option value="ALL">전체 상태</option>
                {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold">
              회비 필터
              <select className="control" value={duesFilter} onChange={event => setDuesFilter(event.target.value as MemberDuesFilter)}>
                <option value="ALL">전체 회비 상태</option>
                {Object.entries(duesStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        )}
        {filterApplied && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-[var(--panel-muted)] px-4 py-3 text-xs text-[var(--text-secondary)]">
            <span>{filteredMembers.length}명 표시 중</span>
            <button type="button" onClick={() => { setStudentNumberFilter(""); setStatusFilter("ALL"); setDuesFilter("ALL"); setOpenFilter(null); }} className="font-bold underline">
              필터 초기화
            </button>
          </div>
        )}
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

        {!loading && !error && members.length > 0 && filteredMembers.length === 0 && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">필터 조건에 맞는 부원이 없습니다.</p>
            <button type="button" onClick={() => { setStudentNumberFilter(""); setStatusFilter("ALL"); setDuesFilter("ALL"); setOpenFilter(null); }} className="mt-3 text-xs font-bold text-[var(--brand)] underline">
              필터 초기화
            </button>
          </div>
        )}

        {!loading && !error && filteredMembers.length > 0 && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white">
            <div className="relative z-20 hidden border-b border-[var(--border-subtle)] lg:grid lg:grid-cols-[minmax(180px,1.6fr)_minmax(90px,0.8fr)_90px_80px_minmax(160px,1.2fr)_minmax(180px,1fr)]">
              <FilterHeader label="이름/이메일/학번" applied={normalizedStudentNumber !== ""} open={openFilter === "studentNumber"} onToggle={() => setOpenFilter(current => current === "studentNumber" ? null : "studentNumber")}>
                <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  학번
                  <input autoFocus aria-label="표 학번 필터" className="control" value={studentNumberFilter} onChange={event => setStudentNumberFilter(event.target.value)} placeholder="학번 입력" />
                </label>
              </FilterHeader>
              <span className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">학기</span>
              <span className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">가입 경로</span>
              <FilterHeader label="상태" applied={statusFilter !== "ALL"} open={openFilter === "status"} onToggle={() => setOpenFilter(current => current === "status" ? null : "status")}>
                <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  상태
                  <select autoFocus aria-label="표 상태 필터" className="control" value={statusFilter} onChange={event => setStatusFilter(event.target.value as MemberStatusFilter)}>
                    <option value="ALL">전체 상태</option>
                    {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </FilterHeader>
              <FilterHeader label="회비 확인" applied={duesFilter !== "ALL"} open={openFilter === "dues"} onToggle={() => setOpenFilter(current => current === "dues" ? null : "dues")}>
                <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  회비 여부
                  <select autoFocus aria-label="표 회비 필터" className="control" value={duesFilter} onChange={event => setDuesFilter(event.target.value as MemberDuesFilter)}>
                    <option value="ALL">전체 회비 상태</option>
                    {Object.entries(duesStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </FilterHeader>
              <span className="px-5 py-3 text-xs font-extrabold text-[var(--text-secondary)]">관리</span>
            </div>
            {filteredMembers.map(member => (
              <MemberRow key={member.id} member={member} onUpdated={handleMemberUpdated} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
