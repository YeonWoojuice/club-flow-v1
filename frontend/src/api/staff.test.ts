import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptStaffInvitation,
  acceptStaffInvitationByCode,
  cancelStaffInvitation,
  changeClubStaffRole,
  createStaffInvitation,
  listClubStaff,
  listClubStaffInvitations,
  listMyStaffInvitations,
  rejectStaffInvitation,
  revokeClubStaff,
} from "./staff";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("./http", () => ({ apiRequest }));

describe("staff api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("운영진과 동아리 초대 API 경로 및 요청 본문을 사용한다", async () => {
    apiRequest.mockResolvedValue(undefined);
    await listClubStaff("club-1");
    await listClubStaffInvitations("club-1");
    await createStaffInvitation("club-1", { email: "staff@example.com", role: "STAFF" });
    await changeClubStaffRole("club-1", "staff-1", { role: "VICE_PRESIDENT" });
    await revokeClubStaff("club-1", "staff-1");
    await cancelStaffInvitation("club-1", "invitation-1");

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/clubs/club-1/staff");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/clubs/club-1/staff-invitations");
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/api/clubs/club-1/staff-invitations", {
      method: "POST",
      body: JSON.stringify({ email: "staff@example.com", role: "STAFF" }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(4, "/api/clubs/club-1/staff/staff-1/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "VICE_PRESIDENT" }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(5, "/api/clubs/club-1/staff/staff-1", { method: "DELETE" });
    expect(apiRequest).toHaveBeenNthCalledWith(6, "/api/clubs/club-1/staff-invitations/invitation-1", { method: "DELETE" });
  });

  it("내가 받은 초대의 조회, 수락, 거절 API를 호출한다", async () => {
    apiRequest.mockResolvedValue(undefined);
    await listMyStaffInvitations();
    await acceptStaffInvitation("invitation-1");
    await rejectStaffInvitation("invitation-2");
    await acceptStaffInvitationByCode("ABCD2345");

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/staff-invitations/me");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/staff-invitations/invitation-1/accept", { method: "POST" });
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/api/staff-invitations/invitation-2/reject", { method: "POST" });
    expect(apiRequest).toHaveBeenNthCalledWith(4, "/api/staff-invitations/accept-by-code", {
      method: "POST",
      body: JSON.stringify({ code: "ABCD2345" }),
    });
  });
});
