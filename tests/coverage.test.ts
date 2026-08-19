import { describe, expect, it } from "vitest";
import {
  adoptedGeneralAnnexes,
  achievementSourceIds,
  buildCoverageReport,
  commentarySourceIds,
  currentSpecialSourceIds,
  expectedStatutorySourceIds,
  knownUnindexedAchievementMaterials,
  researchSourceIds
} from "../src/lib/coverage.js";
import { loadCorpus } from "../src/lib/corpus.js";

const localCorpus = await loadCorpus();
const hasFullLocalCorpus = localCorpus.missingSourceIds.length === 0;

describe("statutory curriculum coverage", () => {
  it("tracks all current special annexes and every adopted middle/high general annex", () => {
    expect(currentSpecialSourceIds).toHaveLength(3);
    expect(adoptedGeneralAnnexes).toEqual([
      3, 4, 7, 12, 14, 18, 19, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
      37, 38, 39, 41
    ]);
    expect(new Set(expectedStatutorySourceIds).size).toBe(29);
  });

  it.skipIf(!hasFullLocalCorpus)("has every expected statutory source extracted", () => {
    const report = buildCoverageReport(localCorpus);
    expect(report.statutoryCurriculum.status).toBe("complete");
    expect(report.statutoryCurriculum.catalogMissingSourceIds).toEqual([]);
    expect(report.statutoryCurriculum.extractionMissingSourceIds).toEqual([]);
  });

  it("tracks the special-education commentary separately from statutory sources", () => {
    expect(commentarySourceIds).toEqual(["kr-moe-2024-special-commentary"]);
    expect(expectedStatutorySourceIds).not.toContain(commentarySourceIds[0]);
  });

  it.skipIf(!hasFullLocalCorpus)("extracts the curated special-only evaluation and research corpora", () => {
    const report = buildCoverageReport(localCorpus);
    expect(achievementSourceIds).toHaveLength(17);
    expect(researchSourceIds).toHaveLength(28);
    expect(knownUnindexedAchievementMaterials).toHaveLength(0);
    expect(report.supplementaryMaterials.categories.achievementAndEvaluation.status)
      .toBe("complete");
    expect(report.supplementaryMaterials.categories.policyAndResearch.status).toBe("complete");
    expect(report.supplementaryMaterials.status).toBe("complete");
  });
});
