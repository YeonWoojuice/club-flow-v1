import { apiRequest } from "./http";
import type { Club, CreateClubInput } from "../types/club";

export function listClubs() {
  return apiRequest<Club[]>("/api/clubs");
}

export function getClub(clubId: string) {
  return apiRequest<Club>(`/api/clubs/${clubId}`);
}

export function createClub(input: CreateClubInput) {
  return apiRequest<Club>("/api/clubs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
