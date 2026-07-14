import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { acceptStaffInvitation, listMyStaffInvitations, rejectStaffInvitation } from "../api/staff";
import { apiErrorMessage } from "../api/http";
import { Brand } from "../components/Brand";
import { AppLayout } from "../components/AppLayout";
import type { ClubStaffRole } from "../types/club";
import type { StaffInvitation } from "../types/staff";

const roleLabel: Record<ClubStaffRole, string> = {
  PRESIDENT: "회장",
  VICE_PRESIDENT: "부회장",
  STAFF: "운영진",
};

export function MyStaffInvitationsPage() {
  const { clubId } = useParams();
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"accept" | "reject" | null>(null);
  const [acceptedInvitation, setAcceptedInvitation] = useState<StaffInvitation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listMyStaffInvitations();
      setInvitations(result.filter(invitation => invitation.status === "PENDING"));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "받은 초대를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    listMyStaffInvitations()
      .then(result => setInvitations(result.filter(invitation => invitation.status === "PENDING")))
      .catch(requestError => setError(apiErrorMessage(requestError, "받은 초대를 불러오지 못했습니다.")))
      .finally(() => setLoading(false));
  }, []);

  const respond = async (invitation: StaffInvitation, action: "accept" | "reject") => {
    if (processingId) return;
    setProcessingId(invitation.id);
    setProcessingAction(action);
    setError("");
    try {
      if (action === "accept") {
        await acceptStaffInvitation(invitation.id);
        setAcceptedInvitation(invitation);
      } else {
        await rejectStaffInvitation(invitation.id);
      }
      setInvitations(current => current.filter(item => item.id !== invitation.id));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, action === "accept" ? "초대를 수락하지 못했습니다." : "초대를 거절하지 못했습니다."));
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const invitationContent = (
    <>
      {error && (
        <div role="alert" className="mt-6 flex items-center justify-between gap-3 rounded-lg bg-[var(--danger-soft)] p-4 text-xs font-bold text-[var(--danger)]">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="underline">다시 시도</button>
        </div>
      )}
      {loading && <p className="mt-7 text-sm text-[var(--text-secondary)]">받은 초대를 불러오는 중...</p>}
      {acceptedInvitation && (
        <div aria-live="polite" className="mt-6 rounded-lg bg-[var(--success-soft)] p-4">
          <p className="text-sm font-extrabold text-[var(--success)]">{acceptedInvitation.clubName} 운영진 초대를 수락했습니다.</p>
          <Link to={`/clubs/${acceptedInvitation.clubId}/dashboard`} className="mt-3 inline-flex rounded-lg bg-[var(--navy)] px-4 py-2.5 text-xs font-extrabold text-white">
            {acceptedInvitation.clubName} 동아리로 이동
          </Link>
        </div>
      )}
      {!loading && !error && invitations.length === 0 && (
        <p className="mt-7 rounded-lg bg-[var(--panel-muted)] p-5 text-sm text-[var(--text-secondary)]">현재 기다리고 있는 운영진 초대가 없습니다.</p>
      )}
      <div className="mt-7 grid gap-3">
        {invitations.map(invitation => (
          <article key={invitation.id} className="rounded-lg border border-[var(--border-subtle)] bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">{invitation.clubName}</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">초대 역할: {roleLabel[invitation.role]}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">초대한 사람: {invitation.invitedByName}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={processingId !== null} onClick={() => void respond(invitation, "reject")} className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40">
                  {processingId === invitation.id && processingAction === "reject" ? "거절 중..." : "거절"}
                </button>
                <button type="button" disabled={processingId !== null} onClick={() => void respond(invitation, "accept")} className="rounded-lg bg-[var(--navy)] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">
                  {processingId === invitation.id && processingAction === "accept" ? "수락 중..." : "수락"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );

  if (clubId) {
    return (
      <AppLayout clubId={clubId}>
        <header className="border-b border-[var(--border-subtle)] bg-white px-4 py-5 sm:px-8">
          <h1 className="text-xl font-extrabold text-[var(--text-primary)]">받은 운영진 초대</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">동아리 이름과 역할을 확인한 뒤 수락하거나 거절해 주세요.</p>
        </header>
        <main className="p-4 sm:p-8">
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6">
            {invitationContent}
          </section>
        </main>
      </AppLayout>
    );
  }

  return (
    <main className="min-h-full bg-[var(--surface)] px-5 py-8 font-body sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Brand />
          <Link to="/clubs" className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold">내 동아리</Link>
        </div>
        <section className="mt-8 rounded-xl border border-[var(--border-subtle)] bg-white p-6 shadow-sm sm:p-9">
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">받은 운영진 초대</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">동아리 이름과 역할을 확인한 뒤 수락하거나 거절해 주세요.</p>

          {invitationContent}
        </section>
      </div>
    </main>
  );
}
