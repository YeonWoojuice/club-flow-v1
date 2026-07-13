import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  applyApplicationImport,
  createApplicationImportSource,
  deleteApplicationImportSource,
  disconnectGoogleConnection,
  getGoogleAuthorizationUrl,
  getGoogleConnectionStatus,
  listApplicationImportSources,
  previewApplicationImport,
  readApplicationGoogleSheet,
  readApplicationImportSource,
  updateApplicationImportSource,
} from "../api/applicationImport";
import { listGenerations } from "../api/generations";
import { apiErrorMessage } from "../api/http";
import { AppLayout } from "../components/AppLayout";
import type {
  ApplicationImportPreview,
  ApplicationImportRowInput,
  ApplicationImportRowStatus,
  ApplicationImportSource,
  ApplicationImportSourceInput,
} from "../types/applicationImport";
import type { Generation } from "../types/generation";
import type { ParsedTable, ParsedWorkbook } from "../types/retention";

const statusLabel: Record<ApplicationImportRowStatus, string> = {
  READY: "등록 가능",
  INVALID: "정보 오류",
  DUPLICATE_IN_SOURCE: "원본 중복",
  ALREADY_APPLIED: "이미 등록됨",
};

function spreadsheetIdFrom(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return urlMatch?.[1] ?? trimmed;
}

function optionalCell(row: string[], column: string) {
  return column === "" ? undefined : row[Number(column)] ?? "";
}

