import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  previewApplicationResultEmails,
  sendApplicationResultEmails,
} from "../api/applicationResultEmails";
import { apiErrorMessage } from "../api/http";
import type {
  ApplicationResultEmailDecision,
  ApplicationResultEmailPreview,
  ApplicationResultEmailSendResult,
} from "../types/applicationResultEmail";

const templateVariables = ["{{memberName}}", "{{clubName}}", "{{discordName}}", "{{kakaoLink}}"] as const;

function createDefaultTemplates(
  decision: ApplicationResultEmailDecision,
  generationName: string,
) {
  if (decision === "ACCEPTED") {
    return {
      subject: `[{{clubName}}] ${generationName} 합격 안내`,
      body: `안녕하세요, {{memberName}}님.\n\n{{clubName}} ${generationName} 지원 결과 합격하셨습니다.\n함께하게 되어 기쁩니다. 이후 활동 안내를 확인해 주세요.`,
    };
  }
  return {
    subject: `[{{clubName}}] ${generationName} 지원 결과 안내`,
    body: `안녕하세요, {{memberName}}님.\n\n{{clubName}} ${generationName} 지원 결과 아쉽게도 이번에는 함께하지 못하게 되었습니다.\n소중한 시간을 내어 지원해 주셔서 감사합니다.`,
  };
}

type Props = {
  clubId: string;
  generationId: string;
  generationName: string;
  decision: ApplicationResultEmailDecision;
  eligibleCount: number;
  excludedCount: number;
  retryCount: number;
  unknownCount: number;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
};

