import type { components } from "./api.gen";

type Schemas = components["schemas"];
type PreviewRowSchema = Schemas["RetentionPreviewRowResponse"];

export type RetentionRowStatus = NonNullable<PreviewRowSchema["status"]>;
export type ParsedTable = Required<Omit<Schemas["ParsedTableResponse"], "sheetId">> & {
  sheetId: number | null;
};
export type ParsedWorkbook = {
  tables: ParsedTable[];
};
export type RetentionImportRowInput = Schemas["RetentionImportRowRequest"];

export type RetentionPreviewRow = Required<
  Pick<PreviewRowSchema, "rowNumber" | "status" | "message">
> & Pick<PreviewRowSchema, "name" | "email" | "studentNumber" | "personId">;

type PreviewSchema = Schemas["RetentionPreviewResponse"];
export type RetentionPreview = Required<Omit<PreviewSchema, "rows">> & {
  rows: RetentionPreviewRow[];
};

export type RetentionApplyResult = Required<Schemas["RetentionApplyResponse"]>;
export type GoogleConnectionStatus = Required<Pick<Schemas["GoogleConnectionStatusResponse"], "connected">>
  & Pick<Schemas["GoogleConnectionStatusResponse"], "googleAccountEmail">;
export type GoogleAuthorizationUrl = Required<Schemas["GoogleAuthorizationUrlResponse"]>;
