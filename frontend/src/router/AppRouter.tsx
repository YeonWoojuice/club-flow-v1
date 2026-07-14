import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { ClubCreatePage } from "../pages/ClubCreatePage";
import { ClubDashboardPage } from "../pages/ClubDashboardPage";
import { ClubEntryPage } from "../pages/ClubEntryPage";
import { ClubListPage } from "../pages/ClubListPage";
import { GenerationPage } from "../pages/GenerationPage";
import { ApplicationListPage } from "../pages/ApplicationListPage";
import { ManualApplicationPage } from "../pages/ManualApplicationPage";
import { ApplicationDetailPage } from "../pages/ApplicationDetailPage";
import { MemberListPage } from "../pages/MemberListPage";
import { LoginPage } from "../pages/LoginPage";
import { RetentionImportPage } from "../pages/RetentionImportPage";
import { ApplicationImportPage } from "../pages/ApplicationImportPage";
import { MyStaffInvitationsPage } from "../pages/MyStaffInvitationsPage";
import { StaffInvitationCodePage } from "../pages/StaffInvitationCodePage";
import { StaffManagementPage } from "../pages/StaffManagementPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<ClubEntryPage />} />
        <Route path="/auth/callback" element={<ClubEntryPage />} />
        <Route path="/clubs" element={<ClubListPage />} />
        <Route path="/staff-invitations" element={<MyStaffInvitationsPage />} />
        <Route path="/staff-invitations/code" element={<StaffInvitationCodePage />} />
        <Route path="/clubs/new" element={<ClubCreatePage />} />
        <Route path="/clubs/:clubId/dashboard" element={<ClubDashboardPage />} />
        <Route path="/clubs/:clubId/generations" element={<GenerationPage />} />
        <Route path="/clubs/:clubId/applications" element={<ApplicationListPage />} />
        <Route path="/clubs/:clubId/applications/new" element={<ManualApplicationPage />} />
        <Route path="/clubs/:clubId/applications/import" element={<ApplicationImportPage />} />
        <Route path="/clubs/:clubId/applications/:applicationId" element={<ApplicationDetailPage />} />
        <Route path="/clubs/:clubId/members" element={<MemberListPage />} />
        <Route path="/clubs/:clubId/members/retention" element={<RetentionImportPage />} />
        <Route path="/clubs/:clubId/staff" element={<StaffManagementPage />} />
        <Route path="/clubs/:clubId/staff-invitations" element={<MyStaffInvitationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
