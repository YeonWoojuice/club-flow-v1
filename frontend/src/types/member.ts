export type MemberJoinedSource = "APPLICATION_ACCEPT" | "MANUAL" | "RETENTION";
export type GenerationMemberStatus = "ACTIVE" | "INACTIVE" | "WITHDRAWN";

export type GenerationMember = {
  id: string;
  generationId: string;
  generationName: string;
  personId: string;
  name: string;
  email: string;
  phone: string | null;
  studentNumber: string;
  joinedSource: MemberJoinedSource;
  status: GenerationMemberStatus;
  createdAt: string;
};
