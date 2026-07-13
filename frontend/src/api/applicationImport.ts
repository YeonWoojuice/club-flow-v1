import { apiRequest } from "./http";
import type {
  ApplicationImportApplyResult,
  ApplicationImportPreview,
  ApplicationImportRowInput,
  ApplicationImportSource,
  ApplicationImportSourceInput,
  ApplicationImportSourceTable,
  ApplicationImportWorkbook,
} from "../types/applicationImport";
import type { GoogleAuthorizationUrl, GoogleConnectionStatus } from "../types/retention";

export function readApplicationGoogleSheet(clubId: string, spreadsheetId: string) {
  return apiRequest<ApplicationImportWorkbook>(
    `/api/clubs/${clubId}/application-import/google-sheet/${encodeURIComponent(spreadsheetId)}/tables`,
  );
}

export function previewApplicationImport(
  clubId: string,
  generationId: string,
  rows: ApplicationImportRowInput[],
) {
  return apiRequest<ApplicationImportPreview>(`/api/clubs/${clubId}/application-import/preview`, {
    method: "POST",
    body: JSON.stringify({ generationId, rows }),
  });
}

export function applyApplicationImport(
  clubId: string,
  generationId: string,
  rows: ApplicationImportRowInput[],
) {
  return apiRequest<ApplicationImportApplyResult>(`/api/clubs/${clubId}/application-import/apply`, {
    method: "POST",
    body: JSON.stringify({ generationId, rows }),
  });
}

export function getGoogleConnectionStatus() {
  return apiRequest<GoogleConnectionStatus>("/api/google-data/status");
}

export function getGoogleAuthorizationUrl(returnPath: string) {
  return apiRequest<GoogleAuthorizationUrl>(
    `/api/google-data/oauth/authorization-url?returnPath=${encodeURIComponent(returnPath)}`,
  );
}

export function disconnectGoogleConnection() {
  return apiRequest<void>("/api/google-data/connection", {
    method: "DELETE",
  });
}

export function listApplicationImportSources(clubId: string) {
  return apiRequest<ApplicationImportSource[]>(`/api/clubs/${clubId}/application-import/sources`);
}

export function createApplicationImportSource(clubId: string, input: ApplicationImportSourceInput) {
  return apiRequest<ApplicationImportSource>(`/api/clubs/${clubId}/application-import/sources`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateApplicationImportSource(
  clubId: string,
  sourceId: string,
  input: ApplicationImportSourceInput,
) {
  return apiRequest<ApplicationImportSource>(
    `/api/clubs/${clubId}/application-import/sources/${sourceId}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function deleteApplicationImportSource(clubId: string, sourceId: string) {
  return apiRequest<void>(`/api/clubs/${clubId}/application-import/sources/${sourceId}`, {
    method: "DELETE",
  });
}

export function readApplicationImportSource(clubId: string, sourceId: string) {
  return apiRequest<ApplicationImportSourceTable>(
    `/api/clubs/${clubId}/application-import/sources/${sourceId}/table`,
  );
}
