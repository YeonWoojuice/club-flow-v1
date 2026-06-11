import { useMemo, useState, type ReactNode } from "react";

type Page = "dashboard" | "sync" | "applications" | "application" | "members" | "member" | "staff" | "logs";
type Tone = "neutral" | "success" | "warning" | "danger" | "navy";
type GenerationStatus = "모집 중" | "활동 중" | "종료";
type Generation = { id: string; name: string; start?: string; end?: string; status: GenerationStatus; hasInterview: boolean };
type Person = { id: string; name: string; email: string; phone: string };
type MembershipOrigin = "carryover" | "application" | "form" | "manual";
type Membership = { id: string; personId: string; generationId: string; status: "활동 중" | "활동 종료"; team: string; fee: "제출 완료" | "미제출"; memo: string; joinedAt: string; origin?: MembershipOrigin; sourceResponseId?: string; carriedFromMembershipId?: string };
type Applicant = { id: string; personId: string; generationId: string; status: string; form: string; submittedAt: string };
type FormPurpose = "지원서" | "부원 명단";
type FormConfig = { id: string; name: string; access: string; responses: number; status: "active" | "disconnected"; lastSync: string; purpose: FormPurpose; generationId: string };
type GoogleConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
type ActivityLog = { id: string; action: string; target: string; detail: string; actor: string; occurredAt: string; tone: Tone };

const initialGenerations: Generation[] = [
  { id: "g13", name: "26-2 학기", start: "2026-08-01", end: "2026-08-31", status: "모집 중", hasInterview: true },
  { id: "g12", name: "26-1 학기", start: "2026-03-01", end: "2026-06-30", status: "활동 중", hasInterview: false },
];

const initialPeople: Person[] = [
  { id: "p1", name: "최하늘", email: "haneul@gmail.com", phone: "010-1234-5678" },
  { id: "p2", name: "김민지", email: "minji@gmail.com", phone: "010-2345-6789" },
  { id: "p3", name: "박준호", email: "junho@gmail.com", phone: "010-3456-7890" },
  { id: "p4", name: "윤도현", email: "dohyun@gmail.com", phone: "010-4567-8901" },
  { id: "p5", name: "이서연", email: "seoyeon@gmail.com", phone: "010-5678-9012" },
];

const initialMemberships: Membership[] = [
  { id: "m13-1", personId: "p1", generationId: "g13", status: "활동 중", team: "디자인팀", fee: "제출 완료", memo: "26-1 학기에서 이월", joinedAt: "2026.06.09", origin: "carryover", carriedFromMembershipId: "m12-1" },
  { id: "m13-2", personId: "p2", generationId: "g13", status: "활동 중", team: "개발팀", fee: "미제출", memo: "26-1 학기에서 이월", joinedAt: "2026.06.09", origin: "carryover", carriedFromMembershipId: "m12-2" },
  { id: "m12-1", personId: "p1", generationId: "g12", status: "활동 중", team: "디자인팀", fee: "제출 완료", memo: "다음 학기 이월 대상", joinedAt: "2025.06.09" },
  { id: "m12-2", personId: "p2", generationId: "g12", status: "활동 중", team: "개발팀", fee: "제출 완료", memo: "다음 학기 이월 대상", joinedAt: "2025.06.09" },
  { id: "m12-3", personId: "p3", generationId: "g12", status: "활동 종료", team: "운영팀", fee: "미제출", memo: "활동 종료 확인", joinedAt: "2025.06.09" },
  { id: "m12-4", personId: "p4", generationId: "g12", status: "활동 종료", team: "개발팀", fee: "미제출", memo: "탈퇴 처리 완료", joinedAt: "2025.06.09" },
];

const initialApplicants: Applicant[] = [
  { id: "a1", personId: "p2", generationId: "g13", status: "접수", form: "26-2 학기 신규 부원 지원서", submittedAt: "2026.06.09" },
  { id: "a2", personId: "p3", generationId: "g13", status: "서류합격", form: "26-2 학기 신규 부원 지원서", submittedAt: "2026.06.09" },
  { id: "a3", personId: "p1", generationId: "g13", status: "최종합격", form: "26-2 학기 신규 부원 지원서", submittedAt: "2026.06.08" },
  { id: "a4", personId: "p4", generationId: "g13", status: "불합격", form: "26-2 학기 신규 부원 지원서", submittedAt: "2026.06.08" },
  { id: "a5", personId: "p5", generationId: "g12", status: "합격", form: "26-1 학기 신규 부원 지원서", submittedAt: "2025.06.08" },
];

const initialForms: FormConfig[] = [
  { id: "f1", name: "26-2 학기 신규 부원 지원서", access: "소유자", responses: 48, status: "active", lastSync: "2026.06.09 11:18", purpose: "지원서", generationId: "g13" },
  { id: "f2", name: "26-2 학기 기존 부원 명단", access: "편집자", responses: 17, status: "active", lastSync: "2026.06.08 18:02", purpose: "부원 명단", generationId: "g13" },
  { id: "f3", name: "지난 학기 지원서", access: "뷰어", responses: 62, status: "disconnected", lastSync: "-", purpose: "지원서", generationId: "g12" },
];

const availableGoogleForms = [
  { id: "google-form-1", name: "2026 하반기 신규 부원 지원서", access: "소유자", responses: 48 },
  { id: "google-form-2", name: "기존 활동 부원 명단", access: "편집자", responses: 17 },
  { id: "google-form-3", name: "디자인팀 추가 모집", access: "뷰어", responses: 21 },
];

const importedMemberResponses = [
  { responseId: "member-response-001", name: "정다은", email: "daeun@gmail.com", phone: "010-6789-0123", team: "미배정" },
  { responseId: "member-response-002", name: "박준호", email: "junho@gmail.com", phone: "010-3456-7890", team: "운영팀" },
];

const activityLogs: ActivityLog[] = [
  { id: "log-1", action: "학기 생성", target: "26-2 학기", detail: "직전 학기 활동 중 부원 2명을 이월했습니다.", actor: "주연우", occurredAt: "2026.06.11 14:32", tone: "navy" },
  { id: "log-2", action: "지원서 상태 변경", target: "최하늘 · 26-2 학기 지원서", detail: "최종합격 처리 후 26-2 학기 부원으로 등록했습니다.", actor: "김민지", occurredAt: "2026.06.11 13:18", tone: "success" },
  { id: "log-3", action: "부원 명단 가져오기", target: "26-2 학기 기존 부원 명단", detail: "신규 8명 등록 · 기존 인원 4명 연결 · 중복 3명 제외", actor: "주연우", occurredAt: "2026.06.11 11:06", tone: "neutral" },
  { id: "log-4", action: "부원 활동 정보 변경", target: "박준호 · 26-2 학기", detail: "활동 상태를 활동 종료로 변경했습니다.", actor: "최하늘", occurredAt: "2026.06.10 18:44", tone: "warning" },
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function statusTone(status: string): Tone {
  if (["합격", "최종합격", "서류합격", "활동 중", "active", "연결됨", "제출 완료", "모집 중"].includes(status)) return "success";
  if (["접수", "검토 중", "disconnected", "미제출", "활동 중"].includes(status)) return "warning";
  if (["불합격", "탈퇴"].includes(status)) return "danger";
  return "neutral";
}

function hasOutstandingFee(membership: Membership) {
  return membership.status === "활동 중" && membership.fee === "미제출";
}

function toneClass(tone: Tone) {
  return { neutral: "bg-[var(--panel-muted)] text-[var(--text-primary)]", success: "bg-[var(--success-soft)] text-[var(--success)]", warning: "bg-[var(--warning-soft)] text-[var(--warning)]", danger: "bg-[var(--danger-soft)] text-[var(--danger)]", navy: "bg-[var(--navy-soft)] text-[var(--navy)]" }[tone];
}

function Button({ children, primary = false, danger = false, onClick, className = "", disabled = false }: { children: ReactNode; primary?: boolean; danger?: boolean; onClick?: () => void; className?: string; disabled?: boolean }) {
  const color = primary ? "border-[var(--navy)] bg-[var(--navy)] text-white" : danger ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]" : "border-[var(--border)] bg-white text-[var(--text-primary)]";
  return <button disabled={disabled} onClick={onClick} className={`h-9 rounded-[6px] border px-3.5 text-[11px] font-bold transition hover:border-[var(--navy)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ${color} ${className}`}>{children}</button>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex h-6 items-center rounded-[5px] px-2.5 text-[10px] font-extrabold ${toneClass(tone)}`}>{children}</span>;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[8px] border border-[var(--border-subtle)] bg-white ${className}`}>{children}</section>;
}

