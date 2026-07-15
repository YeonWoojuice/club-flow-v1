import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  changeGenerationMemberDuesStatus,
  changeGenerationMemberInvitationStatus,
  listMembers,
} from "../api/members";
import { listGenerations } from "../api/generations";
import { apiErrorMessage } from "../api/http";
import { AppLayout } from "../components/AppLayout";
import { MemberDetailModal } from "../components/MemberDetailModal";
import type {
  GenerationMember,
  GenerationMemberDuesStatus,
  GenerationMemberStatus,
  MemberJoinedSource,
} from "../types/member";
import type { Generation } from "../types/generation";

const sourceLabel: Record<MemberJoinedSource, string> = {
  APPLICATION_ACCEPT: "지원 합격",
  MANUAL: "수동 등록",
  RETENTION: "잔류",
};

const statusLabel: Record<GenerationMemberStatus, string> = {
  ACTIVE: "활동 중",
  INACTIVE: "비활동",
  WITHDRAWN: "탈퇴",
};

const statusSortOrder: Record<GenerationMemberStatus, number> = {
  ACTIVE: 0,
  INACTIVE: 1,
  WITHDRAWN: 2,
};

const duesStatusLabel: Record<GenerationMemberDuesStatus, string> = {
  UNKNOWN: "확인 필요",
  UNPAID: "미납",
  PAID: "납부",
  EXEMPT: "면제",
};

const invitationFilterLabel = {
  ALL: "전체 초대 상태",
  KAKAO_PENDING: "카카오톡 초대 필요",
  DISCORD_PENDING: "디스코드 초대 필요",
  BOTH_PENDING: "둘 다 초대 필요",
  COMPLETE: "초대 완료",
} as const;

const memberGridGeometry = "grid-cols-2 gap-x-3 gap-y-2 px-3 lg:min-w-[1220px] lg:grid-cols-[minmax(90px,0.75fr)_95px_110px_minmax(170px,1.35fr)_72px_58px_92px_minmax(130px,1fr)_minmax(150px,1.1fr)] lg:px-4";

function StatusBadge({ status }: { status: GenerationMemberStatus }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center rounded-md bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--success)]">
        활동 중
      </span>
    );
  }
  if (status === "INACTIVE") {
    return (
      <span className="inline-flex items-center rounded-md bg-[var(--warning-soft)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--warning)]">
        비활동
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--panel-muted)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--text-secondary)]">
      탈퇴
    </span>
  );
}

type MemberRowProps = {
  member: GenerationMember;
  onUpdated: (member: GenerationMember) => void;
  onOpen: (memberId: string, trigger: HTMLElement) => void;
};

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    && target.closest("button, input, select, textarea, label, a") !== null;
}

