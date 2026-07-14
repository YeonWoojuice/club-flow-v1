import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { acceptStaffInvitationByCode } from "../api/staff";
import { apiErrorMessage } from "../api/http";
import { Brand } from "../components/Brand";

export function StaffInvitationCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const invitation = await acceptStaffInvitationByCode(code.trim().toUpperCase());
      navigate(`/clubs/${invitation.clubId}/dashboard`, { replace: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "초대 코드를 확인하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-full bg-[var(--surface)] px-5 py-8 font-body sm:py-14">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-4">
          <Brand />
          <Link to="/clubs" className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold">내 동아리</Link>
        </div>
        <section className="mt-8 rounded-xl border border-[var(--border-subtle)] bg-white p-6 shadow-sm sm:p-9">
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">초대 코드 입력</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">동아리 회장에게 전달받은 영문·숫자 8자리 코드를 입력해 주세요.</p>

          <form onSubmit={submit} className="mt-7 grid gap-4">
            <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              초대 코드
              <input
                className="control uppercase tracking-[0.12em]"
                required
                minLength={8}
                maxLength={8}
                value={code}
                onChange={event => setCode(event.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                placeholder="ABCD2345"
                autoComplete="off"
              />
            </label>
            {error && <p role="alert" className="rounded-lg bg-[var(--danger-soft)] p-3 text-xs font-bold text-[var(--danger)]">{error}</p>}
            <button disabled={submitting || code.length !== 8} className="rounded-lg bg-[var(--navy)] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-40">
              {submitting ? "확인 중..." : "코드로 참여하기"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
