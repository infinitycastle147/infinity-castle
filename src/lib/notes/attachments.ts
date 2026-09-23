import type { SupabaseClient } from "@supabase/supabase-js";

export const NOTE_IMAGE_BUCKET = "note-images";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_NOTE = 24;

const ATTACHMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTACHMENT_SOURCE_PATTERN = /!\[[^\]]*\]\(attachment:([0-9a-f-]{36})(?:\s+["'][^"']*["'])?\)/gi;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type NoteAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  signedUrl?: string;
};

export function isAttachmentId(value: string): boolean {
  return ATTACHMENT_ID_PATTERN.test(value);
}

export function extractAttachmentIds(markdown: string): string[] {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(ATTACHMENT_SOURCE_PATTERN)) {
    if (match[1] && isAttachmentId(match[1])) ids.add(match[1].toLowerCase());
  }
  return [...ids];
}

export function imageExtension(mimeType: string): string | undefined {
  return ALLOWED_IMAGE_TYPES.get(mimeType);
}

export function validateImageFile(file: File): void {
  if (!imageExtension(file.type)) {
    throw new Error("Images must be PNG, JPEG, WebP, or GIF files");
  }
  if (file.size === 0) throw new Error("An attached image is empty");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Each image must be 10 MB or smaller");
}

export function assertAttachmentReferences(
  markdown: string,
  uploads: Map<string, File>,
  existingIds: Iterable<string> = [],
): void {
  const referencedIds = extractAttachmentIds(markdown);
  if (referencedIds.length > MAX_IMAGES_PER_NOTE) {
    throw new Error(`A note can contain at most ${MAX_IMAGES_PER_NOTE} images`);
  }
  if (uploads.size > MAX_IMAGES_PER_NOTE) {
    throw new Error(`A note can upload at most ${MAX_IMAGES_PER_NOTE} images at once`);
  }
  const available = new Set([...existingIds].map((id) => id.toLowerCase()));
  for (const id of uploads.keys()) available.add(id.toLowerCase());
  if (referencedIds.some((id) => !available.has(id))) {
    throw new Error("One or more image markers do not have an attached file");
  }
}

export async function getNoteAttachments(
  client: SupabaseClient,
  noteId: string,
): Promise<NoteAttachment[]> {
  const { data, error } = await client
    .from("note_attachments")
    .select("id, file_name, mime_type, size_bytes, storage_path")
    .eq("note_id", noteId);

  if (error) throw new Error(`Could not read note images: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    storagePath: String(row.storage_path),
  }));
}

export async function getSignedNoteAttachments(
  client: SupabaseClient,
  noteId: string,
): Promise<NoteAttachment[]> {
  const attachments = await getNoteAttachments(client, noteId);
  return Promise.all(attachments.map(async (attachment) => {
    const { data, error } = await client.storage
      .from(NOTE_IMAGE_BUCKET)
      .createSignedUrl(attachment.storagePath, 60 * 60);
    if (error) throw new Error(`Could not display ${attachment.fileName}: ${error.message}`);
    return { ...attachment, signedUrl: data.signedUrl };
  }));
}

export async function syncNoteAttachments(input: {
  client: SupabaseClient;
  userId: string;
  noteId: string;
  markdown: string;
  uploads: Map<string, File>;
}): Promise<void> {
  const referencedIds = new Set(extractAttachmentIds(input.markdown));
  const existing = await getNoteAttachments(input.client, input.noteId);
  assertAttachmentReferences(input.markdown, input.uploads, existing.map((attachment) => attachment.id));
  const existingById = new Map(existing.map((attachment) => [attachment.id, attachment]));

  const addedPaths: string[] = [];
  try {
    for (const [id, file] of input.uploads) {
      if (!referencedIds.has(id) || existingById.has(id)) continue;
      validateImageFile(file);
      const extension = imageExtension(file.type);
      const storagePath = `${input.userId}/${input.noteId}/${id}.${extension}`;
      const { error: uploadError } = await input.client.storage
        .from(NOTE_IMAGE_BUCKET)
        .upload(storagePath, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(`Could not upload ${file.name}: ${uploadError.message}`);
      addedPaths.push(storagePath);

      const { error: insertError } = await input.client.from("note_attachments").insert({
        id,
        note_id: input.noteId,
        file_name: file.name.slice(0, 255),
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
      });
      if (insertError) throw new Error(`Could not register ${file.name}: ${insertError.message}`);
    }
  } catch (error) {
    if (addedPaths.length) {
      await input.client.storage.from(NOTE_IMAGE_BUCKET).remove(addedPaths);
      await input.client.from("note_attachments").delete().in("storage_path", addedPaths);
    }
    throw error;
  }

  const stale = existing.filter((attachment) => !referencedIds.has(attachment.id));
  if (!stale.length) return;

  const stalePaths = stale.map((attachment) => attachment.storagePath);
  const { error: removeError } = await input.client.storage.from(NOTE_IMAGE_BUCKET).remove(stalePaths);
  if (removeError) throw new Error(`Could not remove unused images: ${removeError.message}`);
  const { error: deleteError } = await input.client
    .from("note_attachments")
    .delete()
    .in("id", stale.map((attachment) => attachment.id));
  if (deleteError) throw new Error(`Could not remove unused image records: ${deleteError.message}`);
}

export async function removeAllNoteAttachments(
  client: SupabaseClient,
  noteId: string,
): Promise<void> {
  const attachments = await getNoteAttachments(client, noteId);
  if (!attachments.length) return;
  const { error } = await client.storage
    .from(NOTE_IMAGE_BUCKET)
    .remove(attachments.map((attachment) => attachment.storagePath));
  if (error) throw new Error(`Could not remove note images: ${error.message}`);
}
