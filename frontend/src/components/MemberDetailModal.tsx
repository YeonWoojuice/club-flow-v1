import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  changeGenerationMemberStatus,
  listGenerationMemberStatusHistory,
} from "../api/members";
import { apiErrorMessage } from "../api/http";
import type {
  GenerationMember,
  GenerationMemberStatus,
  GenerationMemberStatusHistory,
  MemberJoinedSource,
} from "../types/member";

type ModalMode = "INFO" | "STATUS_EDIT" | "HISTORY";

const sourceLabel: Record<MemberJoinedSource, string> = {
  APPLICATION_ACCEPT: "지원 합격",
  MANUAL: "수동 등록",
  RETENTION: "잔류",
};

const statusLabel: Record<GenerationMemberStatus, string> = {
  REGULAR: "회원",
  ASSOCIATE: "준회원",
  INACTIVE: "비활동",
  WITHDRAWN: "탈퇴",
};

const duesStatusLabel = {
  UNKNOWN: "확인 필요",
  UNPAID: "미납",
  PAID: "납부",
  EXEMPT: "면제",
} as const;

const statusActionLabel: Record<GenerationMemberStatus, string> = {
  REGULAR: "회원으로 변경",
  ASSOCIATE: "준회원으로 변경",
  INACTIVE: "비활동으로 변경",
  WITHDRAWN: "탈퇴 처리",
};

function defaultTargetStatus(status: GenerationMemberStatus): GenerationMemberStatus {
  if (status === "REGULAR") return "ASSOCIATE";
  return "REGULAR";
}

function formatChangedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type Props = {
  member: GenerationMember;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onUpdated: (member: GenerationMember) => void;
};

