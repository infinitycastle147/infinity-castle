"use client";

import { Search } from "lucide-react";
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

export function SearchConsole() {
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

      {results === null ? null : results.length ? (
        <section className="results" aria-live="polite">
          <span className="eyebrow">{results.length} pages recovered</span>
          {results.map((result, index) => (
            <Link className="result-card" href={`/note/${result.note_id}`} key={result.note_id}>
              <span className="result-rank">{String(index + 1).padStart(2, "0")}</span>
              <div><h2 className="result-title">{result.title}</h2><p className="result-content">{result.content}</p></div>
              <span className="result-score">
                {result.vector_similarity === null
                  ? "Text match"
                  : `COS ${Number(result.vector_similarity).toFixed(3)}`}
              </span>
            </Link>
          ))}
        </section>
      ) : <EmptySearch />}
    </>
  );
}

function EmptySearch() {
  return (
    <div className="search-empty" role="status">
      <span className="search-empty-glyph" aria-hidden="true">⌂</span>
      <span className="eyebrow">The halls answer with silence</span>
      <h2>Nothing found in the castle</h2>
      <p>Try another phrase, fewer words, or a nearby idea.</p>
    </div>
  );
}
