import type { Club } from "../types/club";

const clubCache = new Map<string, Club>();

export function getCachedClub(clubId: string) {
  return clubCache.get(clubId) ?? null;
}

export function setCachedClub(clubId: string, club: Club) {
  clubCache.set(clubId, club);
}

export function deleteCachedClub(clubId: string) {
  clubCache.delete(clubId);
}

export function clearCachedClubs() {
  clubCache.clear();
}
