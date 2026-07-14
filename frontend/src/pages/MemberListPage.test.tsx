import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ApiError } from "../api/http";
import type { GenerationMember } from "../types/member";
import { MemberListPage } from "./MemberListPage";

const {
  listGenerations,
  listMembers,
  changeGenerationMemberDuesStatus,
  changeGenerationMemberStatus,
  listGenerationMemberStatusHistory,
} = vi.hoisted(() => ({
  listGenerations: vi.fn(),
  listMembers: vi.fn(),
  changeGenerationMemberDuesStatus: vi.fn(),
  changeGenerationMemberStatus: vi.fn(),
  listGenerationMemberStatusHistory: vi.fn(),
}));

vi.mock("../api/members", () => ({
  listMembers,
  changeGenerationMemberDuesStatus,
  changeGenerationMemberStatus,
  listGenerationMemberStatusHistory,
}));
vi.mock("../api/generations", () => ({ listGenerations }));
vi.mock("../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const activeMember: GenerationMember = {
  id: "member-1",
  generationId: "generation-1",
  generationName: "26-1",
  personId: "person-1",
  name: "김부원",
  email: "member@example.com",
  phone: null,
  studentNumber: "20260001",
  joinedSource: "APPLICATION_ACCEPT",
  status: "ACTIVE",
  duesStatus: "UNKNOWN",
  duesStatusUpdatedAt: null,
  duesStatusUpdatedByUserId: null,
  duesStatusUpdatedByName: null,
  createdAt: "2026-07-01T00:00:00Z",
};

const inactiveUnpaidMember: GenerationMember = {
  ...activeMember,
  id: "member-2",
  personId: "person-2",
  name: "이부원",
  email: "inactive@example.com",
  studentNumber: "20250002",
  status: "INACTIVE",
  duesStatus: "UNPAID",
};

