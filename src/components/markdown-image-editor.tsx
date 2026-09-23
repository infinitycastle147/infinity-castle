"use client";

import { ImagePlus } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef } from "react";

import { MAX_IMAGE_BYTES } from "../lib/notes/attachments";
import { DisplayAttachment, NoteMarkdown } from "./note-markdown";

export type PendingImage = { id: string; file: File };

function imageLabel(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[\[\]]/g, "").trim() || "Attached image";
}

export function MarkdownImageEditor({
  id,
  markdown,
  onMarkdownChange,
  pendingImages,
  onPendingImagesChange,
  onError,
  existingAttachments = [],
}: {
  id: string;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  pendingImages: PendingImage[];
  onPendingImagesChange: (images: PendingImage[]) => void;
  onError?: (message: string) => void;
  existingAttachments?: DisplayAttachment[];
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewImages = useMemo(() => pendingImages.map((image) => ({
    id: image.id,
    fileName: image.file.name,
    url: URL.createObjectURL(image.file),
  })), [pendingImages]);
  const attachments = [...existingAttachments, ...previewImages];

  useEffect(() => () => {
    for (const image of previewImages) URL.revokeObjectURL(image.url);
  }, [previewImages]);

  function attach(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const validFiles = files.filter((file) => (
      ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
      && file.size > 0
      && file.size <= MAX_IMAGE_BYTES
    ));
    if (validFiles.length !== files.length) {
      onError?.("Images must be PNG, JPEG, WebP, or GIF files no larger than 10 MB.");
    }
    if (!validFiles.length) return;
    onError?.("");

    const additions = validFiles.map((file) => ({ id: crypto.randomUUID(), file }));
    const markers = additions
      .map(({ id: attachmentId, file }) => `![${imageLabel(file.name)}](attachment:${attachmentId})`)
      .join("\n\n");
    const field = textarea.current;
    const start = field?.selectionStart ?? markdown.length;
    const end = field?.selectionEnd ?? start;
    const before = markdown.slice(0, start);
    const after = markdown.slice(end);
    const prefix = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const suffix = after && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : "";
    const nextMarkdown = `${before}${prefix}${markers}${suffix}${after}`;
    onPendingImagesChange([...pendingImages, ...additions]);
    onMarkdownChange(nextMarkdown);

    requestAnimationFrame(() => {
      const cursor = before.length + prefix.length + markers.length;
      field?.focus();
      field?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="field">
      <div className="editor-label-row">
        <label htmlFor={id}>Markdown</label>
        <>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={attach}
          />
          <button className="attach-button" type="button" onClick={() => fileInput.current?.click()}>
            <ImagePlus />Attach image
          </button>
        </>
      </div>
      <div className="editor-grid">
        <textarea
          ref={textarea}
          className="textarea"
          id={id}
          spellCheck="true"
          value={markdown}
          onChange={(event) => onMarkdownChange(event.target.value)}
          placeholder={"# A new passage\n\nBegin here. Open a door to [[Another Note]]."}
        />
        <div className="placement-preview" aria-label="Live note preview">
          <span className="preview-label">Live placement</span>
          <div className="markdown preview-markdown">
            {markdown.trim()
              ? <NoteMarkdown markdown={markdown} attachments={attachments} />
              : <p className="preview-empty">Images appear here at the exact point where their marker is inserted.</p>}
          </div>
        </div>
      </div>
      <span className="field-hint">PNG, JPEG, WebP, or GIF · 10 MB each · remove its marker to remove the image on save</span>
    </div>
  );
}