function BrandMark() {
  return <span aria-hidden="true" className="flex h-[18px] w-[18px] items-end justify-center gap-[2px] rounded-[5px] bg-[var(--chrome-active)] px-[4px] py-[4px]"><span className="h-[4px] w-[2px] rounded-[1px] bg-[var(--chrome-text-muted)]" /><span className="h-[7px] w-[2px] rounded-[1px] bg-white" /><span className="h-[10px] w-[2px] rounded-[1px] bg-[var(--chrome-text-muted)]" /></span>;
}

function GenerationSelect({ generations, value, onChange, onCreate, compact = false }: { generations: Generation[]; value: string; onChange: (id: string) => void; onCreate: () => void; compact?: boolean }) {
  return <select aria-label="현재 학기" value={value} onChange={event => event.target.value === "__new__" ? onCreate() : onChange(event.target.value)} className={`rounded-[5px] border border-[var(--chrome-border)] bg-[var(--chrome-active)] font-bold text-white ${compact ? "h-7 max-w-[106px] px-1 text-[8px]" : "h-8 px-2.5 text-[10px]"}`}>{generations.map(generation => <option key={generation.id} value={generation.id}>{generation.name} · {generation.status}</option>)}<option value="__new__">+ 새 학기 만들기</option></select>;
}

function Header({ onHome, onLogs, generations, selectedGenerationId, onGenerationChange, onNewGeneration }: { onHome: () => void; onLogs: () => void; generations: Generation[]; selectedGenerationId: string; onGenerationChange: (id: string) => void; onNewGeneration: () => void }) {
  return <>
    <header className="hidden h-14 items-center justify-between bg-[var(--chrome-header)] px-6 text-[var(--chrome-text)] sm:flex"><button aria-label="대시보드로 이동" onClick={onHome} className="flex items-center gap-2.5 rounded-[6px] text-left"><BrandMark /><b className="brand-title text-[19px] tracking-[-0.3px]">club flow</b><span className="mx-1 h-4 w-px bg-[var(--chrome-border)]" /><span className="font-data text-[10px] font-semibold text-[var(--chrome-text-muted)]">아우내 · 주연우 · 대표 운영진</span></button><GenerationSelect generations={generations} value={selectedGenerationId} onChange={onGenerationChange} onCreate={onNewGeneration} /></header>
    <header className="flex h-[64px] items-center justify-between gap-2 bg-[var(--chrome-header)] px-3 text-[var(--chrome-text)] sm:hidden"><button aria-label="대시보드로 이동" onClick={onHome} className="flex min-w-0 items-center gap-2 rounded-[6px] text-left"><BrandMark /><span className="flex min-w-0 flex-col"><b className="brand-title w-fit text-sm leading-none">club flow</b><span className="mt-1 truncate font-data text-[7px] font-semibold text-[var(--chrome-text-muted)]">아우내 · 주연우 · 대표 운영진</span></span></button><GenerationSelect generations={generations} value={selectedGenerationId} onChange={onGenerationChange} onCreate={onNewGeneration} compact /><button onClick={onLogs} className="rounded-[5px] border border-[var(--chrome-border)] px-2 py-1.5 text-[8px] font-bold text-[var(--chrome-text-muted)]">기록</button></header>
  </>;
}

const primaryNavItems: [Page, string][] = [["dashboard", "대시보드"], ["members", "부원"], ["sync", "Form 응답 가져오기"], ["applications", "지원서"], ["staff", "운영진"]];

