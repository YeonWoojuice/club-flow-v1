import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { StaffManagementPage } from "./StaffManagementPage";

const api = vi.hoisted(() => ({
  getClub: vi.fn(),
  listClubStaff: vi.fn(),
  listClubStaffInvitations: vi.fn(),
  createStaffInvitation: vi.fn(),
  changeClubStaffRole: vi.fn(),
  revokeClubStaff: vi.fn(),
  cancelStaffInvitation: vi.fn(),
}));

vi.mock("../api/clubs", () => ({ getClub: api.getClub }));
vi.mock("../api/staff", () => ({
  listClubStaff: api.listClubStaff,
  listClubStaffInvitations: api.listClubStaffInvitations,
  createStaffInvitation: api.createStaffInvitation,
  changeClubStaffRole: api.changeClubStaffRole,
  revokeClubStaff: api.revokeClubStaff,
  cancelStaffInvitation: api.cancelStaffInvitation,
}));
vi.mock("../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const president = {
  id: "staff-president",
  userId: "user-president",
  name: "김회장",
  email: "president@example.com",
  role: "PRESIDENT",
  status: "APPROVED",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

const staffMember = {
  id: "staff-1",
  userId: "user-1",
  name: "이운영",
  email: "staff@example.com",
  role: "STAFF",
  status: "APPROVED",
  createdAt: "2026-07-02T00:00:00Z",
  updatedAt: "2026-07-02T00:00:00Z",
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/clubs/club-1/staff"]}>
      <Routes><Route path="/clubs/:clubId/staff" element={<StaffManagementPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe("StaffManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    api.getClub.mockResolvedValue({ id: "club-1", role: "PRESIDENT" });
    api.listClubStaff.mockResolvedValue([president, staffMember]);
    api.listClubStaffInvitations.mockResolvedValue([]);
    api.revokeClubStaff.mockResolvedValue(undefined);
  });

  it("회장이 이메일과 역할을 선택해 운영진을 초대한다", async () => {
    const invitation = {
      id: "invitation-1",
      clubId: "club-1",
      clubName: "ClubFlow",
      email: "new@example.com",
      role: "VICE_PRESIDENT",
      status: "PENDING",
      invitedByUserId: "user-president",
      invitedByName: "김회장",
      createdAt: "2026-07-10T00:00:00Z",
      respondedAt: null,
      invitationCode: "ABCD2345",
    };
    api.createStaffInvitation.mockResolvedValueOnce(invitation);
    renderPage();

    fireEvent.change(await screen.findByLabelText("Google 이메일"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("역할", { selector: "select" }), { target: { value: "VICE_PRESIDENT" } });
    fireEvent.click(screen.getByRole("button", { name: "초대 코드 만들기" }));

    await waitFor(() => expect(api.createStaffInvitation).toHaveBeenCalledWith("club-1", {
      email: "new@example.com",
      role: "VICE_PRESIDENT",
    }));
    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
    expect(screen.getByText("ABCD2345")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "코드 복사" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCD2345"));
    expect(await screen.findByText("초대 코드를 복사했습니다.")).toBeInTheDocument();
  });

  it("역할을 변경하고 확인 후 접근 권한을 해제한다", async () => {
    api.changeClubStaffRole.mockResolvedValueOnce({ ...staffMember, role: "VICE_PRESIDENT" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();

    fireEvent.change(await screen.findByLabelText("이운영 역할"), { target: { value: "VICE_PRESIDENT" } });
    await waitFor(() => expect(api.changeClubStaffRole).toHaveBeenCalledWith("club-1", "staff-1", { role: "VICE_PRESIDENT" }));
    expect(screen.getByLabelText("이운영 역할")).toHaveValue("VICE_PRESIDENT");

    fireEvent.click(screen.getByRole("button", { name: "접근 해제" }));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    await waitFor(() => expect(api.revokeClubStaff).toHaveBeenCalledWith("club-1", "staff-1"));
    expect(screen.queryByText("staff@example.com")).not.toBeInTheDocument();
  });

  it("회장이 아니면 관리 API를 호출하지 않고 권한 안내를 표시한다", async () => {
    api.getClub.mockResolvedValueOnce({ id: "club-1", role: "STAFF" });
    renderPage();

    expect(await screen.findByText("회장만 관리할 수 있습니다.")).toBeInTheDocument();
    expect(api.listClubStaff).not.toHaveBeenCalled();
    expect(api.listClubStaffInvitations).not.toHaveBeenCalled();
    expect(screen.queryByText("새 운영진 초대")).not.toBeInTheDocument();
  });

  it("해제된 운영진은 현재 운영진 목록에서 제외한다", async () => {
    api.listClubStaff.mockResolvedValueOnce([
      president,
      { ...staffMember, id: "revoked-1", email: "revoked@example.com", status: "REVOKED" },
    ]);
    renderPage();

    expect(await screen.findByText("president@example.com")).toBeInTheDocument();
    expect(screen.queryByText("revoked@example.com")).not.toBeInTheDocument();
  });
});
