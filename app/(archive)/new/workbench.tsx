"use client";

import { FileUp, ScrollText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useRef, useState } from "react";

type Conflict = { reason: string; noteId?: string };

export function NewNoteWorkbench() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"write" | "import">("write");
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [filename, setFilename] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<Conflict | null>(null);

  async function readFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".md") && file.type !== "text/markdown") {
      setError("Only Markdown (.md) files can enter the archive.");
      return;
    }
    if (file.size > 1_000_000) {
      setError("That file is larger than the 1 MB archive limit.");
      return;
    }
    setMarkdown(await file.text());
    setFilename(file.name);
    setError("");
  }

  async function save(options: { replaceExisting?: boolean; createAsNew?: boolean } = {}) {
    if (!markdown.trim()) {
      setError("Write or import some Markdown first.");
      return;
    }
    setBusy(true);
    setError("");
    setConflict(null);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown,
          ...(title.trim() ? { title: title.trim() } : {}),
          ...options,
        }),
      });
      const payload = await response.json();
      if (response.status === 409) {
        setConflict({ reason: payload.reason, ...(payload.noteId ? { noteId: payload.noteId } : {}) });
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? "The archive rejected this note.");
      router.push(`/note/${payload.noteId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the note.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void save();
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  }

  const conflictCopy = conflict?.reason === "id_not_found"
    ? "This file remembers a note ID that no longer exists here. Import it as a new memory with a fresh ID?"
    : conflict?.reason === "title_match_unchanged"
      ? "A note with this title and content already exists. Confirming will open it without re-embedding."
      : "A note already occupies this identity or title. Replace its content and rebuild its search memory?";

  return (
    <>
      <form className="panel" onSubmit={submit}>
        <div className="tabs" role="tablist" aria-label="Note source">
          <button className={`tab${mode === "write" ? " active" : ""}`} onClick={() => setMode("write")} type="button">Write</button>
          <button className={`tab${mode === "import" ? " active" : ""}`} onClick={() => setMode("import")} type="button">Import .md</button>
        </div>
        <div className="panel-body">
          {mode === "import" && (
            <>
              <input ref={fileInput} hidden type="file" accept=".md,text/markdown" onChange={(event) => void readFile(event.target.files?.[0])} />
              <button className={`dropzone${dragging ? " dragging" : ""}`} type="button"
                onClick={() => fileInput.current?.click()} onDragEnter={() => setDragging(true)}
                onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={drop}>
                <span><FileUp /><br />{filename || "Drop a Markdown file here"}<br /><small>{filename ? "Loaded into the scriptorium" : "or click to choose · max 1 MB"}</small></span>
              </button>
            </>
          )}
          <div className="field">
            <label htmlFor="title">Title <span className="note-meta">· optional with frontmatter or H1</span></label>
            <input className="input" id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The room at the end of the hall" />
          </div>
          <div className="field">
            <label htmlFor="markdown">Markdown</label>
            <textarea className="textarea" id="markdown" spellCheck="true" value={markdown}
              onChange={(event) => setMarkdown(event.target.value)} placeholder={"# A new passage\n\nBegin here. Open a door to [[Another Note]]."} />
          </div>
          {error && <p className="notice error" role="alert">{error}</p>}
          <div className="action-row">
            <span className="note-meta"><ScrollText size={12} /> {markdown.length.toLocaleString()} glyphs</span>
            <button className="button primary" disabled={busy} type="submit">
              {busy ? <><span className="spinner" />Mapping…</> : <><Sparkles />Commit memory</>}
            </button>
          </div>
        </div>
      </form>

      {conflict && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
            <span className="eyebrow">Identity collision</span>
            <h2 id="conflict-title">A familiar passage</h2>
            <p>{conflictCopy}</p>
            <div className="action-row">
              <button className="button quiet" onClick={() => setConflict(null)} type="button">Keep both apart</button>
              <button className="button primary" onClick={() => void save(
                conflict.reason === "id_not_found" ? { createAsNew: true } : { replaceExisting: true },
              )} type="button">
                {conflict.reason === "id_not_found" ? "Import as new" : "Confirm replacement"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
