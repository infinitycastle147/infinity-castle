"use client";

import Link from "next/link";
import { ArrowRight, Crosshair, FileText, Maximize2, Minimize2, Minus, Network, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildTopology, fitGraph, GRAPH_HEIGHT, GRAPH_WIDTH, layoutGraph, matchesConnectionFilter, zoomGraph, type ArchiveEdge, type ArchiveNode, type ConnectionFilter } from "../../../src/lib/notes/graph";

type Camera = { x: number; y: number; scale: number };

export function GraphCanvas({ nodes, edges, initialSelection = null }: { nodes: ArchiveNode[]; edges: ArchiveEdge[]; initialSelection?: string | null }) {
  const topology = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);
  const positions = useMemo(() => layoutGraph(nodes, topology.connections), [nodes, topology]);
  const byId = useMemo(() => new Map(positions.map((node) => [node.id, node])), [positions]);
  const [viewport, setViewport] = useState({ width: GRAPH_WIDTH, height: GRAPH_HEIGHT });
  const fit = useMemo(() => fitGraph(positions, viewport.width, viewport.height), [positions, viewport]);
  const [camera, setCamera] = useState<Camera>(() => {
    const node = initialSelection ? byId.get(initialSelection) : null;
    return node ? { x: GRAPH_WIDTH / 2 - node.x, y: GRAPH_HEIGHT / 2 - node.y, scale: 1 } : fit;
  });
  const [selectedId, setSelectedId] = useState<string | null>(initialSelection);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConnectionFilter>("all");
  const [showLabels, setShowLabels] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; camera: Camera; moved: boolean; nodeId: string | null } | null>(null);
  const suppressClick = useRef(false);
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const activeId = hoveredId ?? selected?.id;
  const activeNeighbors = activeId ? topology.neighbors.get(activeId) : undefined;
  const selectedNeighbors = nodes.filter((node) => selected && topology.neighbors.get(selected.id)?.has(node.id)).sort((a, b) => a.title.localeCompare(b.title));
  const matches = nodes.filter((node) => node.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && matchesConnectionFilter(topology.neighbors.get(node.id)?.size ?? 0, filter));
  const matchingIds = new Set(matches.map((node) => node.id));
  const visibleIds = new Set(nodes.filter((node) => matchesConnectionFilter(topology.neighbors.get(node.id)?.size ?? 0, filter)).map((node) => node.id));
  const linkedCount = nodes.filter((node) => topology.neighbors.get(node.id)?.size).length;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || !entry.contentRect.width || !entry.contentRect.height) return;
      const { width, height } = entry.contentRect;
      setViewport({ width, height });
      const initial = initialSelection ? positions.find((node) => node.id === initialSelection) : undefined;
      setCamera(initial ? { scale: 1, x: width / 2 - initial.x, y: height / 2 - initial.y } : fitGraph(positions, width, height));
    });
    observer.observe(svg);
    // A non-passive listener prevents browser zoom while zooming the atlas.
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      event.preventDefault();
      const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      setCamera((value) => zoomGraph(value, event.deltaY < 0 ? 1.12 : 1 / 1.12, anchor));
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => { observer.disconnect(); svg.removeEventListener("wheel", wheel); };
  }, [positions, initialSelection]);

  function selectNode(id: string, center = false) {
    setSelectedId(id);
    const node = byId.get(id);
    if (center && node) setCamera((value) => ({ ...value, x: viewport.width / 2 - node.x * value.scale, y: viewport.height / 2 - node.y * value.scale }));
  }

  function zoom(factor: number) {
    setCamera((value) => zoomGraph(value, factor, { x: viewport.width / 2, y: viewport.height / 2 }));
  }

  function point(clientX: number, clientY: number) {
    const matrix = svgRef.current?.getScreenCTM();
    return matrix ? new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
  }

  if (!nodes.length) return <div className="graph-frame"><div className="empty library-empty"><div><Network size={34} /><h2>Your atlas starts with a page</h2><p>Add a page, then use [[wikilinks]] to connect your thoughts.</p><Link href="/new" className="button primary">Create your first page</Link></div></div></div>;

  return (
    <section className={`atlas-workspace${expanded ? " expanded" : ""}`} aria-label="Interactive page atlas">
      <div className="atlas-toolbar">
        <div className="search-field"><Search size={16} /><input aria-label="Find a page in the graph" placeholder="Find a light in the atlas…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Clear graph search" onClick={() => setQuery("")}><X size={15} /></button>}</div>
        <label className="label-toggle"><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /> Page names</label>
        <button className="icon-button" aria-label={expanded ? "Collapse atlas" : "Expand atlas"} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
      </div>
      <div className="atlas-body">
        <div className="graph-frame">
          <div className="atlas-map-heading"><span className="eyebrow">Constellation / 01</span><span className="atlas-live"><i />{nodes.length} pages · {topology.connections.length} connections</span></div>
          <svg ref={svgRef} className="graph-svg" viewBox={`0 0 ${viewport.width} ${viewport.height}`} role="group" aria-label="Page graph. Drag to pan. Use zoom buttons or plus and minus keys. Arrow keys pan; zero fits the graph; Escape clears selection." tabIndex={0}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              setHoveredId(null);
              const start = point(event.clientX, event.clientY);
              const target = (event.target as Element).closest("[data-node-id]");
              drag.current = { pointer: event.pointerId, x: start.x, y: start.y, camera, moved: false, nodeId: target?.getAttribute("data-node-id") ?? null };
              suppressClick.current = false;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (!start || start.pointer !== event.pointerId) return;
              const current = point(event.clientX, event.clientY);
              const dx = current.x - start.x; const dy = current.y - start.y;
              if (Math.hypot(dx, dy) > 4) start.moved = true;
              if (start.moved) setCamera({ ...start.camera, x: start.camera.x + dx, y: start.camera.y + dy });
            }}
            onPointerUp={(event) => {
              const start = drag.current;
              if (!start || start.pointer !== event.pointerId) return;
              suppressClick.current = start.moved;
              if (!start.moved) {
                if (start.nodeId) selectNode(start.nodeId); else setSelectedId(null);
              }
              drag.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => { drag.current = null; suppressClick.current = true; }}
            onKeyDown={(event) => {
              if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom(1.2); }
              if (event.key === "-") { event.preventDefault(); zoom(1 / 1.2); }
              if (event.key === "0") { event.preventDefault(); setCamera(fit); }
              if (event.key === "Escape") { setSelectedId(null); setQuery(""); }
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
                event.preventDefault(); setCamera((value) => ({ ...value, x: value.x + (event.key === "ArrowLeft" ? 45 : event.key === "ArrowRight" ? -45 : 0), y: value.y + (event.key === "ArrowUp" ? 45 : event.key === "ArrowDown" ? -45 : 0) }));
              }
            }}>
            <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}>
              <g>{topology.connections.map((edge) => {
                const source = byId.get(edge.source)!; const target = byId.get(edge.target)!;
                if (!visibleIds.has(source.id) || !visibleIds.has(target.id)) return null;
                const active = activeId === source.id || activeId === target.id;
                return <line key={`${edge.source}-${edge.target}`} className={`graph-edge${active ? " highlighted" : activeId ? " faded" : ""}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
              })}</g>
              <g>{positions.filter((node) => visibleIds.has(node.id)).map((node) => {
                const degree = topology.neighbors.get(node.id)?.size ?? 0;
                const isSelected = node.id === selected?.id;
                const isActive = node.id === activeId || activeNeighbors?.has(node.id);
                const dim = (query.trim() && !matchingIds.has(node.id)) || (activeId && !isActive);
                const radius = 6 + Math.min(8, Math.sqrt(degree) * 2);
                return <g key={node.id} data-node-id={node.id} className={`graph-node${isSelected ? " selected" : ""}${degree ? " connected" : " isolated"}${dim ? " dimmed" : ""}`} transform={`translate(${node.x} ${node.y})`} role="button" aria-label={`${node.title}, ${degree} connections. Select to explore.`} aria-pressed={isSelected} tabIndex={0}
                  onPointerEnter={() => { if (!drag.current) setHoveredId(node.id); }} onPointerLeave={() => setHoveredId(null)}
                  onClick={(event) => { event.stopPropagation(); if (!suppressClick.current && event.detail === 0) selectNode(node.id); }}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); selectNode(node.id); } }}>
                  <title>{`${node.title} · ${degree} connections`}</title>
                  <circle className="node-hit" r={22} />
                  {isSelected && <circle className="node-orbit" r={radius + 10} />}
                  <circle className="node-core" r={radius} />
                  <circle className="node-center" r={2} />
                  {(showLabels || isSelected || hoveredId === node.id || (query.trim() && matchingIds.has(node.id))) && <text x={radius + 10} y={4}>{node.title.length > 28 ? `${node.title.slice(0, 26)}…` : node.title}</text>}
                </g>;
              })}</g>
            </g>
          </svg>
          <div className="graph-controls"><button className="icon-button" aria-label="Zoom in" onClick={() => zoom(1.25)} disabled={camera.scale >= 4}><Plus size={17} /></button><span>{Math.round(camera.scale * 100)}%</span><button className="icon-button" aria-label="Zoom out" onClick={() => zoom(.8)} disabled={camera.scale <= .15}><Minus size={17} /></button><button className="icon-button" aria-label="Fit all pages" title="Fit all pages (0)" onClick={() => setCamera(fit)}><Crosshair size={17} /></button></div>
          <div className="graph-map-hint">Drag to explore <span>· Ctrl / ⌘ + scroll to zoom</span></div>
        </div>
        <aside className="atlas-inspector" aria-label="Atlas explorer">
          <div className="inspector-top"><span className="eyebrow">{selected ? "Selected page" : "Explore the archive"}</span>{selected && <button className="icon-button" aria-label="Clear selection" onClick={() => setSelectedId(null)}><X size={15} /></button>}</div>
          {selected ? <div className="selected-page" aria-live="polite"><span className="inspector-symbol"><FileText size={22} /></span><h2>{selected.title}</h2><p>{selectedNeighbors.length} {selectedNeighbors.length === 1 ? "connection" : "connections"} in your archive</p><Link className="button primary" href={`/note/${selected.id}`}>Open page <ArrowRight size={15} /></Link><h3 className="eyebrow">Connected pages</h3>{selectedNeighbors.length ? <ul className="inspector-pages">{selectedNeighbors.map((node) => <li key={node.id}><button onClick={() => selectNode(node.id, true)}><Network size={13} /><span>{node.title}</span><ArrowRight size={13} /></button></li>)}</ul> : <p className="inspector-tip">This page stands on its own. Add a [[wikilink]] in its text to give it a door.</p>}</div> : <div className="inspector-intro"><span className="inspector-symbol"><Network size={24} /></span><h2>Thoughts, connected.</h2><p>Select a light to see its neighbors and follow a thread through your archive.</p><div className="graph-key"><span><i className="key-connected" />Connected page</span><span><i className="key-isolated" />Unlinked page</span><span className="inspector-tip">Larger lights have more connections.</span></div></div>}
          <div className="inspector-directory"><div className="directory-heading"><span className="eyebrow">Find your way</span><span className="result-count" role="status">{matches.length} pages</span></div><div className="filter-pills compact">{([ ["all", "All", nodes.length], ["linked", "Linked", linkedCount], ["unlinked", "Unlinked", nodes.length - linkedCount] ] as const).map(([value, label, count]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setSelectedId(null); setHoveredId(null); setCamera(fit); }}>{label}<span>{count}</span></button>)}</div><ul className="inspector-pages directory-pages">{matches.map((node) => <li key={node.id}><button aria-pressed={selected?.id === node.id} onClick={() => selectNode(node.id, true)}><span className={`directory-dot${topology.neighbors.get(node.id)?.size ? " linked" : ""}`} /><span>{node.title}</span><span className="directory-degree">{topology.neighbors.get(node.id)?.size ?? 0}</span></button></li>)}</ul>{!matches.length && <p className="inspector-tip">No pages match. Try another title or filter.</p>}</div>
        </aside>
      </div>
      <footer className="atlas-footer"><span><i />Your archive, seen from above</span><Link href="/pages">Browse as a list <ArrowRight size={13} /></Link></footer>
    </section>
  );
}
