import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ApplicationDetail } from "../types/application";
import { ApplicationDetailPage } from "./ApplicationDetailPage";

const { getApplication, changeApplicationStatus, capturedEmailProps } = vi.hoisted(() => ({
  getApplication: vi.fn(),
  changeApplicationStatus: vi.fn(),
  capturedEmailProps: { current: null as null | { applicationIds?: string[] } },
}));

vi.mock("../api/applications", () => ({ getApplication, changeApplicationStatus }));
vi.mock("../components/AppLayout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("../components/ApplicationResultEmailModal", () => ({
  ApplicationResultEmailModal: (props: { applicationIds?: string[]; onClose: () => void }) => {
    capturedEmailProps.current = props;
    return <div role="dialog"><span>개별 메일 모달</span><button onClick={props.onClose}>닫기</button></div>;
  },
}));

const accepted: ApplicationDetail = {
  id: "application-1",
  generationId: "generation-1",
  generationName: "26-2",
  personId: "person-1",
  name: "김지원",
  email: "applicant@example.com",
  phone: null,
  studentNumber: "20260001",
  status: "ACCEPTED",
  resultEmailStatus: "NOT_SENT",
  resultEmailSentAt: null,
  generationMemberId: null,
  generationMemberStatus: null,
  sourceType: "MANUAL",
  submittedAt: "2026-07-14T00:00:00Z",
  applicationAnswers: [],
  statusHistory: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/clubs/club-1/applications/application-1"]}>
      <Routes><Route path="/clubs/:clubId/applications/:applicationId" element={<ApplicationDetailPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe("ApplicationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedEmailProps.current = null;
    getApplication.mockResolvedValue(accepted);
    changeApplicationStatus.mockResolvedValue({ ...accepted, status: "REJECTED" });
  });

  it("메일 전송 전 결과에서 개별 메일 버튼과 결과 정정 버튼을 보여준다", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "결과 메일 보내기" }));
    expect(screen.getByText("개별 메일 모달")).toBeInTheDocument();
    expect(capturedEmailProps.current?.applicationIds).toEqual(["application-1"]);
  });

  it("합격을 불합격으로 정정할 때 사유를 서버에 보낸다", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "불합격으로 정정" }));
    fireEvent.change(screen.getByLabelText("정정 사유 (필수)"), { target: { value: "심사 입력 오류" } });
    fireEvent.click(screen.getAllByRole("button", { name: "불합격으로 정정" }).at(-1)!);

    await waitFor(() => expect(changeApplicationStatus).toHaveBeenCalledWith(
      "application-1", "REJECTED", "심사 입력 오류",
    ));
  });

  it("메일 발송 완료 후에는 결과 정정 버튼을 숨긴다", async () => {
    getApplication.mockResolvedValue({ ...accepted, resultEmailStatus: "SENT" });
    renderPage();

    expect(await screen.findByText("합격 결과 · 메일 발송 완료")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "불합격으로 정정" })).not.toBeInTheDocument();
    expect(screen.getByText("메일 전송을 시작했거나 완료하여 결과가 확정되었습니다.")).toBeInTheDocument();
  });

  it("기존 방식으로 이미 부원이 생긴 결과는 정정을 막고 메일 전송은 허용한다", async () => {
    getApplication.mockResolvedValue({
      ...accepted,
      generationMemberId: "legacy-member-1",
      generationMemberStatus: "REGULAR",
    });
    renderPage();

    expect(await screen.findByRole("button", { name: "결과 메일 보내기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "불합격으로 정정" })).not.toBeInTheDocument();
    expect(screen.getByText("기존 방식으로 이미 부원 등록된 결과는 변경할 수 없습니다.")).toBeInTheDocument();
  });

  it("재시작 전의 예전 상세 응답에 변경 이력이 없어도 화면을 표시한다", async () => {
    getApplication.mockResolvedValue({ ...accepted, statusHistory: undefined });
    renderPage();

    expect(await screen.findByRole("heading", { name: "김지원" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "결과 메일 보내기" })).toBeInTheDocument();
  });
});
