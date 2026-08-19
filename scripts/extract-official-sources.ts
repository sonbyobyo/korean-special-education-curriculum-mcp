import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { blocksToChunks, parse } from "kordoc";
import { loadSourceCatalog } from "../src/lib/catalog.js";
import { findProjectRoot } from "../src/lib/paths.js";

const rootDir = findProjectRoot();
const filesDir = join(rootDir, "sources", "official", "files");
const textDir = join(rootDir, "sources", "official", "text");
const irDir = join(rootDir, "sources", "official", "ir");
const force = process.argv.includes("--force");

async function outputsExist(sourceId: string): Promise<boolean> {
  if (force) return false;
  try {
    await Promise.all([
      access(join(textDir, `${sourceId}.md`)),
      access(join(irDir, `${sourceId}.json`))
    ]);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const catalog = await loadSourceCatalog();
  await Promise.all([
    mkdir(textDir, { recursive: true }),
    mkdir(irDir, { recursive: true })
  ]);

  const missingInputs: string[] = [];
  for (const source of catalog.sources) {
    if (await outputsExist(source.id)) {
      process.stderr.write(`keeping ${source.id}\n`);
      continue;
    }
    const inputPath = join(filesDir, source.fileName);
    try {
      await access(inputPath);
    } catch {
      missingInputs.push(source.id);
      process.stderr.write(`skipping missing source ${source.id}: ${source.fileName}\n`);
      continue;
    }
    process.stderr.write(`extracting ${source.id}\n`);
    const result = await parse(inputPath);
    if (!result.success) {
      throw new Error(`${source.id} 추출 실패: ${result.error ?? "unknown error"}`);
    }

    const chunks = blocksToChunks(result.blocks, {
      granularity: "section",
      includeTableCells: false
    });

    await writeFile(join(textDir, `${source.id}.md`), result.markdown ?? "", "utf8");
    await writeFile(
      join(irDir, `${source.id}.json`),
      `${JSON.stringify({
        sourceId: source.id,
        fileType: result.fileType,
        metadata: result.metadata,
        outline: result.outline,
        warnings: result.warnings,
        pageCount: result.pageCount,
        qualitySummary: result.qualitySummary,
        chunks
      }, null, 2)}\n`,
      "utf8"
    );
  }

  if (missingInputs.length > 0) {
    process.stderr.write(
      `source files not extracted (${missingInputs.length}). ` +
      "The server remains usable; get_coverage_report lists the gaps.\n"
    );
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
