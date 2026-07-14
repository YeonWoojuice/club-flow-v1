import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { RetentionImportPage } from "./RetentionImportPage";

const {
  listGenerations,
  getGoogleConnectionStatus,
  parseRetentionFile,
  previewRetention,
  applyRetention,
  disconnectGoogleConnection,
} = vi.hoisted(() => ({
  listGenerations: vi.fn(),
  getGoogleConnectionStatus: vi.fn(),
  parseRetentionFile: vi.fn(),
  previewRetention: vi.fn(),
  applyRetention: vi.fn(),
  disconnectGoogleConnection: vi.fn(),
}));

vi.mock("../api/generations", () => ({ listGenerations }));
vi.mock("../api/retention", () => ({
  getGoogleConnectionStatus,
  parseRetentionFile,
  previewRetention,
  applyRetention,
  disconnectGoogleConnection,
  getGoogleAuthorizationUrl: vi.fn(),
  readRetentionGoogleSheet: vi.fn(),
}));
vi.mock("../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("RetentionImportPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    listGenerations.mockResolvedValue([
      { id: "previous-1", name: "25-2", status: "CLOSED" },
      { id: "target-1", name: "26-1", status: "ACTIVE" },
    ]);
    getGoogleConnectionStatus.mockResolvedValue({ connected: false });
    parseRetentionFile.mockResolvedValue({
      tables: [{
        name: "members.csv",
        headers: ["이름", "이메일", "잔류 여부"],
        rows: [
          ["김잔류", "KEEP@example.com ", "예"],
          ["중복1", "duplicate@example.com", "예"],
          ["중복2", "DUPLICATE@example.com", "예"],
        ],
      }],
    });
    previewRetention.mockResolvedValue({
      totalCount: 3,
      readyCount: 1,
      notRetainedCount: 0,
      duplicateCount: 2,
      invalidCount: 0,
      alreadyMemberCount: 0,
      rows: [
        { rowNumber: 2, name: "김잔류", email: "keep@example.com", personId: "person-ready", status: "READY", message: "이월할 수 있습니다." },
        { rowNumber: 3, name: "중복1", email: "duplicate@example.com", status: "DUPLICATE_IN_SOURCE", message: "같은 원본에 동일한 이메일이 여러 번 있습니다." },
        { rowNumber: 4, name: "중복2", email: "duplicate@example.com", status: "DUPLICATE_IN_SOURCE", message: "같은 원본에 동일한 이메일이 여러 번 있습니다." },
      ],
    });
    applyRetention.mockResolvedValue({ requestedCount: 1, createdCount: 1, alreadyMemberCount: 0 });
    disconnectGoogleConnection.mockResolvedValue(undefined);
  });

  function renderPage(path = "/clubs/club-1/members/retention") {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/clubs/:clubId/members/retention" element={<RetentionImportPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("열을 연결해 중복을 미리보고 READY인 부원만 확정한다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();

    await waitFor(() => expect(listGenerations).toHaveBeenCalledWith("club-1"));
    fireEvent.change(screen.getByLabelText("표 파일 선택 (엑셀 .xlsx 또는 CSV .csv)"), {
      target: { files: [new File(["data"], "members.csv", { type: "text/csv" })] },
    });

    await screen.findByText("3. 열 이름 연결 (열 매핑)");
    fireEvent.change(screen.getByLabelText("이메일 (필수)"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("잔류 여부 (필수)"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("이름 (선택)"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "중복 확인하고 미리보기" }));

    await waitFor(() => expect(previewRetention).toHaveBeenCalledWith(
      "club-1",
      "previous-1",
      "target-1",
      expect.arrayContaining([expect.objectContaining({ email: "KEEP@example.com ", retained: true })]),
    ));
    expect(await screen.findAllByText("원본 중복")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText(/^잔류로 인정할 값/), {
      target: { value: "잔류,예,Y,YES,TRUE,1" },
    });
    expect(screen.queryByText("4. 결과 확인 후 이월")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "중복 확인하고 미리보기" }));
    await screen.findByRole("button", { name: "이월 가능 1명 확정" });

    fireEvent.click(screen.getByRole("button", { name: "이월 가능 1명 확정" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("'25-2'에서 '26-1'(으)로 1명을 이월할까요?"));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("이월 제외 2명"));

    await waitFor(() => expect(applyRetention).toHaveBeenCalledWith(
      "club-1", "previous-1", "target-1", ["person-ready"],
    ));
    expect(await screen.findByText(/1명을 새 학기 부원으로 이월했습니다/)).toBeInTheDocument();
  });

  it("첫 번째 열도 이메일 열로 선택해 미리볼 수 있다", async () => {
    parseRetentionFile.mockResolvedValueOnce({
      tables: [{
        name: "members.csv",
        headers: ["이메일", "이름", "잔류 여부"],
        rows: [["keep@example.com", "김잔류", "예"]],
      }],
    });
    renderPage();

    fireEvent.change(await screen.findByLabelText("표 파일 선택 (엑셀 .xlsx 또는 CSV .csv)"), {
      target: { files: [new File(["data"], "members.csv", { type: "text/csv" })] },
    });
    await screen.findByText("3. 열 이름 연결 (열 매핑)");
    fireEvent.change(screen.getByLabelText("이메일 (필수)"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("잔류 여부 (필수)"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "중복 확인하고 미리보기" }));

    await waitFor(() => expect(previewRetention).toHaveBeenCalledWith(
      "club-1",
      "previous-1",
      "target-1",
      [expect.objectContaining({ email: "keep@example.com", retained: true })],
    ));
  });

  it("이월 확인을 취소하면 부원을 저장하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();

    fireEvent.change(await screen.findByLabelText("표 파일 선택 (엑셀 .xlsx 또는 CSV .csv)"), {
      target: { files: [new File(["data"], "members.csv", { type: "text/csv" })] },
    });
    await screen.findByText("3. 열 이름 연결 (열 매핑)");
    fireEvent.change(screen.getByLabelText("이메일 (필수)"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("잔류 여부 (필수)"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "중복 확인하고 미리보기" }));
    await screen.findByRole("button", { name: "이월 가능 1명 확정" });

    fireEvent.click(screen.getByRole("button", { name: "이월 가능 1명 확정" }));

    expect(applyRetention).not.toHaveBeenCalled();
  });

  it("Google 연결 콜백 결과를 사용자에게 안내한다", async () => {
    renderPage("/clubs/club-1/members/retention?google=connected");

    expect(await screen.findByText("Google 계정을 연결했습니다.")).toBeInTheDocument();
  });

  it("Google 연결 실패 원인을 확인할 수 있게 안내한다", async () => {
    renderPage("/clubs/club-1/members/retention?google=error");

    expect(await screen.findByRole("alert")).toHaveTextContent("Google 계정을 연결하지 못했습니다.");
  });

  it("현재 Google 연결을 해제하고 연결 전 화면으로 돌아간다", async () => {
    getGoogleConnectionStatus.mockResolvedValueOnce({
      connected: true,
      googleAccountEmail: "staff@example.com",
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Google Sheet" }));
    expect(await screen.findByRole("button", { name: "Sheet 불러오기" })).toBeDisabled();
    const accountSettings = screen.getByText("연결된 Google 계정 설정").closest("details");
    expect(accountSettings).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("연결된 Google 계정 설정"));
    expect(accountSettings).toHaveAttribute("open");
    expect(screen.getByText("staff@example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Google 연결 해제" }));

    await waitFor(() => expect(disconnectGoogleConnection).toHaveBeenCalledOnce());
    expect(await screen.findByText("Google 계정 연결을 해제했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Google 계정 연결" })).toBeInTheDocument();
  });
});
