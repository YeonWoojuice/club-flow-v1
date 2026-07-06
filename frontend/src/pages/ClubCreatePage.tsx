import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClub } from "../api/clubs";
import { ApiError } from "../api/http";
import { Brand } from "../components/Brand";

export function ClubCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const club = await createClub({ name, description });
      navigate(`/clubs/${club.id}/dashboard`, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "동아리를 생성하지 못했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-full bg-[var(--surface)] px-5 py-8 font-body sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Brand />
        <section className="mt-8 rounded-[12px] border border-[var(--border-subtle)] bg-white p-6 shadow-sm sm:p-9">
          <span className="text-xs font-extrabold text-[var(--success)]">첫 동아리 설정</span>
          <h1 className="mt-2 text-2xl font-extrabold">운영할 동아리를 만들어 주세요</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            생성과 동시에 회장 권한이 승인되며 바로 대시보드에 입장합니다.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <label className="grid gap-2 text-xs font-bold">
              동아리 이름
              <input className="control" value={name} onChange={event => setName(event.target.value)} maxLength={100} required placeholder="예: 아우내" />
            </label>
            <label className="grid gap-2 text-xs font-bold">
              동아리 설명 <span className="font-normal text-[var(--text-tertiary)]">선택</span>
              <textarea className="min-h-28 w-full resize-y rounded-[6px] border border-[var(--border)] bg-white p-3 text-xs" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} placeholder="동아리의 활동 목적을 간단히 적어 주세요." />
            </label>
            {error && <p role="alert" className="rounded-[7px] bg-[var(--danger-soft)] px-3 py-2.5 text-xs font-bold text-[var(--danger)]">{error}</p>}
            <button disabled={submitting || !name.trim()} className="h-11 rounded-[7px] bg-[var(--navy)] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">
              {submitting ? "생성하고 있습니다..." : "동아리 생성하고 시작하기"}
            </button>
          </form>
          <Link to="/clubs" className="mt-5 block text-center text-xs font-bold text-[var(--text-secondary)]">내 동아리 목록 보기</Link>
        </section>
      </div>
    </main>
  );
}
