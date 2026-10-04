import type { Metadata } from "next";

import { ArchiveViews } from "../../../src/components/archive-views";
import { getArchive } from "../../../src/lib/notes/archive";
import { GraphCanvas } from "./graph-canvas";

export const metadata: Metadata = { title: "Atlas" };

export default async function GraphPage({ searchParams }: { searchParams: Promise<{ note?: string }> }) {
  const [{ pages, edges }, { note }] = await Promise.all([getArchive(), searchParams]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Topology · known doors</span>
          <h1 className="page-title">The living <span className="accent">atlas</span></h1>
          <p className="page-deck">Follow a connection. Rediscover a thought. See how your pages belong together.</p>
        </div>
        <ArchiveViews active="graph" />
      </header>
      <GraphCanvas
        key={note ?? "atlas"}
        nodes={pages}
        edges={edges}
        initialSelection={note ?? null}
      />
    </div>
  );
}
