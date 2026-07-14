import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { getClub } from "../api/clubs";
import { apiErrorMessage } from "../api/http";
import {
  cancelStaffInvitation,
  changeClubStaffRole,
  createStaffInvitation,
  listClubStaff,
  listClubStaffInvitations,
  revokeClubStaff,
} from "../api/staff";
import { AppLayout } from "../components/AppLayout";
import type { ClubStaffRole } from "../types/club";
import type { ClubStaff, InvitableStaffRole, StaffInvitation } from "../types/staff";

const roleLabel: Record<ClubStaffRole, string> = {
  PRESIDENT: "회장",
  VICE_PRESIDENT: "부회장",
  STAFF: "운영진",
};

export function StaffManagementPage() {
  const { clubId = "" } = useParams();
  const [staff, setStaff] = useState<ClubStaff[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [isPresident, setIsPresident] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableStaffRole>("STAFF");
  const [inviting, setInviting] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const applyLoadedData = useCallback((clubRole: ClubStaffRole, staffResult: ClubStaff[], invitationResult: StaffInvitation[]) => {
    setIsPresident(clubRole === "PRESIDENT");
    setStaff(staffResult.filter(member => member.status === "APPROVED"));
    setInvitations(invitationResult.filter(invitation => invitation.status === "PENDING"));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const club = await getClub(clubId);
      if (club.role !== "PRESIDENT") {
        setIsPresident(false);
        setStaff([]);
        setInvitations([]);
        return;
      }
      const [staffResult, invitationResult] = await Promise.all([
        listClubStaff(clubId),
        listClubStaffInvitations(clubId),
      ]);
      applyLoadedData(club.role, staffResult, invitationResult);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "운영진 정보를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [applyLoadedData, clubId]);

  useEffect(() => {
    getClub(clubId)
      .then(async club => {
        if (club.role !== "PRESIDENT") {
          setIsPresident(false);
          return;
        }
        const [staffResult, invitationResult] = await Promise.all([
          listClubStaff(clubId),
          listClubStaffInvitations(clubId),
        ]);
        applyLoadedData(club.role, staffResult, invitationResult);
      })
      .catch(requestError => setError(apiErrorMessage(requestError, "운영진 정보를 불러오지 못했습니다.")))
      .finally(() => setLoading(false));
  }, [applyLoadedData, clubId]);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    setError("");
    try {
      const invitation = await createStaffInvitation(clubId, { email: email.trim(), role });
      setInvitations(current => [invitation, ...current]);
      setIssuedCode(invitation.invitationCode ?? "");
      setCopyMessage("");
      setEmail("");
      setRole("STAFF");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "운영진을 초대하지 못했습니다."));
    } finally {
      setInviting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(issuedCode);
      setCopyMessage("초대 코드를 복사했습니다.");
    } catch {
      setCopyMessage("복사하지 못했습니다. 코드를 직접 선택해 복사해 주세요.");
    }
  };

  const handleRoleChange = async (member: ClubStaff, nextRole: InvitableStaffRole) => {
    if (changingId || member.role === nextRole) return;
    setChangingId(member.id);
    setError("");
    try {
      const updated = await changeClubStaffRole(clubId, member.id, { role: nextRole });
      setStaff(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "운영진 역할을 변경하지 못했습니다."));
    } finally {
      setChangingId(null);
    }
  };

  const handleRevoke = async (member: ClubStaff) => {
    if (revokingId) return;
    if (!window.confirm(`${member.name}님의 동아리 접근 권한을 해제할까요?`)) return;
    setRevokingId(member.id);
    setError("");
    try {
      await revokeClubStaff(clubId, member.id);
      setStaff(current => current.filter(item => item.id !== member.id));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "운영진 권한을 해제하지 못했습니다."));
    } finally {
      setRevokingId(null);
    }
  };

  const handleCancel = async (invitation: StaffInvitation) => {
    if (cancelingId) return;
    if (!window.confirm(`${invitation.email} 초대를 취소할까요?`)) return;
    setCancelingId(invitation.id);
    setError("");
    try {
      await cancelStaffInvitation(clubId, invitation.id);
      setInvitations(current => current.filter(item => item.id !== invitation.id));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "초대를 취소하지 못했습니다."));
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <AppLayout clubId={clubId}>
      <header className="border-b border-[var(--border-subtle)] bg-white px-4 py-5 sm:px-8">
        <h1 className="text-xl font-extrabold text-[var(--text-primary)]">운영진 관리</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">함께 동아리를 관리할 운영진을 초대하고 권한을 관리합니다.</p>
      </header>

      <main className="grid gap-6 p-4 sm:p-8">
        {error && (
          <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-bold text-[var(--danger)] sm:flex-row sm:items-center">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="underline">다시 시도</button>
          </div>
        )}

        {loading && <p className="text-sm text-[var(--text-secondary)]">운영진 정보를 불러오는 중...</p>}

        {!loading && !error && !isPresident && (
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-6">
            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">회장만 관리할 수 있습니다.</h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">운영진 초대, 역할 변경, 접근 해제는 동아리 회장에게 요청해 주세요.</p>
          </section>
        )}

        {!loading && !error && isPresident && (
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6">
            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">새 운영진 초대</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">메일은 자동 발송되지 않습니다. 생성된 코드를 초대받을 사람에게 직접 전달해 주세요.</p>
            <form onSubmit={handleInvite} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
              <label className="grid gap-1.5 text-xs font-bold">
                Google 이메일
                <input className="control" type="email" required maxLength={255} value={email} onChange={event => setEmail(event.target.value)} placeholder="staff@example.com" />
              </label>
              <label className="grid gap-1.5 text-xs font-bold">
                역할
                <select className="control" value={role} onChange={event => setRole(event.target.value as InvitableStaffRole)}>
                  <option value="STAFF">운영진</option>
                  <option value="VICE_PRESIDENT">부회장</option>
                </select>
              </label>
              <button disabled={inviting} className="h-9 rounded-lg bg-[var(--navy)] px-5 text-xs font-extrabold text-white disabled:opacity-40">
                {inviting ? "코드 만드는 중..." : "초대 코드 만들기"}
              </button>
            </form>
            {issuedCode && (
              <div className="mt-4 rounded-lg bg-[var(--success-soft)] p-4" aria-live="polite">
                <p className="text-xs font-bold text-[var(--success)]">초대 코드가 생성되었습니다. 이 화면에서 지금 복사해 전달해 주세요.</p>
                <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <code className="block select-all text-lg font-extrabold tracking-[0.2em] text-[var(--text-primary)]">{issuedCode}</code>
                  <button type="button" onClick={() => void handleCopyCode()} className="rounded-lg border border-[var(--success)] px-3 py-2 text-xs font-extrabold text-[var(--success)]">
                    코드 복사
                  </button>
                </div>
                {copyMessage && <p className="mt-2 text-xs font-bold text-[var(--success)]">{copyMessage}</p>}
              </div>
            )}
          </section>
        )}

        {!loading && !error && isPresident && (
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6">
            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">현재 운영진</h2>
            {staff.length === 0 ? (
              <p className="mt-5 rounded-lg bg-[var(--panel-muted)] p-5 text-sm text-[var(--text-secondary)]">등록된 운영진이 없습니다.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {staff.map(member => (
                  <article key={member.id} className="flex flex-col gap-4 rounded-lg border border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-sm text-[var(--text-primary)]">{member.name}</b>
                        <span className="rounded-md bg-[var(--panel-muted)] px-2 py-1 text-[10px] font-extrabold text-[var(--text-secondary)]">{roleLabel[member.role]}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{member.email}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-secondary)]">참여일 {member.createdAt.slice(0, 10)}</p>
                    </div>
                    {isPresident && member.role !== "PRESIDENT" && (
                      <div className="flex flex-wrap gap-2">
                        <label className="sr-only" htmlFor={`role-${member.id}`}>{member.name} 역할</label>
                        <select
                          id={`role-${member.id}`}
                          aria-label={`${member.name} 역할`}
                          className="control min-w-28"
                          value={member.role}
                          disabled={changingId !== null || revokingId !== null}
                          onChange={event => void handleRoleChange(member, event.target.value as InvitableStaffRole)}
                        >
                          <option value="STAFF">운영진</option>
                          <option value="VICE_PRESIDENT">부회장</option>
                        </select>
                        <button
                          type="button"
                          disabled={changingId !== null || revokingId !== null}
                          onClick={() => void handleRevoke(member)}
                          className="rounded-lg border border-[var(--danger)] px-3 py-2 text-xs font-bold text-[var(--danger)] disabled:opacity-40"
                        >
                          {revokingId === member.id ? "해제 중..." : "접근 해제"}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && !error && isPresident && (
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6">
            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">수락 대기 중인 초대</h2>
            {invitations.length === 0 ? (
              <p className="mt-5 rounded-lg bg-[var(--panel-muted)] p-5 text-sm text-[var(--text-secondary)]">수락을 기다리는 초대가 없습니다.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {invitations.map(invitation => (
                  <article key={invitation.id} className="flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <b className="text-sm text-[var(--text-primary)]">{invitation.email}</b>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{roleLabel[invitation.role]} · 초대일 {invitation.createdAt.slice(0, 10)}</p>
                    </div>
                    <button type="button" disabled={cancelingId !== null} onClick={() => void handleCancel(invitation)} className="self-start rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40 sm:self-auto">
                      {cancelingId === invitation.id ? "취소 중..." : "초대 취소"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </AppLayout>
  );
}
