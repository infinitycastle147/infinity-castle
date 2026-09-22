"use client";

import { ArrowUpRight, Clock3, Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

type SearchResult = {
  chunk_id: string;
  note_id: string;
  title: string;
  content: string;
  vector_similarity: number | null;
  rrf_score: number;
};

export function SearchConsole({ recent }: {
  recent: Array<{ id: string; title: string; updatedAt: string; updatedAtLabel: string }>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Search failed.");
      setResults(payload.results);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <form className="search-box" onSubmit={search}>
        <Search aria-hidden="true" />
        <input className="input" aria-label="Search archive" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="What are you trying to remember?" />
        <button className="button primary" disabled={busy || !query.trim()} type="submit">
          {busy ? <><span className="spinner" />Seeking</> : "Seek"}
        </button>
      </form>
      {error && <p className="notice error" role="alert">{error}</p>}

      {results === null ? (
        <section className="results" aria-label="Recently changed notes">
          <span className="eyebrow"><Clock3 size={11} /> Recently mapped</span>
          {recent.length ? recent.map((note, index) => (
            <Link className="result-card" href={`/note/${note.id}`} key={note.id}>
              <span className="result-rank">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="result-title">{note.title}</h2>
                <p className="result-content">
                  Updated <time dateTime={note.updatedAt}>{note.updatedAtLabel}</time>
                </p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          )) : <EmptySearch copy="The archive is silent. Inscribe the first passage." />}
        </section>
      ) : results.length ? (
        <section className="results" aria-live="polite">
          <span className="eyebrow">{results.length} echoes recovered</span>
          {results.map((result, index) => (
            <Link className="result-card" href={`/note/${result.note_id}`} key={result.chunk_id}>
              <span className="result-rank">{String(index + 1).padStart(2, "0")}</span>
              <div><h2 className="result-title">{result.title}</h2><p className="result-content">{result.content}</p></div>
              <span className="result-score">RRF {Number(result.rrf_score).toFixed(4)}</span>
            </Link>
          ))}
        </section>
      ) : <EmptySearch copy="No room answered. Try a broader phrase." />}
    </>
  );
}

function EmptySearch({ copy }: { copy: string }) {
  return <div className="empty"><div><span className="empty-glyph">⌁</span><p>{copy}</p></div></div>;
}