function HistoryControl() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("?generationId=generation-old")}>
      이전 학기 주소로 이동
    </button>
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/clubs/club-1/members"]}>
      <Routes>
        <Route path="/clubs/:clubId/members" element={<><MemberListPage /><HistoryControl /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MemberListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listGenerations.mockResolvedValue([
      { id: "generation-1", name: "26-1", status: "ACTIVE" },
      { id: "generation-old", name: "25-2", status: "CLOSED" },
    ]);
    listMembers.mockResolvedValue([activeMember]);
    listGenerationMemberStatusHistory.mockResolvedValue([]);
    changeGenerationMemberStatus.mockResolvedValue({ ...activeMember, status: "INACTIVE" });
    changeGenerationMemberDuesStatus.mockResolvedValue({
      ...activeMember,
      duesStatus: "PAID",
      duesStatusUpdatedAt: "2026-07-13T08:00:00Z",
      duesStatusUpdatedByUserId: "user-1",
      duesStatusUpdatedByName: "회계 운영진",
    });
  });

  it("활성 학기 부원만 불러오고 학기를 바꾸면 해당 학기 부원을 다시 조회한다", async () => {
    renderPage();

    await waitFor(() => expect(listMembers).toHaveBeenCalledWith("club-1", "generation-1"));
    fireEvent.change(screen.getByLabelText("조회할 학기"), { target: { value: "generation-old" } });
    await waitFor(() => expect(listMembers).toHaveBeenCalledWith("club-1", "generation-old"));
  });

  it("주소의 학기 값이 바뀌면 선택 학기와 부원 요청도 함께 바뀐다", async () => {
    renderPage();
    await waitFor(() => expect(listMembers).toHaveBeenCalledWith("club-1", "generation-1"));

    fireEvent.click(screen.getByRole("button", { name: "이전 학기 주소로 이동" }));

    await waitFor(() => expect(screen.getByLabelText("조회할 학기")).toHaveValue("generation-old"));
    await waitFor(() => expect(listMembers).toHaveBeenCalledWith("club-1", "generation-old"));
  });

  it("회계 부원이 회비 확인 상태를 납부로 변경한다", async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText("김부원 회비 상태"), { target: { value: "PAID" } });

    await waitFor(() => expect(changeGenerationMemberDuesStatus).toHaveBeenCalledWith("member-1", "PAID"));
    expect(await screen.findByText(/회계 운영진/)).toBeInTheDocument();
  });

  it("활동 중 부원을 비활동으로 변경하고 해당 행을 갱신한다", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "상태 변경" }));
    expect(screen.getByLabelText("변경할 상태")).toHaveValue("INACTIVE");
    fireEvent.change(screen.getByLabelText("사유 (선택)"), { target: { value: "군 복무" } });
    fireEvent.click(screen.getByRole("button", { name: "비활동으로 변경" }));

    await waitFor(() => expect(changeGenerationMemberStatus).toHaveBeenCalledWith(
      "member-1",
      { status: "INACTIVE", reason: "군 복무" },
    ));
    expect((await screen.findAllByText("비활동")).length).toBeGreaterThan(0);
    expect(screen.queryByText("김부원 상태 변경")).not.toBeInTheDocument();
  });

  it("탈퇴 사유를 필수로 받고 확정 전 확인한다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    changeGenerationMemberStatus.mockResolvedValueOnce({ ...activeMember, status: "WITHDRAWN" });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "상태 변경" }));
    fireEvent.change(screen.getByLabelText("변경할 상태"), { target: { value: "WITHDRAWN" } });
    fireEvent.click(screen.getByRole("button", { name: "탈퇴 처리" }));
    expect(screen.getByRole("alert")).toHaveTextContent("탈퇴 사유를 입력해 주세요.");
    expect(changeGenerationMemberStatus).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("사유 (필수)"), { target: { value: "개인 사정" } });
    fireEvent.click(screen.getByRole("button", { name: "탈퇴 처리" }));

    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    await waitFor(() => expect(changeGenerationMemberStatus).toHaveBeenCalledWith(
      "member-1",
      { status: "WITHDRAWN", reason: "개인 사정" },
    ));
    expect(screen.queryByRole("button", { name: "상태 변경" })).not.toBeInTheDocument();
  });

  it("서버의 상태 변경 오류 메시지를 우선 표시하고 제출 버튼을 다시 활성화한다", async () => {
    changeGenerationMemberStatus.mockRejectedValueOnce(
      new ApiError(409, "탈퇴한 부원의 상태는 변경할 수 없습니다."),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "상태 변경" }));
    fireEvent.click(screen.getByRole("button", { name: "비활동으로 변경" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("탈퇴한 부원의 상태는 변경할 수 없습니다.");
    expect(screen.getByRole("button", { name: "비활동으로 변경" })).toBeEnabled();
  });

  it("상태 변경 처리 중에는 버튼을 잠가 요청을 한 번만 보낸다", async () => {
    let resolveChange: (member: GenerationMember) => void = () => undefined;
    changeGenerationMemberStatus.mockReturnValueOnce(new Promise(resolve => {
      resolveChange = resolve;
    }));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "상태 변경" }));
    const submit = screen.getByRole("button", { name: "비활동으로 변경" });
    fireEvent.click(submit);

    expect(await screen.findByRole("button", { name: "변경 중..." })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "변경 중..." }));
    expect(changeGenerationMemberStatus).toHaveBeenCalledOnce();

    await act(async () => resolveChange({ ...activeMember, status: "INACTIVE" }));
    expect((await screen.findAllByText("비활동")).length).toBeGreaterThan(0);
  });

  it("상태 변경 이력의 로딩과 결과를 표시하고 다시 닫는다", async () => {
    let resolveHistory: (value: unknown[]) => void = () => undefined;
    listGenerationMemberStatusHistory.mockReturnValueOnce(new Promise(resolve => {
      resolveHistory = resolve;
    }));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "변경 이력" }));
    expect(screen.getByText("이력을 불러오는 중...")).toBeInTheDocument();
    resolveHistory([{
      id: "history-1",
      previousStatus: "ACTIVE",
      newStatus: "INACTIVE",
      reason: "군 복무",
      changedByUserId: "user-1",
      changedByName: "운영진",
      changedAt: "2026-07-10T03:00:00Z",
    }]);

    expect(await screen.findByText("활동 중 → 비활동")).toBeInTheDocument();
    expect(screen.getByText("사유: 군 복무")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "이력 닫기" }));
    expect(screen.queryByLabelText("김부원 상태 변경 이력")).not.toBeInTheDocument();
  });

  it("상태 변경 이력이 없거나 조회에 실패한 상태를 구분한다", async () => {
    listGenerationMemberStatusHistory.mockRejectedValueOnce(
      new ApiError(500, "변경 이력을 조회하지 못했습니다."),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "변경 이력" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("변경 이력을 조회하지 못했습니다.");

    listGenerationMemberStatusHistory.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("아직 상태 변경 이력이 없습니다.")).toBeInTheDocument();
  });

  it("제목 행의 상태 필터를 적용하고 적용된 제목을 회색으로 표시한다", async () => {
    listMembers.mockResolvedValueOnce([activeMember, inactiveUnpaidMember]);
    renderPage();

    const statusHeader = await screen.findByRole("button", { name: "상태" });
    fireEvent.click(statusHeader);
    fireEvent.change(screen.getByLabelText("표 상태 필터"), { target: { value: "INACTIVE" } });

    await waitFor(() => expect(screen.queryAllByText("이부원").length).toBeGreaterThan(0));
    expect(screen.queryAllByText("김부원")).toHaveLength(0);
    expect(statusHeader.parentElement).toHaveClass("bg-[var(--panel-muted)]");
    expect(screen.getByText("1명 표시 중")).toBeInTheDocument();
  });

  it("학번과 회비 여부를 함께 필터링하고 초기화한다", async () => {
    listMembers.mockResolvedValueOnce([activeMember, inactiveUnpaidMember]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "이름/이메일/학번" }));
    fireEvent.change(screen.getByLabelText("표 학번 필터"), { target: { value: "2025" } });
    fireEvent.click(screen.getByRole("button", { name: "회비 확인" }));
    fireEvent.change(screen.getByLabelText("표 회비 필터"), { target: { value: "UNPAID" } });

    await waitFor(() => expect(screen.queryAllByText("이부원").length).toBeGreaterThan(0));
    expect(screen.queryAllByText("김부원")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
    await waitFor(() => expect(screen.queryAllByText("김부원").length).toBeGreaterThan(0));
  });
});
