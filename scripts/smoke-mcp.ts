import { spawn } from "node:child_process";
import { isAbsolute, join, resolve } from "node:path";
import { findProjectRoot } from "../src/lib/paths.js";

interface RpcResponse {
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

const rootDir = findProjectRoot();
const serverOptionIndex = process.argv.indexOf("--server");
const serverOption = serverOptionIndex >= 0 ? process.argv[serverOptionIndex + 1] : undefined;
const serverPath = serverOption
  ? isAbsolute(serverOption) ? serverOption : resolve(rootDir, serverOption)
  : join(rootDir, "dist", "src", "server.js");
const expectSupplements = !process.argv.includes("--core");
const child = spawn(process.execPath, [serverPath], {
  cwd: rootDir,
  stdio: ["pipe", "pipe", "pipe"]
});

let stdoutBuffer = "";
let stderrBuffer = "";
const responses = new Map<number, (response: RpcResponse) => void>();

child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk: string) => {
  stderrBuffer += chunk;
});

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk: string) => {
  stdoutBuffer += chunk;
  const lines = stdoutBuffer.split(/\r?\n/u);
  stdoutBuffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    const message = JSON.parse(line) as RpcResponse;
    if (typeof message.id === "number") {
      responses.get(message.id)?.(message);
      responses.delete(message.id);
    }
  }
});

function send(message: Record<string, unknown>): void {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function request(id: number, method: string, params: Record<string, unknown>): Promise<RpcResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      responses.delete(id);
      reject(new Error(`${method} 응답 시간 초과. stderr=${stderrBuffer}`));
    }, 15_000);
    responses.set(id, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
    send({ jsonrpc: "2.0", id, method, params });
  });
}

function assertOk(response: RpcResponse, label: string): Record<string, unknown> {
  if (response.error) throw new Error(`${label} 실패: ${response.error.code} ${response.error.message}`);
  if (!response.result) throw new Error(`${label} 결과 없음`);
  return response.result;
}

async function main(): Promise<void> {
  const initialized = assertOk(
    await request(1, "initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "local-smoke-test", version: "1.0.0" }
    }),
    "initialize"
  );
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const listed = assertOk(await request(2, "tools/list", {}), "tools/list");
  const toolNames = ((listed.tools as Array<{ name: string }> | undefined) ?? []).map((tool) => tool.name);
  for (const required of [
    "get_coverage_report",
    "list_official_sources",
    "search_curriculum",
    "get_curriculum_chunk",
    "find_achievement_standard"
  ]) {
    if (!toolNames.includes(required)) throw new Error(`필수 도구 누락: ${required}`);
  }

  const sources = assertOk(
    await request(3, "tools/call", { name: "list_official_sources", arguments: {} }),
    "list_official_sources"
  );
  if (sources.isError) throw new Error("공식 출처 도구가 오류를 반환했습니다.");

  const coverage = assertOk(
    await request(5, "tools/call", { name: "get_coverage_report", arguments: {} }),
    "get_coverage_report"
  );
  const coverageData = coverage.structuredContent as {
    statutoryCurriculum?: { status?: string; expectedSourceCount?: number };
  } | undefined;
  if (coverageData?.statutoryCurriculum?.status !== "complete") {
    throw new Error("법정 교육과정 원문 범위가 완전하지 않습니다.");
  }

  const search = assertOk(
    await request(4, "tools/call", {
      name: "search_curriculum",
      arguments: {
        query: "진로 직업",
        schoolLevel: "high",
        curriculumType: "basic",
        limit: 3
      }
    }),
    "search_curriculum"
  );
  if (search.isError) throw new Error("교육과정 검색 도구가 오류를 반환했습니다.");

  const structured = search.structuredContent as {
    resultCount?: number;
    results?: Array<{ sourceId?: string; sourcePageUrl?: string; chunkId?: string; page?: number | null }>;
  } | undefined;
  if (!structured?.resultCount || !structured.results?.length) {
    throw new Error("실제 코퍼스 검색 결과가 비어 있습니다.");
  }
  const first = structured.results[0];
  if (!first?.sourceId || !first.chunkId || !first.sourcePageUrl?.startsWith("https://")) {
    throw new Error("검색 결과의 출처 추적 필드가 불완전합니다.");
  }

  if (expectSupplements) {
    for (const [id, materialKind, query] of [
      [6, "achievement", "성취수준"],
      [7, "research", "특수교육 교육과정"]
    ] as const) {
      const supplemental = assertOk(
        await request(id, "tools/call", {
          name: "search_curriculum",
          arguments: { query, materialKind, limit: 2 }
        }),
        `${materialKind} search_curriculum`
      );
      const supplementalData = supplemental.structuredContent as { resultCount?: number } | undefined;
      if (!supplementalData?.resultCount) throw new Error(`${materialKind} 코퍼스 검색 결과가 비어 있습니다.`);
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      protocolVersion: initialized.protocolVersion,
      tools: toolNames,
      searchResultCount: structured.resultCount,
      sampleAnchor: first
    }, null, 2)}\n`
  );
}

void main()
  .then(() => child.kill())
  .catch((error: unknown) => {
    child.kill();
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