function Navigation({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const active = (key: Page) => page === key || (page === "application" && key === "applications") || (page === "member" && key === "members");
  return <><nav className="hidden h-12 items-center justify-between bg-[var(--chrome-nav)] px-6 sm:flex"><div className="flex items-center gap-1.5">{primaryNavItems.map(([key, label]) => <button key={key} onClick={() => setPage(key)} className={`h-8 rounded-[6px] px-3 text-[11px] font-bold ${active(key) ? "bg-[var(--chrome-active)] text-white" : "text-[var(--chrome-text-muted)]"}`}>{label}</button>)}</div><button onClick={() => setPage("logs")} className={`h-7 border-l border-[var(--chrome-border)] pl-4 text-[10px] font-semibold ${active("logs") ? "text-white" : "text-[var(--chrome-text-muted)]"}`}>활동 기록</button></nav><nav className="flex h-12 gap-1 border-b border-[var(--chrome-border)] bg-[var(--chrome-nav)] px-2 py-1.5 sm:hidden">{primaryNavItems.map(([key, label]) => <button key={key} onClick={() => setPage(key)} className={`flex-1 rounded-[5px] text-[9px] font-semibold ${active(key) ? "bg-[var(--chrome-active)] font-extrabold text-white" : "text-[var(--chrome-text-muted)]"}`}>{label === "Form 응답 가져오기" ? "Form" : label}</button>)}</nav></>;
}

function PageTitle({ title, description, action }: { title: ReactNode; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4"><div className="min-w-0"><h1 className="text-xl font-extrabold sm:text-[22px]">{title}</h1>{description && <p className="mt-1 text-[11px] leading-[1.45] text-[var(--text-secondary)]">{description}</p>}</div>{action}</div>;
}

function DataTable({ header, rows, onRowClick, layout = "default" }: { header: string[]; rows: ReactNode[][]; onRowClick?: (index: number) => void; layout?: "default" | "applications" }) {
  const grid = layout === "applications" ? "grid-cols-[1.1fr_1.6fr_1fr_2.6fr_1fr_110px]" : "grid-cols-[1.4fr_2fr_1fr_1fr_1fr_180px]";
  const minWidth = layout === "applications" ? "min-w-[1040px]" : "min-w-[900px]";
  return <div className={`${minWidth} font-data text-[10px]`}><div className={`grid ${grid} bg-[var(--panel-muted)] px-3`}>{header.map(label => <b key={label} className="flex h-[38px] items-center text-[9px] text-[var(--text-secondary)]">{label}</b>)}</div>{rows.map((row, index) => <div key={index} role={onRowClick ? "button" : undefined} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(index)} className={`grid ${grid} border-t border-[var(--border-subtle)] px-3 ${onRowClick ? "cursor-pointer hover:bg-[var(--panel-muted)]" : ""}`}>{row.map((value, cell) => <div key={cell} className={`flex min-h-11 items-center pr-3 ${cell === 0 ? "font-body text-[11px] font-bold" : ""}`}>{value}</div>)}</div>)}</div>;
}

function Segmented({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <div className="flex h-9 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--panel-muted)] p-1">{options.map(option => <button key={option} onClick={() => onChange(option)} className={`flex-1 rounded-[4px] px-2 text-[10px] font-bold ${value === option ? "bg-[var(--navy)] text-white" : "text-[var(--text-secondary)]"}`}>{option}</button>)}</div>;
}

function GenerationModal({ memberships, generations, currentGenerationId, people, onClose, onCreate }: { memberships: Membership[]; generations: Generation[]; currentGenerationId: string; people: Person[]; onClose: () => void; onCreate: (generation: Generation, carryIds: string[]) => void }) {
  const [name, setName] = useState("27-1 학기");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [hasInterview, setHasInterview] = useState(true);
  const [scope, setScope] = useState("직전 학기 활동 중");
  const [query, setQuery] = useState("");
  const previousGeneration = generations.find(item => item.id !== currentGenerationId);
  const immediateCandidates = useMemo(() => memberships.filter(member => member.generationId === previousGeneration?.id && member.status === "활동 중"), [memberships, previousGeneration?.id]);
  const allCandidates = useMemo(() => {
    const generationOrder = new Map(generations.map((generation, index) => [generation.id, index]));
    const latestByPerson = new Map<string, Membership>();
    memberships.filter(member => member.generationId !== currentGenerationId).sort((a, b) => (generationOrder.get(a.generationId) ?? 999) - (generationOrder.get(b.generationId) ?? 999)).forEach(member => {
      if (!latestByPerson.has(member.personId)) latestByPerson.set(member.personId, member);
    });
    return [...latestByPerson.values()];
  }, [memberships, generations, currentGenerationId]);
  const [selected, setSelected] = useState(immediateCandidates.map(member => member.id));
  const defaultIds = immediateCandidates.map(member => member.id);
  const additions = selected.filter(id => !defaultIds.includes(id)).length;
  const removals = defaultIds.filter(id => !selected.includes(id)).length;
  const candidates = (scope === "직전 학기 활동 중" ? immediateCandidates : allCandidates).filter(member => {
    const person = people.find(item => item.id === member.personId);
    return `${person?.name} ${person?.email}`.toLowerCase().includes(query.toLowerCase());
  });
  const toggle = (id: string) => setSelected(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--overlay)] p-4"><Panel className="flex max-h-[90vh] w-full max-w-[680px] flex-col gap-3.5 overflow-auto p-5 shadow-[0_12px_32px_var(--shadow-modal)]"><div><h2 className="text-[18px] font-extrabold">새 학기 만들기</h2><p className="mt-1 text-[11px] text-[var(--text-secondary)]">직전 학기 인원을 기본 이월하고, 필요하면 전체 이전 학기에서 복귀 인원을 추가합니다.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-bold">학기명<input className="control mt-1" value={name} onChange={event => setName(event.target.value)} placeholder="예: 27-1 학기" /></label><label className="flex items-end gap-2 pb-1 text-[11px] font-bold"><input type="checkbox" checked={hasInterview} onChange={event => setHasInterview(event.target.checked)} /> 면접 진행</label><label className="text-[10px] font-bold">모집 시작일<input type="date" className="control mt-1" value={start} onChange={event => setStart(event.target.value)} /></label><label className="text-[10px] font-bold">모집 종료일<input type="date" className="control mt-1" value={end} onChange={event => setEnd(event.target.value)} /></label></div><div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--panel-muted)] p-3.5"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><b className="text-[11px]">기존 부원 이월</b><div className="flex flex-wrap gap-1"><Badge tone="success">추가 {additions}명</Badge><Badge tone={removals ? "warning" : "neutral"}>제외 {removals}명</Badge><Badge tone="navy">최종 {selected.length}명</Badge></div></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px]"><Segmented value={scope} options={["직전 학기 활동 중", "전체 이전 학기"]} onChange={setScope} /><input className="control" value={query} onChange={event => setQuery(event.target.value)} placeholder="이름 또는 이메일 검색" /></div><p className="mt-2 text-[9px] leading-[1.45] text-[var(--text-secondary)]">전체 이전 학기는 사람 기준으로 중복을 제거하고 가장 최근 참여 기록을 표시합니다.</p><div className="mt-2.5 grid max-h-[232px] gap-2 overflow-y-auto overscroll-contain pr-1">{candidates.map(member => { const person = people.find(item => item.id === member.personId)!; const sourceGeneration = generations.find(item => item.id === member.generationId); const checked = selected.includes(member.id); return <label key={member.id} className="flex min-h-[52px] items-center justify-between gap-3 rounded-[6px] bg-white p-2.5 text-[11px]"><span className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={checked} onChange={() => toggle(member.id)} /><span className="min-w-0"><b className="block">{person.name}</b><span className="block truncate text-[9px] text-[var(--text-secondary)]">{person.email} · 최근 {sourceGeneration?.name} · {member.team}</span></span></span><Badge tone={checked ? "navy" : "neutral"}>{checked ? "이월 예정" : "추가 가능"}</Badge></label>; })}{!candidates.length && <p className="rounded-[6px] bg-white p-4 text-center text-[10px] text-[var(--text-secondary)]">조건에 맞는 이월 후보가 없습니다.</p>}</div></div><div className="flex justify-end gap-2"><Button onClick={onClose}>취소</Button><Button primary disabled={!name.trim()} onClick={() => onCreate({ id: `g${Date.now()}`, name, start, end, status: "모집 중", hasInterview }, selected)}>{name} 생성 · {selected.length}명 이월</Button></div></Panel></div>;
}

function GenerationEditModal({ generation, onClose, onSave }: { generation: Generation; onClose: () => void; onSave: (generation: Generation) => void }) {
  const [name, setName] = useState(generation.name);
  const [start, setStart] = useState(generation.start || "");
  const [end, setEnd] = useState(generation.end || "");
  const [status, setStatus] = useState<GenerationStatus>(generation.status);
  const [hasInterview, setHasInterview] = useState(generation.hasInterview);
  const save = () => onSave({ ...generation, name: name.trim(), start, end, status, hasInterview });
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--overlay)] p-4"><Panel className="flex w-full max-w-[560px] flex-col gap-4 p-5 shadow-[0_12px_32px_var(--shadow-modal)]"><div><h2 className="text-[18px] font-extrabold">학기 설정 수정</h2><p className="mt-1 text-[11px] text-[var(--text-secondary)]">학기 정보만 변경되며 기존 부원, 지원서, Form 연결은 유지됩니다.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-bold">학기명<input className="control mt-1" value={name} onChange={event => setName(event.target.value)} /></label><label className="text-[10px] font-bold">학기 상태<select className="control mt-1" value={status} onChange={event => setStatus(event.target.value as GenerationStatus)}><option>모집 중</option><option>활동 중</option><option>종료</option></select></label><label className="text-[10px] font-bold">모집 시작일<input type="date" className="control mt-1" value={start} onChange={event => setStart(event.target.value)} /></label><label className="text-[10px] font-bold">모집 종료일<input type="date" className="control mt-1" value={end} onChange={event => setEnd(event.target.value)} /></label></div><label className="flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--panel-muted)] p-3 text-[11px] font-bold"><input type="checkbox" checked={hasInterview} onChange={event => setHasInterview(event.target.checked)} /> 면접 진행 여부</label><div className="flex justify-end gap-2"><Button onClick={onClose}>취소</Button><Button primary disabled={!name.trim()} onClick={save}>변경 저장</Button></div></Panel></div>;
}

