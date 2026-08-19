import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadSourceCatalog } from "../src/lib/catalog.js";
import { findProjectRoot } from "../src/lib/paths.js";
import type { OfficialSource, SourceFormat, SourceReceipt } from "../src/types.js";

const rootDir = findProjectRoot();
const filesDir = join(rootDir, "sources", "official", "files");
const receiptsPath = join(rootDir, "sources", "official", "source-receipts.json");
const maxBytes = 100 * 1024 * 1024;
const force = process.argv.includes("--force");

interface NcicSession {
  csrf: string;
  cookies: string;
}

const ncicSessions = new Map<string, Promise<NcicSession>>();

function detectFormat(bytes: Uint8Array): SourceFormat {
  const ascii = Buffer.from(bytes.subarray(0, 8)).toString("ascii");
  const hex = Buffer.from(bytes.subarray(0, 8)).toString("hex");
  if (ascii.startsWith("%PDF-")) return "pdf";
  if (hex.startsWith("d0cf11e0a1b11ae1")) return "hwp";
  if (hex.startsWith("504b0304")) return "hwpx";
  throw new Error(`지원하지 않는 파일 시그니처: ${hex}`);
}

function extractCsrf(html: string): string {
  const match = html.match(/name=["']_csrf["'][^>]*value=["']([^"']+)["']/iu);
  if (!match?.[1]) throw new Error("NCIC 다운로드 페이지에서 CSRF 토큰을 찾지 못함");
  return match[1];
}

function cookieHeader(headers: Headers): string {
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : headers.get("set-cookie")?.split(/,(?=[^;,]+=)/u) ?? [];
  return values.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
}

async function fetchSource(source: OfficialSource): Promise<Response> {
  const commonHeaders = {
    Accept: "application/octet-stream,application/pdf,*/*",
    Referer: source.sourcePageUrl,
    "User-Agent": "korean-special-education-curriculum-mcp/0.1 (+source-verification)"
  };
  if (!source.downloadRequest) {
    return fetch(source.downloadUrl, { redirect: "follow", headers: commonHeaders });
  }

  const request = source.downloadRequest;
  let sessionPromise = ncicSessions.get(request.discoveryUrl);
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const discovery = await fetch(request.discoveryUrl, {
        redirect: "follow",
        headers: { ...commonHeaders, Accept: "text/html,application/xhtml+xml" }
      });
      if (!discovery.ok) {
        throw new Error(`${source.id} NCIC 다운로드 페이지 조회 실패: HTTP ${discovery.status}`);
      }
      return {
        csrf: extractCsrf(await discovery.text()),
        cookies: cookieHeader(discovery.headers)
      };
    })();
    ncicSessions.set(request.discoveryUrl, sessionPromise);
  }
  const { csrf, cookies } = await sessionPromise;
  const form = new URLSearchParams({
    _csrf: csrf,
    filePath: request.filePath,
    fileName: request.storedFileName,
    fileOrg: request.originalFileName,
    fileIdx: request.fileIdx,
    fileTbl: request.fileTbl
  });
  return fetch(request.endpointUrl, {
    method: "POST",
    redirect: "follow",
    headers: {
      ...commonHeaders,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookies ? { Cookie: cookies } : {})
    },
    body: form
  });
}

async function loadExistingReceipts(): Promise<Map<string, SourceReceipt>> {
  try {
    const raw = JSON.parse(await readFile(receiptsPath, "utf8")) as { receipts?: SourceReceipt[] };
    return new Map((raw.receipts ?? []).map((receipt) => [receipt.sourceId, receipt]));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "";
    if (code !== "ENOENT") throw error;
    return new Map();
  }
}

async function reusableReceipt(
  source: OfficialSource,
  receipts: Map<string, SourceReceipt>
): Promise<SourceReceipt | null> {
  if (force) return null;
  const receipt = receipts.get(source.id);
  try {
    const filePath = join(filesDir, source.fileName);
    await access(filePath);
    if (receipt && receipt.fileName === source.fileName && receipt.detectedFormat === source.format) {
      return receipt;
    }
    const bytes = new Uint8Array(await readFile(filePath));
    const detectedFormat = detectFormat(bytes);
    if (detectedFormat !== source.format) return null;
    return {
      sourceId: source.id,
      fileName: source.fileName,
      downloadedAt: new Date().toISOString(),
      byteLength: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      detectedFormat,
      contentType: null,
      finalUrl: source.downloadUrl
    };
  } catch {
    return null;
  }
}

async function writeReceipts(receipts: SourceReceipt[], catalogBaseline: unknown): Promise<void> {
  const receiptFile = {
    schemaVersion: "1.0.0",
    catalogBaseline,
    generatedAt: new Date().toISOString(),
    receipts
  };
  await writeFile(receiptsPath, `${JSON.stringify(receiptFile, null, 2)}\n`, "utf8");
}

async function download(source: OfficialSource): Promise<SourceReceipt> {
  const response = await fetchSource(source);

  if (!response.ok) {
    throw new Error(`${source.id} 다운로드 실패: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) {
    throw new Error(`${source.id} 파일이 제한(${maxBytes} bytes)을 초과함`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
    throw new Error(`${source.id} 파일 크기 오류: ${bytes.byteLength}`);
  }

  const detectedFormat = detectFormat(bytes);
  if (detectedFormat !== source.format) {
    throw new Error(`${source.id} 형식 불일치: catalog=${source.format}, detected=${detectedFormat}`);
  }

  await writeFile(join(filesDir, source.fileName), bytes);
  return {
    sourceId: source.id,
    fileName: source.fileName,
    downloadedAt: new Date().toISOString(),
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    detectedFormat,
    contentType: response.headers.get("content-type"),
    finalUrl: response.url
  };
}

async function main(): Promise<void> {
  const catalog = await loadSourceCatalog();
  await mkdir(filesDir, { recursive: true });
  const existingReceipts = await loadExistingReceipts();

  const receipts: SourceReceipt[] = [];
  const missingManualSources: string[] = [];
  for (const source of catalog.sources) {
    const existing = await reusableReceipt(source, existingReceipts);
    if (existing) {
      process.stderr.write(`keeping ${source.id}\n`);
      receipts.push(existing);
      continue;
    }
    if (source.manualAcquisition) {
      const archive = source.manualAcquisition.archiveEntry
        ? ` (ZIP 내부: ${source.manualAcquisition.archiveEntry})`
        : "";
      const message =
        `${source.id}: ${source.manualAcquisition.expectedOriginalFileName}${archive} -> ${source.fileName}`;
      missingManualSources.push(message);
      process.stderr.write(`skipping manual source ${message}\n`);
      continue;
    }
    process.stderr.write(`downloading ${source.id}\n`);
    receipts.push(await download(source));
    await writeReceipts(receipts, catalog.baseline);
  }

  await writeReceipts(receipts, catalog.baseline);
  process.stderr.write(`wrote ${receiptsPath}\n`);
  if (missingManualSources.length > 0) {
    process.stderr.write(
      `optional manual sources not prepared (${missingManualSources.length}). ` +
      "The server remains usable; get_coverage_report lists the gaps.\n"
    );
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
