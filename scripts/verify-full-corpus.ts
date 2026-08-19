import { buildCoverageReport } from "../src/lib/coverage.js";
import { loadCorpus } from "../src/lib/corpus.js";

async function main(): Promise<void> {
  const report = buildCoverageReport(await loadCorpus());
  if (report.statutoryCurriculum.status !== "complete") {
    throw new Error(
      `법정 교육과정 코퍼스가 불완전합니다: ${report.statutoryCurriculum.extractionMissingSourceIds.join(", ")}`
    );
  }
  if (report.supplementaryMaterials.status !== "complete") {
    throw new Error("보충자료 코퍼스가 불완전합니다. get_coverage_report로 누락 자료를 확인하세요.");
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
