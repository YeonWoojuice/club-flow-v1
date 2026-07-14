import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { activateGeneration, createGeneration, listGenerations, updateGeneration } from "../api/generations";
import { apiErrorMessage } from "../api/http";
import { AppLayout } from "../components/AppLayout";
import type { Generation, GenerationStatus } from "../types/generation";

type EditState = {
  name: string;
  startDate: string;
  endDate: string;
  status: GenerationStatus;
};

export function GenerationPage() {
  const { clubId = "" } = useParams();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit form state: keyed by generation id
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", startDate: "", endDate: "", status: "ACTIVE" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const fetchGenerations = useCallback(() => {
    listGenerations(clubId)
      .then(setGenerations)
      .catch(requestError => setError(apiErrorMessage(requestError, "학기 목록을 불러오지 못했습니다.")))
      .finally(() => setLoading(false));
  }, [clubId]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // 쓰기 성공 후 목록 갱신용 (초기 로딩은 위 effect가 담당)
  const load = () => {
    setLoading(true);
    fetchGenerations();
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createGeneration(clubId, { name: createName, startDate: createStartDate, endDate: createEndDate });
      setCreateName("");
      setCreateStartDate("");
      setCreateEndDate("");
      setShowCreate(false);
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "학기를 생성하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (generation: Generation) => {
    setEditingId(generation.id);
    setEditState({
      name: generation.name,
      startDate: generation.startDate,
      endDate: generation.endDate,
      status: generation.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>, generation: Generation) => {
    event.preventDefault();
    setEditSubmitting(true);
    setError("");
    try {
      await updateGeneration(generation.id, editState);
      setEditingId(null);
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "학기를 수정하지 못했습니다."));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleClose = async (generation: Generation) => {
    const confirmed = window.confirm(
      `'${generation.name}' 학기를 종료할까요?\n필요하면 나중에 다시 활성화할 수 있습니다.`,
    );
    if (!confirmed) return;
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
      setError(apiErrorMessage(requestError, "학기를 종료하지 못했습니다."));
    }
  };

  const handleActivate = async (generation: Generation) => {
    const currentActive = generations.find(item => item.status === "ACTIVE");
    const message = currentActive
      ? `'${generation.name}' 학기를 활성화할까요?\n현재 활성 학기 '${currentActive.name}'은 자동으로 종료됩니다.`
      : `'${generation.name}' 학기를 활성화할까요?`;
    if (!window.confirm(message)) return;
    setActivatingId(generation.id);
    setError("");
    try {
      await activateGeneration(generation.id);
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "학기를 활성화하지 못했습니다."));
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <AppLayout clubId={clubId}>
      {/* Page header */}
      <div className="flex flex-col items-start gap-4 border-b border-[var(--border-subtle)] bg-white px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text-primary)]">학기/기수</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">동아리의 학기를 생성하고 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowCreate(prev => !prev)}
          className="w-full rounded-lg bg-[var(--navy)] px-4 py-2 text-xs font-extrabold text-white transition-opacity hover:opacity-90 sm:w-auto"
        >
          + 새 학기 만들기
        </button>
      </div>

      <div className="px-4 py-6 md:px-8">
        {/* Error banner */}
        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-bold text-[var(--danger)]">
            {error}
          </p>
        )}

        {/* Create panel */}
        {showCreate && (
          <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-white p-6">
            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">새 학기 만들기</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">동아리에는 활성 학기가 하나만 존재할 수 있습니다.</p>
            <form className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={handleCreate}>
              <label className="grid gap-1.5 text-xs font-bold">
                학기 이름
                <input
                  className="control"
                  value={createName}
                  onChange={event => setCreateName(event.target.value)}
                  required
                  maxLength={100}
                  placeholder="예: 2026-2 학기"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold">
                시작일
                <input
                  className="control"
                  type="date"
                  value={createStartDate}
                  onChange={event => setCreateStartDate(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold">
                종료일
                <input
                  className="control"
                  type="date"
                  value={createEndDate}
                  onChange={event => setCreateEndDate(event.target.value)}
                  required
                />
              </label>
              <div className="flex items-end gap-2">
                <button
                  disabled={submitting}
                  className="h-9 rounded-lg bg-[var(--navy)] px-4 text-xs font-extrabold text-white disabled:opacity-40"
                >
                  {submitting ? "생성 중..." : "학기 생성"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="h-9 rounded-lg border border-[var(--border)] px-4 text-xs font-bold text-[var(--text-secondary)]"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Generation list */}
        {loading && (
          <p className="text-sm text-[var(--text-secondary)]">불러오는 중...</p>
        )}

        {!loading && generations.length === 0 && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">등록된 학기가 없습니다.</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">위의 "+ 새 학기 만들기" 버튼을 눌러 첫 학기를 생성하세요.</p>
          </div>
        )}

        <div className="grid gap-3">
          {generations.map(generation => (
            <article
              key={generation.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-white p-5"
            >
              {editingId === generation.id ? (
                // Inline edit form
                <form onSubmit={event => handleEdit(event, generation)} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-1.5 text-xs font-bold">
                      학기 이름
                      <input
                        className="control"
                        value={editState.name}
                        onChange={event => setEditState(prev => ({ ...prev, name: event.target.value }))}
                        required
                        maxLength={100}
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold">
                      시작일
                      <input
                        className="control"
                        type="date"
                        value={editState.startDate}
                        onChange={event => setEditState(prev => ({ ...prev, startDate: event.target.value }))}
                        required
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold">
                      종료일
                      <input
                        className="control"
                        type="date"
                        value={editState.endDate}
                        onChange={event => setEditState(prev => ({ ...prev, endDate: event.target.value }))}
                        required
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={editSubmitting}
                      className="rounded-lg bg-[var(--navy)] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40"
                    >
                      {editSubmitting ? "저장 중..." : "저장"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)]"
                    >
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                // Read-only card view
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[var(--text-primary)]">{generation.name}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                          generation.status === "ACTIVE"
                            ? "bg-[var(--success-soft)] text-[var(--success)]"
                            : "bg-[var(--panel-muted)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {generation.status === "ACTIVE" ? "활성" : "종료"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                      {generation.startDate} ~ {generation.endDate}
                      {generation.status === "CLOSED" && generation.closedAt && (
                        <span className="ml-2">· 종료일: {generation.closedAt.slice(0, 10)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEdit(generation)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--navy)] hover:text-[var(--text-primary)]"
                    >
                      수정
                    </button>
                    {generation.status === "ACTIVE" && (
                      <button
                        onClick={() => handleClose(generation)}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      >
                        학기 종료
                      </button>
                    )}
                    {generation.status === "CLOSED" && (
                      <button
                        type="button"
                        disabled={activatingId !== null}
                        onClick={() => void handleActivate(generation)}
                        className="rounded-lg border border-[var(--success)] px-3 py-1.5 text-xs font-bold text-[var(--success)] transition-colors hover:bg-[var(--success-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {activatingId === generation.id ? "활성화 중..." : "다시 활성화"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
