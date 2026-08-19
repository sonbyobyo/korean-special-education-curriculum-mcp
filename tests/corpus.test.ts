import { describe, expect, it } from "vitest";
import { findChunk, searchCorpus, type CurriculumCorpus } from "../src/lib/corpus.js";

const corpus: CurriculumCorpus = {
  catalog: {
    schemaVersion: "1.0.0",
    curriculum: "2022-revised-special-education",
    scope: { schoolLevels: ["middle", "high"], curriculumTypes: ["basic", "common", "elective"] },
    baseline: { noticeId: "current", asOf: "2026-08-19" },
    sources: []
  },
  missingSourceIds: [],
  documents: [
    {
      source: {
        id: "current",
        role: "base",
        title: "기본 교육과정",
        issuingAuthority: "교육부",
        noticeNumber: "교육부 고시",
        publishedDate: "2022-12-22",
        annex: 3,
        format: "hwp",
        sourcePageUrl: "https://example.com/source",
        downloadUrl: "https://example.com/file",
        fileName: "source.hwp",
        curriculumTypes: ["basic"],
        defaultSearch: true,
        rights: { policy: "test", redistributeOriginal: false, reviewRequired: false }
      },
      pageCount: 10,
      chunks: [
        {
          id: "c0001",
          type: "text",
          breadcrumb: ["국어", "성취기준"],
          text: "[9국어01-01] 중학교 학생은 의사소통 활동에 참여한다.",
          page: 3,
          blockRange: [1, 2]
        },
        {
          id: "c0002",
          type: "text",
          breadcrumb: ["국어", "성취기준"],
          text: "[6국어01-01] 초등학교 학생은 표현한다.",
          page: 4,
          blockRange: [3, 4]
        },
        {
          id: "c0003",
          type: "text",
          breadcrumb: ["생활영어", "교수·학습"],
          text: "국어 수업과 연계하여 중학교 학습자의 의사소통을 지원한다.",
          page: 5,
          blockRange: [5, 6]
        }
      ]
    }
  ]
};

describe("curriculum corpus", () => {
  it("중학교 필터에서 초등학교 전용 청크를 제외한다", () => {
    const hits = searchCorpus(corpus, { query: "학생", schoolLevel: "middle" });
    expect(hits.map((hit) => hit.chunkId)).toEqual(["c0001"]);
  });

  it("출처와 청크 식별자로 원문 위치를 찾는다", () => {
    const found = findChunk(corpus, "current", "c0001");
    expect(found?.chunk.page).toBe(3);
    expect(found?.source.curriculumTypes).toEqual(["basic"]);
  });

  it("교과 필터는 본문 언급이 아니라 목차 경로를 기준으로 적용한다", () => {
    const hits = searchCorpus(corpus, { query: "의사소통", subject: "국어" });
    expect(hits.map((hit) => hit.chunkId)).toEqual(["c0001"]);
  });
});
