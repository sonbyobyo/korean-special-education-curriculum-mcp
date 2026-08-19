import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogPath = join(root, "sources", "official", "source-catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

const niseBoard358 = "https://www.nise.go.kr/boardCnts/view.do?boardID=358&lev=0&m=010801&opType=N&page=1&s=nise&searchType=null&statusYN=W";
const niseEvaluationBoard = "https://www.nise.go.kr/boardCnts/list.do?boardID=813&m=010301&s=eduable";
const niseDownload = (site, no = 1) => `https://www.nise.go.kr/ebook/src/viewer/download.php?host=main&no=${no}&site=${site}`;
const niseRights = {
  policy: "NISE-source-terms",
  attributionRequired: true,
  redistributeOriginal: false,
  reviewRequired: true
};

const achievementSources = [
  ["guide", "장애학생 통합교육 교수·학습 지원을 위한 평가자료 활용 가이드북", "20240820_174642", ["basic", "common"]],
  ["korean", "2022 개정 특수교육 기본 교육과정 국어과 평가자료", "20240226_094301", ["basic"]],
  ["social", "2022 개정 특수교육 기본 교육과정 사회과 평가자료", "20240226_095436", ["basic"]],
  ["science", "2022 개정 특수교육 기본 교육과정 과학과 평가자료", "20240226_111136", ["basic"]],
  ["music", "2022 개정 특수교육 기본 교육과정 음악과 평가자료", "20240226_114357", ["basic"]],
  ["art", "2022 개정 특수교육 기본 교육과정 미술과 평가자료", "20240226_125651", ["basic"]],
  ["practical-arts", "2022 개정 특수교육 기본 교육과정 실과 평가자료", "20240226_132119", ["basic"]]
].map(([slug, title, site, curriculumTypes]) => ({
  id: `kr-nise-2024-special-evaluation-${slug}`,
  role: "interpretation",
  title,
  issuingAuthority: "교육부 국립특수교육원",
  noticeNumber: "국립특수교육원 평가자료(2024)",
  publishedDate: "2024-02-26",
  annex: null,
  format: "pdf",
  sourcePageUrl: niseEvaluationBoard,
  downloadUrl: niseDownload(site),
  fileName: `kr-nise-2024-special-evaluation-${slug}.pdf`,
  curriculumTypes,
  defaultSearch: true,
  materialKind: "achievement",
  rights: niseRights
}));

const researchRows = [
  ["health", "725496", "20230207_101527", "2022 개정 특수교육 기본 교육과정 선택교과(보건) 시안 개발 연구 보고서", ["basic"]],
  ["social", "725228", "20230109_131631", "2022 개정 특수교육 교육과정 기본 교육과정 사회과 시안 개발 연구", ["basic"]],
  ["textbook-guidelines", "725203", "20230112_125725", "2022 개정 특수교육 교과용도서 편찬 지침 개발 연구", ["basic", "common", "elective"]],
  ["iryotherapy", "725202", "20230112_122338", "2022 개정 특수교육 교육과정 선택 중심 교육과정 특수교육 전문 교과 이료과 시안 개발 연구", ["elective"]],
  ["vocational-life", "725201", "20230112_113214", "2022 개정 특수교육 선택 중심 교육과정 전문교과(직업생활) 시안 개발 연구", ["elective"]],
  ["pe-physical-disability", "725200", "20230112_112353", "2022 개정 특수교육 공통 교육과정 체육과(지체장애) 시안 개발 연구", ["common"]],
  ["independent-living-visual", "725199", "20230112_111720", "2022 개정 특수교육 교육과정 공통 및 선택 중심 교육과정 시각장애인 자립생활 시안 개발 연구", ["common", "elective"]],
  ["pe-visual", "725198", "20230112_111112", "2022 개정 특수교육 교육과정 공통 교육과정 체육과(시각장애) 시안 개발 연구", ["common"]],
  ["braille", "725197", "20230112_110442", "2022 개정 특수교육 교육과정 공통 교육과정 점자 시안 개발 연구", ["common"]],
  ["art-visual", "725196", "20230112_101942", "2022 개정 특수교육 교육과정 공통 교육과정 미술과(시각장애) 시안 개발 연구", ["common"]],
  ["deaf-life-culture", "725195", "20230112_101115", "2022 개정 특수교육 교육과정 공통 및 선택 중심 교육과정 농인의 생활과 문화 시안 개발 연구", ["common", "elective"]],
  ["korean-hearing", "725194", "20230112_102642", "2022 개정 특수교육 교육과정 공통 및 선택 중심 교육과정 국어과(청각장애) 시안 개발 연구", ["common", "elective"]],
  ["sign-language", "725193", "20230112_093946", "2022 개정 특수교육 교육과정 공통 교육과정 수어 시안 개발 연구", ["common"]],
  ["creative-activities", "725192", "20230112_105748", "2022 개정 특수교육 교육과정 기본 교육과정 창의적 체험활동 시안 개발 연구", ["basic"]],
  ["daily-life", "725191", "20230111_175500", "2022 개정 특수교육 교육과정 기본 교육과정 일상생활 활동 시안 개발 연구", ["basic"]],
  ["ict", "725190", "20230112_105329", "2022 개정 특수교육 교육과정 기본 교육과정 선택교과(정보통신활용) 시안 개발 연구", ["basic"]],
  ["life-english", "725189", "20230112_104551", "2022 개정 특수교육 교육과정 기본 교육과정 선택교과(생활영어) 시안 개발 연구", ["basic"]],
  ["career", "725188", "20230112_103825", "2022 개정 특수교육 교육과정 기본 교육과정 진로와 직업 시안 개발 연구", ["basic"]],
  ["practical-arts", "725187", "20230111_161020", "2022 개정 특수교육 교육과정 기본 교육과정 실과 시안 개발 연구", ["basic"]],
  ["music", "725186", "20230111_155300", "2022 개정 특수교육 교육과정 기본 교육과정 음악과 시안 개발 연구", ["basic"]],
  ["art", "725185", "20230111_153544", "2022 개정 특수교육 교육과정 기본 교육과정 미술과 시안 개발 연구", ["basic"]],
  ["pe", "725184", "20230111_152627", "2022 개정 특수교육 교육과정 기본 교육과정 체육과 시안 개발 연구", ["basic"]],
  ["science", "725183", "20230111_151158", "2022 개정 특수교육 교육과정 기본 교육과정 과학과 시안 개발 연구", ["basic"]],
  ["math", "725182", "20230111_143743", "2022 개정 특수교육 교육과정 기본 교육과정 수학과 시안 개발 연구", ["basic"]],
  ["korean", "725180", "20230109_114029", "2022 개정 특수교육 교육과정 기본 교육과정 국어과 시안 개발 연구", ["basic"]],
  ["general", "725176", "20230109_093724", "2022 개정 특수교육 교육과정 총론 시안 개발 연구", ["basic", "common", "elective"]]
];

const researchSources = researchRows.map(([slug, boardSeq, site, title, curriculumTypes]) => ({
  id: `kr-nise-2022-special-draft-${slug}`,
  role: "interpretation",
  title,
  issuingAuthority: "교육부 국립특수교육원",
  noticeNumber: "국립특수교육원 교육과정 보고서(2022)",
  publishedDate: slug === "general" ? "2022-11-30" : "2022-11-25",
  annex: null,
  format: "pdf",
  sourcePageUrl: `${niseBoard358}&boardSeq=${boardSeq}`,
  downloadUrl: niseDownload(site, slug === "science" ? 3 : 1),
  fileName: `kr-nise-2022-special-draft-${slug}.pdf`,
  curriculumTypes,
  defaultSearch: true,
  materialKind: "research",
  rights: { ...niseRights, policy: "KOGL-4" }
}));

const basicEvaluationPost = "https://www.nise.go.kr/boardCnts/view.do?boardID=813&boardSeq=400333&lev=0&m=010301&opType=N&page=1&s=eduable&searchType=null&statusYN=W";
const manualEvaluationRows = [
  ["math", "수학", "05(수학)_기본 교육과정 평가 자료.hwp"],
  ["pe", "체육", "07(체육)_기본 교육과정 평가 자료.hwp"],
  ["career", "진로와 직업", "11(진로직업)_기본 교육과정 평가 자료.hwp"],
  ["elective", "선택교과", "12(선택교과)_기본 교육과정 평가 자료.hwp"]
];
const manualEvaluationSources = manualEvaluationRows.map(([slug, subject, archiveEntry]) => ({
  id: `kr-nise-2024-special-evaluation-${slug}`,
  role: "interpretation",
  title: `2022 개정 특수교육 기본 교육과정 ${subject} 평가자료`,
  issuingAuthority: "교육부 국립특수교육원",
  noticeNumber: "국립특수교육원 평가자료(2024)",
  publishedDate: "2024-02-26",
  annex: null,
  format: "hwp",
  sourcePageUrl: basicEvaluationPost,
  downloadUrl: basicEvaluationPost,
  manualAcquisition: {
    reason: "publisher-access-control",
    expectedOriginalFileName: "기본 교육과정 평가자료_한글.zip",
    archiveEntry
  },
  fileName: `kr-nise-2024-special-evaluation-${slug}.hwp`,
  curriculumTypes: ["basic"],
  defaultSearch: true,
  materialKind: "achievement",
  rights: niseRights
}));

const highAchievementPost = "https://www.nise.go.kr/boardCnts/view.do?boardID=819&boardSeq=736771&lev=0&m=010701&opType=N&page=1&s=eduable&searchType=null&statusYN=W";
const highApplicationPost = "https://www.nise.go.kr/boardCnts/view.do?boardID=819&boardSeq=743575&lev=0&m=010701&opType=N&page=1&s=eduable&searchType=null&statusYN=W";
const highAchievementSources = [
  {
    id: "kr-nise-2026-high-achievement-book",
    title: "2022 개정 특수교육 기본 교육과정에 따른 고등학교 성취수준 자료집",
    publishedDate: "2026-01-02",
    format: "hwp",
    sourcePageUrl: highAchievementPost,
    fileName: "kr-nise-2026-high-achievement-book.hwp",
    originalFileName: "(자료집)_2022 개정 특수교육 기본 교육과정에 따른 고등학교 성취수준.hwp"
  },
  {
    id: "kr-nise-2026-high-achievement-research",
    title: "2022 개정 특수교육 기본 교육과정에 따른 고등학교 성취수준 개발 연구",
    publishedDate: "2026-01-02",
    format: "pdf",
    sourcePageUrl: highAchievementPost,
    fileName: "kr-nise-2026-high-achievement-research.pdf",
    originalFileName: "(보고서)_2022 개정 특수교육 기본 교육과정에 따른 고등학교 성취수준 개발 연구.pdf"
  },
  {
    id: "kr-nise-2026-high-achievement-application",
    title: "특수교육 기본 교육과정 고등학교 성취수준 활용자료",
    publishedDate: "2026-04-22",
    format: "pdf",
    sourcePageUrl: highApplicationPost,
    fileName: "kr-nise-2026-high-achievement-application.pdf",
    originalFileName: "(웹탑재)_기본 교육과정 고등학교 성취수준 활용자료.pdf"
  }
].map(({ originalFileName, ...source }) => ({
  ...source,
  role: "interpretation",
  issuingAuthority: "교육부 국립특수교육원",
  noticeNumber: "국립특수교육원 고등학교 성취수준 자료(2026)",
  annex: null,
  downloadUrl: source.sourcePageUrl,
  manualAcquisition: {
    reason: "publisher-access-control",
    expectedOriginalFileName: originalFileName
  },
  curriculumTypes: ["basic"],
  defaultSearch: true,
  materialKind: "achievement",
  rights: niseRights
}));

const highBoardPost = (boardSeq, page) =>
  `https://www.nise.go.kr/boardCnts/view.do?boardID=819&boardSeq=${boardSeq}&lev=0&m=010701&opType=N&page=${page}&s=eduable&searchType=null&statusYN=W`;
const professionalSources = [
  {
    id: "kr-nise-2024-special-professional-iryotherapy-achievement",
    title: "특수교육 전문교과[이료] 평가를 위한 성취수준 도움 자료집",
    publishedDate: "2024-12-30",
    sourcePageUrl: highBoardPost("410826", 2),
    fileName: "kr-nise-2024-special-professional-iryotherapy-achievement.hwp",
    originalFileName: "특수교육 전문교과[이료] 평가를 위한 성취수준 도움 자료집.hwp",
    materialKind: "achievement"
  },
  {
    id: "kr-nise-2024-special-professional-vocational-achievement",
    title: "특수교육 전문교과[직업생활] 평가를 위한 성취수준 도움 자료집",
    publishedDate: "2024-12-30",
    sourcePageUrl: highBoardPost("410817", 2),
    fileName: "kr-nise-2024-special-professional-vocational-achievement.hwp",
    originalFileName: "특수교육 전문교과[직업생활] 평가를 위한 성취수준 도움 자료집.hwp",
    materialKind: "achievement"
  },
  {
    id: "kr-nise-2025-special-selective-minimum-achievement",
    title: "선택 중심 교육과정 적용 특수교육대상학생을 위한 최소 성취수준 보장지도 도움자료",
    publishedDate: "2025-01-22",
    sourcePageUrl: highBoardPost("410823", 2),
    fileName: "kr-nise-2025-special-selective-minimum-achievement.pdf",
    originalFileName: "선택 중심 교육과정 적용 특수교육대상학생을 위한 최소 성취수준 보장지도 도움자료.pdf",
    materialKind: "achievement"
  },
  {
    id: "kr-nise-2024-special-professional-minimum-research",
    title: "특수교육 전문교과 최소 성취수준 보장지도 자료 개발 최종 연구결과 보고서",
    publishedDate: "2024-12-30",
    sourcePageUrl: highBoardPost("410825", 3),
    fileName: "kr-nise-2024-special-professional-minimum-research.hwp",
    originalFileName: "특수교육 전문교과 최소 성취수준 보장지도 자료 개발 최종 연구결과 보고서.hwp",
    materialKind: "research"
  }
].map(({ originalFileName, ...source }) => ({
  ...source,
  role: "interpretation",
  issuingAuthority: "교육부 국립특수교육원",
  noticeNumber: "국립특수교육원 특수교육 전문교과 성취수준 자료(2024~2025)",
  annex: null,
  format: source.fileName.endsWith(".pdf") ? "pdf" : "hwp",
  downloadUrl: source.sourcePageUrl,
  manualAcquisition: {
    reason: "publisher-access-control",
    expectedOriginalFileName: originalFileName
  },
  curriculumTypes: ["elective"],
  defaultSearch: true,
  rights: niseRights
}));

const monitoringSource = {
  id: "kr-nec-2025-curriculum-monitoring-special",
  role: "interpretation",
  title: "2025년 국가교육과정 조사·분석·점검 결과 보고서 - 특수교육",
  issuingAuthority: "국가교육위원회",
  noticeNumber: "2025년 국가교육과정 조사·분석·점검 결과 보고서 별책16",
  publishedDate: "2026-06-15",
  annex: null,
  format: "pdf",
  sourcePageUrl: "https://ncic.re.kr/bbs/report/view/1884.do?page=589",
  downloadUrl: "https://ncic.re.kr/bbs/download.do?articleIdx=1884&fileName=1781482871117_m6c0.pdf",
  fileName: "kr-nec-2025-curriculum-monitoring-special.pdf",
  curriculumTypes: ["basic", "common", "elective"],
  defaultSearch: true,
  materialKind: "research",
  rights: {
    policy: "NCIC-source-terms",
    attributionRequired: true,
    redistributeOriginal: false,
    reviewRequired: true
  }
};

const additions = [
  ...achievementSources,
  ...manualEvaluationSources,
  ...highAchievementSources,
  ...professionalSources,
  ...researchSources,
  monitoringSource
];
const additionIds = new Set(additions.map((source) => source.id));
catalog.sources = [...catalog.sources.filter((source) => !additionIds.has(source.id)), ...additions];
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
process.stderr.write(`catalog synced: ${additions.length} supplemental sources\n`);
