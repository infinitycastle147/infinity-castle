import { describe, expect, it } from "vitest";

import { semanticMatchThreshold } from "../src/lib/notes/search-policy";

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
