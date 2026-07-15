import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { GenerationMember } from "../types/member";
import { MemberListPage } from "./MemberListPage";

const {
  listGenerations,
  listMembers,
  changeGenerationMemberDuesStatus,
  changeGenerationMemberInvitationStatus,
  changeGenerationMemberStatus,
  listGenerationMemberStatusHistory,
} = vi.hoisted(() => ({
  listGenerations: vi.fn(),
  listMembers: vi.fn(),
  changeGenerationMemberDuesStatus: vi.fn(),
  changeGenerationMemberInvitationStatus: vi.fn(),
  changeGenerationMemberStatus: vi.fn(),
  listGenerationMemberStatusHistory: vi.fn(),
}));

vi.mock("../api/members", () => ({
  listMembers,
  changeGenerationMemberDuesStatus,
  changeGenerationMemberInvitationStatus,
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
  phone: "010-1111-2222",
  studentNumber: "20260001",
  joinedSource: "APPLICATION_ACCEPT",
  status: "ACTIVE",
  duesStatus: "UNKNOWN",
  kakaoInvited: false,
  discordInvited: false,
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
    changeGenerationMemberInvitationStatus.mockResolvedValue({
      ...activeMember,
      kakaoInvited: true,
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
    const updatedDescription = await screen.findByText(/회계 운영진/);
    expect(updatedDescription).toHaveClass("truncate", "whitespace-nowrap");
    expect(updatedDescription).toHaveAttribute("title", expect.stringContaining("회계 운영진"));
  });

  it("작은 화면은 2열 압축 카드이고 1024px부터 표 형태를 적용한다", async () => {
    renderPage();

    const email = await screen.findByText("member@example.com");
    const memberRow = email.parentElement?.parentElement;
    const desktopHeader = screen.getByRole("button", { name: "상태" }).parentElement?.parentElement;
    const mobileFilters = screen.getByLabelText("학번 필터").parentElement?.parentElement;

    expect(memberRow).toHaveClass(
      "gap-x-3",
      "px-3",
      "grid-cols-2",
      "lg:min-w-[1220px]",
      "lg:items-start",
    );
    expect(desktopHeader).toHaveClass(
      "hidden",
      "lg:grid",
      "gap-x-3",
      "px-3",
      "lg:min-w-[1220px]",
    );
    expect(mobileFilters).toHaveClass("lg:hidden");
  });

  it("카카오톡과 디스코드 초대 여부를 부원별로 저장한다", async () => {
    renderPage();

    const kakao = await screen.findByLabelText("김부원 카카오톡 초대 완료");
    const discord = screen.getByLabelText("김부원 디스코드 초대 완료");
    expect(kakao).not.toBeChecked();
    expect(discord).not.toBeChecked();
    fireEvent.click(kakao);

    await waitFor(() => expect(changeGenerationMemberInvitationStatus).toHaveBeenCalledWith(
      "member-1",
      { kakaoInvited: true, discordInvited: false },
    ));
    expect(await screen.findByLabelText("김부원 카카오톡 초대 완료")).toBeChecked();
  });

  it("초대 미완료 인원수를 표시하고 초대 상태로 필터링한다", async () => {
    const completedMember = {
      ...inactiveUnpaidMember,
      kakaoInvited: true,
      discordInvited: true,
    };
    listMembers.mockResolvedValueOnce([activeMember, completedMember]);
    renderPage();

    expect(await screen.findByText("카카오톡 미초대 1명 · 디스코드 미초대 1명")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("초대 필터"), { target: { value: "KAKAO_PENDING" } });

    expect(screen.queryAllByText("김부원").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("이부원")).toHaveLength(0);
    expect(screen.getByText("1명 표시 중")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("초대 필터"), { target: { value: "COMPLETE" } });
    expect(screen.queryAllByText("이부원").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("김부원")).toHaveLength(0);
  });

  it("제목 행에서도 초대 필터를 적용하고 적용 상태를 표시한다", async () => {
    listMembers.mockResolvedValueOnce([activeMember, { ...inactiveUnpaidMember, kakaoInvited: true }]);
    renderPage();

    const invitationHeader = await screen.findByRole("button", { name: "초대 확인" });
    fireEvent.click(invitationHeader);
    fireEvent.change(screen.getByLabelText("표 초대 필터"), { target: { value: "BOTH_PENDING" } });

    expect(screen.queryAllByText("김부원").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("이부원")).toHaveLength(0);
    expect(invitationHeader.parentElement).toHaveClass("bg-[var(--panel-muted)]");
  });

  it("긴 이메일을 한 줄로 줄이고 이름을 누르면 상세 창을 연다", async () => {
    renderPage();

    const email = await screen.findByText("member@example.com");
    expect(email).toHaveClass("truncate");
    expect(email).toHaveAttribute("title", "member@example.com");

    fireEvent.click(screen.getByRole("button", { name: "김부원 부원 정보 보기" }));
    expect(screen.getByRole("dialog", { name: "김부원 부원 정보" })).toHaveTextContent("010-1111-2222");
  });

  it("이름과 학번과 이메일과 전화번호를 한 검색창에서 찾는다", async () => {
    listMembers.mockResolvedValueOnce([
      activeMember,
      { ...inactiveUnpaidMember, phone: "010-9999-8888" },
    ]);
    renderPage();

    await screen.findByText("이부원");
    const search = await screen.findByLabelText("부원 검색");
    fireEvent.change(search, { target: { value: "9999" } });

    expect(screen.queryAllByText("이부원").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("김부원")).toHaveLength(0);
    expect(screen.getByText("1명 표시 중")).toBeInTheDocument();
  });

  it("행의 일반 영역을 누르면 상세 창을 열지만 회비와 초대 입력은 열지 않는다", async () => {
    renderPage();

    const email = await screen.findByText("member@example.com");
    fireEvent.click(email);
    expect(screen.getByRole("dialog", { name: "김부원 부원 정보" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "부원 정보 창 닫기" }));

    fireEvent.mouseDown(screen.getByLabelText("김부원 회비 상태"));
    fireEvent.click(screen.getByLabelText("김부원 카카오톡 초대 완료"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("상세 창을 닫은 뒤 같은 부원을 다시 열고 원래 버튼으로 초점을 돌린다", async () => {
    renderPage();

    const openButton = await screen.findByRole("button", { name: "김부원 부원 정보 보기" });
    fireEvent.click(openButton);
    expect(screen.getByRole("dialog", { name: "김부원 부원 정보" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "부원 정보 창 닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();

    fireEvent.click(openButton);
    expect(screen.getByRole("dialog", { name: "김부원 부원 정보" })).toBeInTheDocument();
  });

  it("한 번에 한 부원만 선택하고 닫은 뒤 다른 부원을 연다", async () => {
    listMembers.mockResolvedValueOnce([activeMember, inactiveUnpaidMember]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "김부원 부원 정보 보기" }));
    expect(screen.getByRole("dialog", { name: "김부원 부원 정보" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "부원 정보 창 닫기" }));
    fireEvent.click(screen.getByRole("button", { name: "이부원 부원 정보 보기" }));

    expect(screen.queryByRole("dialog", { name: "김부원 부원 정보" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "이부원 부원 정보" })).toBeInTheDocument();
  });

  it("활동 중, 비활동, 탈퇴 순서로 부원 목록을 정렬한다", async () => {
    const withdrawnMember: GenerationMember = {
      ...inactiveUnpaidMember,
      id: "member-3",
      personId: "person-3",
      name: "박부원",
      email: "withdrawn@example.com",
      status: "WITHDRAWN",
    };
    listMembers.mockResolvedValueOnce([withdrawnMember, inactiveUnpaidMember, activeMember]);
    renderPage();

    const memberButtons = await screen.findAllByRole("button", { name: /부원 정보 보기/ });
    expect(memberButtons.map(button => button.textContent)).toEqual(["김부원", "이부원", "박부원"]);
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

    fireEvent.click(await screen.findByRole("button", { name: "학번" }));
    fireEvent.change(screen.getByLabelText("표 학번 필터"), { target: { value: "2025" } });
    fireEvent.click(screen.getByRole("button", { name: "회비 확인" }));
    fireEvent.change(screen.getByLabelText("표 회비 필터"), { target: { value: "UNPAID" } });

    await waitFor(() => expect(screen.queryAllByText("이부원").length).toBeGreaterThan(0));
    expect(screen.queryAllByText("김부원")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
    await waitFor(() => expect(screen.queryAllByText("김부원").length).toBeGreaterThan(0));
  });
});
