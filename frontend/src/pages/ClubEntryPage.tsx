import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listClubs } from "../api/clubs";
import { apiErrorMessage } from "../api/http";
import { listMyStaffInvitations } from "../api/staff";
import { Brand } from "../components/Brand";
import { LoadingScreen } from "../components/LoadingScreen";

type ClubsResult = PromiseSettledResult<Awaited<ReturnType<typeof listClubs>>>;
type InvitationsResult = PromiseSettledResult<Awaited<ReturnType<typeof listMyStaffInvitations>>>;

export function ClubEntryPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("접근 가능한 동아리를 확인하고 있습니다.");
  const [error, setError] = useState("");

  const handleResults = useCallback((clubsResult: ClubsResult, invitationsResult: InvitationsResult) => {
    if (clubsResult.status === "rejected") {
      setError(apiErrorMessage(
        clubsResult.reason,
        "동아리 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      ));
      return;
    }

    const clubs = clubsResult.value;
    const invitations = invitationsResult.status === "fulfilled" ? invitationsResult.value : [];
    if (clubs.length === 0 && invitations.some(invitation => invitation.status === "PENDING")) {
      navigate("/staff-invitations", { replace: true });
      return;
    }
    if (clubs.length === 0) {
      navigate("/clubs/new", { replace: true });
      return;
    }
    if (clubs.length === 1) {
      navigate(`/clubs/${clubs[0].id}/dashboard`, { replace: true });
      return;
    }
    navigate("/clubs", { replace: true });
  }, [navigate]);

  const load = useCallback(() => Promise.allSettled([
    listClubs(),
    listMyStaffInvitations(),
  ]).then(([clubsResult, invitationsResult]) => handleResults(clubsResult, invitationsResult)), [handleResults]);

  const retry = () => {
    setError("");
    setMessage("접근 가능한 동아리를 확인하고 있습니다.");
    void load();
  };

  useEffect(() => {
    void Promise.allSettled([
      listClubs(),
      listMyStaffInvitations(),
    ]).then(([clubsResult, invitationsResult]) => handleResults(clubsResult, invitationsResult));
  }, [handleResults]);

  if (error) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[var(--surface)] px-5 font-body">
        <section className="w-full max-w-md rounded-[12px] border border-[var(--border-subtle)] bg-white p-8 text-center shadow-sm">
          <div className="flex justify-center"><Brand /></div>
          <h1 className="mt-8 text-lg font-extrabold text-[var(--text-primary)]">동아리 정보를 확인하지 못했습니다.</h1>
          <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button type="button" onClick={retry} className="rounded-lg bg-[var(--navy)] px-4 py-2.5 text-xs font-extrabold text-white">
              다시 시도
            </button>
            <button type="button" onClick={() => navigate("/clubs")} className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)]">
              내 동아리 보기
            </button>
          </div>
        </section>
      </main>
    );
  }

  return <LoadingScreen message={message} />;
}
