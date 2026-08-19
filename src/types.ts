export type SchoolLevel = "middle" | "high";
export type CurriculumType = "basic" | "common" | "elective";
export type SourceRole = "base" | "amendment" | "interpretation";
export type SourceFormat = "hwp" | "hwpx" | "pdf";
export type MaterialKind = "statutory" | "commentary" | "achievement" | "research";

export interface SourceRights {
  policy: string;
  attributionRequired?: boolean;
  redistributeOriginal: false;
  reviewRequired: boolean;
}

export interface NcicFormDownloadRequest {
  kind: "ncic-form";
  discoveryUrl: string;
  endpointUrl: string;
  filePath: string;
  storedFileName: string;
  originalFileName: string;
  fileIdx: string;
  fileTbl: string;
}

export interface ManualAcquisition {
  reason: "publisher-access-control";
  expectedOriginalFileName: string;
  archiveEntry?: string;
}

export interface OfficialSource {
  id: string;
  role: SourceRole;
  title: string;
  issuingAuthority: string;
  noticeNumber: string;
  publishedDate: string;
  annex: number | null;
  format: SourceFormat;
  sourcePageUrl: string;
  downloadUrl: string;
  downloadRequest?: NcicFormDownloadRequest;
  manualAcquisition?: ManualAcquisition;
  fileName: string;
  curriculumTypes: CurriculumType[];
  defaultSearch: boolean;
  materialKind?: MaterialKind;
  supersededBy?: string;
  incorporatesNoticeNumbers?: string[];
  rights: SourceRights;
}

export interface SourceCatalog {
  schemaVersion: string;
  curriculum: "2022-revised-special-education";
  scope: {
    schoolLevels: SchoolLevel[];
    curriculumTypes: CurriculumType[];
  };
  baseline: {
    noticeId: string;
    asOf: string;
  };
  sources: OfficialSource[];
}

export interface SourceReceipt {
  sourceId: string;
  fileName: string;
  downloadedAt: string;
  byteLength: number;
  sha256: string;
  detectedFormat: SourceFormat;
  contentType: string | null;
  finalUrl: string;
}

export interface ExtractedChunk {
  id: string;
  type: "text" | "table" | "heading";
  breadcrumb: string[];
  text: string;
  page?: number;
  blockRange: [number, number];
}

export interface ExtractedDocument {
  sourceId: string;
  fileType: string;
  pageCount?: number;
  chunks: ExtractedChunk[];
}

export interface CurriculumRecord {
  id: string;
  schoolLevel: SchoolLevel;
  curriculumType: CurriculumType;
  subject: string;
  domain: string | null;
  achievementCode: string | null;
  title: string;
  summary: string;
  contentKind: "official-identifier" | "mechanical-derivative" | "reviewed-summary";
  verificationStatus: "candidate" | "official-source-checked" | "human-reviewed";
  source: {
    sourceId: string;
    page: number | null;
    section: string | null;
  };
}
