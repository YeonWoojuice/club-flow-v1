import type { components } from "./api.gen";

type Schemas = components["schemas"];
type MemberSchema = Schemas["GenerationMemberResponse"];
type HistorySchema = Schemas["GenerationMemberStatusHistoryResponse"];

export type MemberJoinedSource = NonNullable<MemberSchema["joinedSource"]>;
export type GenerationMemberStatus = NonNullable<MemberSchema["status"]>;
export type GenerationMemberDuesStatus = NonNullable<MemberSchema["duesStatus"]>;

export type GenerationMember = Required<Omit<
  MemberSchema,
  "phone" | "duesStatusUpdatedAt" | "duesStatusUpdatedByUserId" | "duesStatusUpdatedByName"
>> & {
  phone: string | null;
  duesStatus: GenerationMemberDuesStatus;
  duesStatusUpdatedAt: string | null;
  duesStatusUpdatedByUserId: string | null;
  duesStatusUpdatedByName: string | null;
};

export type GenerationMemberStatusChangeRequest =
  Schemas["ChangeGenerationMemberStatusRequest"];

export type GenerationMemberStatusHistory = Required<Omit<HistorySchema, "reason">> & {
  reason: string | null;
};
