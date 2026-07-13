import { apiRequest } from "./http";
import type {
  CreateGenerationInput,
  Generation,
  UpdateGenerationInput,
} from "../types/generation";

export function listGenerations(clubId: string) {
  return apiRequest<Generation[]>(`/api/clubs/${clubId}/generations`);
}

export function createGeneration(clubId: string, input: CreateGenerationInput) {
  return apiRequest<Generation>(`/api/clubs/${clubId}/generations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateGeneration(generationId: string, input: UpdateGenerationInput) {
  return apiRequest<Generation>(`/api/generations/${generationId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function activateGeneration(generationId: string) {
  return apiRequest<Generation>(`/api/generations/${generationId}/activate`, {
    method: "POST",
  });
}
