import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  CurriculumType,
  ExtractedChunk,
  ExtractedDocument,
  MaterialKind,
  OfficialSource,
  SchoolLevel,
  SourceCatalog
} from "../types.js";
import { loadSourceCatalog } from "./catalog.js";
import { findProjectRoot } from "./paths.js";

export interface CorpusDocument {
  source: OfficialSource;
  pageCount: number | null;
  chunks: ExtractedChunk[];
}

export interface CurriculumCorpus {
  catalog: SourceCatalog;
  documents: CorpusDocument[];
  missingSourceIds: string[];
}

export interface SearchOptions {
  query: string;
  curriculumType?: CurriculumType;
  schoolLevel?: SchoolLevel;
  subject?: string;
  sourceIds?: string[];
  includeSuperseded?: boolean;
  materialKind?: MaterialKind;
  limit?: number;
}

export interface SearchHit {
  sourceId: string;
  noticeNumber: string;
  sourceTitle: string;
  sourcePageUrl: string;
  chunkId: string;
  page: number | null;
  breadcrumb: string[];
  curriculumTypes: CurriculumType[];
  materialKind: MaterialKind;
  schoolLevel: SchoolLevel | "all";
  score: number;
  excerpt: string;
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) >= 0) {
    count += 1;
    offset += Math.max(needle.length, 1);
  }
  return count;
}

function excerpt(text: string, terms: string[], maxChars = 700): string {
  const lower = text.toLocaleLowerCase("ko-KR");
  const positions = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
  const center = positions.length > 0 ? Math.min(...positions) : 0;
  const start = Math.max(0, center - Math.floor(maxChars / 3));
  const end = Math.min(text.length, start + maxChars);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function matchesSchoolLevel(chunk: ExtractedChunk, schoolLevel?: SchoolLevel): boolean {
  const content = normalize(`${chunk.breadcrumb.join(" ")} ${chunk.text}`);
  const gradeCodes = [...content.matchAll(/\[(\d{1,2})[^\]\r\n]{1,24}\d{2}-\d{2}\]/gu)].map(
    (match) => Number(match[1])
  );
  const wantedGrade = schoolLevel === "middle" ? 9 : schoolLevel === "high" ? 12 : null;

  if (wantedGrade !== null && gradeCodes.length > 0) return gradeCodes.includes(wantedGrade);

  const mentionsElementary = content.includes("초등학교");
  const mentionsMiddle = content.includes("중학교");
  const mentionsHigh = content.includes("고등학교");
  if (!schoolLevel) return !mentionsElementary || mentionsMiddle || mentionsHigh;
  if (schoolLevel === "middle" && mentionsHigh && !mentionsMiddle) return false;
  if (schoolLevel === "high" && mentionsMiddle && !mentionsHigh) return false;
  if (mentionsElementary && !mentionsMiddle && !mentionsHigh) return false;
  return true;
}

export async function loadCorpus(): Promise<CurriculumCorpus> {
  const catalog = await loadSourceCatalog();
  const irDir = join(findProjectRoot(), "sources", "official", "ir");
  const documents: CorpusDocument[] = [];
  const missingSourceIds: string[] = [];

  for (const source of catalog.sources) {
    try {
      const raw = await readFile(join(irDir, `${source.id}.json`), "utf8");
      const extracted = JSON.parse(raw) as ExtractedDocument;
      if (extracted.sourceId !== source.id || !Array.isArray(extracted.chunks)) {
        throw new Error(`추출 데이터 형식 오류: ${source.id}`);
      }
      documents.push({
        source,
        pageCount: extracted.pageCount ?? null,
        chunks: extracted.chunks
      });
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String(error.code) : "";
      if (code !== "ENOENT") throw error;
      missingSourceIds.push(source.id);
    }
  }

  return { catalog, documents, missingSourceIds };
}

export function searchCorpus(corpus: CurriculumCorpus, options: SearchOptions): SearchHit[] {
  const query = normalize(options.query);
  if (!query) throw new Error("검색어는 비어 있을 수 없습니다.");

  const terms = [...new Set(query.split(/[\s,;/]+/u).filter((term) => term.length >= 2))];
  if (terms.length === 0) terms.push(query);
  const sourceFilter = options.sourceIds ? new Set(options.sourceIds) : null;
  const subject = options.subject ? normalize(options.subject) : null;
  const hits: SearchHit[] = [];

  for (const document of corpus.documents) {
    const { source } = document;
    if (!options.includeSuperseded && !source.defaultSearch) continue;
    if ((source.materialKind ?? "statutory") !== (options.materialKind ?? "statutory")) continue;
    if (sourceFilter && !sourceFilter.has(source.id)) continue;
    if (options.curriculumType && !source.curriculumTypes.includes(options.curriculumType)) continue;

    for (const chunk of document.chunks) {
      if (!matchesSchoolLevel(chunk, options.schoolLevel)) continue;
      const breadcrumb = normalize(chunk.breadcrumb.join(" > "));
      const text = normalize(chunk.text);
      const searchable = `${breadcrumb} ${text}`;
      let score = countOccurrences(searchable, query) * 20;
      for (const term of terms) score += Math.min(countOccurrences(searchable, term), 8) * 3;
      if (subject) {
        if (!breadcrumb.includes(subject)) continue;
        score += 12;
      }
      if (score === 0) continue;
      if (source.role === "amendment") score += 2;

      hits.push({
        sourceId: source.id,
        noticeNumber: source.noticeNumber,
        sourceTitle: source.title,
        sourcePageUrl: source.sourcePageUrl,
        chunkId: chunk.id,
        page: chunk.page ?? null,
        breadcrumb: chunk.breadcrumb,
        curriculumTypes: source.curriculumTypes,
        materialKind: source.materialKind ?? "statutory",
        schoolLevel: options.schoolLevel ?? "all",
        score,
        excerpt: excerpt(chunk.text, terms)
      });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || a.sourceId.localeCompare(b.sourceId) || a.chunkId.localeCompare(b.chunkId))
    .slice(0, Math.min(Math.max(options.limit ?? 10, 1), 50));
}

export function findChunk(
  corpus: CurriculumCorpus,
  sourceId: string,
  chunkId: string
): { source: OfficialSource; chunk: ExtractedChunk } | null {
  const document = corpus.documents.find((candidate) => candidate.source.id === sourceId);
  const chunk = document?.chunks.find((candidate) => candidate.id === chunkId);
  return document && chunk ? { source: document.source, chunk } : null;
}
