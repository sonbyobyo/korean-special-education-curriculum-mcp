import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expectedStatutorySourceIds } from "../src/lib/coverage.js";
import { findProjectRoot } from "../src/lib/paths.js";
import type { ExtractedDocument, SourceCatalog } from "../src/types.js";

interface CoreSourceManifest {
  id: string;
  title: string;
  issuingAuthority: string;
  noticeNumber: string;
  publishedDate: string;
  annex: number | null;
  sourcePageUrl: string;
  rightsPolicy: "KOGL-1";
  attributionRequired: true;
  transformation: string;
  file: string;
  sha256: string;
  byteLength: number;
  pageCount: number | null;
  chunkCount: number;
}

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

async function main(): Promise<void> {
  const root = findProjectRoot();
  const catalog = JSON.parse(
    await readFile(join(root, "sources", "official", "source-catalog.json"), "utf8")
  ) as SourceCatalog;
  const sourceById = new Map(catalog.sources.map((source) => [source.id, source]));
  const inputDirectory = join(root, "sources", "official", "ir");
  const outputDirectory = join(root, "data", "core", "ir");
  await mkdir(outputDirectory, { recursive: true });

  const expectedFiles = new Set(expectedStatutorySourceIds.map((id) => `${id}.json`));
  for (const fileName of await readdir(outputDirectory)) {
    if (fileName.endsWith(".json") && !expectedFiles.has(fileName)) {
      await unlink(join(outputDirectory, fileName));
    }
  }

  const sources: CoreSourceManifest[] = [];
  let totalBytes = 0;
  let totalPages = 0;
  let totalChunks = 0;

  for (const sourceId of expectedStatutorySourceIds) {
    const source = sourceById.get(sourceId);
    if (!source) throw new Error(`카탈로그에 법정 출처가 없습니다: ${sourceId}`);
    if (source.rights.policy !== "KOGL-1" || source.rights.attributionRequired !== true) {
      throw new Error(`KOGL 제1유형으로 확인되지 않은 출처는 코어에 넣을 수 없습니다: ${sourceId}`);
    }

    const extracted = JSON.parse(
      await readFile(join(inputDirectory, `${sourceId}.json`), "utf8")
    ) as ExtractedDocument;
    if (extracted.sourceId !== sourceId || !Array.isArray(extracted.chunks)) {
      throw new Error(`추출 데이터 형식 오류: ${sourceId}`);
    }

    const coreDocument = {
      sourceId: extracted.sourceId,
      pageCount: extracted.pageCount ?? null,
      chunks: extracted.chunks
    };
    const serialized = JSON.stringify(coreDocument);
    const fileName = `${sourceId}.json`;
    await writeFile(join(outputDirectory, fileName), serialized, "utf8");

    const byteLength = Buffer.byteLength(serialized, "utf8");
    const pageCount = extracted.pageCount ?? null;
    totalBytes += byteLength;
    totalPages += pageCount ?? 0;
    totalChunks += extracted.chunks.length;
    sources.push({
      id: source.id,
      title: source.title,
      issuingAuthority: source.issuingAuthority,
      noticeNumber: source.noticeNumber,
      publishedDate: source.publishedDate,
      annex: source.annex,
      sourcePageUrl: source.sourcePageUrl,
      rightsPolicy: "KOGL-1",
      attributionRequired: true,
      transformation: "원문에서 텍스트·표를 기계 추출하고 검색용 청크로 분할함",
      file: `ir/${fileName}`,
      sha256: sha256(serialized),
      byteLength,
      pageCount,
      chunkCount: extracted.chunks.length
    });
  }

  const manifest = {
    schemaVersion: "1.0.0",
    bundle: "2022-revised-special-education-statutory-core",
    asOf: catalog.baseline.asOf,
    sourceCount: sources.length,
    pageCount: totalPages,
    chunkCount: totalChunks,
    byteLength: totalBytes,
    contentNote: "현행 법정 교육과정 29개 문서의 기계적 텍스트 추출물이며 원본 HWP·HWPX·PDF는 포함하지 않습니다.",
    rights: {
      policy: "공공누리 제1유형(출처표시)",
      url: "https://www.kogl.or.kr/info/licenseType1.do",
      attribution: "국가교육위원회, 각 고시·별책 제목과 원문 링크는 sources 배열 참조"
    },
    sources
  };
  await writeFile(join(root, "data", "core", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(
    `코어 번들 생성 완료: ${sources.length}개 출처, ${totalPages}쪽, ${totalChunks}청크, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB\n`
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
