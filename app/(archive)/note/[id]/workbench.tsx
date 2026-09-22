"use client";

import { Download, Pencil, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Note = {
  id: string;
  title: string;
  contentMd: string;
  createdAt: string;
  updatedAt: string;
  updatedAtLabel: string;
};

function displayMarkdown(markdown: string) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

export function NoteWorkbench({ note }: { note: Note }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [markdown, setMarkdown] = useState(note.contentMd);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, markdown }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save the note.");
      setEditing(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the note.");
    } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Could not delete the note.");
      }
      router.push("/search");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the note.");
      setConfirmDelete(false); setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Memory · {note.id.slice(0, 8)}</span>
          <h1 className="page-title">{title}</h1>
          <p className="note-meta">
            Last mapped <time dateTime={note.updatedAt}>{note.updatedAtLabel}</time>
          </p>
        </div>
        <div className="note-toolbar">
          <a className="button" href={`/api/notes/${note.id}/download`}><Download />Export</a>
          <button className="button" onClick={() => setEditing((value) => !value)} type="button">
            {editing ? <><X />Close</> : <><Pencil />Edit</>}
          </button>
          <button className="button danger" onClick={() => setConfirmDelete(true)} type="button"><Trash2 />Delete</button>
        </div>
      </header>

      <section className="panel">
        {editing ? (
          <div className="panel-body">
            <div className="field"><label htmlFor="note-title">Title</label><input className="input" id="note-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
            <div className="field"><label htmlFor="note-markdown">Markdown</label><textarea className="textarea" id="note-markdown" value={markdown} onChange={(event) => setMarkdown(event.target.value)} /></div>
            {error && <p className="notice error" role="alert">{error}</p>}
            <div className="action-row"><span className="note-meta">Saving rebuilds this passage&apos;s search memory.</span><button className="button primary" disabled={busy} onClick={() => void save()} type="button">{busy ? <><span className="spinner" />Re-mapping…</> : <><Save />Save passage</>}</button></div>
          </div>
        ) : (
          <article className="reader markdown"><Markdown remarkPlugins={[remarkGfm]}>{displayMarkdown(markdown)}</Markdown></article>
        )}
      </section>

      {confirmDelete && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <span className="eyebrow">Permanent action</span><h2 id="delete-title">Unmake this room?</h2>
            <p>The note, its embedded fragments, and every connected edge will be removed.</p>
            <div className="action-row"><button className="button quiet" onClick={() => setConfirmDelete(false)} type="button">Return</button><button className="button danger" disabled={busy} onClick={() => void remove()} type="button">Delete forever</button></div>
          </section>
        </div>
      )}
    </>
  );
}
