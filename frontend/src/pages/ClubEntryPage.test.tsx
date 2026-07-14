import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClubEntryPage } from "./ClubEntryPage";

const { listClubs, listMyStaffInvitations, navigate } = vi.hoisted(() => ({
  listClubs: vi.fn(),
  listMyStaffInvitations: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../api/clubs", () => ({ listClubs }));
vi.mock("../api/staff", () => ({ listMyStaffInvitations }));
vi.mock("react-router-dom", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

describe("ClubEntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listClubs.mockResolvedValue([]);
    listMyStaffInvitations.mockResolvedValue([]);
  });

  it("접근 가능한 동아리가 없어도 받은 초대가 있으면 초대 화면을 먼저 연다", async () => {
    listMyStaffInvitations.mockResolvedValueOnce([{
      id: "invitation-1",
      status: "PENDING",
    }]);

    render(<MemoryRouter><ClubEntryPage /></MemoryRouter>);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/staff-invitations", { replace: true }));
    expect(navigate).not.toHaveBeenCalledWith("/clubs/new", expect.anything());
  });

  it("가입한 동아리가 있으면 받은 초대보다 기존 동아리로 먼저 이동한다", async () => {
    listClubs.mockResolvedValueOnce([{ id: "club-1" }]);
    listMyStaffInvitations.mockResolvedValueOnce([{
      id: "invitation-1",
      status: "PENDING",
    }]);

    render(<MemoryRouter><ClubEntryPage /></MemoryRouter>);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      "/clubs/club-1/dashboard",
      { replace: true },
    ));
    expect(navigate).not.toHaveBeenCalledWith("/staff-invitations", expect.anything());
  });

  it("받은 초대와 동아리가 모두 없으면 동아리 생성 화면으로 이동한다", async () => {
    render(<MemoryRouter><ClubEntryPage /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/clubs/new", { replace: true }));
  });

  it("받은 초대 조회만 실패하면 가입한 동아리로 계속 이동한다", async () => {
    listClubs.mockResolvedValueOnce([{ id: "club-1" }]);
    listMyStaffInvitations.mockRejectedValueOnce(new Error("temporary failure"));

    render(<MemoryRouter><ClubEntryPage /></MemoryRouter>);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      "/clubs/club-1/dashboard",
      { replace: true },
    ));
  });

  it("동아리 조회가 실패하면 다시 시도하거나 동아리 목록으로 이동할 수 있다", async () => {
    listClubs.mockRejectedValueOnce(new Error("temporary failure"));

    render(<MemoryRouter><ClubEntryPage /></MemoryRouter>);

    expect(await screen.findByRole("alert")).toHaveTextContent("동아리 정보를 불러오지 못했습니다.");
    fireEvent.click(screen.getByRole("button", { name: "내 동아리 보기" }));
    expect(navigate).toHaveBeenCalledWith("/clubs");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(listClubs).toHaveBeenCalledTimes(2));
  });
});
