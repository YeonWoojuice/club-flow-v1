import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import type { GenerationMember } from "../types/member";
import { MemberDetailModal } from "./MemberDetailModal";

const {
  changeGenerationMemberStatus,
  listGenerationMemberStatusHistory,
} = vi.hoisted(() => ({
  changeGenerationMemberStatus: vi.fn(),
  listGenerationMemberStatusHistory: vi.fn(),
}));

vi.mock("../api/members", () => ({
  changeGenerationMemberStatus,
  listGenerationMemberStatusHistory,
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
  status: "REGULAR",
  duesStatus: "PAID",
  kakaoInvited: true,
  discordInvited: false,
  duesStatusUpdatedAt: null,
  duesStatusUpdatedByUserId: null,
  duesStatusUpdatedByName: null,
  createdAt: "2026-07-01T00:00:00Z",
};

function renderModal(
  member = activeMember,
  onClose = vi.fn(),
  onUpdated = vi.fn(),
) {
  return {
    onClose,
    onUpdated,
    ...render(
      <MemberDetailModal
        member={member}
        returnFocusRef={{ current: null }}
        onClose={onClose}
        onUpdated={onUpdated}
      />,
    ),
  };
}

describe("MemberDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listGenerationMemberStatusHistory.mockResolvedValue([]);
    changeGenerationMemberStatus.mockResolvedValue({ ...activeMember, status: "INACTIVE" });
  });

  it("부원의 기본 정보와 운영 상태를 한 화면에 표시한다", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", { name: "김부원 부원 정보" });
    expect(dialog).toHaveTextContent("20260001");
    expect(dialog).toHaveTextContent("010-1111-2222");
    expect(dialog).toHaveTextContent("member@example.com");
    expect(dialog).toHaveTextContent("납부");
    expect(dialog).toHaveTextContent("카카오톡 초대");
  });

  it("회원을 비활동으로 바꾸고 상세 창의 값을 갱신한다", async () => {
    const { onUpdated } = renderModal();

    fireEvent.click(screen.getByRole("tab", { name: "상태 변경" }));
    expect(screen.getByLabelText("변경할 상태")).toHaveValue("ASSOCIATE");
    fireEvent.change(screen.getByLabelText("변경할 상태"), { target: { value: "INACTIVE" } });
    fireEvent.change(screen.getByLabelText("사유 (선택)"), { target: { value: "군 복무" } });
    fireEvent.click(screen.getByRole("button", { name: "비활동으로 변경" }));

    await waitFor(() => expect(changeGenerationMemberStatus).toHaveBeenCalledWith(
      "member-1",
      { status: "INACTIVE", reason: "군 복무" },
    ));
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ status: "INACTIVE" }));
    expect(await screen.findByRole("status")).toHaveTextContent("비활동으로 변경했습니다");
  });

  it("비활동 부원의 탈퇴는 사유와 한 번 더 확인을 받은 뒤에만 저장한다", async () => {
    changeGenerationMemberStatus.mockResolvedValueOnce({ ...activeMember, status: "WITHDRAWN" });
    renderModal({ ...activeMember, status: "INACTIVE" });

    fireEvent.click(screen.getByRole("tab", { name: "상태 변경" }));
    fireEvent.change(screen.getByLabelText("변경할 상태"), { target: { value: "WITHDRAWN" } });
    fireEvent.click(screen.getByRole("button", { name: "탈퇴 처리" }));
    expect(screen.getByRole("alert")).toHaveTextContent("탈퇴 사유를 입력해 주세요.");
    expect(changeGenerationMemberStatus).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("사유 (필수)"), { target: { value: "개인 사정" } });
    fireEvent.click(screen.getByRole("button", { name: "탈퇴 처리" }));
    expect(screen.getByRole("alertdialog", { name: "탈퇴 최종 확인" })).toBeInTheDocument();
    expect(changeGenerationMemberStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "탈퇴 확정" }));
    await waitFor(() => expect(changeGenerationMemberStatus).toHaveBeenCalledWith(
      "member-1",
      { status: "WITHDRAWN", reason: "개인 사정" },
    ));
  });

  it("서버 오류를 그대로 표시하고 다시 시도할 수 있게 버튼을 푼다", async () => {
    changeGenerationMemberStatus.mockRejectedValueOnce(
      new ApiError(409, "탈퇴한 부원의 상태는 변경할 수 없습니다."),
    );
    renderModal();

    fireEvent.click(screen.getByRole("tab", { name: "상태 변경" }));
    fireEvent.change(screen.getByLabelText("변경할 상태"), { target: { value: "INACTIVE" } });
    fireEvent.click(screen.getByRole("button", { name: "비활동으로 변경" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("탈퇴한 부원의 상태는 변경할 수 없습니다.");
    expect(screen.getByRole("button", { name: "비활동으로 변경" })).toBeEnabled();
  });

  it("변경 이력의 로딩, 결과, 실패 후 재시도를 구분한다", async () => {
    listGenerationMemberStatusHistory
      .mockRejectedValueOnce(new ApiError(500, "변경 이력을 조회하지 못했습니다."))
      .mockResolvedValueOnce([{
        id: "history-1",
        previousStatus: "REGULAR",
        newStatus: "INACTIVE",
        reason: "군 복무",
        changedByUserId: "user-1",
        changedByName: "운영진",
        changedAt: "2026-07-10T03:00:00Z",
      }]);
    renderModal();

    fireEvent.click(screen.getByRole("tab", { name: "변경 이력" }));
    expect(screen.getByText("이력을 불러오는 중...")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("변경 이력을 조회하지 못했습니다.");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("회원 → 비활동")).toBeInTheDocument();
    expect(screen.getByText("사유: 군 복무")).toBeInTheDocument();
  });

  it("수정 중 닫으려 하면 입력 내용을 버릴지 확인한다", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole("tab", { name: "상태 변경" }));
    fireEvent.change(screen.getByLabelText("사유 (선택)"), { target: { value: "작성 중" } });
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "작성 중인 변경 취소 확인" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "버리고 닫기" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("탈퇴한 부원은 상태를 다시 바꿀 수 없지만 이력은 볼 수 있다", async () => {
    renderModal({ ...activeMember, status: "WITHDRAWN" });

    expect(screen.getByRole("tab", { name: "상태 변경" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "변경 이력" }));
    expect(await screen.findByText("아직 상태 변경 이력이 없습니다.")).toBeInTheDocument();
  });
});
