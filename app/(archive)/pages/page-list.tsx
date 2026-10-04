"use client";

import Link from "next/link";
import { ArrowDownUp, ArrowRight, FileText, Network, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { ArchivePage } from "../../../src/lib/notes/archive";
import { buildTopology, matchesConnectionFilter, type ArchiveEdge, type ConnectionFilter } from "../../../src/lib/notes/graph";

const PAGE_SIZE = 30;
const dateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function PageList({ pages, edges }: { pages: ArchivePage[]; edges: ArchiveEdge[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const [filter, setFilter] = useState<ConnectionFilter>("all");
  const [page, setPage] = useState(0);
  const { neighbors } = useMemo(() => buildTopology(pages, edges), [pages, edges]);
  const unlinked = pages.filter((note) => !neighbors.get(note.id)?.size).length;
  const results = useMemo(() => pages.filter((note) =>
    note.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && matchesConnectionFilter(neighbors.get(note.id)?.size ?? 0, filter)
  ).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "created" ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)), [pages, query, sort, filter, neighbors]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(results.length / PAGE_SIZE) - 1));
  const reset = () => { setQuery(""); setFilter("all"); setPage(0); };

  return (
    <section className="archive-library" aria-label="Page library">
      <div className="archive-summary">
        <div><strong>{String(pages.length).padStart(2, "0")}</strong><span>pages in the archive</span></div>
        <div><strong>{String(pages.length - unlinked).padStart(2, "0")}</strong><span>connected pages</span></div>
        <div><strong>{String(unlinked).padStart(2, "0")}</strong><span>waiting for a link</span></div>
      </div>
      <div className="library-toolbar">
        <div className="search-field"><Search size={16} /><input aria-label="Search page titles" placeholder="Find a page by title…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />{query && <button aria-label="Clear search" onClick={() => { setQuery(""); setPage(0); }}><X size={15} /></button>}</div>
        <label className="sort-field"><ArrowDownUp size={15} /><span className="sr-only">Sort pages</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }}><option value="updated">Recently updated</option><option value="created">Newest first</option><option value="title">Title A–Z</option></select></label>
      </div>
      <div className="library-filter-row">
        <div className="filter-pills" aria-label="Filter pages">{([ ["all", "All pages", pages.length], ["linked", "Connected", pages.length - unlinked], ["unlinked", "Unlinked", unlinked] ] as const).map(([value, label, count]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(0); }}>{label}<span>{count}</span></button>)}</div>
        <span className="result-count" role="status">{results.length} {results.length === 1 ? "page" : "pages"}{query ? " found" : ""}</span>
      </div>
      {results.length ? <>
        <div className="page-list-heading" aria-hidden="true"><span>Page / title</span><span>Connections</span><span>Last updated</span><span /></div>
        <ul className="page-list">{results.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((note, index) => {
          const count = neighbors.get(note.id)?.size ?? 0;
          return <li key={note.id} className="page-list-row">
            <Link href={`/note/${note.id}`} className="page-list-main"><span className="page-number">{String(currentPage * PAGE_SIZE + index + 1).padStart(2, "0")}</span><FileText size={18} /><span className="page-list-title">{note.title}<small>{count ? "Part of your constellation" : "A thought with room to grow"}</small></span></Link>
            <Link href={`/graph?note=${encodeURIComponent(note.id)}`} className={`connection-badge${count ? " linked" : ""}`} aria-label={`Explore ${note.title} in graph, ${count} connections`}><Network size={13} />{count}<span className="connection-word"> {count === 1 ? "link" : "links"}</span></Link>
            <time dateTime={note.updatedAt}>{dateFormatter.format(new Date(note.updatedAt))}</time>
            <Link href={`/note/${note.id}`} className="row-open" aria-label={`Open ${note.title}`}><ArrowRight size={17} /></Link>
          </li>;
        })}</ul>
        <div className="library-footer"><span>Every page is a room. Wikilinks are the doors.</span>{results.length > PAGE_SIZE && <nav className="pagination" aria-label="Page list pagination"><button className="icon-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">←</button><span>{currentPage + 1} / {Math.ceil(results.length / PAGE_SIZE)}</span><button className="icon-button" disabled={(currentPage + 1) * PAGE_SIZE >= results.length} onClick={() => setPage(currentPage + 1)} aria-label="Next page">→</button></nav>}</div>
      </> : <div className="empty library-empty"><div><FileText size={30} /><h2>{pages.length ? "No pages found" : "Your first page awaits"}</h2><p>{pages.length ? "Try another title or explore all your pages." : "Write a thought or import a markdown file to start your archive."}</p>{pages.length ? <button className="button" onClick={reset}>Clear filters</button> : <Link className="button primary" href="/new">Create your first page</Link>}</div></div>}
    </section>
  );
}