function CarryoverManagementModal({ generation, generations, memberships, people, onClose, onSave }: { generation: Generation; generations: Generation[]; memberships: Membership[]; people: Person[]; onClose: () => void; onSave: (personIds: string[]) => void }) {
  const [scope, setScope] = useState("직전 학기 활동 중");
  const [query, setQuery] = useState("");
  const currentMemberships = memberships.filter(item => item.generationId === generation.id);
  const currentByPerson = new Map(currentMemberships.map(item => [item.personId, item]));
  const previousGeneration = generations.find(item => item.id !== generation.id);
  const immediateCandidates = useMemo(() => memberships.filter(item => item.generationId === previousGeneration?.id && item.status === "활동 중"), [memberships, previousGeneration?.id]);
  const previousCandidates = useMemo(() => {
    const generationOrder = new Map(generations.map((item, index) => [item.id, index]));
    const latestByPerson = new Map<string, Membership>();
    memberships.filter(item => item.generationId !== generation.id).sort((a, b) => (generationOrder.get(a.generationId) ?? 999) - (generationOrder.get(b.generationId) ?? 999)).forEach(item => {
      if (!latestByPerson.has(item.personId)) latestByPerson.set(item.personId, item);
    });
    return [...latestByPerson.values()];
  }, [memberships, generations, generation.id]);
  const [selected, setSelected] = useState(currentMemberships.filter(item => item.origin === "carryover").map(item => item.personId));
  const filtered = (scope === "직전 학기 활동 중" ? immediateCandidates : previousCandidates).filter(item => {
    const person = people.find(candidate => candidate.id === item.personId);
    return `${person?.name} ${person?.email}`.toLowerCase().includes(query.toLowerCase());
  });
  const initialCarryoverIds = currentMemberships.filter(item => item.origin === "carryover").map(item => item.personId);
  const additions = selected.filter(id => !initialCarryoverIds.includes(id) && !currentByPerson.has(id)).length;
  const removals = initialCarryoverIds.filter(id => !selected.includes(id)).length;
  const toggle = (personId: string) => setSelected(items => items.includes(personId) ? items.filter(item => item !== personId) : [...items, personId]);
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--overlay)] p-4"><Panel className="flex max-h-[90vh] w-full max-w-[680px] flex-col gap-4 overflow-auto p-5 shadow-[0_12px_32px_var(--shadow-modal)]"><div><h2 className="text-[18px] font-extrabold">{generation.name} 이월 인원 관리</h2><p className="mt-1 text-[11px] leading-[1.45] text-[var(--text-secondary)]">이전 학기 참여자를 추가하거나, 이월로 등록된 인원만 제외할 수 있습니다. 다른 경로로 등록된 부원은 유지됩니다.</p></div><div className="flex flex-wrap gap-2"><Badge tone="success">추가 예정 {additions}명</Badge><Badge tone={removals ? "warning" : "neutral"}>제외 예정 {removals}명</Badge><Badge tone="navy">이월 유지 {selected.length - additions}명</Badge></div><div className="grid gap-2 sm:grid-cols-[1fr_220px]"><Segmented value={scope} options={["직전 학기 활동 중", "전체 이전 학기"]} onChange={setScope} /><input className="control" value={query} onChange={event => setQuery(event.target.value)} placeholder="이름 또는 이메일 검색" /></div><p className="text-[9px] leading-[1.45] text-[var(--text-secondary)]">전체 이전 학기는 사람 기준으로 중복을 제거하고 가장 최근 참여 기록을 표시합니다.</p><div className="grid max-h-[252px] gap-2 overflow-y-auto overscroll-contain rounded-[8px] bg-[var(--panel-muted)] p-2.5 pr-2">{filtered.map(source => { const person = people.find(item => item.id === source.personId)!; const sourceGeneration = generations.find(item => item.id === source.generationId); const current = currentByPerson.get(source.personId); const locked = Boolean(current && current.origin !== "carryover"); const checked = locked || selected.includes(source.personId); return <label key={source.personId} className={`flex min-h-[52px] items-center justify-between gap-3 rounded-[6px] bg-white p-3 text-[11px] ${locked ? "opacity-65" : ""}`}><span className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(source.personId)} /><span className="min-w-0"><b className="block">{person.name}</b><span className="block truncate text-[9px] text-[var(--text-secondary)]">{person.email} · 최근 {sourceGeneration?.name} · {source.team}</span></span></span>{locked ? <Badge>이미 참여</Badge> : current?.origin === "carryover" ? <Badge tone="navy">이월됨</Badge> : <Badge>추가 가능</Badge>}</label>; })}</div><div className="flex justify-end gap-2"><Button onClick={onClose}>취소</Button><Button primary onClick={() => onSave(selected)}>이월 인원 변경 저장</Button></div></Panel></div>;
}

function DashboardPage({ generation, applicants, memberships, onEditGeneration, onManageCarryover }: { generation: Generation; applicants: Applicant[]; memberships: Membership[]; onEditGeneration: () => void; onManageCarryover: () => void }) {
  const statuses = generation.hasInterview ? ["접수", "서류합격", "최종합격", "불합격"] : ["접수", "합격", "불합격"];
  const recruiting = generation.status === "모집 중";
  const statusTitle = recruiting ? `${generation.name} 모집 진행 중` : generation.status === "활동 중" ? `${generation.name} 운영 중` : `${generation.name} 운영 종료`;
  const statusPanel = recruiting
    ? <section className="flex flex-col gap-2 rounded-[8px] border border-[#111827] bg-[#111827] p-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="inline-flex h-6 items-center rounded-[5px] bg-white/10 px-2.5 text-[10px] font-extrabold text-white">{generation.status}</span><b className="mt-2 block text-sm text-white">{statusTitle}</b><span className="text-[10px] text-[#D1D5DB]">{generation.start || "시작일 미정"} ~ {generation.end || "종료일 미정"} · {generation.hasInterview ? "면접 진행" : "면접 없음"}</span></div><div className="flex gap-5"><span><small className="block text-[9px] text-[#D1D5DB]">지원서</small><b className="font-data text-2xl text-white">{applicants.length}명</b></span><span><small className="block text-[9px] text-[#D1D5DB]">학기 부원</small><b className="font-data text-2xl text-white">{memberships.length}명</b></span></div></section>
    : <section className="flex flex-col gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><Badge tone={statusTone(generation.status)}>{generation.status}</Badge><b className="mt-2 block text-sm text-[var(--text-primary)]">{statusTitle}</b><span className="text-[10px] text-[var(--text-secondary)]">{generation.start || "시작일 미정"} ~ {generation.end || "종료일 미정"} · {generation.hasInterview ? "면접 진행" : "면접 없음"}</span></div><div className="flex gap-5"><span><small className="block text-[9px] text-[var(--text-secondary)]">지원서</small><b className="font-data text-2xl text-[var(--text-primary)]">{applicants.length}명</b></span><span><small className="block text-[9px] text-[var(--text-secondary)]">학기 부원</small><b className="font-data text-2xl text-[var(--text-primary)]">{memberships.length}명</b></span></div></section>;
  return <><PageTitle title={`${generation.name} 운영 대시보드`} description="선택한 학기의 모집, 지원서, 부원 현황입니다." action={<div className="flex flex-wrap gap-2"><Button onClick={onManageCarryover}>이월 인원 관리</Button><Button onClick={onEditGeneration}>학기 설정 수정</Button></div>} />{statusPanel}<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[["학기 부원", memberships.length], ["활동 중", memberships.filter(item => item.status === "활동 중").length], ["회비 미제출", memberships.filter(hasOutstandingFee).length], ["지원서", applicants.length]].map(([label, value]) => <Panel key={label} className="p-4"><span className="text-[11px] text-[var(--text-secondary)]">{label}</span><b className="mt-2 block font-data text-2xl">{value}</b></Panel>)}</div><Panel className="p-4"><b className="text-sm">지원서 진행 현황</b><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{statuses.map(status => <div key={status} className="border-t border-[var(--border-subtle)] pt-2"><span className="text-[10px] text-[var(--text-secondary)]">{status}</span><b className="block font-data text-lg">{applicants.filter(item => item.status === status).length}</b></div>)}</div></Panel></>;
}

