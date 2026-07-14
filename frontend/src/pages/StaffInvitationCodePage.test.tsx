import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffInvitationCodePage } from "./StaffInvitationCodePage";

const { acceptStaffInvitationByCode, navigate } = vi.hoisted(() => ({
  acceptStaffInvitationByCode: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../api/staff", () => ({ acceptStaffInvitationByCode }));
vi.mock("react-router-dom", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

describe("StaffInvitationCodePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acceptStaffInvitationByCode.mockResolvedValue({ clubId: "club-1" });
  });

  it("코드를 대문자로 정리해 수락하고 해당 동아리로 이동한다", async () => {
    render(<MemoryRouter><StaffInvitationCodePage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("초대 코드"), { target: { value: "abcd2345" } });
    fireEvent.click(screen.getByRole("button", { name: "코드로 참여하기" }));

    await waitFor(() => expect(acceptStaffInvitationByCode).toHaveBeenCalledWith("ABCD2345"));
    expect(navigate).toHaveBeenCalledWith("/clubs/club-1/dashboard", { replace: true });
  });
});