export function MemberDetailModal({ member, returnFocusRef, onClose, onUpdated }: Props) {
  const initialTargetStatus = defaultTargetStatus(member.status);
  const [mode, setMode] = useState<ModalMode>("INFO");
  const [targetStatus, setTargetStatus] = useState<GenerationMemberStatus>(initialTargetStatus);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [withdrawalConfirmOpen, setWithdrawalConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [history, setHistory] = useState<GenerationMemberStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyRequestVersion, setHistoryRequestVersion] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const hasUnsavedStatusChange = mode === "STATUS_EDIT"
    && (reason.trim() !== "" || targetStatus !== initialTargetStatus);

  const requestClose = useCallback(() => {
    if (submitting) return;
    if (hasUnsavedStatusChange) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }, [hasUnsavedStatusChange, onClose, submitting]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const returnFocusElement = returnFocusRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusElement?.focus();
    };
  }, [returnFocusRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]",
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    if (mode !== "HISTORY") return;
    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");
      try {
        const items = await listGenerationMemberStatusHistory(member.id);
        if (!cancelled) setHistory(items);
      } catch (requestError) {
        if (!cancelled) {
          setHistoryError(apiErrorMessage(requestError, "상태 변경 이력을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [historyRequestVersion, member.id, mode]);

  function changeMode(nextMode: ModalMode) {
    if (submitting) return;
    setMode(nextMode);
    setError("");
    setSuccessMessage("");
    setWithdrawalConfirmOpen(false);
    setDiscardConfirmOpen(false);
    if (nextMode === "STATUS_EDIT") {
      setTargetStatus(defaultTargetStatus(member.status));
      setReason("");
    }
  }

  async function saveStatusChange() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const updated = await changeGenerationMemberStatus(member.id, {
        status: targetStatus,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      onUpdated(updated);
      setMode("INFO");
      setReason("");
      setWithdrawalConfirmOpen(false);
      setSuccessMessage(`${updated.name}님의 상태를 ${statusLabel[updated.status]}으로 변경했습니다.`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "부원 상태를 변경하지 못했습니다."));
      setWithdrawalConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (targetStatus === "WITHDRAWN" && !trimmedReason) {
      setError("탈퇴 사유를 입력해 주세요.");
      return;
    }
    if (trimmedReason.length > 500) {
      setError("사유는 500자 이내로 입력해 주세요.");
      return;
    }
    setError("");
    if (targetStatus === "WITHDRAWN") {
      setWithdrawalConfirmOpen(true);
      return;
    }
    void saveStatusChange();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-detail-title"
        className="h-full w-full overflow-y-auto bg-white p-5 shadow-2xl sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="member-detail-title" className="text-lg font-extrabold text-[var(--text-primary)]">
              {member.name} 부원 정보
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{member.generationName} 활동 기록을 확인합니다.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="부원 정보 창 닫기"
            disabled={submitting}
            onClick={requestClose}
            className="rounded-lg px-2 py-1 text-xl text-[var(--text-secondary)] disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2" role="tablist" aria-label="부원 상세 메뉴">
          <ModeButton active={mode === "INFO"} onClick={() => changeMode("INFO")}>기본 정보</ModeButton>
          <ModeButton active={mode === "STATUS_EDIT"} disabled={member.status === "WITHDRAWN"} onClick={() => changeMode("STATUS_EDIT")}>상태 변경</ModeButton>
          <ModeButton active={mode === "HISTORY"} onClick={() => changeMode("HISTORY")}>변경 이력</ModeButton>
        </div>

        {successMessage && (
          <p role="status" className="mt-4 rounded-lg bg-[var(--success-soft)] px-4 py-3 text-xs font-bold text-[var(--success)]">
            {successMessage}
          </p>
        )}

        {mode === "INFO" && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoSection title="기본 정보">
              <InfoRow label="이름" value={member.name} />
              <InfoRow label="학번" value={member.studentNumber} />
              <InfoRow label="전화번호" value={member.phone ?? "-"} />
              <InfoRow label="이메일" value={member.email} breakAll />
              <InfoRow label="학기" value={member.generationName} />
              <InfoRow label="가입 경로" value={sourceLabel[member.joinedSource]} />
            </InfoSection>
            <InfoSection title="운영 상태">
              <InfoRow label="부원 상태" value={statusLabel[member.status]} />
              <InfoRow label="회비" value={duesStatusLabel[member.duesStatus]} />
              <InfoRow label="카카오톡 초대" value={member.kakaoInvited ? "완료" : "미완료"} />
              <InfoRow label="디스코드 초대" value={member.discordInvited ? "완료" : "미완료"} />
            </InfoSection>
          </div>
        )}

        {mode === "STATUS_EDIT" && member.status !== "WITHDRAWN" && (
          <form onSubmit={handleSubmit} className="mt-5 rounded-xl border border-[var(--border-subtle)] p-4 sm:p-5">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">부원 상태 변경</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              현재 상태는 {statusLabel[member.status]}입니다. 탈퇴는 비활동 상태에서만 처리할 수 있습니다.
            </p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                변경할 상태
                <select
                  value={targetStatus}
                  onChange={event => {
                    setTargetStatus(event.target.value as GenerationMemberStatus);
                    setError("");
                    setWithdrawalConfirmOpen(false);
                  }}
                  disabled={submitting}
                  className="control"
                >
                  {member.status === "REGULAR" && <option value="ASSOCIATE">준회원</option>}
                  {member.status === "REGULAR" && <option value="INACTIVE">비활동</option>}
                  {member.status === "ASSOCIATE" && <option value="REGULAR">회원</option>}
                  {member.status === "ASSOCIATE" && <option value="INACTIVE">비활동</option>}
                  {member.status === "INACTIVE" && <option value="REGULAR">회원</option>}
                  {member.status === "INACTIVE" && <option value="ASSOCIATE">준회원</option>}
                  {member.status === "INACTIVE" && <option value="WITHDRAWN">탈퇴</option>}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                사유 {targetStatus === "WITHDRAWN" ? "(필수)" : "(선택)"}
                <textarea
                  value={reason}
                  onChange={event => {
                    setReason(event.target.value);
                    setError("");
                  }}
                  maxLength={500}
                  rows={4}
                  disabled={submitting}
                  aria-required={targetStatus === "WITHDRAWN"}
                  className="resize-y rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--text-primary)]"
                  placeholder={targetStatus === "WITHDRAWN" ? "탈퇴 사유를 입력해 주세요." : "필요한 경우 사유를 입력해 주세요."}
                />
              </label>
              <p className="text-right text-[10px] text-[var(--text-secondary)]">{reason.length}/500자</p>
              {error && (
                <p role="alert" className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-bold text-[var(--danger)]">
                  {error}
                </p>
              )}
              {withdrawalConfirmOpen && (
                <div role="alertdialog" aria-label="탈퇴 최종 확인" className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4">
                  <p className="text-sm font-extrabold text-[var(--danger)]">정말 탈퇴 처리할까요?</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">처리 후에는 회원·준회원·비활동 상태로 되돌릴 수 없습니다.</p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" disabled={submitting} onClick={() => setWithdrawalConfirmOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">계속 수정</button>
                    <button type="button" disabled={submitting} onClick={() => void saveStatusChange()} className="rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">
                      {submitting ? "처리 중..." : "탈퇴 확정"}
                    </button>
                  </div>
                </div>
              )}
              {!withdrawalConfirmOpen && (
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={submitting} onClick={() => changeMode("INFO")} className="rounded-lg px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)]">취소</button>
                  <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--navy)] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">
                    {submitting ? "변경 중..." : statusActionLabel[targetStatus]}
                  </button>
                </div>
              )}
            </div>
          </form>
        )}

        {mode === "HISTORY" && (
          <section className="mt-5 rounded-xl border border-[var(--border-subtle)] p-4 sm:p-5" aria-label={`${member.name} 상태 변경 이력`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">상태 변경 이력</h3>
              {historyError && (
                <button type="button" onClick={() => setHistoryRequestVersion(version => version + 1)} className="text-xs font-bold text-[var(--navy)] underline">다시 시도</button>
              )}
            </div>
            {historyLoading && <p className="mt-4 text-xs text-[var(--text-secondary)]">이력을 불러오는 중...</p>}
            {!historyLoading && historyError && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-bold text-[var(--danger)]">{historyError}</p>}
            {!historyLoading && !historyError && history.length === 0 && <p className="mt-4 text-xs text-[var(--text-secondary)]">아직 상태 변경 이력이 없습니다.</p>}
            {!historyLoading && !historyError && history.length > 0 && (
              <ul className="mt-4 grid gap-2">
                {history.map(item => (
                  <li key={item.id} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                    <p className="text-xs font-bold text-[var(--text-primary)]">{statusLabel[item.previousStatus]} → {statusLabel[item.newStatus]}</p>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{item.changedByName} · {formatChangedAt(item.changedAt)}</p>
                    {item.reason && <p className="mt-1 text-xs text-[var(--text-secondary)]">사유: {item.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {discardConfirmOpen && (
          <div role="alertdialog" aria-label="작성 중인 변경 취소 확인" className="mt-5 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-4">
            <p className="text-sm font-extrabold text-[var(--text-primary)]">작성 중인 내용을 버릴까요?</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">입력한 상태와 사유는 저장되지 않습니다.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setDiscardConfirmOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">계속 작성</button>
              <button type="button" onClick={onClose} className="rounded-lg bg-[var(--navy)] px-3 py-2 text-xs font-extrabold text-white">버리고 닫기</button>
            </div>
          </div>
        )}

        {mode === "INFO" && (
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={requestClose} className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)]">닫기</button>
          </div>
        )}
      </section>
    </div>
  );
}

function ModeButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-2.5 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-[var(--navy)] text-white" : "bg-[var(--panel-muted)] text-[var(--text-secondary)]"}`}
    >
      {children}
    </button>
  );
}

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border-subtle)] p-4">
      <h3 className="text-sm font-extrabold text-[var(--text-primary)]">{title}</h3>
      <dl className="mt-3 grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-xs">{children}</dl>
    </section>
  );
}

function InfoRow({ label, value, breakAll = false }: { label: string; value: string; breakAll?: boolean }) {
  return (
    <>
      <dt className="font-bold text-[var(--text-secondary)]">{label}</dt>
      <dd className={breakAll ? "min-w-0 break-all" : "min-w-0"}>{value}</dd>
    </>
  );
}