function optionalInstant(row: string[], column: string) {
  const value = optionalCell(row, column)?.trim();
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

export function ApplicationImportPage() {
  const { clubId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const googleCallbackResult = searchParams.get("google");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [generationId, setGenerationId] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState("");
  const [sources, setSources] = useState<ApplicationImportSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceDisplayName, setSourceDisplayName] = useState("");
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [tableIndex, setTableIndex] = useState(0);
  const [nameColumn, setNameColumn] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [studentNumberColumn, setStudentNumberColumn] = useState("");
  const [phoneColumn, setPhoneColumn] = useState("");
  const [submittedAtColumn, setSubmittedAtColumn] = useState("");
  const [previewRows, setPreviewRows] = useState<ApplicationImportRowInput[]>([]);
  const [preview, setPreview] = useState<ApplicationImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState<"connecting" | "disconnecting" | null>(null);
  const [sourceBusy, setSourceBusy] = useState<string | null>(null);
  const [error, setError] = useState(() => googleCallbackResult === "error"
    ? "Google 계정을 연결하지 못했습니다. 권한 동의 여부와 테스트 사용자 등록을 확인해 주세요."
    : "");
  const [success, setSuccess] = useState(() => googleCallbackResult === "connected"
    ? "Google 계정을 연결했습니다."
    : "");

  const table: ParsedTable | null = workbook?.tables[tableIndex] ?? null;
  const activeGenerations = generations.filter(item => item.status === "ACTIVE");

  useEffect(() => {
    Promise.all([listGenerations(clubId), getGoogleConnectionStatus(), listApplicationImportSources(clubId)])
      .then(([generationItems, connection, savedSources]) => {
        setGenerations(generationItems);
        setGenerationId(generationItems.find(item => item.status === "ACTIVE")?.id ?? "");
        setGoogleConnected(connection.connected);
        setGoogleEmail(connection.googleAccountEmail ?? null);
        setSources(savedSources);
      })
      .catch(requestError => setError(apiErrorMessage(requestError, "초기 정보를 불러오지 못했습니다.")));
  }, [clubId]);

  useEffect(() => {
    if (googleCallbackResult !== "connected" && googleCallbackResult !== "error") return;
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("google");
    setSearchParams(nextSearchParams, { replace: true });
  }, [googleCallbackResult, searchParams, setSearchParams]);

  const questionColumnCount = useMemo(() => {
    if (!table) return 0;
    const fixed = new Set([nameColumn, emailColumn, studentNumberColumn, phoneColumn, submittedAtColumn].filter(value => value !== ""));
    return table.headers.filter((header, index) => header.trim() && !fixed.has(String(index))).length;
  }, [emailColumn, nameColumn, phoneColumn, studentNumberColumn, submittedAtColumn, table]);

  const resetMapping = () => {
    setNameColumn("");
    setEmailColumn("");
    setStudentNumberColumn("");
    setPhoneColumn("");
    setSubmittedAtColumn("");
    setPreviewRows([]);
    setPreview(null);
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
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const parsed = await readApplicationGoogleSheet(clubId, spreadsheetId);
      setWorkbook(parsed);
      setTableIndex(0);
      resetMapping();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Google Sheet를 읽지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const applySavedSource = (source: ApplicationImportSource, savedTable: ParsedTable) => {
    const indexOf = (header: string | null | undefined) => header ? String(savedTable.headers.indexOf(header)) : "";
    setSelectedSourceId(source.id);
    setSourceDisplayName(source.displayName);
    setSpreadsheet(source.spreadsheetId);
    setWorkbook({ tables: [savedTable] });
    setTableIndex(0);
    setNameColumn(indexOf(source.mapping.nameHeader));
    setEmailColumn(indexOf(source.mapping.emailHeader));
    setStudentNumberColumn(indexOf(source.mapping.studentNumberHeader));
    setPhoneColumn(indexOf(source.mapping.phoneHeader));
    setSubmittedAtColumn(indexOf(source.mapping.submittedAtHeader));
    setPreviewRows([]);
    setPreview(null);
  };

  const loadSavedSource = async (source: ApplicationImportSource) => {
    setSourceBusy(source.id);
    setError("");
    setSuccess("");
    try {
      const result = await readApplicationImportSource(clubId, source.id);
      applySavedSource(result.source, result.table);
      setSuccess(`'${source.displayName}'의 최신 응답을 불러왔습니다.`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "저장된 Google Sheet를 읽지 못했습니다."));
    } finally {
      setSourceBusy(null);
    }
  };

  const startSourceEdit = (source: ApplicationImportSource) => {
    setSelectedSourceId(source.id);
    setSourceDisplayName(source.displayName);
    setSpreadsheet(source.spreadsheetId);
    setWorkbook(null);
    resetMapping();
    setSuccess("Google Sheet를 다시 불러오고 열을 연결한 뒤 설정을 저장해 주세요.");
  };

  const removeSavedSource = async (source: ApplicationImportSource) => {
    if (!window.confirm(`'${source.displayName}' 저장 설정을 삭제할까요?\n지원자 데이터는 삭제되지 않습니다.`)) return;
    setSourceBusy(source.id);
    setError("");
    try {
      await deleteApplicationImportSource(clubId, source.id);
      setSources(current => current.filter(item => item.id !== source.id));
      if (selectedSourceId === source.id) setSelectedSourceId(null);
      setSuccess("저장된 가져오기 설정을 삭제했습니다.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "저장된 설정을 삭제하지 못했습니다."));
    } finally {
      setSourceBusy(null);
    }
  };

  const saveCurrentSource = async () => {
    const spreadsheetId = spreadsheetIdFrom(spreadsheet);
    if (!table || table.sheetId == null || !spreadsheetId || !sourceDisplayName.trim()) {
      setError("설정 이름과 Google Sheet, Sheet 탭을 확인해 주세요.");
      return;
    }
    if (nameColumn === "" || emailColumn === "" || studentNumberColumn === "") {
      setError("이름, 이메일, 학번 열을 연결한 뒤 저장해 주세요.");
      return;
    }
    const headerAt = (column: string) => column === "" ? null : table.headers[Number(column)] ?? null;
    const input: ApplicationImportSourceInput = {
      displayName: sourceDisplayName.trim(),
      spreadsheetId,
      sheetId: table.sheetId,
      sheetTitle: table.name,
      headers: table.headers,
      mapping: {
        nameHeader: headerAt(nameColumn) ?? "",
        emailHeader: headerAt(emailColumn) ?? "",
        studentNumberHeader: headerAt(studentNumberColumn) ?? "",
        phoneHeader: headerAt(phoneColumn),
        submittedAtHeader: headerAt(submittedAtColumn),
      },
    };
    setSourceBusy(selectedSourceId ?? "new");
    setError("");
    try {
      const saved = selectedSourceId
        ? await updateApplicationImportSource(clubId, selectedSourceId, input)
        : await createApplicationImportSource(clubId, input);
      setSources(current => [...current.filter(item => item.id !== saved.id), saved]
        .sort((left, right) => left.displayName.localeCompare(right.displayName, "ko")));
      setSelectedSourceId(saved.id);
      setSuccess(`'${saved.displayName}' 설정을 저장했습니다. 다음부터 최신 응답 확인 버튼을 사용할 수 있습니다.`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "가져오기 설정을 저장하지 못했습니다."));
    } finally {
      setSourceBusy(null);
    }
  };

  const mappedRows = () => {
    if (!table) return [];
    const fixedIndexes = new Set(
      [nameColumn, emailColumn, studentNumberColumn, phoneColumn, submittedAtColumn]
        .filter(value => value !== "")
        .map(Number),
    );
    return table.rows.map((row, index) => ({
      rowNumber: index + 2,
      name: row[Number(nameColumn)] ?? "",
      email: row[Number(emailColumn)] ?? "",
      studentNumber: row[Number(studentNumberColumn)] ?? "",
      phone: optionalCell(row, phoneColumn),
      submittedAt: optionalInstant(row, submittedAtColumn),
      answers: table.headers.flatMap((header, columnIndex) => {
        if (fixedIndexes.has(columnIndex) || !header.trim()) return [];
        return [{
          questionKey: `sheet-column-${columnIndex + 1}`,
          questionLabel: header,
          answerValue: row[columnIndex] ?? "",
        }];
      }),
    }));
  };

  const runPreview = async () => {
    if (!table || nameColumn === "" || emailColumn === "" || studentNumberColumn === "") {
      setError("이름, 이메일, 학번 열을 모두 연결해 주세요.");
      return;
    }
    if (!generationId) {
      setError("지원자를 등록할 진행 중인 학기를 선택해 주세요.");
      return;
    }
    const selectedColumns = [nameColumn, emailColumn, studentNumberColumn, phoneColumn, submittedAtColumn]
      .filter(value => value !== "");
    if (new Set(selectedColumns).size !== selectedColumns.length) {
      setError("하나의 Sheet 열을 여러 항목에 겹쳐 연결할 수 없습니다.");
      return;
    }
    const rows = mappedRows();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await previewApplicationImport(clubId, generationId, rows);
      setPreviewRows(rows);
      setPreview(result);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "지원자 미리보기를 만들지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const confirmApply = async () => {
    if (!preview || preview.readyCount === 0) return;
    setBusy(true);
    setError("");
    try {
      const result = await applyApplicationImport(clubId, generationId, previewRows);
      setSuccess(`${result.createdCount}명의 지원자를 등록했습니다. 등록할 수 없는 ${result.skippedCount}명은 건너뛰었습니다.`);
      setPreview(current => current && ({
        ...current,
        readyCount: 0,
        alreadyAppliedCount: current.alreadyAppliedCount + result.createdCount,
        rows: current.rows.map(row => row.status === "READY"
          ? { ...row, status: "ALREADY_APPLIED", message: "지원자로 등록되었습니다." }
          : row),
      }));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "지원자 등록을 완료하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout clubId={clubId}>
      <header className="border-b border-[var(--border-subtle)] bg-white px-4 py-5 md:px-8">
        <Link to={`/clubs/${clubId}/applications`} className="text-xs font-bold text-[var(--text-secondary)]">← 지원자 목록</Link>
        <h1 className="mt-1.5 text-xl font-extrabold">Google Sheet 지원자 가져오기</h1>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Google Form 응답이나 일반 Google Sheet를 확인한 뒤 지원자로 등록합니다.</p>
      </header>

      <main className="grid gap-5 p-4 md:p-8">
        {error && <p role="alert" className="rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-xs font-bold text-[var(--danger)]">{error}</p>}
        {success && <p aria-live="polite" className="rounded-lg bg-[var(--success-soft)] px-4 py-3 text-xs font-bold text-[var(--success)]">{success}</p>}

        <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
          <h2 className="text-sm font-extrabold">1. 지원 학기 선택</h2>
          <label className="mt-4 grid max-w-md gap-1.5 text-xs font-bold">진행 중인 학기
            <select className="control" value={generationId} onChange={event => { setGenerationId(event.target.value); setPreview(null); }}>
              <option value="">선택해 주세요</option>
              {activeGenerations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {activeGenerations.length === 0 && <p className="mt-2 text-xs text-[var(--danger)]">먼저 학기 관리에서 진행 중인 학기를 만들어 주세요.</p>}
        </section>

        <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
          <h2 className="text-sm font-extrabold">2. Google Sheet 불러오기</h2>
          {googleConnected ? (
            <div className="mt-4 grid gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[var(--text-secondary)]">연결 계정: {googleEmail}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={googleBusy !== null} onClick={() => void connectGoogle()} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold disabled:opacity-40">
                    {googleBusy === "connecting" ? "연결 화면 여는 중..." : "다른 Google 계정으로 다시 연결"}
                  </button>
                  <button type="button" disabled={googleBusy !== null} onClick={() => void disconnectGoogle()} className="rounded-lg border border-[var(--danger)] px-3 py-2 text-xs font-bold text-[var(--danger)] disabled:opacity-40">
                    {googleBusy === "disconnecting" ? "연결 해제 중..." : "Google 연결 해제"}
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-extrabold">저장된 Google Sheet</h3>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">주소를 다시 붙여넣지 않고 최신 응답을 확인합니다.</p>
                  </div>
                </div>
                {sources.length === 0 ? (
                  <p className="mt-3 text-xs text-[var(--text-secondary)]">아직 저장한 설정이 없습니다. 아래에서 Sheet를 불러오고 열을 연결한 뒤 저장할 수 있습니다.</p>
                ) : (
                  <ul className="mt-3 grid gap-2">
                    {sources.map(source => (
                      <li key={source.id} className="flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-extrabold">{source.displayName}</p>
                          <p className="mt-1 text-[10px] text-[var(--text-secondary)]">탭: {source.sheetTitle}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={sourceBusy !== null || busy}
                            onClick={() => void loadSavedSource(source)}
                            className="rounded-lg bg-[var(--navy)] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                          >
                            {sourceBusy === source.id ? "확인 중..." : "최신 응답 확인"}
                          </button>
                          <button type="button" disabled={sourceBusy !== null} onClick={() => startSourceEdit(source)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold disabled:opacity-40">설정 수정</button>
                          <button type="button" disabled={sourceBusy !== null} onClick={() => void removeSavedSource(source)} className="rounded-lg border border-[var(--danger)] px-3 py-2 text-xs font-bold text-[var(--danger)] disabled:opacity-40">삭제</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="grid flex-1 gap-1.5 text-xs font-bold">Google Sheet 주소 또는 ID
                  <input disabled={googleBusy !== null} className="control" value={spreadsheet} onChange={event => setSpreadsheet(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                </label>
                <button type="button" disabled={busy || googleBusy !== null} onClick={() => void loadGoogleSheet()} className="self-end rounded-lg bg-[var(--navy)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? "불러오는 중..." : "불러오기"}</button>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Google Form에 연결된 응답 Sheet와 일반 Google Sheet를 모두 불러올 수 있습니다.</p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-[var(--panel-muted)] p-4">
              <p className="text-xs text-[var(--text-secondary)]">Sheet를 읽으려면 먼저 읽기 전용 권한으로 Google 계정을 연결해야 합니다.</p>
              <button type="button" disabled={googleBusy !== null} onClick={() => void connectGoogle()} className="mt-3 rounded-lg bg-[var(--navy)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{googleBusy === "connecting" ? "연결 화면 여는 중..." : "Google 계정 연결"}</button>
            </div>
          )}
        </section>

        {workbook && workbook.tables.length === 0 && (
          <p className="rounded-xl border border-[var(--border-subtle)] bg-white p-5 text-sm text-[var(--text-secondary)]">불러올 수 있는 Sheet 탭이 없습니다.</p>
        )}

        {table && (
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
            <h2 className="text-sm font-extrabold">3. Sheet의 열 연결하기 (열 매핑)</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Sheet에서 이름·이메일·학번이 적힌 열을 지정합니다. 나머지 열은 지원서 질문과 답변으로 자동 저장합니다.</p>
            {workbook && workbook.tables.length > 1 && <label className="mt-4 grid max-w-md gap-1.5 text-xs font-bold">Sheet 탭
              <select className="control" value={tableIndex} onChange={event => { setTableIndex(Number(event.target.value)); resetMapping(); }}>
                {workbook.tables.map((item, index) => <option key={`${item.name}-${index}`} value={index}>{item.name}</option>)}
              </select>
            </label>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ColumnSelect label="이름 (필수)" value={nameColumn} headers={table.headers} onChange={setNameColumn} required />
              <ColumnSelect label="이메일 (필수)" value={emailColumn} headers={table.headers} onChange={setEmailColumn} required />
              <ColumnSelect label="학번 (필수)" value={studentNumberColumn} headers={table.headers} onChange={setStudentNumberColumn} required />
              <ColumnSelect label="전화번호 (선택)" value={phoneColumn} headers={table.headers} onChange={setPhoneColumn} />
              <ColumnSelect label="응답 시간 (선택)" value={submittedAtColumn} headers={table.headers} onChange={setSubmittedAtColumn} />
            </div>
            <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted)] p-4">
              <h3 className="text-xs font-extrabold">다음에도 한 번에 불러오기</h3>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Sheet 주소, 탭, 열 연결 규칙만 저장합니다. 지원자 행과 Google 접근 권한은 저장 설정에 포함하지 않습니다.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="grid flex-1 gap-1 text-xs font-bold">설정 이름
                  <input className="control" value={sourceDisplayName} onChange={event => setSourceDisplayName(event.target.value)} maxLength={100} placeholder="예: 2026-2 지원서" />
                </label>
                <button
                  type="button"
                  disabled={sourceBusy !== null}
                  onClick={() => void saveCurrentSource()}
                  className="self-end rounded-lg border border-[var(--navy)] px-4 py-2.5 text-xs font-bold text-[var(--navy)] disabled:opacity-40"
                >
                  {sourceBusy === (selectedSourceId ?? "new") ? "저장 중..." : selectedSourceId ? "저장 설정 수정" : "가져오기 설정 저장"}
                </button>
                {selectedSourceId && (
                  <button
                    type="button"
                    disabled={sourceBusy !== null}
                    onClick={() => { setSelectedSourceId(null); setSourceDisplayName(""); }}
                    className="self-end rounded-lg px-3 py-2.5 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40"
                  >
                    새 설정으로 저장
                  </button>
                )}
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-[var(--panel-muted)] p-3 text-xs text-[var(--text-secondary)]">현재 선택에 따라 나머지 {questionColumnCount}개 열을 지원서 질문으로 자동 저장합니다.</p>
            <button type="button" disabled={busy || !generationId} onClick={() => void runPreview()} className="mt-5 rounded-lg bg-[var(--navy)] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? "확인하는 중..." : "중복 확인하고 미리보기"}</button>
          </section>
        )}

        {preview && (
          <section className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
            <h2 className="text-sm font-extrabold">4. 결과 확인 후 등록</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Count label="전체" value={preview.totalCount} />
              <Count label="등록 가능" value={preview.readyCount} />
              <Count label="원본 중복" value={preview.duplicateCount} />
              <Count label="정보 오류" value={preview.invalidCount} />
              <Count label="이미 등록됨" value={preview.alreadyAppliedCount} />
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-[var(--panel-muted)]"><tr><th className="p-3">행</th><th className="p-3">이름</th><th className="p-3">이메일</th><th className="p-3">판정</th><th className="p-3">설명</th></tr></thead>
                <tbody>{preview.rows.map(row => <tr key={`${row.rowNumber}-${row.email}`} className="border-t border-[var(--border-subtle)]"><td className="p-3">{row.rowNumber}</td><td className="p-3">{row.name || "-"}</td><td className="p-3">{row.email || "-"}</td><td className="p-3 font-bold">{statusLabel[row.status]}</td><td className="p-3 text-[var(--text-secondary)]">{row.message}</td></tr>)}</tbody>
              </table>
            </div>
            <button type="button" disabled={busy || preview.readyCount === 0} onClick={() => void confirmApply()} className="mt-5 rounded-lg bg-[var(--navy)] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? "등록하는 중..." : `등록 가능 ${preview.readyCount}명 확정`}</button>
          </section>
        )}
      </main>
    </AppLayout>
  );
}

function ColumnSelect({ label, value, headers, onChange, required = false }: { label: string; value: string; headers: string[]; onChange: (value: string) => void; required?: boolean }) {
  return <label className="grid gap-1.5 text-xs font-bold">{label}<select className="control" value={value} onChange={event => onChange(event.target.value)} required={required}><option value="">선택 안 함</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `열 ${index + 1}`}</option>)}</select></label>;
}

function Count({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-[var(--panel-muted)] p-3"><p className="text-[11px] text-[var(--text-secondary)]">{label}</p><p className="mt-1 text-lg font-extrabold">{value}</p></div>;
}
