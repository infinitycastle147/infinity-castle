"use client";

import { Download, Pencil, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MarkdownImageEditor, PendingImage } from "../../../../src/components/markdown-image-editor";
import { DisplayAttachment, NoteMarkdown } from "../../../../src/components/note-markdown";

type Note = {
  id: string;
  title: string;
  contentMd: string;
  createdAt: string;
  updatedAt: string;
  updatedAtLabel: string;
};

export function NoteWorkbench({ note, attachments }: { note: Note; attachments: DisplayAttachment[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [markdown, setMarkdown] = useState(note.contentMd);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("markdown", markdown);
      for (const image of pendingImages) form.set(`attachment:${image.id}`, image.file);
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save the note.");
      setEditing(false);
      setPendingImages([]);
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
            <MarkdownImageEditor
              id="note-markdown"
              markdown={markdown}
              onMarkdownChange={setMarkdown}
              pendingImages={pendingImages}
              onPendingImagesChange={setPendingImages}
              onError={setError}
              existingAttachments={attachments}
            />
            {error && <p className="notice error" role="alert">{error}</p>}
            <div className="action-row"><span className="note-meta">Saving rebuilds this passage&apos;s search memory.</span><button className="button primary" disabled={busy} onClick={() => void save()} type="button">{busy ? <><span className="spinner" />Re-mapping…</> : <><Save />Save passage</>}</button></div>
          </div>
        ) : (
          <article className="reader markdown"><NoteMarkdown markdown={markdown} attachments={attachments} /></article>
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
