import { describe, expect, it } from "vitest";

import {
  semanticMatchThreshold,
  uniquePageResults,
} from "../src/lib/notes/search-policy";

describe("semantic search policy", () => {
  it("requires strong evidence for a one-word query", () => {
    expect(semanticMatchThreshold("ashish")).toBe(0.72);
  });

  it("also protects underspecified two-word searches", () => {
    expect(semanticMatchThreshold("ashish notes")).toBe(0.72);
  });

  it("allows a slightly broader semantic match for contextual queries", () => {
    expect(semanticMatchThreshold("how does chain of thought work")).toBe(0.62);
  });

  it("counts Unicode words rather than ASCII-only tokens", () => {
    expect(semanticMatchThreshold("असीम महल खोज")).toBe(0.62);
  });
});

describe("page-level search results", () => {
  it("keeps only the highest-ranked chunk for each page", () => {
    const results = [
      { chunk_id: "chunk-a1", note_id: "note-a", score: 0.9 },
      { chunk_id: "chunk-a2", note_id: "note-a", score: 0.8 },
      { chunk_id: "chunk-b1", note_id: "note-b", score: 0.7 },
    ];

    expect(uniquePageResults(results)).toEqual([
      { chunk_id: "chunk-a1", note_id: "note-a", score: 0.9 },
      { chunk_id: "chunk-b1", note_id: "note-b", score: 0.7 },
    ]);
  });

  it("does not mutate the ranked search results", () => {
    const results = [
      { chunk_id: "chunk-a1", note_id: "note-a" },
      { chunk_id: "chunk-a2", note_id: "note-a" },
    ];

    uniquePageResults(results);

    expect(results).toHaveLength(2);
  });
});
