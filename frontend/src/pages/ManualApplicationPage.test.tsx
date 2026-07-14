import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManualApplicationPage } from "./ManualApplicationPage";

const { createManualApplication, listGenerations } = vi.hoisted(() => ({
  createManualApplication: vi.fn(),
  listGenerations: vi.fn(),
}));

vi.mock("../api/applications", () => ({ createManualApplication }));
vi.mock("../api/generations", () => ({ listGenerations }));
vi.mock("../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("ManualApplicationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listGenerations.mockResolvedValue([{ id: "generation-1", name: "26-1", status: "ACTIVE" }]);
    createManualApplication.mockResolvedValue({ id: "application-1" });
  });

  it("선택한 디스코드 이름을 결과 메일 변수용 인물 정보로 등록한다", async () => {
    render(
      <MemoryRouter initialEntries={["/clubs/club-1/applications/new"]}>
        <Routes>
          <Route path="/clubs/:clubId/applications/new" element={<ManualApplicationPage />} />
          <Route path="/clubs/:clubId/applications/:applicationId" element={<p>등록 완료</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("option", { name: "26-1" });
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "김지원" } });
    fireEvent.change(screen.getByLabelText("학번"), { target: { value: "20260001" } });
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "APPLY@example.com" } });
    fireEvent.change(screen.getByLabelText(/디스코드 이름/), { target: { value: " crewcat_user " } });
    fireEvent.change(screen.getByLabelText("답변"), { target: { value: "함께 활동하고 싶습니다." } });
    fireEvent.click(screen.getByRole("button", { name: "지원자 등록" }));

    await waitFor(() => expect(createManualApplication).toHaveBeenCalledWith(
      "club-1",
      expect.objectContaining({
        email: "apply@example.com",
        discordName: "crewcat_user",
      }),
    ));
    expect(await screen.findByText("등록 완료")).toBeInTheDocument();
  });
});
