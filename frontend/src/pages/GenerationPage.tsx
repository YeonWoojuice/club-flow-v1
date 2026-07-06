import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { createGeneration, listGenerations, updateGeneration } from "../api/generations";
import { ApiError } from "../api/http";
import { ClubNavigation } from "../components/ClubNavigation";
import type { Generation } from "../types/generation";

export function GenerationPage() {
  const { clubId = "" } = useParams();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    listGenerations(clubId)
      .then(setGenerations)
      .catch(() => setError("학기 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [clubId]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createGeneration(clubId, { name, startDate, endDate });
      setName("");
      setStartDate("");
      setEndDate("");
      load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "학기를 생성하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (generation: Generation) => {
    setError("");
    try {
      await updateGeneration(generation.id, {
        name: generation.name,
        startDate: generation.startDate,
        endDate: generation.endDate,
        status: "CLOSED",
      });
      load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "학기를 종료하지 못했습니다.");
    }
  };

  return (
    <div className="min-h-full bg-[var(--surface)] font-body">
      <ClubNavigation clubId={clubId} />
      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[360px_1fr]">
        <section className="rounded-[10px] border border-[var(--border-subtle)] bg-white p-5">
          <h1 className="text-xl font-extrabold">새 학기 만들기</h1>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            동아리에는 활성 학기가 하나만 존재할 수 있습니다.
          </p>
          <form className="mt-6 grid gap-4" onSubmit={handleCreate}>
            <label className="grid gap-2 text-xs font-bold">
              학기 이름
              <input className="control" value={name} onChange={event => setName(event.target.value)} required maxLength={100} placeholder="예: 2026-2 학기" />
            </label>
            <label className="grid gap-2 text-xs font-bold">
              시작일
              <input className="control" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required />
            </label>
            <label className="grid gap-2 text-xs font-bold">
              종료일
              <input className="control" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} required />
            </label>
            <button disabled={submitting} className="h-10 rounded-[7px] bg-[var(--navy)] text-xs font-extrabold text-white disabled:opacity-40">
              {submitting ? "생성 중..." : "활성 학기 생성"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">학기 목록</h2>
          {error && <p role="alert" className="mt-4 rounded-[7px] bg-[var(--danger-soft)] p-3 text-xs font-bold text-[var(--danger)]">{error}</p>}
          {loading && <p className="mt-5 text-sm text-[var(--text-secondary)]">불러오는 중...</p>}
          {!loading && generations.length === 0 && <p className="mt-5 rounded-[8px] bg-white p-5 text-sm text-[var(--text-secondary)]">등록된 학기가 없습니다.</p>}
          <div className="mt-5 grid gap-3">
            {generations.map(generation => (
              <article key={generation.id} className="flex flex-col justify-between gap-4 rounded-[9px] border border-[var(--border-subtle)] bg-white p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <b>{generation.name}</b>
                    <span className={`rounded-[5px] px-2 py-1 text-[10px] font-extrabold ${generation.status === "ACTIVE" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--panel-muted)] text-[var(--text-secondary)]"}`}>
                      {generation.status === "ACTIVE" ? "활성" : "종료"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">{generation.startDate} ~ {generation.endDate}</p>
                </div>
                {generation.status === "ACTIVE" && (
                  <button onClick={() => handleClose(generation)} className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-xs font-extrabold">
                    학기 종료
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
