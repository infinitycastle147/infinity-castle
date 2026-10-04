import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GraphCanvas } from "../app/(archive)/graph/graph-canvas";
import { PageList } from "../app/(archive)/pages/page-list";

const pages = [
  { id: "a", title: "A thought & a thread", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "b", title: "Another room", createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
];
const edges = [{ source: "a", target: "b" }];

describe("archive server rendering", () => {
  it("renders graph titles as a single text value without React hydration warnings", () => {
    const error = vi.spyOn(console, "error");
    try {
      const props = { nodes: pages, edges, initialSelection: "a" };
      const html = renderToString(createElement(GraphCanvas, props));
      expect(html).toContain("<title>A thought &amp; a thread · 1 connections</title>");
      expect(html).toContain("Open page");
      expect(renderToString(createElement(GraphCanvas, props))).toBe(html);
      expect(error).not.toHaveBeenCalled();
    } finally { error.mockRestore(); }
  });

  it("renders the newest page first and provides direct atlas links", () => {
    const html = renderToString(createElement(PageList, { pages, edges }));
    expect(html.indexOf('href="/note/b"')).toBeLessThan(html.indexOf('href="/note/a"'));
    expect(html).toContain('href="/graph?note=a"');
    expect(html).toMatch(/datetime="2026-03-01T00:00:00Z"/i);
  });

  it("gives empty archives an actionable first step in both views", () => {
    for (const html of [renderToString(createElement(GraphCanvas, { nodes: [], edges: [] })), renderToString(createElement(PageList, { pages: [], edges: [] }))]) {
      expect(html).toContain('href="/new"');
      expect(html).toContain("Create your first page");
    }
  });
});
