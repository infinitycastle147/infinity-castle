export type ArchiveNode = { id: string; title: string };
export type ArchiveEdge = { source: string; target: string };
export type ConnectionFilter = "all" | "linked" | "unlinked";

// Render a connection once, even when both pages link to each other.
export function buildTopology(nodes: ArchiveNode[], edges: ArchiveEdge[]) {
  const neighbors = new Map(nodes.map((node) => [node.id, new Set<string>()]));
  const seen = new Set<string>();
  const connections: ArchiveEdge[] = [];
  for (const edge of edges) {
    if (edge.source === edge.target || !neighbors.has(edge.source) || !neighbors.has(edge.target)) continue;
    const key = JSON.stringify([edge.source, edge.target].sort());
    if (seen.has(key)) continue;
    seen.add(key);
    connections.push(edge);
    neighbors.get(edge.source)!.add(edge.target);
    neighbors.get(edge.target)!.add(edge.source);
  }
  return { neighbors, connections };
}

export function matchesConnectionFilter(count: number, filter: ConnectionFilter) {
  return filter === "all" || (filter === "linked" ? count > 0 : count === 0);
}

export const GRAPH_WIDTH = 1000;
export const GRAPH_HEIGHT = 680;

export type GraphCamera = { x: number; y: number; scale: number };

export function fitGraph(positions: { x: number; y: number }[], width: number, height: number): GraphCamera {
  if (!positions.length) return { x: 0, y: 0, scale: 1 };
  const minX = Math.min(...positions.map((node) => node.x)) - 50;
  const maxX = Math.max(...positions.map((node) => node.x)) + 190;
  const minY = Math.min(...positions.map((node) => node.y)) - 70;
  const maxY = Math.max(...positions.map((node) => node.y)) + 70;
  const scale = Math.min(1.5, width / (maxX - minX), height / (maxY - minY));
  return { x: width / 2 - (minX + maxX) / 2 * scale, y: height / 2 - (minY + maxY) / 2 * scale, scale };
}

export function zoomGraph(camera: GraphCamera, factor: number, anchor: { x: number; y: number }): GraphCamera {
  const scale = Math.max(.15, Math.min(4, camera.scale * factor));
  const ratio = scale / camera.scale;
  return { scale, x: anchor.x - (anchor.x - camera.x) * ratio, y: anchor.y - (anchor.y - camera.y) * ratio };
}

export function layoutGraph(nodes: ArchiveNode[], edges: ArchiveEdge[]) {
  const spread = Math.max(160, Math.sqrt(nodes.length) * 50);
  const positions = nodes.map((node, index) => {
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    const radius = spread * Math.sqrt((index + .5) / Math.max(nodes.length, 1));
    return { ...node, x: GRAPH_WIDTH / 2 + Math.cos(angle) * radius, y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radius, vx: 0, vy: 0 };
  });
  const byId = new Map(positions.map((node) => [node.id, node]));
  // Settle once instead of continuously moving targets under the pointer.
  for (let tick = 0; tick < 140; tick += 1) {
    const alpha = 1 - tick / 150;
    // Nearby-cell repulsion keeps large archives from comparing every pair.
    const cells = new Map<string, number[]>();
    for (let index = 0; index < positions.length; index += 1) {
      const node = positions[index]!;
      const key = `${Math.floor(node.x / 250)},${Math.floor(node.y / 250)}`;
      const cell = cells.get(key) ?? [];
      cell.push(index); cells.set(key, cell);
    }
    for (let left = 0; left < positions.length; left += 1) {
      const a = positions[left]!;
      const cx = Math.floor(a.x / 250); const cy = Math.floor(a.y / 250);
      for (let ox = -1; ox <= 1; ox += 1) for (let oy = -1; oy <= 1; oy += 1) {
        for (const right of cells.get(`${cx + ox},${cy + oy}`) ?? []) {
          if (right <= left) continue;
          const b = positions[right]!;
          const dx = b.x - a.x; const dy = b.y - a.y;
          const distance = Math.max(Math.hypot(dx, dy), 1);
          const force = Math.min(12, 11000 / (distance * distance)) * alpha;
          a.vx -= dx / distance * force; a.vy -= dy / distance * force;
          b.vx += dx / distance * force; b.vy += dy / distance * force;
        }
      }
    }
    for (const edge of edges) {
      const a = byId.get(edge.source); const b = byId.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const force = (distance - 150) * .015 * alpha;
      a.vx += dx / distance * force; a.vy += dy / distance * force;
      b.vx -= dx / distance * force; b.vy -= dy / distance * force;
    }
    for (const node of positions) {
      node.vx = (node.vx + (GRAPH_WIDTH / 2 - node.x) * .001) * .75;
      node.vy = (node.vy + (GRAPH_HEIGHT / 2 - node.y) * .001) * .75;
      node.x += node.vx; node.y += node.vy;
    }
  }
  return positions;
}
