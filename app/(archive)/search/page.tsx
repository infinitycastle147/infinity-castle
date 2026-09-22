import type { Metadata } from "next";

import { createClient } from "../../../src/lib/supabase/server";
import { SearchConsole } from "./search-console";

export const metadata: Metadata = { title: "Seek" };

export default async function SearchPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Hybrid divination · text + meaning</span>
          <h1 className="page-title">Seek the <span className="accent">archive</span></h1>
          <p className="page-deck">Ask plainly. The castle listens for exact words and nearby ideas.</p>
        </div>
      </header>
      <SearchConsole recent={(data ?? []).map((note) => ({
        id: String(note.id),
        title: String(note.title),
        updatedAt: String(note.updated_at),
        updatedAtLabel: new Date(String(note.updated_at)).toLocaleDateString(),
      }))} />
    </div>
  );
}
