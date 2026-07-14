import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicationResultStatus } from "./ApplicationResultStatus";

describe("ApplicationResultStatus", () => {
  it.each([
    ["SUBMITTED", "NOT_SENT", "접수"],
    ["REVIEWING", "NOT_SENT", "검토 중"],
    ["ACCEPTED", "NOT_SENT", "합격 · 메일 미발송"],
    ["REJECTED", "NOT_SENT", "불합격 · 메일 미발송"],
    ["ACCEPTED", "SENT", "합격 결과 · 메일 발송 완료"],
    ["REJECTED", "SENT", "불합격 결과 · 메일 발송 완료"],
    ["ACCEPTED", "UNKNOWN", "합격 결과 · 발송 결과 확인 필요"],
  ] as const)("%s와 %s 조합을 %s로 표시한다", (status, emailStatus, label) => {
    render(<ApplicationResultStatus status={status} emailStatus={emailStatus} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
