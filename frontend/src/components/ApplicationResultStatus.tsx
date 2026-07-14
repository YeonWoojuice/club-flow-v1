import type {
  ApplicationResultEmailStatus,
  ApplicationStatus,
} from "../types/application";

type DisplayStatus = {
  label: string;
  className: string;
};

function resultStatus(
  status: ApplicationStatus,
  emailStatus: ApplicationResultEmailStatus | undefined,
): DisplayStatus {
  if (status === "SUBMITTED") {
    return { label: "접수", className: "bg-blue-50 text-blue-700" };
  }
  if (status === "REVIEWING") {
    return { label: "검토 중", className: "bg-[var(--warning-soft)] text-[var(--warning)]" };
  }
  if (status === "CANCELED") {
    return { label: "취소", className: "bg-[var(--panel-muted)] text-[var(--text-secondary)]" };
  }

  const decisionLabel = status === "ACCEPTED" ? "합격 결과" : "불합격 결과";
  if (!emailStatus || emailStatus === "UNKNOWN") {
    return {
      label: `${decisionLabel} · 발송 결과 확인 필요`,
      className: "bg-[var(--panel-muted)] text-[var(--text-primary)]",
    };
  }
  if (emailStatus === "SENT") {
    return {
      label: `${decisionLabel} · 메일 발송 완료`,
      className: "bg-[var(--panel-muted)] text-[var(--text-secondary)]",
    };
  }
  if (emailStatus === "PENDING") {
    return {
      label: `${decisionLabel} · 메일 발송 중`,
      className: "bg-[var(--panel-muted)] text-[var(--text-secondary)]",
    };
  }
  if (emailStatus === "FAILED") {
    return {
      label: `${status === "ACCEPTED" ? "합격" : "불합격"} · 메일 발송 실패`,
      className: status === "ACCEPTED"
        ? "bg-[var(--success-soft)] text-[var(--success)]"
        : "bg-[var(--danger-soft)] text-[var(--danger)]",
    };
  }
  return {
    label: `${status === "ACCEPTED" ? "합격" : "불합격"} · 메일 미발송`,
    className: status === "ACCEPTED"
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : "bg-[var(--danger-soft)] text-[var(--danger)]",
  };
}

export function ApplicationResultStatus({
  status,
  emailStatus,
}: {
  status: ApplicationStatus;
  emailStatus?: ApplicationResultEmailStatus;
}) {
  const display = resultStatus(status, emailStatus);
  return (
    <span className={`inline-flex max-w-full items-center rounded-md px-2 py-1 text-[10px] font-bold leading-4 ${display.className}`}>
      {display.label}
    </span>
  );
}
