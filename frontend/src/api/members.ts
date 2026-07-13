import { apiRequest } from "./http";
import type {
  GenerationMember,
  GenerationMemberDuesStatus,
  GenerationMemberStatusChangeRequest,
  GenerationMemberStatusHistory,
} from "../types/member";

export function listMembers(clubId: string, generationId: string) {
  return apiRequest<GenerationMember[]>(
    `/api/clubs/${clubId}/members?generationId=${encodeURIComponent(generationId)}`,
  );
}

export function changeGenerationMemberDuesStatus(
  memberId: string,
  duesStatus: GenerationMemberDuesStatus,
) {
  return apiRequest<GenerationMember>(`/api/generation-members/${memberId}/dues-status`, {
    method: "PATCH",
    body: JSON.stringify({ duesStatus }),
  });
}

export function changeGenerationMemberStatus(
  memberId: string,
  request: GenerationMemberStatusChangeRequest,
) {
  return apiRequest<GenerationMember>(`/api/generation-members/${memberId}/status`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export function listGenerationMemberStatusHistory(memberId: string) {
  return apiRequest<GenerationMemberStatusHistory[]>(
    `/api/generation-members/${memberId}/status-history`,
  );
}
