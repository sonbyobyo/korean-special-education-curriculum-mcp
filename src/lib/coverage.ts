import type { CurriculumCorpus } from "./corpus.js";

export const currentSpecialSourceIds = [
  "kr-nec-2026-2-annex1",
  "kr-nec-2026-2-annex2",
  "kr-nec-2026-2-annex3"
] as const;

export const adoptedGeneralAnnexes = [3, 4, 7, 12, 14, 18, 19, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 41] as const;

export const adoptedGeneralSourceIds = adoptedGeneralAnnexes.map((annex) =>
  annex === 3 || annex === 4
    ? `kr-nec-2026-1-annex${annex}`
    : `kr-nec-2024-3-annex${annex}`
);

export const expectedStatutorySourceIds = [
  ...currentSpecialSourceIds,
  ...adoptedGeneralSourceIds
];
export const commentarySourceIds = ["kr-moe-2024-special-commentary"] as const;
export const achievementSourceIds = [
  "kr-nise-2024-special-evaluation-guide",
  "kr-nise-2024-special-evaluation-korean",
  "kr-nise-2024-special-evaluation-social",
  "kr-nise-2024-special-evaluation-science",
  "kr-nise-2024-special-evaluation-music",
  "kr-nise-2024-special-evaluation-art",
  "kr-nise-2024-special-evaluation-practical-arts",
  "kr-nise-2024-special-evaluation-math",
  "kr-nise-2024-special-evaluation-pe",
  "kr-nise-2024-special-evaluation-career",
  "kr-nise-2024-special-evaluation-elective",
  "kr-nise-2026-high-achievement-book",
  "kr-nise-2026-high-achievement-research",
  "kr-nise-2026-high-achievement-application",
  "kr-nise-2024-special-professional-iryotherapy-achievement",
  "kr-nise-2024-special-professional-vocational-achievement",
  "kr-nise-2025-special-selective-minimum-achievement"
] as const;
export const researchSourceIds = [
  "health", "social", "textbook-guidelines", "iryotherapy", "vocational-life",
  "pe-physical-disability", "independent-living-visual", "pe-visual", "braille", "art-visual",
  "deaf-life-culture", "korean-hearing", "sign-language", "creative-activities", "daily-life",
  "ict", "life-english", "career", "practical-arts", "music", "art", "pe", "science", "math",
  "korean", "general"
].map((slug) => `kr-nise-2022-special-draft-${slug}`).concat(
  "kr-nec-2025-curriculum-monitoring-special",
  "kr-nise-2024-special-professional-minimum-research"
);

export const knownUnindexedAchievementMaterials = [] as const;

export function buildCoverageReport(corpus: CurriculumCorpus) {
  const catalogIds = new Set(corpus.catalog.sources.map((source) => source.id));
  const preparedIds = new Set(corpus.documents.map((document) => document.source.id));
  const catalogMissing = expectedStatutorySourceIds.filter((id) => !catalogIds.has(id));
  const extractionMissing = expectedStatutorySourceIds.filter((id) => !preparedIds.has(id));
  const preparedStatutory = expectedStatutorySourceIds.length - extractionMissing.length;
  const commentaryPrepared = commentarySourceIds.filter((id) => preparedIds.has(id));
  const achievementPrepared = achievementSourceIds.filter((id) => preparedIds.has(id));
  const researchPrepared = researchSourceIds.filter((id) => preparedIds.has(id));
  const commentaryComplete = commentaryPrepared.length === commentarySourceIds.length;
  const achievementComplete = achievementPrepared.length === achievementSourceIds.length &&
    knownUnindexedAchievementMaterials.length === 0;
  const researchComplete = researchPrepared.length === researchSourceIds.length;

  return {
    asOf: corpus.catalog.baseline.asOf,
    scope: corpus.catalog.scope,
    statutoryCurriculum: {
      status: catalogMissing.length === 0 && extractionMissing.length === 0 ? "complete" : "incomplete",
      expectedSourceCount: expectedStatutorySourceIds.length,
      preparedSourceCount: preparedStatutory,
      currentSpecialAnnexes: [1, 2, 3],
      adoptedGeneralAnnexes,
      catalogMissingSourceIds: catalogMissing,
      extractionMissingSourceIds: extractionMissing,
      interpretation:
        "중·고등학교 범위에서 현행 특수교육 별책 1·2·3과, 별책 2가 준용하는 일반교육과정 별책 3·4·7·12·14·18·19·22·23~39·41의 공식 원문 준비 상태입니다."
    },
    supplementaryMaterials: {
      status: commentaryComplete && achievementComplete && researchComplete ? "complete" : "partially-indexed",
      categories: {
        commentary: {
          status: commentaryComplete ? "complete" : "incomplete",
          expectedSourceIds: commentarySourceIds,
          preparedSourceIds: commentaryPrepared
        },
        achievementAndEvaluation: {
          status: achievementComplete ? "complete" : "partial-official-access-gap",
          indexedSourceIds: achievementPrepared,
          knownUnindexedOfficialMaterials: knownUnindexedAchievementMaterials
        },
        policyAndResearch: {
          status: researchComplete ? "complete" : "incomplete",
          expectedSourceIds: researchSourceIds,
          preparedSourceIds: researchPrepared
        }
      },
      interpretation:
        "해설·평가·연구자료는 고시 원문과 법적 지위가 다르므로 별도 코퍼스로 표시합니다. 게시판 로그인이 필요한 자료는 수동 확보 여부와 누락 목록으로 명시합니다."
    }
  };
}
