import type { components } from "./api.gen";

type Schemas = components["schemas"];
type StaffSchema = Schemas["ClubStaffResponse"];
type InvitationSchema = Schemas["ClubStaffInvitationResponse"];
type InvitationRole = NonNullable<InvitationSchema["role"]>;

export type StaffInvitationStatus = NonNullable<InvitationSchema["status"]>;
export type InvitableStaffRole = Exclude<InvitationRole, "PRESIDENT">;

export type ClubStaff = Required<StaffSchema>;

export type StaffInvitation = Required<Omit<InvitationSchema, "respondedAt">> & {
  respondedAt: string | null;
  invitationCode?: string | null;
};

export type CreateStaffInvitationInput = Omit<
  Schemas["CreateClubStaffInvitationRequest"],
  "role"
> & {
  role: InvitableStaffRole;
};

export type ChangeStaffRoleInput = {
  role: InvitableStaffRole;
};
