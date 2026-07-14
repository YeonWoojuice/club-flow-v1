import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type {
  ApplicationResultEmailStatus,
  ApplicationStatus,
  ApplicationSummary,
} from "../types/application";
import { ApplicationListPage } from "./ApplicationListPage";

const {
  listApplications,
  changeApplicationStatus,
  listGenerations,
  previewApplicationResultEmails,
  sendApplicationResultEmails,
} = vi.hoisted(() => ({
  listApplications: vi.fn(),
  changeApplicationStatus: vi.fn(),
  listGenerations: vi.fn(),
  previewApplicationResultEmails: vi.fn(),
  sendApplicationResultEmails: vi.fn(),
}));

vi.mock("../api/applications", () => ({ listApplications, changeApplicationStatus }));
vi.mock("../api/generations", () => ({ listGenerations }));
vi.mock("../api/applicationResultEmails", () => ({
  previewApplicationResultEmails,
  sendApplicationResultEmails,
}));
vi.mock("../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function application(
  id: string,
  generationId: string,
  status: ApplicationStatus,
  resultEmailStatus: ApplicationResultEmailStatus = "NOT_SENT",
): ApplicationSummary {
  return {
    id,
    generationId,
    generationName: generationId === "generation-active" ? "26-2" : "26-1",
    personId: `person-${id}`,
    name: `지원자 ${id}`,
    email: `${id}@example.com`,
    phone: null,
    studentNumber: `2026${id}`,
    status,
    resultEmailStatus,
    resultEmailSentAt: resultEmailStatus === "SENT" ? "2026-07-14T00:00:00Z" : null,
    sourceType: "MANUAL",
    submittedAt: "2026-07-13T00:00:00Z",
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/clubs/club-1/applications"]}>
      <Routes>
        <Route path="/clubs/:clubId/applications" element={<ApplicationListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ApplicationListPage 일괄 합격", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listGenerations.mockResolvedValue([
      { id: "generation-active", name: "26-2", status: "ACTIVE" },
      { id: "generation-closed", name: "26-1", status: "CLOSED" },
    ]);
    listApplications.mockResolvedValue([
      application("submitted", "generation-active", "SUBMITTED"),
      application("reviewing", "generation-active", "REVIEWING"),
      application("rejected", "generation-active", "REJECTED", "FAILED"),
      application("accepted", "generation-active", "ACCEPTED"),
      application("accepted-sent", "generation-active", "ACCEPTED", "SENT"),
      application("accepted-pending", "generation-active", "ACCEPTED", "PENDING"),
      application("accepted-unknown", "generation-active", "ACCEPTED", "UNKNOWN"),
      application("canceled", "generation-active", "CANCELED"),
      application("old", "generation-closed", "SUBMITTED"),
    ]);
    changeApplicationStatus.mockResolvedValue({});
    previewApplicationResultEmails.mockResolvedValue({
      totalCount: 4,
      sendableCount: 1,
      excludedCount: 3,
      rows: [{
        applicationId: "accepted",
        memberName: "지원자 accepted",
        email: "accepted@example.com",
        discordName: null,
        resultEmailStatus: "NOT_SENT",
        sendable: true,
        reason: null,
        renderedSubject: "[테스트 동아리] 합격 안내",
        renderedBody: "지원자 accepted님, 합격하셨습니다.",
      }],
    });
    sendApplicationResultEmails.mockResolvedValue({
      batchId: "batch-1",
      decision: "ACCEPTED",
      status: "COMPLETED",
      totalCount: 1,
      sentCount: 1,
      failedCount: 0,
      unknownCount: 0,
      createdAt: "2026-07-14T00:00:00Z",
      completedAt: "2026-07-14T00:00:01Z",
      messages: [],
    });
  });

  it("확인 토스트에서 활성 학기의 처리 가능 인원만 안내한다", async () => {
    renderPage();

    const bulkButton = await screen.findByRole("button", { name: "불합격 제외 전원 합격처리" });
    await waitFor(() => expect(bulkButton).toBeEnabled());
    fireEvent.click(bulkButton);

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "현재까지 불합격 처리 인원 제외 전원 합격처리됩니다. 진행하시겠습니까?",
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent("대상: 26-2 · 2명");
  });

  it("불합격과 종료 학기 지원자는 제외하고 접수·검토 중 지원자만 합격 처리한다", async () => {
    renderPage();

    const bulkButton = await screen.findByRole("button", { name: "불합격 제외 전원 합격처리" });
    await waitFor(() => expect(bulkButton).toBeEnabled());
    fireEvent.click(bulkButton);
    fireEvent.click(screen.getByRole("button", { name: "전원 합격 처리" }));

    await waitFor(() => expect(changeApplicationStatus).toHaveBeenCalledTimes(2));
    expect(changeApplicationStatus).toHaveBeenNthCalledWith(1, "submitted", "ACCEPTED");
    expect(changeApplicationStatus).toHaveBeenNthCalledWith(2, "reviewing", "ACCEPTED");
    expect(await screen.findByRole("status")).toHaveTextContent("26-2 지원자 2명을 합격 처리했습니다.");
  });

  it("활성 학기 조회가 실패해도 지원자 목록은 계속 보여준다", async () => {
    listGenerations.mockRejectedValueOnce(new Error("generation failed"));
    renderPage();

    expect((await screen.findAllByText("지원자 submitted")).length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("일괄 합격 기능을 사용할 수 없습니다.");
    expect(screen.getByRole("button", { name: "불합격 제외 전원 합격처리" })).toBeDisabled();
  });

  it("활성 학기를 기본으로 보여주고 학기를 바꾸면 해당 학기 지원자만 표시한다", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByLabelText("조회할 학기")).toHaveValue("generation-active"));
    expect(screen.queryAllByText("지원자 old")).toHaveLength(0);
    expect(screen.queryAllByText("지원자 submitted").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("조회할 학기"), { target: { value: "generation-closed" } });

    await waitFor(() => expect(screen.queryAllByText("지원자 old").length).toBeGreaterThan(0));
    expect(screen.queryAllByText("지원자 submitted")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "불합격 제외 전원 합격처리" })).toBeDisabled();
  });

  it("미발송과 실패만 결과 메일 대상으로 세고 발송 완료 결과를 회색 단계 문구로 유지한다", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "합격 메일 일괄 전송 (1)" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "불합격 메일 일괄 전송 (1)" })).toBeEnabled();
    expect(screen.getAllByText("합격 결과 · 메일 발송 완료").length).toBeGreaterThan(0);
    expect(screen.getAllByText("합격 결과 · 발송 결과 확인 필요").length).toBeGreaterThan(0);
    expect(screen.getAllByText("불합격 · 메일 발송 실패").length).toBeGreaterThan(0);
  });

  it("합격 메일 모달에서 기본 템플릿을 미리보고 전송 결과를 안내한다", async () => {
    sendApplicationResultEmails.mockResolvedValueOnce({
      batchId: "batch-1",
      decision: "ACCEPTED",
      status: "FAILED",
      totalCount: 1,
      sentCount: 0,
      failedCount: 1,
      unknownCount: 0,
      createdAt: "2026-07-14T00:00:00Z",
      completedAt: "2026-07-14T00:00:01Z",
      messages: [],
    });
    renderPage();

    const openButton = await screen.findByRole("button", { name: "합격 메일 일괄 전송 (1)" });
    fireEvent.click(openButton);

    const dialog = await screen.findByRole("dialog", { name: "합격 메일 일괄 전송" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.parentElement).toHaveClass("bg-black/50");
    expect(screen.getByLabelText("메일 제목")).toHaveValue("[{{clubName}}] 26-2 합격 안내");
    await waitFor(() => expect(previewApplicationResultEmails).toHaveBeenCalledWith(
      "club-1",
      expect.objectContaining({
        generationId: "generation-active",
        decision: "ACCEPTED",
        subjectTemplate: "[{{clubName}}] 26-2 합격 안내",
      }),
    ));

    const sendButton = await screen.findByRole("button", { name: "1명에게 합격 메일 보내기" });
    await waitFor(() => expect(sendButton).toBeEnabled());
    fireEvent.click(sendButton);

    await waitFor(() => expect(sendApplicationResultEmails).toHaveBeenCalledOnce());
    const partialFailure = await screen.findByText(/0명 전송 완료 · 1명 실패 · 0명 결과 확인 필요 · 3명 제외/);
    expect(partialFailure).toHaveTextContent("실패한 대상은 다시 시도할 수 있습니다.");
  });

  it("Escape로 메일 모달을 닫고 실행 버튼으로 포커스를 돌려준다", async () => {
    renderPage();

    const openButton = await screen.findByRole("button", { name: "불합격 메일 일괄 전송 (1)" });
    fireEvent.click(openButton);
    await screen.findByRole("dialog", { name: "불합격 메일 일괄 전송" });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(openButton).toHaveFocus();
  });

  it("선택한 템플릿 입력란에 지원 변수를 삽입한다", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "합격 메일 일괄 전송 (1)" }));
    const subject = await screen.findByLabelText("메일 제목");
    fireEvent.focus(subject);
    fireEvent.click(screen.getByRole("button", { name: "{{memberName}}" }));

    expect(subject).toHaveValue("[{{clubName}}] 26-2 합격 안내{{memberName}}");
    expect(screen.getByRole("button", { name: "1명에게 합격 메일 보내기" })).toBeDisabled();
  });
});
