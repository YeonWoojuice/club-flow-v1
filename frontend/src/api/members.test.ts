import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeGenerationMemberDuesStatus,
  changeGenerationMemberStatus,
  listGenerationMemberStatusHistory,
  listMembers,
} from "./members";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock("./http", () => ({ apiRequest }));

describe("members API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("부원 상태와 선택 사유를 PATCH 요청으로 전달한다", () => {
    changeGenerationMemberStatus("member/1", { status: "INACTIVE", reason: "군 복무" });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/generation-members/member/1/status",
      {
        method: "PATCH",
        body: JSON.stringify({ status: "INACTIVE", reason: "군 복무" }),
      },
    );
  });

  it("부원의 상태 변경 이력을 조회한다", () => {
    listGenerationMemberStatusHistory("member-1");

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/generation-members/member-1/status-history",
    );
  });

  it("선택한 학기의 부원만 조회한다", () => {
    listMembers("club-1", "generation/1");

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/clubs/club-1/members?generationId=generation%2F1",
    );
  });

  it("회비 확인 상태를 PATCH 요청으로 전달한다", () => {
    changeGenerationMemberDuesStatus("member-1", "PAID");

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/generation-members/member-1/dues-status",
      { method: "PATCH", body: JSON.stringify({ duesStatus: "PAID" }) },
    );
  });
});
