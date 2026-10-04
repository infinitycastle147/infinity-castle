import { describe, expect, it } from "vitest";

import { buildTopology, fitGraph, layoutGraph, matchesConnectionFilter, zoomGraph } from "../src/lib/notes/graph";

const nodes = [{ id: "a", title: "Alpha" }, { id: "b", title: "Beta" }, { id: "c", title: "Unlinked" }];

describe("archive topology", () => {
  it("counts distinct neighbors in either direction without phantom or self connections", () => {
    const { neighbors, connections } = buildTopology(nodes, [
      { source: "a", target: "b" }, { source: "b", target: "a" },
      { source: "a", target: "b" }, { source: "a", target: "a" },
      { source: "missing", target: "c" },
    ]);
    expect(connections).toHaveLength(1);
    expect([...neighbors.get("a")!]).toEqual(["b"]);
    expect([...neighbors.get("b")!]).toEqual(["a"]);
    expect(neighbors.get("c")?.size).toBe(0);
  });

  it("keeps incoming-only pages in the connected filter", () => {
    const { neighbors } = buildTopology(nodes, [{ source: "a", target: "b" }]);
    expect(nodes.filter((node) => matchesConnectionFilter(neighbors.get(node.id)!.size, "linked")).map((node) => node.id)).toEqual(["a", "b"]);
    expect(nodes.filter((node) => matchesConnectionFilter(neighbors.get(node.id)!.size, "unlinked")).map((node) => node.id)).toEqual(["c"]);
    expect(matchesConnectionFilter(0, "all")).toBe(true);
  });

  it("settles empty, single, and disconnected graphs into stable finite positions", () => {
    expect(layoutGraph([], [])).toEqual([]);
    for (const sample of [nodes.slice(0, 1), nodes]) {
      const positions = layoutGraph(sample, []);
      expect(positions).toEqual(layoutGraph(sample, []));
      expect(positions.map((node) => node.id)).toEqual(sample.map((node) => node.id));
      expect(positions.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
      expect(new Set(positions.map((node) => `${node.x},${node.y}`)).size).toBe(sample.length);
    }
  });
});

describe("atlas camera", () => {
  it("fits every node inside desktop and phone viewports", () => {
    const positions = layoutGraph(nodes, []);
    for (const [width, height] of [[1000, 600], [340, 430]] as const) {
      const camera = fitGraph(positions, width, height);
      for (const node of positions) {
        const x = node.x * camera.scale + camera.x;
        const y = node.y * camera.scale + camera.y;
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(width);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(height);
      }
    }
  });

  it("keeps the point under the cursor fixed while zooming and clamps zoom", () => {
    const camera = { x: 30, y: -50, scale: .8 };
    const anchor = { x: 300, y: 250 };
    const world = { x: (anchor.x - camera.x) / camera.scale, y: (anchor.y - camera.y) / camera.scale };
    for (const factor of [1.25, .8, 100, .001]) {
      const next = zoomGraph(camera, factor, anchor);
      expect(world.x * next.scale + next.x).toBeCloseTo(anchor.x);
      expect(world.y * next.scale + next.y).toBeCloseTo(anchor.y);
      expect(next.scale).toBeGreaterThanOrEqual(.15);
      expect(next.scale).toBeLessThanOrEqual(4);
    }
  });
});
