export type ApplicationStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELED";

export type ApplicationSourceType = "MANUAL" | "GOOGLE_FORM";

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
  phone: string;
  studentNumber: string;
  applicationAnswers: {
    questionKey: string;
    questionLabel: string;
    answerValue: string;
  }[];
};
