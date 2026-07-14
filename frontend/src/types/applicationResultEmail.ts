export type ApplicationResultEmailDecision = "ACCEPTED" | "REJECTED";

export type ApplicationResultEmailRequest = {
  generationId: string;
  decision: ApplicationResultEmailDecision;
  subjectTemplate: string;
  bodyTemplate: string;
  kakaoLink?: string;
};

export type ApplicationResultEmailRecipient = {
  applicationId: string;
  memberName: string;
  email: string;
  discordName: string | null;
  resultEmailStatus: "NOT_SENT" | "PENDING" | "SENT" | "FAILED" | "UNKNOWN";
  sendable: boolean;
  reason: string | null;
  renderedSubject: string | null;
  renderedBody: string | null;
};

export type ApplicationResultEmailPreview = {
  totalCount: number;
  sendableCount: number;
  excludedCount: number;
  rows: ApplicationResultEmailRecipient[];
};

export type ApplicationResultEmailSendResult = {
  batchId: string;
  decision: ApplicationResultEmailDecision;
  status: "PENDING" | "COMPLETED" | "PARTIAL_FAILED" | "FAILED" | "UNKNOWN";
  totalCount: number;
  sentCount: number;
  failedCount: number;
  unknownCount: number;
  createdAt: string;
  completedAt: string | null;
  messages: {
    messageId: string;
    applicationId: string;
    memberName: string;
    email: string;
    status: "PENDING" | "SENT" | "FAILED" | "UNKNOWN";
    providerMessageId: string | null;
    errorMessage: string | null;
    sentAt: string | null;
  }[];
};
