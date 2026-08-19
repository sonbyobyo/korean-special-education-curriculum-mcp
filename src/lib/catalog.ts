import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { SourceCatalog } from "../types.js";
import { findProjectRoot } from "./paths.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const curriculumType = z.enum(["basic", "common", "elective"]);
const ncicFormDownloadRequestSchema = z
  .object({
    kind: z.literal("ncic-form"),
    discoveryUrl: z.url(),
    endpointUrl: z.url(),
    filePath: z.string().startsWith("/"),
    storedFileName: z.string().min(1),
    originalFileName: z.string().min(1),
    fileIdx: z.string().regex(/^\d+$/u),
    fileTbl: z.string().min(1)
  })
  .strict();
const manualAcquisitionSchema = z
  .object({
    reason: z.literal("publisher-access-control"),
    expectedOriginalFileName: z.string().min(1),
    archiveEntry: z.string().min(1).optional()
  })
  .strict();
const sourceSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/u),
    role: z.enum(["base", "amendment", "interpretation"]),
    title: z.string().min(1),
    issuingAuthority: z.string().min(1),
    noticeNumber: z.string().min(1),
    publishedDate: isoDate,
    annex: z.number().int().positive().nullable(),
    format: z.enum(["hwp", "hwpx", "pdf"]),
    sourcePageUrl: z.url(),
    downloadUrl: z.url(),
    downloadRequest: ncicFormDownloadRequestSchema.optional(),
    manualAcquisition: manualAcquisitionSchema.optional(),
    fileName: z.string().regex(/^[a-zA-Z0-9._-]+$/u),
    curriculumTypes: z.array(curriculumType).min(1),
    defaultSearch: z.boolean(),
    materialKind: z.enum(["statutory", "commentary", "achievement", "research"]).optional(),
    supersededBy: z.string().min(1).optional(),
    incorporatesNoticeNumbers: z.array(z.string().min(1)).optional(),
    rights: z
      .object({
        policy: z.string().min(1),
        attributionRequired: z.boolean().optional(),
        redistributeOriginal: z.literal(false),
        reviewRequired: z.boolean()
      })
      .strict()
  })
  .strict();

const catalogSchema = z
  .object({
    schemaVersion: z.string().min(1),
    curriculum: z.literal("2022-revised-special-education"),
    scope: z
      .object({
        schoolLevels: z.array(z.enum(["middle", "high"])).min(1),
        curriculumTypes: z.array(curriculumType).min(1)
      })
      .strict(),
    baseline: z.object({ noticeId: z.string().min(1), asOf: isoDate }).strict(),
    sources: z.array(sourceSchema).min(1)
  })
  .strict();

export async function loadSourceCatalog(path?: string): Promise<SourceCatalog> {
  const target = path ?? join(findProjectRoot(), "sources", "official", "source-catalog.json");
  const raw = await readFile(target, "utf8");
  const parsed = catalogSchema.parse(JSON.parse(raw)) as SourceCatalog;

  const ids = new Set<string>();
  for (const source of parsed.sources) {
    if (ids.has(source.id)) {
      throw new Error(`중복 source id: ${source.id}`);
    }
    ids.add(source.id);
  }

  if (!ids.has(parsed.baseline.noticeId)) {
    throw new Error(`기준선 source가 카탈로그에 없음: ${parsed.baseline.noticeId}`);
  }

  for (const source of parsed.sources) {
    if (source.supersededBy && !ids.has(source.supersededBy)) {
      throw new Error(`${source.id}의 supersededBy 대상이 없음: ${source.supersededBy}`);
    }
    if (!source.defaultSearch && !source.supersededBy) {
      throw new Error(`기본 검색 제외 출처에 supersededBy가 없음: ${source.id}`);
    }
  }

  return parsed;
}
