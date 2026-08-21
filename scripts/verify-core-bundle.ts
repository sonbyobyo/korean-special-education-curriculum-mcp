import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expectedStatutorySourceIds } from "../src/lib/coverage.js";
import { findProjectRoot } from "../src/lib/paths.js";

interface CoreManifestSource {
  id: string;
  file: string;
  sha256: string;
  byteLength: number;
  pageCount: number | null;
  chunkCount: number;
  rightsPolicy: string;
  attributionRequired: boolean;
}

interface CoreManifest {
  sourceCount: number;
  pageCount: number;
  chunkCount: number;
  byteLength: number;
  sources: CoreManifestSource[];
}

async function main(): Promise<void> {
  const root = findProjectRoot();
  const coreRoot = join(root, "data", "core");
  const manifest = JSON.parse(
    await readFile(join(coreRoot, "manifest.json"), "utf8")
  ) as CoreManifest;
  const expectedIds = new Set(expectedStatutorySourceIds);
  const actualIds = new Set(manifest.sources.map((source) => source.id));
  if (manifest.sourceCount !== expectedIds.size || actualIds.size !== expectedIds.size) {
    throw new Error(`코어 출처 수 오류: expected=${expectedIds.size}, actual=${actualIds.size}`);
  }

  let totalBytes = 0;
  let totalPages = 0;
  let totalChunks = 0;
  for (const source of manifest.sources) {
    if (!expectedIds.has(source.id)) throw new Error(`예상하지 않은 코어 출처: ${source.id}`);
    if (source.rightsPolicy !== "KOGL-1" || source.attributionRequired !== true) {
      throw new Error(`출처표시 조건 오류: ${source.id}`);
    }
    const data = await readFile(join(coreRoot, source.file));
    const digest = createHash("sha256").update(data).digest("hex");
    if (digest !== source.sha256) throw new Error(`SHA-256 불일치: ${source.id}`);
    if (data.byteLength !== source.byteLength) throw new Error(`바이트 수 불일치: ${source.id}`);
    const document = JSON.parse(data.toString("utf8")) as {
      sourceId?: string;
      pageCount?: number | null;
      chunks?: unknown[];
    };
    if (document.sourceId !== source.id || !Array.isArray(document.chunks)) {
      throw new Error(`코어 문서 형식 오류: ${source.id}`);
    }
    if ((document.pageCount ?? null) !== source.pageCount || document.chunks.length !== source.chunkCount) {
      throw new Error(`코어 문서 집계 불일치: ${source.id}`);
    }
    totalBytes += data.byteLength;
    totalPages += document.pageCount ?? 0;
    totalChunks += document.chunks.length;
  }

  if (
    totalBytes !== manifest.byteLength ||
    totalPages !== manifest.pageCount ||
    totalChunks !== manifest.chunkCount
  ) {
    throw new Error("코어 전체 집계가 manifest와 일치하지 않습니다.");
  }
  process.stdout.write(
    `코어 검증 완료: ${manifest.sourceCount}개 출처, ${totalPages}쪽, ${totalChunks}청크, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB\n`
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
