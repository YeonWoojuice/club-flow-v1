import { apiRequest } from "./http";
import type { CurrentUser } from "../types/auth";

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/api/auth/me");
}

export function logout() {
  return apiRequest<void>("/api/auth/logout", { method: "POST" });
}
