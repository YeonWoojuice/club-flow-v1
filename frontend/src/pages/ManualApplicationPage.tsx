import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createManualApplication } from "../api/applications";
import { listGenerations } from "../api/generations";
import { ApiError } from "../api/http";
import { ClubNavigation } from "../components/ClubNavigation";
import type { Generation } from "../types/generation";

type AnswerInput = {
  id: number;
  questionLabel: string;
  answerValue: string;
};

export function ManualApplicationPage() {
  const { clubId = "" } = useParams();
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [generationId, setGenerationId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [answers, setAnswers] = useState<AnswerInput[]>([
    { id: 1, questionLabel: "지원 동기", answerValue: "" },
  ]);
  const [nextAnswerId, setNextAnswerId] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listGenerations(clubId)
      .then(items => {
        const active = items.filter(item => item.status === "ACTIVE");
        setGenerations(active);
        setGenerationId(active[0]?.id ?? "");
      })
      .catch(() => setError("학기 정보를 불러오지 못했습니다."));
  }, [clubId]);

  const updateAnswer = (id: number, field: "questionLabel" | "answerValue", value: string) => {
    setAnswers(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addAnswer = () => {
    setAnswers(items => [...items, { id: nextAnswerId, questionLabel: "", answerValue: "" }]);
    setNextAnswerId(value => value + 1);
  };

  const removeAnswer = (id: number) => {
    setAnswers(items => items.filter(item => item.id !== id));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const application = await createManualApplication(clubId, {
        generationId,
        name,
        email: email.trim().toLowerCase(),
        phone,
        studentNumber,
        applicationAnswers: answers.map((answer, index) => ({
          questionKey: `manual_${index + 1}`,
          questionLabel: answer.questionLabel,
          answerValue: answer.answerValue,
        })),
      });
      navigate(`/clubs/${clubId}/applications/${application.id}`, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "지원자를 등록하지 못했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[var(--surface)] font-body">
      <ClubNavigation clubId={clubId} />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <Link to={`/clubs/${clubId}/applications`} className="text-xs font-bold text-[var(--text-secondary)]">← 지원자 목록</Link>
        <section className="mt-5 rounded-[10px] border border-[var(--border-subtle)] bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">지원자 수동 등록</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">이메일은 소문자로 정규화되어 같은 사람을 식별하는 데 사용됩니다.</p>
          {generations.length === 0 && !error && (
            <p className="mt-5 rounded-[7px] bg-[var(--warning-soft)] p-3 text-xs font-bold text-[var(--warning)]">활성 학기가 없습니다. 학기를 먼저 생성해 주세요.</p>
          )}
          {error && <p role="alert" className="mt-5 rounded-[7px] bg-[var(--danger-soft)] p-3 text-xs font-bold text-[var(--danger)]">{error}</p>}
          <form className="mt-7 grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-xs font-bold">
              학기
              <select className="control" value={generationId} onChange={event => setGenerationId(event.target.value)} required>
                {generations.map(generation => <option key={generation.id} value={generation.id}>{generation.name}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold">이름<input className="control" value={name} onChange={event => setName(event.target.value)} required /></label>
              <label className="grid gap-2 text-xs font-bold">학번<input className="control" value={studentNumber} onChange={event => setStudentNumber(event.target.value)} required /></label>
              <label className="grid gap-2 text-xs font-bold">이메일<input className="control" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
              <label className="grid gap-2 text-xs font-bold">연락처 <span className="font-normal text-[var(--text-tertiary)]">선택</span><input className="control" value={phone} onChange={event => setPhone(event.target.value)} /></label>
            </div>
            <div className="border-t border-[var(--border-subtle)] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-extrabold">지원서 답변</h2>
                <button type="button" onClick={addAnswer} className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-xs font-bold">문항 추가</button>
              </div>
              <div className="mt-4 grid gap-4">
                {answers.map(answer => (
                  <div key={answer.id} className="rounded-[8px] bg-[var(--panel-muted)] p-4">
                    <label className="grid gap-2 text-xs font-bold">질문<input className="control" value={answer.questionLabel} onChange={event => updateAnswer(answer.id, "questionLabel", event.target.value)} required /></label>
                    <label className="mt-3 grid gap-2 text-xs font-bold">답변<textarea className="min-h-24 rounded-[6px] border border-[var(--border)] bg-white p-3 text-xs" value={answer.answerValue} onChange={event => updateAnswer(answer.id, "answerValue", event.target.value)} required /></label>
                    {answers.length > 1 && <button type="button" onClick={() => removeAnswer(answer.id)} className="mt-3 text-xs font-bold text-[var(--danger)]">문항 삭제</button>}
                  </div>
                ))}
              </div>
            </div>
            <button disabled={submitting || !generationId} className="h-11 rounded-[7px] bg-[var(--navy)] text-sm font-extrabold text-white disabled:opacity-40">
              {submitting ? "등록 중..." : "지원자 등록"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
