import { apiRequest, clearCsrfToken } from "./http";
import type { CurrentUser } from "../types/auth";

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/api/auth/me");
}

export async function logout() {
  try {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
  } finally {
    clearCsrfToken();
  }
}
