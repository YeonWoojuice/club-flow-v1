export type ClubRole = "PRESIDENT" | "VICE_PRESIDENT" | "STAFF";
export type ClubStaffStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";

export type Club = {
  id: string;
  name: string;
  description: string | null;
  role: ClubRole;
  status: ClubStaffStatus;
  createdAt: string;
};

export type CreateClubInput = {
  name: string;
  description: string;
};
