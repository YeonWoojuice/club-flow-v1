import { apiRequest } from "./http";
import type { GenerationMember } from "../types/member";

export function listMembers(clubId: string) {
  return apiRequest<GenerationMember[]>(`/api/clubs/${clubId}/members`);
}
