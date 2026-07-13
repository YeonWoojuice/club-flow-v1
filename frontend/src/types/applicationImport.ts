import type { components } from "./api.gen";
import type { ParsedTable, ParsedWorkbook } from "./retention";

type Schemas = components["schemas"];
type AnswerSchema = Schemas["ApplicationImportAnswerRequest"];
type RowSchema = Schemas["ApplicationImportRowRequest"];
type PreviewRowSchema = Schemas["ApplicationImportPreviewRowResponse"];
type PreviewSchema = Schemas["ApplicationImportPreviewResponse"];
type SourceSchema = Schemas["ApplicationImportSourceResponse"];
type SourceMappingSchema = Schemas["ApplicationImportSourceMappingResponse"];
type SourceInputSchema = Schemas["UpsertApplicationImportSourceRequest"];

export type ApplicationImportAnswerInput = Required<AnswerSchema>;

export type ApplicationImportRowInput = Required<
  Pick<RowSchema, "rowNumber" | "name" | "email" | "studentNumber">
> & Omit<RowSchema, "rowNumber" | "name" | "email" | "studentNumber" | "answers"> & {
  answers: ApplicationImportAnswerInput[];
};

export type ApplicationImportRowStatus = NonNullable<PreviewRowSchema["status"]>;

export type ApplicationImportPreviewRow = Required<
  Pick<PreviewRowSchema, "rowNumber" | "status" | "message">
> & Omit<PreviewRowSchema, "rowNumber" | "status" | "message">;

export type ApplicationImportPreview = Required<Omit<PreviewSchema, "rows">> & {
  rows: ApplicationImportPreviewRow[];
};

export type ApplicationImportApplyResult = Required<Schemas["ApplicationImportApplyResponse"]>;
export type ApplicationImportWorkbook = ParsedWorkbook;

export type ApplicationImportSourceMapping = Required<Omit<
  SourceMappingSchema,
  "phoneHeader" | "submittedAtHeader"
>> & {
  phoneHeader: string | null;
  submittedAtHeader: string | null;
};

export type ApplicationImportSource = Required<Omit<SourceSchema, "mapping">> & {
  mapping: ApplicationImportSourceMapping;
};

export type ApplicationImportSourceInput = Omit<SourceInputSchema, "mapping"> & {
  mapping: {
    nameHeader: string;
    emailHeader: string;
    studentNumberHeader: string;
    phoneHeader: string | null;
    submittedAtHeader: string | null;
  };
};

export type ApplicationImportSourceTable = {
  source: ApplicationImportSource;
  table: ParsedTable;
};
