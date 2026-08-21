#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import {
  findChunk,
  loadCorpus,
  searchCorpus,
  type CurriculumCorpus
} from "./lib/corpus.js";
import { buildCoverageReport } from "./lib/coverage.js";

const version = "0.1.0";
const currentUseNote =
  "중·고등학교 범위의 현행 특수교육 별책과 준용 일반교육과정 별책을 함께 검색합니다. " +
  "해설서·성취수준·평가기준·연구자료는 고시 원문과 법적 지위가 다른 별도 자료로 구분합니다. " +
  "검색 결과는 공식 해석이 아니므로 실제 편성·이수 판단에는 응답의 공식 출처와 최신 기관 안내를 확인하세요.";

function toolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data
  };
}

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }]
  };
}

export function createServer(corpus: CurriculumCorpus): McpServer {
  const server = new McpServer(
    { name: "korean-special-education-curriculum", version },
    {
      instructions:
        "대한민국 2022 개정 특수교육 교육과정의 중학교·고등학교 기본·공통·선택 중심 내용을 공식 출처와 함께 검색하는 읽기 전용 서버입니다. " +
        "먼저 get_coverage_report로 범위와 준비 상태를 확인하고 search_curriculum을 사용하세요. 응답의 sourceId, page, sourcePageUrl을 인용하고, " +
        "해설·평가자료를 고시 원문과 혼동하지 마세요. 세부 원문은 get_curriculum_chunk로 확인합니다."
    }
  );

  server.registerTool(
    "get_coverage_report",
    {
      title: "교육과정 수록 범위·완전성 확인",
      description:
        "중·고등학교 특수교육 고시 원문과 준용 일반교육과정 별책의 수록 완전성, 아직 별도 수집 중인 보조자료 범위를 보고합니다.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async () => toolResult(buildCoverageReport(corpus))
  );

  server.registerResource(
    "official-source-catalog",
    "curriculum://official-sources",
    {
      title: "2022 개정 특수교육 교육과정 공식 출처 목록",
      description: "고시 기준선, 다운로드 원출처, 권리 및 검색 정책",
      mimeType: "application/json"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(corpus.catalog, null, 2)
        }
      ]
    })
  );

  server.registerTool(
    "list_official_sources",
    {
      title: "공식 출처 및 준비 상태 확인",
      description: "현행 기준일, 고시·별책, 원문 URL, 추출 여부와 청크 수를 나열합니다.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async () =>
      toolResult({
        baseline: corpus.catalog.baseline,
        scope: corpus.catalog.scope,
        sources: corpus.catalog.sources.map((source) => {
          const document = corpus.documents.find((candidate) => candidate.source.id === source.id);
          return {
            ...source,
            materialKind: source.materialKind ?? "statutory",
            prepared: Boolean(document),
            pageCount: document?.pageCount ?? null,
            chunkCount: document?.chunks.length ?? 0
          };
        }),
        missingSourceIds: corpus.missingSourceIds,
        note: currentUseNote
      })
  );

  server.registerTool(
    "search_curriculum",
    {
      title: "특수교육 교육과정 검색",
      description:
        "중·고등학교 특수교육 교육과정 고시 원문 또는 별도 해설서 청크를 검색합니다. 결과마다 자료 유형, 고시·자료명, 쪽수, 목차 경로와 공식 출처 URL을 반환합니다.",
      inputSchema: z.object({
        query: z.string().min(1).describe("검색어 또는 성취기준 코드"),
        schoolLevel: z.enum(["middle", "high"]).optional().describe("중학교 또는 고등학교 필터"),
        curriculumType: z.enum(["basic", "common", "elective"]).optional(),
        subject: z.string().min(1).optional().describe("교과명 필터(예: 국어, 진로와 직업)"),
        sourceIds: z.array(z.string()).min(1).optional().describe("특정 공식 문서만 검색"),
        materialKind: z.enum(["statutory", "commentary", "achievement", "research"]).default("statutory")
          .describe("statutory=고시 원문, commentary=해설서"),
        includeSuperseded: z.boolean().default(false).describe("현행 검색에서 제외된 구 총론 포함"),
        limit: z.number().int().min(1).max(50).default(10)
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (input) => {
      if (corpus.documents.length === 0) {
        return toolError("추출 데이터가 없습니다. 프로젝트에서 npm run sources:prepare를 먼저 실행하세요.");
      }
      const results = searchCorpus(corpus, input);
      return toolResult({
        query: input.query,
        baseline: corpus.catalog.baseline,
        resultCount: results.length,
        results,
        note: currentUseNote
      });
    }
  );

  server.registerTool(
    "get_curriculum_chunk",
    {
      title: "교육과정 원문 청크 조회",
      description: "검색 결과의 sourceId와 chunkId로 해당 원문 청크와 정확한 출처 위치를 조회합니다.",
      inputSchema: z.object({
        sourceId: z.string().min(1),
        chunkId: z.string().regex(/^c\d{4,}$/u),
        maxChars: z.number().int().min(500).max(30000).default(12000)
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async ({ sourceId, chunkId, maxChars }) => {
      const found = findChunk(corpus, sourceId, chunkId);
      if (!found) return toolError(`청크를 찾지 못했습니다: ${sourceId}/${chunkId}`);
      const truncated = found.chunk.text.length > maxChars;
      return toolResult({
        sourceId,
        chunkId,
        noticeNumber: found.source.noticeNumber,
        sourceTitle: found.source.title,
        sourcePageUrl: found.source.sourcePageUrl,
        page: found.chunk.page ?? null,
        breadcrumb: found.chunk.breadcrumb,
        text: truncated ? `${found.chunk.text.slice(0, maxChars)}\n…` : found.chunk.text,
        truncated,
        note: currentUseNote
      });
    }
  );

  server.registerTool(
    "find_achievement_standard",
    {
      title: "성취기준 코드 조회",
      description: "예: 9국어01-01 또는 [12진로01-01] 같은 성취기준 코드를 찾아 출처와 문맥을 반환합니다.",
      inputSchema: z.object({
        code: z.string().min(3),
        curriculumType: z.enum(["basic", "common", "elective"]).optional(),
        limit: z.number().int().min(1).max(30).default(10)
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async ({ code, curriculumType, limit }) => {
      const normalizedCode = code.replace(/^\[|\]$/gu, "").trim();
      const results = searchCorpus(corpus, {
        query: `[${normalizedCode}]`,
        curriculumType,
        includeSuperseded: false,
        limit
      });
      return toolResult({
        code: normalizedCode,
        baseline: corpus.catalog.baseline,
        resultCount: results.length,
        results,
        note: currentUseNote
      });
    }
  );

  return server;
}

serveStdio(async () => createServer(await loadCorpus()), {
  onerror: (error) => process.stderr.write(`[mcp] ${error.message}\n`)
});
