import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GenerationPage } from "./GenerationPage";

const { activateGeneration, createGeneration, listGenerations, updateGeneration } = vi.hoisted(() => ({
  activateGeneration: vi.fn(),
  createGeneration: vi.fn(),
  listGenerations: vi.fn(),
  updateGeneration: vi.fn(),
}));

vi.mock("../api/generations", () => ({
  activateGeneration,
  createGeneration,
  listGenerations,
  updateGeneration,
}));
vi.mock("../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("GenerationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listGenerations.mockResolvedValue([
      { id: "new", name: "26-2", status: "ACTIVE", startDate: "2026-09-01", endDate: "2027-02-28" },
      { id: "old", name: "26-1", status: "CLOSED", startDate: "2026-03-01", endDate: "2026-08-31", closedAt: "2026-08-31T00:00:00Z" },
    ]);
    activateGeneration.mockResolvedValue({ id: "old", name: "26-1", status: "ACTIVE", closedAt: null });
  });

  it("종료 학기를 다시 활성화하기 전에 현재 활성 학기 종료를 안내한다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={["/clubs/club-1/generations"]}>
        <Routes>
          <Route path="/clubs/:clubId/generations" element={<GenerationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "다시 활성화" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("'26-2'은 자동으로 종료됩니다"));
    await waitFor(() => expect(activateGeneration).toHaveBeenCalledWith("old"));
  });
});
