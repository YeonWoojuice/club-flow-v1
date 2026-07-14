import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ApplicationStatus, ApplicationSummary } from "../types/application";
import { ApplicationListPage } from "./ApplicationListPage";

const { listApplications, changeApplicationStatus, listGenerations } = vi.hoisted(() => ({
  listApplications: vi.fn(),
  changeApplicationStatus: vi.fn(),
  listGenerations: vi.fn(),
}));

vi.mock("../api/applications", () => ({ listApplications, changeApplicationStatus }));
vi.mock("../api/generations", () => ({ listGenerations }));
vi.mock("../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function application(id: string, generationId: string, status: ApplicationStatus): ApplicationSummary {
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
      application("rejected", "generation-active", "REJECTED"),
      application("accepted", "generation-active", "ACCEPTED"),
      application("canceled", "generation-active", "CANCELED"),
      application("old", "generation-closed", "SUBMITTED"),
    ]);
    changeApplicationStatus.mockResolvedValue({});
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
});