function SyncPage({ generation, generations, forms, setForms, connectionStatus, setConnectionStatus, notify, importMembers }: { generation: Generation; generations: Generation[]; forms: FormConfig[]; setForms: (forms: FormConfig[]) => void; connectionStatus: GoogleConnectionStatus; setConnectionStatus: (status: GoogleConnectionStatus) => void; notify: (text: string) => void; importMembers: (formId: string, generationId: string) => void }) {
  const [purpose, setPurpose] = useState<FormPurpose>("지원서");
  const [generationId, setGenerationId] = useState(generation.id);
  const [selectedFormId, setSelectedFormId] = useState(availableGoogleForms[0].id);
  const [syncingFormId, setSyncingFormId] = useState("");
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const startGoogleConnection = () => {
    setConnectionStatus("connecting");
    window.setTimeout(() => { setConnectionStatus("connected"); notify("Google 계정 연결 완료"); }, 700);
  };
  const connectForm = () => {
    const selectedForm = availableGoogleForms.find(item => item.id === selectedFormId)!;
    if (forms.some(item => item.id === selectedForm.id && item.generationId === generationId)) {
      notify("이미 해당 학기에 연결된 Form입니다.");
      return;
    }
    setForms([...forms, { ...selectedForm, status: "active", lastSync: "동기화 전", purpose, generationId }]);
    notify(`${selectedForm.name} Form 연결 완료`);
  };
  const syncForm = (form: FormConfig) => {
    setSyncingFormId(form.id);
    window.setTimeout(() => {
      setForms(forms.map(item => item.id === form.id ? { ...item, status: "active", lastSync: "방금 전" } : item));
      setSyncingFormId("");
      if (form.purpose === "부원 명단") importMembers(form.id, form.generationId);
      else notify("동기화 완료 · 신규 지원서 4건 · 중복 2건 제외");
    }, 650);
  };
  const disconnect = () => {
    setConnectionStatus("disconnected");
    setForms(forms.map(item => ({ ...item, status: "disconnected" })));
    setDisconnectConfirm(false);
    notify("Google 계정 연결을 해제했습니다.");
  };
  const visibleForms = forms.filter(form => form.generationId === generation.id);
  return <><PageTitle title={`${generation.name} Form 연결`} description="Google 계정을 연결하고 접근 가능한 Form을 현재 학기에 연결합니다." /><Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="flex flex-1 items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${connectionStatus === "connected" ? "bg-[var(--success)]" : connectionStatus === "connecting" ? "bg-[var(--warning)]" : "bg-[var(--text-secondary)]"}`} /><div><b className="text-xs">{connectionStatus === "connected" ? "Google 계정 연결됨" : connectionStatus === "connecting" ? "Google 인증 화면에서 연결 중" : connectionStatus === "error" ? "Google 계정 재연결 필요" : "Google 계정 연결 필요"}</b><p className="mt-1 text-[9px] text-[var(--text-secondary)]">{connectionStatus === "connected" ? "forms-manager@gmail.com · Form 조회 권한" : "브라우저에는 OAuth 토큰을 저장하지 않습니다."}</p></div></div>{connectionStatus === "connected" ? <Button danger onClick={() => setDisconnectConfirm(true)}>연결 해제</Button> : <Button primary disabled={connectionStatus === "connecting"} onClick={startGoogleConnection}>{connectionStatus === "connecting" ? "연결 중..." : connectionStatus === "error" ? "다시 연결" : "Google 계정 연결"}</Button>}</Panel>{connectionStatus === "connected" && <Panel className="grid gap-4 p-4"><b className="text-sm">접근 가능한 Form 연결</b><label className="text-[10px] font-bold">1. Form 선택<select className="control mt-1" value={selectedFormId} onChange={event => setSelectedFormId(event.target.value)}>{availableGoogleForms.map(item => <option key={item.id} value={item.id}>{item.name} · {item.access} · {item.responses}개 응답</option>)}</select></label><div><b className="text-[10px]">2. 용도 선택</b><Segmented value={purpose} options={["지원서", "부원 명단"]} onChange={value => setPurpose(value as FormPurpose)} /></div><label className="text-[10px] font-bold">3. 학기 선택<select className="control mt-1" value={generationId} onChange={event => setGenerationId(event.target.value)}>{generations.map(item => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}</select></label><Button primary className="w-fit" onClick={connectForm}>선택한 Form 연결</Button></Panel>}<div className="grid gap-2"><b className="text-sm">연결된 Form</b>{visibleForms.map(form => <Panel key={form.id} className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center"><div className="flex-1"><b className="text-xs">{form.name}</b><div className="mt-1 flex flex-wrap gap-1"><Badge tone={statusTone(form.status)}>{form.status}</Badge><Badge tone="navy">{form.purpose}</Badge><Badge>{generation.name}</Badge></div></div><span className="font-data text-[10px] text-[var(--text-secondary)]">{form.responses}개 응답 · {form.lastSync}</span><Button disabled={connectionStatus !== "connected" || syncingFormId === form.id} onClick={() => syncForm(form)}>{syncingFormId === form.id ? "동기화 중..." : connectionStatus === "connected" ? "응답 동기화" : "재연결 필요"}</Button></Panel>)}{!visibleForms.length && <Panel className="p-6 text-center text-[11px] text-[var(--text-secondary)]">현재 학기에 연결된 Form이 없습니다.</Panel>}</div>{disconnectConfirm && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--overlay)] p-4"><Panel className="w-full max-w-[480px] p-5"><h2 className="text-[18px] font-extrabold">Google 계정 연결 해제</h2><p className="my-3 text-[11px] leading-[1.5] text-[var(--text-secondary)]">연결된 Form의 동기화가 중단됩니다. 기존에 가져온 지원서와 부원 정보는 유지됩니다.</p><div className="flex justify-end gap-2"><Button onClick={() => setDisconnectConfirm(false)}>취소</Button><Button danger onClick={disconnect}>연결 해제</Button></div></Panel></div>}</>;
}

