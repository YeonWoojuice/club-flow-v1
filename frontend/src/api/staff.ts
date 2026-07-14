import { apiRequest } from "./http";
import type {
  ChangeStaffRoleInput,
  ClubStaff,
  CreateStaffInvitationInput,
  StaffInvitation,
} from "../types/staff";

export function listClubStaff(clubId: string) {
  return apiRequest<ClubStaff[]>(`/api/clubs/${clubId}/staff`);
}

export function changeClubStaffRole(
  clubId: string,
  staffId: string,
  input: ChangeStaffRoleInput,
) {
  return apiRequest<ClubStaff>(`/api/clubs/${clubId}/staff/${staffId}/role`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function revokeClubStaff(clubId: string, staffId: string) {
  return apiRequest<ClubStaff>(`/api/clubs/${clubId}/staff/${staffId}`, {
    method: "DELETE",
  });
}

export function listClubStaffInvitations(clubId: string) {
  return apiRequest<StaffInvitation[]>(`/api/clubs/${clubId}/staff-invitations`);
}

export function createStaffInvitation(clubId: string, input: CreateStaffInvitationInput) {
  return apiRequest<StaffInvitation>(`/api/clubs/${clubId}/staff-invitations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelStaffInvitation(clubId: string, invitationId: string) {
  return apiRequest<StaffInvitation>(`/api/clubs/${clubId}/staff-invitations/${invitationId}`, {
    method: "DELETE",
  });
}

export function listMyStaffInvitations() {
  return apiRequest<StaffInvitation[]>("/api/staff-invitations/me");
}

export function acceptStaffInvitation(invitationId: string) {
  return apiRequest<ClubStaff>(`/api/staff-invitations/${invitationId}/accept`, {
    method: "POST",
  });
}

export function acceptStaffInvitationByCode(code: string) {
  return apiRequest<StaffInvitation>("/api/staff-invitations/accept-by-code", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function rejectStaffInvitation(invitationId: string) {
  return apiRequest<StaffInvitation>(`/api/staff-invitations/${invitationId}/reject`, {
    method: "POST",
  });
}