function MemberRow({ member, onUpdated, onOpen }: MemberRowProps) {
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const [duesSubmitting, setDuesSubmitting] = useState(false);
  const [duesError, setDuesError] = useState("");
  const [invitationSubmitting, setInvitationSubmitting] = useState(false);
  const [invitationError, setInvitationError] = useState("");
  const duesUpdatedDescription = member.duesStatusUpdatedByName && member.duesStatusUpdatedAt
    ? `${member.duesStatusUpdatedByName} · ${new Date(member.duesStatusUpdatedAt).toLocaleString("ko-KR")}`
    : null;

  async function handleDuesStatusChange(duesStatus: GenerationMemberDuesStatus) {
    setDuesSubmitting(true);
    setDuesError("");
    try {
      onUpdated(await changeGenerationMemberDuesStatus(member.id, duesStatus));
    } catch (requestError) {
      setDuesError(apiErrorMessage(requestError, "회비 상태를 변경하지 못했습니다."));
    } finally {
      setDuesSubmitting(false);
    }
  }

  async function handleInvitationStatusChange(
    field: "kakaoInvited" | "discordInvited",
    checked: boolean,
  ) {
    setInvitationSubmitting(true);
    setInvitationError("");
    try {
      onUpdated(await changeGenerationMemberInvitationStatus(member.id, {
        kakaoInvited: field === "kakaoInvited" ? checked : member.kakaoInvited,
        discordInvited: field === "discordInvited" ? checked : member.discordInvited,
      }));
    } catch (requestError) {
      setInvitationError(apiErrorMessage(requestError, "초대 여부를 변경하지 못했습니다."));
    } finally {
      setInvitationSubmitting(false);
    }
  }

  return (
    <article className="border-t border-[var(--border-subtle)] first:border-t-0">
      <div
        onClick={event => {
          if (!isInteractiveTarget(event.target) && openButtonRef.current) {
            onOpen(member.id, openButtonRef.current);
          }
        }}
        className={`grid cursor-pointer py-3 transition-colors hover:bg-[var(--panel-muted)] lg:items-start lg:py-2.5 ${memberGridGeometry}`}
      >
        <button
          ref={openButtonRef}
          type="button"
          aria-label={`${member.name} 부원 정보 보기`}
          onClick={event => {
            event.stopPropagation();
            onOpen(member.id, event.currentTarget);
          }}
          className="col-span-2 min-w-0 text-left sm:col-span-1 lg:col-span-1"
        >
          <span className="block text-sm font-bold text-[var(--text-primary)] underline-offset-2 hover:underline">{member.name}</span>
        </button>
        <div>
          <span className="mb-0.5 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">학번</span>
          <span className="text-xs text-[var(--text-secondary)]">{member.studentNumber}</span>
        </div>
        <div>
          <span className="mb-0.5 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">전화번호</span>
          <span className="text-xs text-[var(--text-secondary)]">{member.phone ?? "-"}</span>
        </div>
        <div className="min-w-0">
          <span className="mb-0.5 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">이메일</span>
          <span title={member.email} className="block truncate text-xs text-[var(--text-secondary)]">{member.email}</span>
        </div>
        <div className="hidden lg:block">
          <span className="text-xs text-[var(--text-secondary)]">{member.generationName}</span>
        </div>
        <div>
          <span className="mb-0.5 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">가입 경로</span>
          <span className="text-[11px] text-[var(--text-secondary)]">{sourceLabel[member.joinedSource]}</span>
        </div>
        <div>
          <span className="mb-0.5 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">상태</span>
          <StatusBadge status={member.status} />
        </div>
        <div className="min-w-0">
          <span className="mb-0.5 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">회비 확인</span>
          <label className="grid min-w-24 gap-1 text-[10px] font-bold text-[var(--text-secondary)]">
            <span className="sr-only">{member.name} 회비 상태</span>
            <select
              aria-label={`${member.name} 회비 상태`}
              value={member.duesStatus}
              disabled={duesSubmitting}
              onChange={event => void handleDuesStatusChange(event.target.value as GenerationMemberDuesStatus)}
              className="rounded-lg border border-[var(--border-subtle)] bg-white px-2 py-1.5 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"
            >
              {Object.entries(duesStatusLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {duesUpdatedDescription && (
            <p title={duesUpdatedDescription} className="mt-1 truncate whitespace-nowrap text-[10px] text-[var(--text-secondary)]">
              {duesUpdatedDescription}
            </p>
          )}
          {duesError && <p role="alert" className="mt-1 text-[10px] font-bold text-[var(--danger)]">{duesError}</p>}
        </div>
        <div className="min-w-0">
          <span className="mb-0.5 block text-[10px] font-bold text-[var(--text-secondary)] lg:hidden">초대 확인</span>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-[var(--text-secondary)]">
            <label className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <input
                type="checkbox"
                aria-label={`${member.name} 카카오톡 초대 완료`}
                checked={member.kakaoInvited}
                disabled={invitationSubmitting}
                onChange={event => void handleInvitationStatusChange("kakaoInvited", event.target.checked)}
                className="size-4 accent-[var(--navy)]"
              />
              카카오톡
            </label>
            <label className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <input
                type="checkbox"
                aria-label={`${member.name} 디스코드 초대 완료`}
                checked={member.discordInvited}
                disabled={invitationSubmitting}
                onChange={event => void handleInvitationStatusChange("discordInvited", event.target.checked)}
                className="size-4 accent-[var(--navy)]"
              />
              디스코드
            </label>
          </div>
          {invitationError && <p role="alert" className="mt-1 text-[10px] font-bold text-[var(--danger)]">{invitationError}</p>}
        </div>
      </div>
    </article>
  );
}

type MemberFilterKey = "studentNumber" | "status" | "dues" | "invitation";
type MemberStatusFilter = GenerationMemberStatus | "ALL";
type MemberDuesFilter = GenerationMemberDuesStatus | "ALL";
type MemberInvitationFilter = keyof typeof invitationFilterLabel;

type FilterHeaderProps = {
  label: string;
  applied: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function FilterHeader({ label, applied, open, onToggle, children }: FilterHeaderProps) {
  return (
    <div className={`relative py-3 ${applied ? "bg-[var(--panel-muted)]" : "bg-white"}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-extrabold text-[var(--text-secondary)]"
      >
        <span>{label}</span>
        <span aria-hidden="true" className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="absolute left-2 top-[calc(100%-2px)] z-30 min-w-52 rounded-lg border border-[var(--border-subtle)] bg-white p-3 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export function MemberListPage() {
  const { clubId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedGenerationId = searchParams.get("generationId");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [generationsLoading, setGenerationsLoading] = useState(true);
  const [generationId, setGenerationId] = useState("");
  const [members, setMembers] = useState<GenerationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentNumberFilter, setStudentNumberFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("ALL");
  const [duesFilter, setDuesFilter] = useState<MemberDuesFilter>("ALL");
  const [invitationFilter, setInvitationFilter] = useState<MemberInvitationFilter>("ALL");
  const [openFilter, setOpenFilter] = useState<MemberFilterKey | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const memberDetailReturnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setGenerationsLoading(true);
      setLoading(true);
      setError("");
      setGenerations([]);
      setGenerationId("");
      setMembers([]);
      try {
        const items = await listGenerations(clubId);
        if (cancelled) return;
        setGenerations(items);
        setGenerationsLoading(false);
        if (items.length === 0) setLoading(false);
      } catch (requestError) {
        if (cancelled) return;
        setError(apiErrorMessage(requestError, "학기 목록을 불러오지 못했습니다."));
        setGenerationsLoading(false);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [clubId]);

  useEffect(() => {
    if (generationsLoading) return;

    const selected = generations.find(item => item.id === requestedGenerationId)
      ?? generations.find(item => item.status === "ACTIVE")
      ?? generations[0];
    const nextId = selected?.id ?? "";

    if (!nextId) return;
    if (requestedGenerationId !== nextId) {
      setSearchParams(current => {
        const next = new URLSearchParams(current);
        next.set("generationId", nextId);
        return next;
      }, { replace: true });
      return;
    }

    let cancelled = false;

    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setGenerationId(nextId);
      setLoading(true);
      setError("");
      try {
        const items = await listMembers(clubId, nextId);
        if (!cancelled) setMembers(items);
      } catch (requestError) {
        if (!cancelled) {
          setError(apiErrorMessage(requestError, "부원 목록을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [clubId, generations, generationsLoading, requestedGenerationId, setSearchParams]);

  function selectGeneration(nextId: string) {
    setGenerationId(nextId);
    setSelectedMemberId(null);
    setSearchQuery("");
    setStudentNumberFilter("");
    setStatusFilter("ALL");
    setDuesFilter("ALL");
    setInvitationFilter("ALL");
    setOpenFilter(null);
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set("generationId", nextId);
      return next;
    }, { replace: true });
  }

  function handleMemberUpdated(updated: GenerationMember) {
    setMembers(current => current.map(member => member.id === updated.id ? updated : member));
  }

  function openMemberDetail(memberId: string, trigger: HTMLElement) {
    memberDetailReturnFocusRef.current = trigger;
    setSelectedMemberId(memberId);
  }

  function closeMemberDetail() {
    setSelectedMemberId(null);
  }

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const selectedMember = members.find(member => member.id === selectedMemberId) ?? null;
  const normalizedStudentNumber = studentNumberFilter.trim();
  const filteredMembers = members
    .filter(member => {
      if (normalizedSearchQuery) {
        const searchableText = [member.name, member.studentNumber, member.email, member.phone ?? ""]
          .join(" ")
          .toLocaleLowerCase("ko-KR");
        if (!searchableText.includes(normalizedSearchQuery)) return false;
      }
      if (normalizedStudentNumber && !member.studentNumber.includes(normalizedStudentNumber)) return false;
      if (statusFilter !== "ALL" && member.status !== statusFilter) return false;
      if (duesFilter !== "ALL" && member.duesStatus !== duesFilter) return false;
      if (invitationFilter === "KAKAO_PENDING" && member.kakaoInvited) return false;
      if (invitationFilter === "DISCORD_PENDING" && member.discordInvited) return false;
      if (invitationFilter === "BOTH_PENDING" && (member.kakaoInvited || member.discordInvited)) return false;
      if (invitationFilter === "COMPLETE" && (!member.kakaoInvited || !member.discordInvited)) return false;
      return true;
    })
    .sort((left, right) => statusSortOrder[left.status] - statusSortOrder[right.status]);
  const kakaoPendingCount = members.filter(member => !member.kakaoInvited).length;
  const discordPendingCount = members.filter(member => !member.discordInvited).length;
  const filterApplied = normalizedSearchQuery !== ""
    || normalizedStudentNumber !== ""
    || statusFilter !== "ALL"
    || duesFilter !== "ALL"
    || invitationFilter !== "ALL";

  function resetFilters() {
    setSearchQuery("");
    setStudentNumberFilter("");
    setStatusFilter("ALL");
    setDuesFilter("ALL");
    setInvitationFilter("ALL");
    setOpenFilter(null);
  }

  return (
    <AppLayout clubId={clubId}>
      <div className="border-b border-[var(--border-subtle)] bg-white px-4 py-5 md:px-8">
        <h1 className="text-xl font-extrabold text-[var(--text-primary)]">부원 관리</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">학기별 부원 등록 기록을 확인합니다.</p>
      </div>

      <div className="px-4 py-6 md:px-8">
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              조회할 학기
              <select
                className="control"
                value={generationId}
                onChange={event => selectGeneration(event.target.value)}
                disabled={generations.length === 0}
              >
                {generations.length === 0 && <option value="">등록된 학기가 없습니다</option>}
                {generations.map(generation => (
                  <option key={generation.id} value={generation.id}>
                    {generation.name} {generation.status === "ACTIVE" ? "(활성)" : "(종료)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              부원 검색
              <input
                type="search"
                className="control"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="이름, 학번, 이메일, 전화번호"
              />
            </label>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">선택한 학기의 부원과 회비 확인 상태만 표시합니다.</p>
        </div>

        {members.length > 0 && (
          <div className="mb-4 grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-white p-4 sm:grid-cols-2 lg:hidden">
            <label className="grid gap-1.5 text-xs font-bold">
              학번 필터
              <input className="control" value={studentNumberFilter} onChange={event => setStudentNumberFilter(event.target.value)} placeholder="학번 입력" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold">
              상태 필터
              <select className="control" value={statusFilter} onChange={event => setStatusFilter(event.target.value as MemberStatusFilter)}>
                <option value="ALL">전체 상태</option>
                {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold">
              회비 필터
              <select className="control" value={duesFilter} onChange={event => setDuesFilter(event.target.value as MemberDuesFilter)}>
                <option value="ALL">전체 회비 상태</option>
                {Object.entries(duesStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold">
              초대 필터
              <select className="control" value={invitationFilter} onChange={event => setInvitationFilter(event.target.value as MemberInvitationFilter)}>
                {Object.entries(invitationFilterLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        )}
        {members.length > 0 && (
          <p className="mb-4 text-xs font-bold text-[var(--text-secondary)]" aria-live="polite">
            카카오톡 미초대 {kakaoPendingCount}명 · 디스코드 미초대 {discordPendingCount}명
          </p>
        )}
        {filterApplied && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-[var(--panel-muted)] px-4 py-3 text-xs text-[var(--text-secondary)]">
            <span>{filteredMembers.length}명 표시 중</span>
            <button type="button" onClick={resetFilters} className="font-bold underline">
              필터 초기화
            </button>
          </div>
        )}
        {loading && <p className="text-sm text-[var(--text-secondary)]">불러오는 중...</p>}

        {error && (
          <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-bold text-[var(--danger)]">
            {error}
          </p>
        )}

        {!loading && !error && members.length === 0 && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">등록된 부원이 없습니다.</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">합격 결과 메일 전송이 완료되면 자동으로 추가됩니다.</p>
          </div>
        )}

        {!loading && !error && members.length > 0 && filteredMembers.length === 0 && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">필터 조건에 맞는 부원이 없습니다.</p>
            <button type="button" onClick={resetFilters} className="mt-3 text-xs font-bold text-[var(--navy)] underline">
              필터 초기화
            </button>
          </div>
        )}

        {!loading && !error && filteredMembers.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-white">
            <div className={`relative z-20 hidden border-b border-[var(--border-subtle)] lg:grid ${memberGridGeometry}`}>
              <span className="py-3 text-xs font-extrabold text-[var(--text-secondary)]">이름</span>
              <FilterHeader label="학번" applied={normalizedStudentNumber !== ""} open={openFilter === "studentNumber"} onToggle={() => setOpenFilter(current => current === "studentNumber" ? null : "studentNumber")}>
                <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  학번
                  <input autoFocus aria-label="표 학번 필터" className="control" value={studentNumberFilter} onChange={event => setStudentNumberFilter(event.target.value)} placeholder="학번 입력" />
                </label>
              </FilterHeader>
              <span className="py-3 text-xs font-extrabold text-[var(--text-secondary)]">전화번호</span>
              <span className="py-3 text-xs font-extrabold text-[var(--text-secondary)]">이메일</span>
              <span className="py-3 text-xs font-extrabold text-[var(--text-secondary)]">학기</span>
              <span className="py-3 text-xs font-extrabold text-[var(--text-secondary)]">가입 경로</span>
              <FilterHeader label="상태" applied={statusFilter !== "ALL"} open={openFilter === "status"} onToggle={() => setOpenFilter(current => current === "status" ? null : "status")}>
                <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  상태
                  <select autoFocus aria-label="표 상태 필터" className="control" value={statusFilter} onChange={event => setStatusFilter(event.target.value as MemberStatusFilter)}>
                    <option value="ALL">전체 상태</option>
                    {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </FilterHeader>
              <FilterHeader label="회비 확인" applied={duesFilter !== "ALL"} open={openFilter === "dues"} onToggle={() => setOpenFilter(current => current === "dues" ? null : "dues")}>
                <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  회비 여부
                  <select autoFocus aria-label="표 회비 필터" className="control" value={duesFilter} onChange={event => setDuesFilter(event.target.value as MemberDuesFilter)}>
                    <option value="ALL">전체 회비 상태</option>
                    {Object.entries(duesStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </FilterHeader>
              <FilterHeader label="초대 확인" applied={invitationFilter !== "ALL"} open={openFilter === "invitation"} onToggle={() => setOpenFilter(current => current === "invitation" ? null : "invitation")}>
                <label className="grid gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  초대 여부
                  <select autoFocus aria-label="표 초대 필터" className="control" value={invitationFilter} onChange={event => setInvitationFilter(event.target.value as MemberInvitationFilter)}>
                    {Object.entries(invitationFilterLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </FilterHeader>
            </div>
            {filteredMembers.map(member => (
              <MemberRow
                key={member.id}
                member={member}
                onUpdated={handleMemberUpdated}
                onOpen={openMemberDetail}
              />
            ))}
          </div>
        )}
      </div>
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          returnFocusRef={memberDetailReturnFocusRef}
          onClose={closeMemberDetail}
          onUpdated={handleMemberUpdated}
        />
      )}
    </AppLayout>
  );
}
