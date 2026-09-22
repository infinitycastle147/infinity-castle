import type { Metadata } from "next";

import { createClient } from "../../../src/lib/supabase/server";
import { GraphCanvas } from "./graph-canvas";

export const metadata: Metadata = { title: "Atlas" };

export default async function GraphPage() {
  const supabase = await createClient();
  const [{ data: notes }, { data: edges }] = await Promise.all([
    supabase.from("notes").select("id, title").order("title"),
    supabase.from("edges").select("note_id, linked_note_id"),
  ]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Topology · known doors</span>
          <h1 className="page-title">The living <span className="accent">atlas</span></h1>
          <p className="page-deck">Each light is a memory. Each path began as a wikilink.</p>
        </div>
      </header>
      <GraphCanvas
        nodes={(notes ?? []).map((note) => ({ id: String(note.id), title: String(note.title) }))}
        edges={(edges ?? []).map((edge) => ({ source: String(edge.note_id), target: String(edge.linked_note_id) }))}
      />
    </div>
  );
}
