"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Node = { id: string; title: string };
type Edge = { source: string; target: string };
type PositionedNode = Node & { x: number; y: number; vx: number; vy: number };

const WIDTH = 1000;
const HEIGHT = 620;

function initialPositions(nodes: Node[]): PositionedNode[] {
  return nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const radius = 80 + (index % 5) * 32;
    return {
      ...node,
      x: WIDTH / 2 + Math.cos(angle) * radius,
      y: HEIGHT / 2 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });
}

export function GraphCanvas({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const router = useRouter();
  const [positions, setPositions] = useState(() => initialPositions(nodes));
  const frame = useRef<number | null>(null);
  const edgeSet = useMemo(() => edges, [edges]);

  useEffect(() => {
    let tick = 0;
    let current = initialPositions(nodes);
    const iterate = () => {
      const byId = new Map(current.map((node) => [node.id, node]));
      const alpha = Math.max(0.04, 1 - tick / 170);

      for (let left = 0; left < current.length; left += 1) {
        for (let right = left + 1; right < current.length; right += 1) {
          const a = current[left]; const b = current[right];
          if (!a || !b) continue;
          const dx = b.x - a.x; const dy = b.y - a.y;
          const distanceSq = Math.max(dx * dx + dy * dy, 90);
          const force = (9000 * alpha) / distanceSq;
          const distance = Math.sqrt(distanceSq);
          a.vx -= (dx / distance) * force; a.vy -= (dy / distance) * force;
          b.vx += (dx / distance) * force; b.vy += (dy / distance) * force;
        }
      }

      for (const edge of edgeSet) {
        const source = byId.get(edge.source); const target = byId.get(edge.target);
        if (!source || !target) continue;
        const dx = target.x - source.x; const dy = target.y - source.y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const pull = (distance - 125) * .009 * alpha;
        source.vx += (dx / distance) * pull; source.vy += (dy / distance) * pull;
        target.vx -= (dx / distance) * pull; target.vy -= (dy / distance) * pull;
      }

      current = current.map((node) => ({
        ...node,
        vx: (node.vx + (WIDTH / 2 - node.x) * .0008) * .78,
        vy: (node.vy + (HEIGHT / 2 - node.y) * .0008) * .78,
        x: Math.max(35, Math.min(WIDTH - 35, node.x + node.vx)),
        y: Math.max(35, Math.min(HEIGHT - 35, node.y + node.vy)),
      }));
      setPositions(current);
      tick += 1;
      if (tick < 170) frame.current = requestAnimationFrame(iterate);
    };
    frame.current = requestAnimationFrame(iterate);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [nodes, edgeSet]);

  const byId = new Map(positions.map((node) => [node.id, node]));
  if (!nodes.length) return <div className="graph-frame"><div className="empty"><div><span className="empty-glyph">◇</span><p>No rooms to map yet.</p></div></div></div>;

  return (
    <div className="graph-frame">
      <svg className="graph-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Graph of ${nodes.length} notes and ${edges.length} links`}>
        <g>{edges.map((edge, index) => {
          const source = byId.get(edge.source); const target = byId.get(edge.target);
          return source && target ? <line className="graph-edge" key={`${edge.source}-${edge.target}-${index}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} /> : null;
        })}</g>
        <g>{positions.map((node) => (
          <g className="graph-node" key={node.id} role="link" tabIndex={0}
            onClick={() => router.push(`/note/${node.id}`)}
            onKeyDown={(event) => { if (event.key === "Enter") router.push(`/note/${node.id}`); }}
            transform={`translate(${node.x} ${node.y})`} style={{ cursor: "pointer" }}>
            <circle r="8" /><text x="13" y="4">{node.title.length > 28 ? `${node.title.slice(0, 26)}…` : node.title}</text>
          </g>
        ))}</g>
      </svg>
      <div className="graph-legend">{nodes.length} rooms · {edges.length} doors · select a light to enter</div>
    </div>
  );
}