function ApplicationsPage({ generation, applicants, people, setApplicants, openDetail, notify, registerAccepted }: { generation: Generation; applicants: Applicant[]; people: Person[]; setApplicants: (items: Applicant[]) => void; openDetail: (id: string) => void; notify: (text: string) => void; registerAccepted: (applicants: Applicant[]) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("지원 상태 전체");
  const [modal, setModal] = useState(false);
  const options = generation.hasInterview ? ["접수", "서류합격", "최종합격", "불합격"] : ["접수", "합격", "불합격"];
  const bulkStatus = generation.hasInterview ? "서류합격" : "합격";
  const filtered = applicants.filter(applicant => { const person = people.find(item => item.id === applicant.personId)!; return (status === "지원 상태 전체" || applicant.status === status) && `${person.name} ${person.email}`.toLowerCase().includes(query.toLowerCase()); });
  const bulk = () => { const updated = applicants.map(item => item.status === "불합격" ? item : { ...item, status: bulkStatus }); setApplicants(updated); if (!generation.hasInterview) registerAccepted(updated.filter(item => item.status === "합격")); setModal(false); notify(`${bulkStatus} 일괄 처리 완료`); };
  return <><PageTitle title={`${generation.name} 지원서 관리`} action={<div className="flex gap-2"><Button onClick={() => setModal(true)}>{generation.hasInterview ? "서류 일괄 합격" : "불합격 인원 외 합격 처리"}</Button><Button primary onClick={() => notify("최신 지원서를 동기화했습니다.")}>최신 응답 동기화</Button></div>} /><div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={event => setQuery(event.target.value)} className="control sm:w-[360px]" placeholder="이름 또는 이메일 검색" /><select value={status} onChange={event => setStatus(event.target.value)} className="control sm:w-[200px]"><option>지원 상태 전체</option>{options.map(option => <option key={option}>{option}</option>)}</select></div><Panel className="hidden overflow-x-auto sm:block"><DataTable layout="applications" header={["이름", "이메일", "지원 상태", "지원서명", "제출일", "액션"]} rows={filtered.map(applicant => { const person = people.find(item => item.id === applicant.personId)!; return [person.name, person.email, <Badge tone={statusTone(applicant.status)}>{applicant.status}</Badge>, applicant.form, applicant.submittedAt, <Button onClick={() => openDetail(applicant.id)}>상세</Button>]; })} /></Panel><div className="grid gap-2 sm:hidden">{filtered.map(applicant => { const person = people.find(item => item.id === applicant.personId)!; return <button key={applicant.id} onClick={() => openDetail(applicant.id)} className="text-left"><Panel className="p-3"><div className="flex justify-between"><b className="text-xs">{person.name}</b><Badge tone={statusTone(applicant.status)}>{applicant.status}</Badge></div><p className="mt-2 text-[10px] text-[var(--text-secondary)]">{person.email} · {applicant.form}</p></Panel></button>; })}</div>{modal && <div className="fixed inset-0 z-30 flex items-center justify-center bg-[var(--overlay)] p-4"><Panel className="w-full max-w-[580px] p-5"><h2 className="text-[18px] font-extrabold">{bulkStatus} 일괄 처리</h2><p className="my-3 text-[11px] text-[var(--text-secondary)]">불합격 인원을 제외한 {applicants.filter(item => item.status !== "불합격").length}명을 {bulkStatus} 처리합니다.</p><div className="flex justify-end gap-2"><Button onClick={() => setModal(false)}>취소</Button><Button primary onClick={bulk}>{bulkStatus} 처리</Button></div></Panel></div>}</>;
}

function ApplicationDetail({ applicant, person, generation, update, onBack }: { applicant: Applicant; person: Person; generation: Generation; update: (status: string) => void; onBack: () => void }) {
  const options = generation.hasInterview ? ["접수", "서류합격", "최종합격", "불합격"] : ["접수", "합격", "불합격"];
  const responses = [
    ["지원 동기", "커뮤니티와 함께 성장하고 실제 프로젝트에 기여하고 싶습니다."],
    ["관심 분야", "프론트엔드 개발 · UI/UX"],
    ["활동 가능 시간", "평일 저녁과 주말 정기 활동에 참여할 수 있습니다."],
  ];
  return <><Button className="w-fit" onClick={onBack}>← 목록으로</Button><PageTitle title="지원서 상세" description={`${generation.name} · ${person.name} · ${person.email}`} action={<Badge tone={statusTone(applicant.status)}>{applicant.status}</Badge>} /><Panel className="overflow-hidden"><div className="border-b border-[var(--border-subtle)] bg-[var(--panel-muted)] px-4 py-3"><b className="text-sm">Google Form 원본 응답</b><p className="mt-1 text-[9px] text-[var(--text-secondary)]">원본 응답은 수정할 수 없습니다.</p></div><div className="grid gap-4 p-4"><section><b className="text-[11px]">기본 정보</b><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Info label="이름" value={person.name} /><Info label="이메일" value={person.email} /><Info label="연락처" value={person.phone} /><Info label="제출일" value={applicant.submittedAt} /><Info label="연결 Form" value={applicant.form} /><Info label="지원 학기" value={generation.name} /></div></section><section className="border-t border-[var(--border-subtle)] pt-4"><b className="text-[11px]">지원서 응답</b><div className="mt-3 grid gap-2">{responses.map(([question, answer]) => <div key={question} className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--panel-muted)] p-3"><b className="text-[9px] text-[var(--text-secondary)]">{question}</b><p className="mt-1.5 text-[11px] leading-[1.5]">{answer}</p></div>)}</div></section></div></Panel><Panel className="grid gap-3 p-4 sm:grid-cols-[420px_1fr]"><label className="text-[10px] font-bold">{generation.name} 지원 상태<Segmented value={applicant.status} options={options} onChange={update} /></label><label className="text-[10px] font-bold">내부 메모<input className="control mt-1" defaultValue="최종 인터뷰 후 결정" /></label></Panel></>;
}

function MembersPage({ generation, memberships, people, openDetail }: { generation: Generation; memberships: Membership[]; people: Person[]; openDetail: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("활동 상태 선택");
  const filtered = memberships.filter(member => { const person = people.find(item => item.id === member.personId)!; return (status === "활동 상태 선택" || member.status === status) && `${person.name} ${person.email}`.toLowerCase().includes(query.toLowerCase()); });
  return <><PageTitle title={`${generation.name} 부원 관리`} description="선택한 학기의 참여 기록을 관리합니다." /><div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={event => setQuery(event.target.value)} className="control sm:w-[380px]" placeholder="이름 또는 이메일 검색" /><select value={status} onChange={event => setStatus(event.target.value)} className="control sm:w-[220px]"><option>활동 상태 선택</option><option>활동 중</option><option>활동 종료</option></select></div><div className="grid grid-cols-3 gap-2 sm:gap-3">{[["학기 부원", memberships.length], ["활동 중", memberships.filter(item => item.status === "활동 중").length], ["회비 미제출", memberships.filter(hasOutstandingFee).length]].map(([label, value]) => <Panel key={label} className="flex min-w-0 flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"><span className="truncate text-[9px] text-[var(--text-secondary)] sm:text-xs sm:text-[var(--text-primary)]">{label}</span><b className="font-data text-lg">{value}</b></Panel>)}</div><Panel className="hidden overflow-x-auto sm:block"><DataTable header={["이름", "이메일", "활동 상태", "회비 제출", "소속", ""]} rows={filtered.map(member => { const person = people.find(item => item.id === member.personId)!; return [person.name, person.email, <Badge tone={statusTone(member.status)}>{member.status}</Badge>, <Badge tone={statusTone(member.fee)}>{member.fee}</Badge>, member.team, "›"]; })} onRowClick={index => openDetail(filtered[index].id)} /></Panel><div className="grid gap-2 sm:hidden">{filtered.map(member => { const person = people.find(item => item.id === member.personId)!; return <button key={member.id} onClick={() => openDetail(member.id)} className="text-left"><Panel className="p-3"><div className="flex justify-between"><b>{person.name}</b><span>›</span></div><p className="my-2 text-[10px] text-[var(--text-secondary)]">{person.email} · {member.team}</p><div className="flex gap-1"><Badge tone={statusTone(member.status)}>{member.status}</Badge><Badge tone={statusTone(member.fee)}>{member.fee}</Badge></div></Panel></button>; })}</div></>;
}

function MemberDetail({ membership, person, generation, history, generations, update, remove, notify, onBack }: { membership: Membership; person: Person; generation: Generation; history: Membership[]; generations: Generation[]; update: (value: Membership) => void; remove: () => void; notify: (text: string) => void; onBack: () => void }) {
  return <><Button className="w-fit" onClick={onBack}>← 목록으로</Button><PageTitle title="부원 상세 확인" description={`${person.name} · Person 정보는 모든 학기에서 공유됩니다.`} /><Panel className="grid gap-3 p-4 sm:grid-cols-3"><Info label="이메일" value={person.email} /><Info label="연락처" value={person.phone} /><Info label="식별 기준" value="이메일" /></Panel><Panel className="p-4"><b className="text-sm">학기 참여 이력</b><div className="mt-3 grid gap-2">{history.map(item => <div key={item.id} className="flex items-center justify-between border-l-2 border-[var(--navy)] pl-3 text-[11px]"><span><b>{generations.find(gen => gen.id === item.generationId)?.name}</b> · {item.team}</span><Badge tone={statusTone(item.status)}>{item.status}</Badge></div>)}</div></Panel><Panel className="grid gap-3 p-4"><b className="text-sm">{generation.name} 활동 정보</b><div className="grid gap-3 sm:grid-cols-[220px_220px_1fr]"><label className="text-[10px] font-bold">활동 상태<Segmented value={membership.status} options={["활동 중", "활동 종료"]} onChange={value => update({ ...membership, status: value as Membership["status"] })} /></label><label className="text-[10px] font-bold">회비 제출<Segmented value={membership.fee} options={["제출 완료", "미제출"]} onChange={value => update({ ...membership, fee: value as Membership["fee"] })} /></label><label className="text-[10px] font-bold">운영 메모<input value={membership.memo} onChange={event => update({ ...membership, memo: event.target.value })} className="control mt-1" /></label></div></Panel><div className="flex justify-between"><Button danger onClick={remove}>현재 학기 참여 삭제</Button><Button primary onClick={() => notify(`${generation.name} 활동 정보를 저장했습니다.`)}>변경 저장</Button></div></>;
}

function StaffPage() {
  return <><PageTitle title="운영진 관리" action={<Button primary>운영진 초대</Button>} /><Panel className="p-4 text-xs">주연우 · 대표 운영진<br /><br />김민지 · 운영진<br /><br />최하늘 · 운영진</Panel></>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><b className="text-[10px] text-[var(--text-secondary)]">{label}</b><p className="mt-1 text-xs font-bold">{value}</p></div>;
}

function LogsPage() {
  return <><PageTitle title="활동 기록" description="운영진이 수행한 주요 변경 사항을 시간순으로 확인합니다." action={<Badge tone="navy">총 126건</Badge>} /><Panel className="hidden overflow-x-auto sm:block"><div className="grid min-w-[900px] grid-cols-[180px_1.1fr_2fr_120px_150px] bg-[var(--panel-muted)] px-4 text-[9px] font-extrabold text-[var(--text-secondary)]"><span className="flex h-10 items-center">작업</span><span className="flex h-10 items-center">대상</span><span className="flex h-10 items-center">변경 내용</span><span className="flex h-10 items-center">수행자</span><span className="flex h-10 items-center">일시</span></div>{activityLogs.map(log => <div key={log.id} className="grid min-h-[62px] min-w-[900px] grid-cols-[180px_1.1fr_2fr_120px_150px] items-center border-t border-[var(--border-subtle)] px-4 text-[10px]"><div><Badge tone={log.tone}>{log.action}</Badge></div><b className="pr-4 text-[11px]">{log.target}</b><span className="pr-4 leading-[1.45] text-[var(--text-secondary)]">{log.detail}</span><span className="font-bold">{log.actor}</span><time className="font-data text-[9px] text-[var(--text-secondary)]">{log.occurredAt}</time></div>)}</Panel><div className="grid gap-2 sm:hidden">{activityLogs.map(log => <Panel key={log.id} className="p-3.5"><div className="flex items-start justify-between gap-3"><div><Badge tone={log.tone}>{log.action}</Badge><b className="mt-2 block text-xs">{log.target}</b></div><time className="shrink-0 font-data text-[8px] text-[var(--text-secondary)]">{log.occurredAt}</time></div><p className="mt-2.5 border-t border-[var(--border-subtle)] pt-2.5 text-[10px] leading-[1.5] text-[var(--text-secondary)]">{log.detail}</p><span className="mt-2 block text-[9px] font-bold">수행자 · {log.actor}</span></Panel>)}</div></>;
}

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [generations, setGenerations] = useState(initialGenerations);
  const [selectedGenerationId, setSelectedGenerationId] = useState("g13");
  const [people, setPeople] = useState(initialPeople);
  const [memberships, setMemberships] = useState(initialMemberships);
  const [applicants, setApplicants] = useState(initialApplicants);
  const [forms, setForms] = useState(initialForms);
  const [googleConnectionStatus, setGoogleConnectionStatus] = useState<GoogleConnectionStatus>("connected");
  const [selectedApplicantId, setSelectedApplicantId] = useState("a1");
  const [selectedMembershipId, setSelectedMembershipId] = useState("m13-1");
  const [generationModal, setGenerationModal] = useState(false);
  const [generationEditModal, setGenerationEditModal] = useState(false);
  const [carryoverModal, setCarryoverModal] = useState(false);
  const [toast, setToast] = useState("");
  const generation = generations.find(item => item.id === selectedGenerationId)!;
  const generationApplicants = applicants.filter(item => item.generationId === selectedGenerationId);
  const generationMemberships = memberships.filter(item => item.generationId === selectedGenerationId);
  const selectedApplicant = applicants.find(item => item.id === selectedApplicantId);
  const selectedMembership = memberships.find(item => item.id === selectedMembershipId);
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2600); };
  const changeGeneration = (id: string) => { setSelectedGenerationId(id); setPage("dashboard"); };
  const ensureMembership = (applicant: Applicant) => {
    if (memberships.some(item => item.personId === applicant.personId && item.generationId === applicant.generationId)) return;
    setMemberships(items => [...items, { id: `m${Date.now()}-${applicant.personId}`, personId: applicant.personId, generationId: applicant.generationId, status: "활동 중", team: "미배정", fee: "미제출", memo: "지원서 합격으로 자동 등록", joinedAt: "2026.06.11", origin: "application" }]);
  };
  const updateApplicantStatus = (status: string) => {
    if (!selectedApplicant) return;
    setApplicants(items => items.map(item => item.id === selectedApplicant.id ? { ...item, status } : item));
    const accepted = generation.hasInterview ? status === "최종합격" : status === "합격";
    if (accepted) { ensureMembership(selectedApplicant); notify(`합격 처리 · ${generation.name} 부원으로 등록됨`); }
  };
  const registerAccepted = (items: Applicant[]) => items.forEach(ensureMembership);
  const importMembers = (formId: string, generationId: string) => {
    const peopleByEmail = new Map(people.map(person => [normalizeEmail(person.email), person]));
    const knownResponseIds = new Set(memberships.map(membership => membership.sourceResponseId).filter(Boolean));
    const knownMemberships = new Set(memberships.map(membership => `${membership.generationId}:${membership.personId}`));
    const newPeople: Person[] = [];
    const newMemberships: Membership[] = [];
    let existingPeopleLinked = 0;
    let duplicatesSkipped = 0;

    importedMemberResponses.forEach(response => {
      const sourceResponseId = `${formId}:${response.responseId}`;
      const email = normalizeEmail(response.email);
      let person = peopleByEmail.get(email);
      if (!person) {
        person = { id: `person-${formId}-${response.responseId}`, name: response.name, email, phone: response.phone };
        peopleByEmail.set(email, person);
        newPeople.push(person);
      }

      if (knownResponseIds.has(sourceResponseId) || knownMemberships.has(`${generationId}:${person.id}`)) {
        duplicatesSkipped += 1;
        return;
      }

      if (!newPeople.includes(person)) existingPeopleLinked += 1;
      knownResponseIds.add(sourceResponseId);
      knownMemberships.add(`${generationId}:${person.id}`);
      newMemberships.push({ id: `membership-${generationId}-${person.id}`, personId: person.id, generationId, status: "활동 중", team: response.team, fee: "미제출", memo: "부원 명단 Form에서 등록", joinedAt: "2026.06.11", origin: "form", sourceResponseId });
    });

    if (newPeople.length) setPeople(items => [...items, ...newPeople]);
    if (newMemberships.length) setMemberships(items => [...items, ...newMemberships]);
    notify(`가져오기 완료 · 신규 ${newPeople.length}명 · 기존 인원 연결 ${existingPeopleLinked}명 · 중복 ${duplicatesSkipped}명 제외`);
  };
  const createGeneration = (newGeneration: Generation, carryIds: string[]) => {
    const selectedByPerson = new Map<string, Membership>();
    carryIds.map(id => memberships.find(item => item.id === id)).filter((item): item is Membership => Boolean(item)).forEach(item => selectedByPerson.set(item.personId, item));
    const carried = [...selectedByPerson.values()].map(item => ({ ...item, id: `m${Date.now()}-${item.personId}`, generationId: newGeneration.id, status: "활동 중" as const, fee: "미제출" as const, memo: `${generations.find(generation => generation.id === item.generationId)?.name || "이전 학기"}에서 이월`, joinedAt: "2026.06.11", origin: "carryover" as const, sourceResponseId: undefined, carriedFromMembershipId: item.id }));
    setGenerations(items => [newGeneration, ...items]); setMemberships(items => [...items, ...carried]); setSelectedGenerationId(newGeneration.id); setGenerationModal(false); setPage("dashboard"); notify(`${newGeneration.name} 생성 · 부원 ${carried.length}명 이월 완료`);
  };
  const updateGeneration = (updatedGeneration: Generation) => {
    setGenerations(items => items.map(item => item.id === updatedGeneration.id ? updatedGeneration : item));
    setGenerationEditModal(false);
    notify(`${updatedGeneration.name} 학기 설정을 수정했습니다.`);
  };
  const updateCarryover = (selectedPersonIds: string[]) => {
    const current = memberships.filter(item => item.generationId === selectedGenerationId);
    const currentCarryovers = current.filter(item => item.origin === "carryover");
    const selected = new Set(selectedPersonIds);
    const removedIds = new Set(currentCarryovers.filter(item => !selected.has(item.personId)).map(item => item.id));
    const remainingPersonIds = new Set(current.filter(item => !removedIds.has(item.id)).map(item => item.personId));
    const generationOrder = new Map(generations.map((item, index) => [item.id, index]));
    const latestPreviousByPerson = new Map<string, Membership>();
    memberships.filter(item => item.generationId !== selectedGenerationId).sort((a, b) => (generationOrder.get(a.generationId) ?? 999) - (generationOrder.get(b.generationId) ?? 999)).forEach(item => {
      if (!latestPreviousByPerson.has(item.personId)) latestPreviousByPerson.set(item.personId, item);
    });
    const additions = selectedPersonIds.filter(personId => !remainingPersonIds.has(personId)).map(personId => latestPreviousByPerson.get(personId)).filter((item): item is Membership => Boolean(item)).map(item => ({ ...item, id: `m${Date.now()}-${item.personId}`, generationId: selectedGenerationId, status: "활동 중" as const, fee: "미제출" as const, memo: `${generations.find(generation => generation.id === item.generationId)?.name || "이전 학기"}에서 이월`, joinedAt: "2026.06.11", origin: "carryover" as const, sourceResponseId: undefined, carriedFromMembershipId: item.id }));
    setMemberships(items => [...items.filter(item => !removedIds.has(item.id)), ...additions]);
    setCarryoverModal(false);
    notify(`이월 인원 수정 완료 · 추가 ${additions.length}명 · 제외 ${removedIds.size}명`);
  };
  const isDetail = page === "application" || page === "member";
  return <div className={`min-h-full font-body text-[var(--text-primary)] ${isDetail ? "bg-[var(--surface-detail)]" : "bg-[var(--surface)]"}`}><Header onHome={() => setPage("dashboard")} onLogs={() => setPage("logs")} generations={generations} selectedGenerationId={selectedGenerationId} onGenerationChange={changeGeneration} onNewGeneration={() => setGenerationModal(true)} /><Navigation page={page} setPage={setPage} /><main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-[18px] pb-5 sm:px-5 sm:py-5 xl:px-8 xl:py-7 xl:pb-7">
    {page === "dashboard" && <DashboardPage generation={generation} applicants={generationApplicants} memberships={generationMemberships} onEditGeneration={() => setGenerationEditModal(true)} onManageCarryover={() => setCarryoverModal(true)} />}
    {page === "sync" && <SyncPage generation={generation} generations={generations} forms={forms} setForms={setForms} connectionStatus={googleConnectionStatus} setConnectionStatus={setGoogleConnectionStatus} notify={notify} importMembers={importMembers} />}
    {page === "applications" && <ApplicationsPage generation={generation} applicants={generationApplicants} people={people} setApplicants={updated => setApplicants(items => [...items.filter(item => item.generationId !== selectedGenerationId), ...updated])} openDetail={id => { setSelectedApplicantId(id); setPage("application"); }} notify={notify} registerAccepted={registerAccepted} />}
    {page === "application" && selectedApplicant && <ApplicationDetail applicant={selectedApplicant} person={people.find(item => item.id === selectedApplicant.personId)!} generation={generation} update={updateApplicantStatus} onBack={() => setPage("applications")} />}
    {page === "members" && <MembersPage generation={generation} memberships={generationMemberships} people={people} openDetail={id => { setSelectedMembershipId(id); setPage("member"); }} />}
    {page === "member" && selectedMembership && <MemberDetail membership={selectedMembership} person={people.find(item => item.id === selectedMembership.personId)!} generation={generation} history={memberships.filter(item => item.personId === selectedMembership.personId)} generations={generations} update={value => setMemberships(items => items.map(item => item.id === value.id ? value : item))} remove={() => { setMemberships(items => items.filter(item => item.id !== selectedMembership.id)); setPage("members"); notify("현재 학기 참여 기록을 삭제했습니다."); }} notify={notify} onBack={() => setPage("members")} />}
    {page === "staff" && <StaffPage />}
    {page === "logs" && <LogsPage />}
  </main>{generationModal && <GenerationModal memberships={memberships} generations={generations} currentGenerationId={selectedGenerationId} people={people} onClose={() => setGenerationModal(false)} onCreate={createGeneration} />}{generationEditModal && <GenerationEditModal generation={generation} onClose={() => setGenerationEditModal(false)} onSave={updateGeneration} />}{carryoverModal && <CarryoverManagementModal generation={generation} generations={generations} memberships={memberships} people={people} onClose={() => setCarryoverModal(false)} onSave={updateCarryover} />}{toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[6px] bg-[var(--navy)] px-4 py-3 text-xs font-bold text-white shadow-lg">{toast}</div>}</div>;
}
