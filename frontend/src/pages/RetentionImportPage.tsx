import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { listGenerations } from "../api/generations";
import { apiErrorMessage } from "../api/http";
import {
  applyRetention,
  disconnectGoogleConnection,
  getGoogleAuthorizationUrl,
  getGoogleConnectionStatus,
  parseRetentionFile,
  previewRetention,
  readRetentionGoogleSheet,
} from "../api/retention";
import { AppLayout } from "../components/AppLayout";
import type { Generation } from "../types/generation";
import type { ParsedTable, ParsedWorkbook, RetentionPreview, RetentionRowStatus } from "../types/retention";

const statusLabel: Record<RetentionRowStatus, string> = {
  READY: "이월 가능",
  NOT_RETAINED: "잔류 안 함",
  INVALID: "정보 오류",
  DUPLICATE_IN_SOURCE: "원본 중복",
  NOT_PREVIOUS_MEMBER: "이전 부원 아님",
  ALREADY_TARGET_MEMBER: "이미 이월됨",
};

function spreadsheetIdFrom(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return urlMatch?.[1] ?? trimmed;
}

export function RetentionImportPage() {
  const { clubId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const googleCallbackResult = searchParams.get("google");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [previousGenerationId, setPreviousGenerationId] = useState("");
  const [targetGenerationId, setTargetGenerationId] = useState("");
  const [source, setSource] = useState<"file" | "google">("file");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState("");
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [tableIndex, setTableIndex] = useState(0);
  const [emailColumn, setEmailColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [studentNumberColumn, setStudentNumberColumn] = useState("");
  const [retainedColumn, setRetainedColumn] = useState("");
  const [retainedValues, setRetainedValues] = useState("잔류,예,Y,YES,TRUE");
  const [preview, setPreview] = useState<RetentionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState<"connecting" | "disconnecting" | null>(null);
  const [error, setError] = useState(() => googleCallbackResult === "error"
    ? "Google 계정을 연결하지 못했습니다. 권한 동의 여부와 테스트 사용자 등록을 확인해 주세요."
    : "");
  const [success, setSuccess] = useState(() => googleCallbackResult === "connected"
    ? "Google 계정을 연결했습니다."
    : "");

  const table: ParsedTable | null = workbook?.tables[tableIndex] ?? null;
  const closedGenerations = generations.filter(item => item.status === "CLOSED");
  const activeGenerations = generations.filter(item => item.status === "ACTIVE");

  useEffect(() => {
    Promise.all([listGenerations(clubId), getGoogleConnectionStatus()])
      .then(([generationItems, connection]) => {
        setGenerations(generationItems);
        setPreviousGenerationId(generationItems.find(item => item.status === "CLOSED")?.id ?? "");
        setTargetGenerationId(generationItems.find(item => item.status === "ACTIVE")?.id ?? "");
        setGoogleConnected(connection.connected);
        setGoogleEmail(connection.googleAccountEmail ?? null);
      })
      .catch(requestError => setError(apiErrorMessage(requestError, "초기 정보를 불러오지 못했습니다.")));
  }, [clubId]);

  useEffect(() => {
    if (googleCallbackResult !== "connected" && googleCallbackResult !== "error") return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("google");
    setSearchParams(nextSearchParams, { replace: true });
  }, [googleCallbackResult, searchParams, setSearchParams]);

  const readyPersonIds = useMemo(
    () => preview?.rows.filter(row => row.status === "READY" && row.personId).map(row => row.personId as string) ?? [],
    [preview],
  );

  const invalidatePreview = () => {
    setPreview(null);
  };

  const resetMapping = () => {
    setEmailColumn("");
    setNameColumn("");
    setStudentNumberColumn("");
    setRetainedColumn("");
    invalidatePreview();
  };

  const changeSource = (nextSource: "file" | "google") => {
    setSource(nextSource);
    setWorkbook(null);
    resetMapping();
  };

  const changeSpreadsheet = (value: string) => {
    setSpreadsheet(value);
    setWorkbook(null);
    resetMapping();
  };

  const changeMappedColumn = (
    setter: (value: string) => void,
    value: string,
  ) => {
    setter(value);
    invalidatePreview();
  };

  const selectWorkbook = (parsed: ParsedWorkbook) => {
    setWorkbook(parsed);
    setTableIndex(0);
    resetMapping();
  };

  const loadFile = async (file?: File) => {
    if (!file) return;
    setWorkbook(null);
    resetMapping();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const parsed = await parseRetentionFile(clubId, file);
      selectWorkbook(parsed);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "파일을 읽지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const connectGoogle = async () => {
    setGoogleBusy("connecting");
    setError("");
    setSuccess("");
    try {
      const { authorizationUrl } = await getGoogleAuthorizationUrl(window.location.pathname);
      window.location.assign(authorizationUrl);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Google 계정 연결을 시작하지 못했습니다."));
      setGoogleBusy(null);
    }
  };

  const disconnectGoogle = async () => {
    if (!window.confirm("Google Sheet 연결을 해제할까요? 다시 사용하려면 Google 계정을 연결해야 합니다.")) return;

    setGoogleBusy("disconnecting");
    setError("");
    setSuccess("");
    try {
      await disconnectGoogleConnection();
      setGoogleConnected(false);
      setGoogleEmail(null);
      setWorkbook(null);
      resetMapping();
      setSuccess("Google 계정 연결을 해제했습니다.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Google 계정 연결을 해제하지 못했습니다."));
    } finally {
      setGoogleBusy(null);
    }
  };

  const loadGoogleSheet = async () => {
    const spreadsheetId = spreadsheetIdFrom(spreadsheet);
    if (!spreadsheetId) {
      setError("Google Sheet 주소 또는 ID를 입력해 주세요.");
      return;
    }
    invalidatePreview();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const parsed = await readRetentionGoogleSheet(clubId, spreadsheetId);
      selectWorkbook(parsed);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Google Sheet를 읽지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    if (!table || emailColumn === "" || retainedColumn === "") {
      setError("이메일 열과 잔류 여부 열을 연결해 주세요.");
      return;
    }
    const emailIndex = Number(emailColumn);
    const retainedIndex = Number(retainedColumn);
    const acceptedValues = new Set(retainedValues.split(",").map(value => value.trim().toUpperCase()).filter(Boolean));
    const rows = table.rows.map((row, index) => ({
      rowNumber: index + 2,
      email: row[emailIndex] ?? "",
      name: nameColumn === "" ? undefined : row[Number(nameColumn)] ?? "",
      studentNumber: studentNumberColumn === "" ? undefined : row[Number(studentNumberColumn)] ?? "",
      retained: acceptedValues.has((row[retainedIndex] ?? "").trim().toUpperCase()),
    }));

    invalidatePreview();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      setPreview(await previewRetention(clubId, previousGenerationId, targetGenerationId, rows));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "이월 미리보기를 만들지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const confirmApply = async () => {
    if (!preview || readyPersonIds.length === 0) return;
    const previousGenerationName = generations.find(item => item.id === previousGenerationId)?.name ?? "선택한 이전 학기";
    const targetGenerationName = generations.find(item => item.id === targetGenerationId)?.name ?? "선택한 새 학기";
    const excludedCount = preview.totalCount - readyPersonIds.length;
    const confirmed = window.confirm(
      `'${previousGenerationName}'에서 '${targetGenerationName}'(으)로 ${readyPersonIds.length}명을 이월할까요?\n이월 제외 ${excludedCount}명은 저장되지 않습니다.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      const result = await applyRetention(clubId, previousGenerationId, targetGenerationId, readyPersonIds);
      setSuccess(`${result.createdCount}명을 새 학기 부원으로 이월했습니다. 이미 등록된 ${result.alreadyMemberCount}명은 건너뛰었습니다.`);
      setPreview(current => current && ({ ...current, readyCount: 0, alreadyMemberCount: current.alreadyMemberCount + result.createdCount,
        rows: current.rows.map(row => row.status === "READY" ? { ...row, status: "ALREADY_TARGET_MEMBER", message: "새 학기 부원으로 이월되었습니다." } : row) }));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "잔류 부원 이월을 완료하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout clubId={clubId}>
      <div className="border-b border-[var(--border-subtle)] bg-white px-6 py-5 md:px-8">
        <Link to={`/clubs/${clubId}/members`} className="text-xs font-bold text-[var(--text-secondary)]">← 부원 목록</Link>
        <h1 className="mt-1.5 text-xl font-extrabold text-[var(--text-primary)]">잔류 부원 이월</h1>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">이전 학기의 부원을 파일이나 Google Sheet에서 확인한 뒤 새 학기로 옮깁니다.</p>
      </div>

      <div className="grid gap-5 px-4 py-6 md:px-8">
        {error && <p role="alert" className="rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-xs font-bold text-[var(--danger)]">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{success}</p>}

        <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
          <h2 className="text-sm font-extrabold">1. 이전 학기와 새 학기 선택</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold">이전 학기 (종료됨)
              <select className="control" value={previousGenerationId} onChange={event => { setPreviousGenerationId(event.target.value); invalidatePreview(); }}>
                <option value="">선택해 주세요</option>
                {closedGenerations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold">새 학기 (진행 중)
              <select className="control" value={targetGenerationId} onChange={event => { setTargetGenerationId(event.target.value); invalidatePreview(); }}>
                <option value="">선택해 주세요</option>
                {activeGenerations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
          <h2 className="text-sm font-extrabold">2. 원본 불러오기</h2>
          <div className="mt-4 flex gap-2">
            <button type="button" aria-pressed={source === "file"} onClick={() => changeSource("file")} className={`rounded-lg px-4 py-2 text-xs font-bold ${source === "file" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)]"}`}>표 파일 (엑셀·CSV)</button>
            <button type="button" aria-pressed={source === "google"} onClick={() => changeSource("google")} className={`rounded-lg px-4 py-2 text-xs font-bold ${source === "google" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)]"}`}>Google Sheet</button>
          </div>
          {source === "file" ? (
            <label className="mt-4 grid gap-2 text-xs font-bold">표 파일 선택 (엑셀 .xlsx 또는 CSV .csv)
              <input type="file" accept=".csv,.xlsx" disabled={busy} onChange={event => void loadFile(event.target.files?.[0])} className="control py-2" />
            </label>
          ) : googleConnected ? (
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border-2 border-[var(--navy)] bg-white p-4">
                <p className="text-xs font-extrabold text-[var(--navy)]">Google Sheet 주소를 붙여넣고 불러오세요.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="grid flex-1 gap-1.5 text-xs font-bold">Google Sheet 주소 또는 ID
                    <input disabled={googleBusy !== null} className="control" value={spreadsheet} onChange={event => changeSpreadsheet(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                  </label>
                  <button type="button" disabled={busy || googleBusy !== null || !spreadsheet.trim()} onClick={() => void loadGoogleSheet()} className="min-h-10 rounded-lg bg-[var(--navy)] px-6 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">
                    {busy ? "불러오는 중..." : "Sheet 불러오기"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">Google Form 응답이 연결된 Sheet와 일반 Google Sheet를 같은 방식으로 읽습니다.</p>
              </div>

              <details className="rounded-lg bg-[var(--panel-muted)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                <summary className="cursor-pointer font-bold">연결된 Google 계정 설정</summary>
                <p className="mt-3">현재 연결 계정: <strong className="text-[var(--text-primary)]">{googleEmail}</strong></p>
                <p className="mt-1 text-[11px]">Sheet를 불러올 때는 계정을 다시 연결할 필요가 없습니다.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={googleBusy !== null} onClick={() => void connectGoogle()} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold disabled:opacity-40">
                    {googleBusy === "connecting" ? "연결 화면 여는 중..." : "다른 계정으로 변경"}
                  </button>
                  <button type="button" disabled={googleBusy !== null} onClick={() => void disconnectGoogle()} className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--danger)] disabled:opacity-40">
                    {googleBusy === "disconnecting" ? "연결 해제 중..." : "Google 연결 해제"}
                  </button>
                </div>
              </details>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-[var(--panel-muted)] p-4">
              <p className="text-xs text-[var(--text-secondary)]">Sheet를 읽으려면 먼저 읽기 전용 권한으로 Google 계정을 연결해야 합니다.</p>
              <button type="button" disabled={googleBusy !== null} onClick={() => void connectGoogle()} className="mt-3 rounded-lg bg-[var(--navy)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                {googleBusy === "connecting" ? "연결 화면 여는 중..." : "Google 계정 연결"}
              </button>
            </div>
          )}
        </section>

        {workbook && workbook.tables.length > 0 && (
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
            <h2 className="text-sm font-extrabold">3. 열 이름 연결 (열 매핑)</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">파일의 어떤 열이 이메일·잔류 여부인지 지정합니다. 같은 양식이라도 열 순서가 달라도 처리할 수 있습니다.</p>
            {workbook.tables.length > 1 && <label className="mt-4 grid gap-1.5 text-xs font-bold">시트
              <select className="control" value={tableIndex} onChange={event => { setTableIndex(Number(event.target.value)); resetMapping(); }}>
                {workbook.tables.map((item, index) => <option key={`${item.name}-${index}`} value={index}>{item.name}</option>)}
              </select>
            </label>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ColumnSelect label="이메일 (필수)" value={emailColumn} headers={table?.headers ?? []} onChange={value => changeMappedColumn(setEmailColumn, value)} required />
              <ColumnSelect label="잔류 여부 (필수)" value={retainedColumn} headers={table?.headers ?? []} onChange={value => changeMappedColumn(setRetainedColumn, value)} required />
              <ColumnSelect label="이름 (선택)" value={nameColumn} headers={table?.headers ?? []} onChange={value => changeMappedColumn(setNameColumn, value)} />
              <ColumnSelect label="학번 (선택)" value={studentNumberColumn} headers={table?.headers ?? []} onChange={value => changeMappedColumn(setStudentNumberColumn, value)} />
            </div>
            <label className="mt-4 grid gap-1.5 text-xs font-bold">잔류로 인정할 값 (쉼표로 구분)
              <input className="control" value={retainedValues} onChange={event => { setRetainedValues(event.target.value); invalidatePreview(); }} />
              <span className="font-normal text-[var(--text-tertiary)]">여기에 없는 값은 “잔류 안 함”으로 처리됩니다.</span>
            </label>
            <button type="button" disabled={busy || !previousGenerationId || !targetGenerationId} onClick={() => void runPreview()} className="mt-5 rounded-lg bg-[var(--navy)] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">중복 확인하고 미리보기</button>
          </section>
        )}

        {preview && (
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
            <h2 className="text-sm font-extrabold">4. 결과 확인 후 이월</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Count label="전체" value={preview.totalCount} />
              <Count label="이월 가능" value={preview.readyCount} />
              <Count label="잔류 안 함" value={preview.notRetainedCount} />
              <Count label="중복" value={preview.duplicateCount} />
              <Count label="오류/이미 처리" value={preview.invalidCount + preview.alreadyMemberCount} />
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-[var(--panel-muted)]"><tr><th className="p-3">행</th><th className="p-3">이름</th><th className="p-3">이메일</th><th className="p-3">판정</th><th className="p-3">설명</th></tr></thead>
                <tbody>{preview.rows.map(row => <tr key={`${row.rowNumber}-${row.email}`} className="border-t border-[var(--border-subtle)]"><td className="p-3">{row.rowNumber}</td><td className="p-3">{row.name || "-"}</td><td className="p-3">{row.email || "-"}</td><td className="p-3 font-bold">{statusLabel[row.status]}</td><td className="p-3 text-[var(--text-secondary)]">{row.message}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-[var(--text-secondary)]">
              대상: <strong className="text-[var(--text-primary)]">{generations.find(item => item.id === previousGenerationId)?.name ?? "-"}</strong>
              {" → "}<strong className="text-[var(--text-primary)]">{generations.find(item => item.id === targetGenerationId)?.name ?? "-"}</strong>
              {" · "}이월 {readyPersonIds.length}명 · 제외 {preview.totalCount - readyPersonIds.length}명
            </p>
            <button type="button" disabled={busy || readyPersonIds.length === 0} onClick={() => void confirmApply()} className="mt-5 rounded-lg bg-[var(--navy)] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">이월 가능 {readyPersonIds.length}명 확정</button>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function ColumnSelect({ label, value, headers, onChange, required = false }: { label: string; value: string; headers: string[]; onChange: (value: string) => void; required?: boolean }) {
  return <label className="grid gap-1.5 text-xs font-bold">{label}<select className="control" value={value} onChange={event => onChange(event.target.value)} required={required}><option value="">선택 안 함</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `열 ${index + 1}`}</option>)}</select></label>;
}

function Count({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-[var(--panel-muted)] p-3"><p className="text-[11px] text-[var(--text-secondary)]">{label}</p><p className="mt-1 text-lg font-extrabold">{value}</p></div>;
}
