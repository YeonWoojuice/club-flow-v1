import { apiRequest } from "./http";
import type {
  ApplicationResultEmailPreview,
  ApplicationResultEmailRequest,
  ApplicationResultEmailSendResult,
} from "../types/applicationResultEmail";

export function previewApplicationResultEmails(
  clubId: string,
  request: ApplicationResultEmailRequest,
) {
  return apiRequest<ApplicationResultEmailPreview>(
    `/api/clubs/${clubId}/application-result-emails/preview`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function sendApplicationResultEmails(
  clubId: string,
  request: ApplicationResultEmailRequest,
) {
  return apiRequest<ApplicationResultEmailSendResult>(
    `/api/clubs/${clubId}/application-result-emails/send`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}
