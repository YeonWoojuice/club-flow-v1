import { apiRequest } from "./http";
import type {
  ApplicationDetail,
  ApplicationStatus,
  ApplicationSummary,
  ManualApplicationInput,
} from "../types/application";

export function listApplications(clubId: string) {
  return apiRequest<ApplicationSummary[]>(`/api/clubs/${clubId}/applications`);
}

export function createManualApplication(clubId: string, input: ManualApplicationInput) {
  return apiRequest<ApplicationDetail>(`/api/clubs/${clubId}/applications/manual`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getApplication(applicationId: string) {
  return apiRequest<ApplicationDetail>(`/api/applications/${applicationId}`);
}

export function changeApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
) {
  return apiRequest<ApplicationDetail>(`/api/applications/${applicationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