export function ApplicationResultEmailModal({
  clubId,
  generationId,
  generationName,
  decision,
  eligibleCount,
  excludedCount,
  retryCount,
  unknownCount,
  returnFocusRef,
  onClose,
  onCompleted,
}: Props) {
  const defaults = createDefaultTemplates(decision, generationName);
  const [subjectTemplate, setSubjectTemplate] = useState(defaults.subject);
  const [bodyTemplate, setBodyTemplate] = useState(defaults.body);
  const [kakaoLink, setKakaoLink] = useState("");
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const [preview, setPreview] = useState<ApplicationResultEmailPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendResult, setSendResult] = useState<ApplicationResultEmailSendResult | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const initialPreviewRequested = useRef(false);
  const sendingRef = useRef(sending);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const request = useCallback(() => ({
    generationId,
    decision,
    subjectTemplate,
    bodyTemplate,
    ...(kakaoLink.trim() ? { kakaoLink: kakaoLink.trim() } : {}),
  }), [bodyTemplate, decision, generationId, kakaoLink, subjectTemplate]);

  const loadPreview = useCallback(async () => {
    if (!subjectTemplate.trim() || !bodyTemplate.trim()) {
      setError("메일 제목과 본문을 모두 입력해 주세요.");
      return;
    }
    setPreviewing(true);
    setError("");
    setSendResult(null);
    try {
      setPreview(await previewApplicationResultEmails(clubId, request()));
    } catch (requestError) {
      setPreview(null);
      setError(apiErrorMessage(requestError, "메일 미리보기를 불러오지 못했습니다."));
    } finally {
      setPreviewing(false);
    }
  }, [bodyTemplate, clubId, request, subjectTemplate]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const returnFocusElement = returnFocusRef.current;
    document.body.style.overflow = "hidden";
    subjectRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sendingRef.current) onCloseRef.current();
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
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusElement?.focus();
    };
  }, [returnFocusRef]);

  useEffect(() => {
    if (initialPreviewRequested.current) return;
    initialPreviewRequested.current = true;
    void loadPreview();
  }, [loadPreview]);

  const invalidatePreview = () => {
    setPreview(null);
    setSendResult(null);
    setError("");
  };

  const insertVariable = (variable: string) => {
    const field = activeField === "subject" ? subjectRef.current : bodyRef.current;
    const value = activeField === "subject" ? subjectTemplate : bodyTemplate;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${variable}${value.slice(end)}`;
    if (activeField === "subject") setSubjectTemplate(next);
    else setBodyTemplate(next);
    invalidatePreview();
    field?.focus();
  };

  const sendEmails = async () => {
    if (sending || !preview || preview.sendableCount === 0) return;
    setSending(true);
    setError("");
    setSendResult(null);
    try {
      const result = await sendApplicationResultEmails(clubId, request());
      setSendResult(result);
      await onCompleted();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "결과 메일을 전송하지 못했습니다."));
    } finally {
      setSending(false);
    }
  };

  const decisionLabel = decision === "ACCEPTED" ? "합격" : "불합격";
  const targetCount = preview?.sendableCount ?? eligibleCount;
  const displayedExcludedCount = preview?.excludedCount ?? excludedCount;
  const displayedRetryCount = preview
    ? preview.rows.filter(row => row.sendable && row.resultEmailStatus === "FAILED").length
    : retryCount;
  const displayedUnknownCount = preview
    ? preview.rows.filter(row => row.resultEmailStatus === "UNKNOWN").length
    : unknownCount;
  const sample = preview?.rows.find(row => row.sendable && row.renderedSubject && row.renderedBody);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !sending) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-email-title"
        aria-describedby="result-email-description"
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="result-email-title" className="text-lg font-extrabold text-[var(--text-primary)]">
              {decisionLabel} 메일 일괄 전송
            </h2>
            <p id="result-email-description" className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {generationName}의 {decisionLabel} 결과 중 아직 전송할 수 있는 대상에게 메일을 보냅니다.
            </p>
          </div>
          <button
            type="button"
            aria-label="메일 전송 창 닫기"
            disabled={sending}
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg text-[var(--text-secondary)] disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="메일 전송 대상 요약">
          <Summary label="대상" value={targetCount} />
          <Summary label="제외" value={displayedExcludedCount} />
          <Summary label="실패 재시도" value={displayedRetryCount} />
          <Summary label="결과 확인 필요" value={displayedUnknownCount} />
        </div>

        {displayedUnknownCount > 0 && (
          <p role="status" className="mt-3 rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-xs font-bold text-[var(--warning)]">
            발송 결과를 확인할 수 없는 {displayedUnknownCount}명은 중복 전송을 막기 위해 대상에서 제외했습니다.
          </p>
        )}

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            메일 제목
            <input
              ref={subjectRef}
              className="control"
              value={subjectTemplate}
              disabled={sending}
              onFocus={() => setActiveField("subject")}
              onChange={event => { setSubjectTemplate(event.target.value); invalidatePreview(); }}
              maxLength={200}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            메일 본문
            <textarea
              ref={bodyRef}
              className="min-h-48 resize-y rounded-lg border border-[var(--border)] bg-white p-3 text-sm leading-6"
              value={bodyTemplate}
              disabled={sending}
              onFocus={() => setActiveField("body")}
              onChange={event => { setBodyTemplate(event.target.value); invalidatePreview(); }}
              maxLength={10000}
            />
          </label>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">선택한 입력란에 변수 삽입</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {templateVariables.map(variable => (
                <button
                  key={variable}
                  type="button"
                  disabled={sending}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => insertVariable(variable)}
                  className="rounded-md border border-[var(--border)] bg-[var(--panel-muted)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40"
                >
                  {variable}
                </button>
              ))}
            </div>
          </div>
          <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            카카오톡 안내 링크 <span className="font-normal text-[var(--text-tertiary)]">선택</span>
            <input
              className="control"
              type="url"
              value={kakaoLink}
              disabled={sending}
              onChange={event => { setKakaoLink(event.target.value); invalidatePreview(); }}
              placeholder="https://open.kakao.com/..."
            />
          </label>
        </div>

        <section className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted)] p-4" aria-label="메일 미리보기 결과">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">수신자 미리보기</h3>
            <button
              type="button"
              disabled={previewing || sending}
              onClick={() => void loadPreview()}
              className="self-start rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              {previewing ? "확인 중..." : "미리보기 새로고침"}
            </button>
          </div>
          {!preview && !previewing && <p className="mt-3 text-xs text-[var(--text-secondary)]">템플릿을 확인한 뒤 미리보기를 새로고침해 주세요.</p>}
          {preview && (
            <>
              {preview.rows.filter(row => row.sendable).length === 0 ? (
                <p className="mt-3 text-xs text-[var(--text-secondary)]">전송할 수신자가 없습니다.</p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {preview.rows.filter(row => row.sendable).slice(0, 6).map(recipient => (
                    <li key={recipient.applicationId} className="min-w-0 rounded-lg bg-white px-3 py-2 text-xs">
                      <b className="block truncate">{recipient.memberName}</b>
                      <span className="block truncate text-[var(--text-secondary)]">{recipient.email}</span>
                    </li>
                  ))}
                </ul>
              )}
              {preview.rows.some(row => !row.sendable) && (
                <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-white p-3">
                  <p className="text-[11px] font-bold text-[var(--text-secondary)]">제외 사유</p>
                  <ul className="mt-2 grid gap-1.5 text-xs text-[var(--text-secondary)]">
                    {preview.rows.filter(row => !row.sendable).slice(0, 5).map(row => (
                      <li key={row.applicationId}>
                        <b className="text-[var(--text-primary)]">{row.memberName}</b> · {row.reason ?? "전송 대상이 아닙니다."}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sample && (
                <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-white p-3">
                  <p className="text-[11px] font-bold text-[var(--text-secondary)]">{sample.memberName}님에게 보이는 내용</p>
                  <p className="mt-2 text-xs font-extrabold text-[var(--text-primary)]">{sample.renderedSubject}</p>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">{sample.renderedBody}</p>
                </div>
              )}
            </>
          )}
        </section>

        {error && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-bold text-[var(--danger)]">{error}</p>}
        {sendResult && (
          <p role="status" aria-live="polite" className={`mt-4 rounded-lg px-3 py-2 text-xs font-bold ${sendResult.failedCount > 0 || sendResult.unknownCount > 0 ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>
            {sendResult.sentCount}명 전송 완료 · {sendResult.failedCount}명 실패 · {sendResult.unknownCount}명 결과 확인 필요 · {displayedExcludedCount}명 제외
            {sendResult.failedCount > 0 && " — 실패한 대상은 다시 시도할 수 있습니다."}
            {sendResult.unknownCount > 0 && " — 결과 확인이 필요한 대상은 중복 전송하지 않습니다."}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={sending}
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40"
          >
            {sendResult ? "닫기" : "취소"}
          </button>
          {!sendResult && (
            <button
              type="button"
              disabled={sending || previewing || !preview || preview.sendableCount === 0}
              onClick={() => void sendEmails()}
              className={`rounded-lg px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40 ${decision === "ACCEPTED" ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`}
            >
              {sending ? "전송 중..." : `${targetCount}명에게 ${decisionLabel} 메일 보내기`}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--panel-muted)] p-3">
      <p className="text-[11px] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-[var(--text-primary)]">{value}명</p>
    </div>
  );
}
