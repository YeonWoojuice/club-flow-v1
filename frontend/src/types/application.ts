export type ApplicationStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELED";

export type ApplicationSourceType = "MANUAL" | "GOOGLE_FORM";

export type ApplicationResultEmailStatus =
  | "NOT_SENT"
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "UNKNOWN";

export type ApplicationAnswer = {
  id: string;
  questionKey: string;
  questionLabel: string;
  answerValue: string | null;
  answerJson: unknown | null;
  displayOrder: number;
};

export type ApplicationSummary = {
  id: string;
  generationId: string;
  generationName: string;
  personId: string;
  name: string;
  email: string;
  phone: string | null;
  studentNumber: string;
  status: ApplicationStatus;
  resultEmailStatus: ApplicationResultEmailStatus;
  resultEmailSentAt: string | null;
  sourceType: ApplicationSourceType;
  submittedAt: string;
};

export type ApplicationDetail = ApplicationSummary & {
  applicationAnswers: ApplicationAnswer[];
};

export type ManualApplicationInput = {
  generationId: string;
  name: string;
  email: string;
  /** 백엔드 계약상 선택 항목. 빈 값은 필드를 생략해 null로 저장되게 한다. */
  phone?: string;
  /** 결과 메일의 {{discordName}} 변수에 사용할 선택 항목이다. */
  discordName?: string;
  studentNumber: string;
  applicationAnswers: {
    questionKey: string;
    questionLabel: string;
    answerValue: string;
  }[];
};
