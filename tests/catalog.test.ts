import { describe, expect, it } from "vitest";
import { loadSourceCatalog } from "../src/lib/catalog.js";

describe("official source catalog", () => {
  it("contains the current special-education baseline", async () => {
    const catalog = await loadSourceCatalog();
    expect(catalog.baseline.noticeId).toBe("kr-nec-2026-2");
    expect(catalog.sources.some((source) => source.id === catalog.baseline.noticeId)).toBe(true);
  });

  it("does not allow redistribution of official binaries", async () => {
    const catalog = await loadSourceCatalog();
    expect(catalog.sources.every((source) => source.rights.redistributeOriginal === false)).toBe(true);
  });

  it("tracks the general-curriculum notice adopted by special education", async () => {
    const catalog = await loadSourceCatalog();
    const adopted = catalog.sources.find((source) => source.id === "kr-nec-2024-3");
    expect(adopted?.curriculumTypes).toEqual(["common", "elective"]);
    expect(adopted?.defaultSearch).toBe(true);
  });

  it("resolves every supersededBy relationship", async () => {
    const catalog = await loadSourceCatalog();
    const ids = new Set(catalog.sources.map((source) => source.id));
    for (const source of catalog.sources) {
      if (source.supersededBy) expect(ids.has(source.supersededBy)).toBe(true);
    }
  });
});
