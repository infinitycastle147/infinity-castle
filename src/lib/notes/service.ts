import { hashParsedNote } from "./content-hash";
import { parseNote } from "./parser";
import type {
  Embedder,
  ProcessedNoteRepository,
  SaveMarkdownResult,
} from "./types";

export async function saveMarkdownNote(input: {
  markdown: string;
  title?: string;
  noteId?: string;
  replaceExisting?: boolean;
  ignoreSourceId?: boolean;
  embedder: Embedder;
  repository: ProcessedNoteRepository;
}): Promise<SaveMarkdownResult> {
  const parsed = parseNote(
    input.markdown,
    input.title === undefined ? {} : { title: input.title },
  );
  if (input.noteId && parsed.sourceId && input.noteId !== parsed.sourceId) {
    throw new Error("The route note id and uploaded frontmatter id do not match");
  }

  const requestedId = input.noteId ?? (input.ignoreSourceId ? undefined : parsed.sourceId);
  const contentHash = hashParsedNote(parsed);
  const check = await input.repository.checkUpload({
    ...(requestedId ? { id: requestedId } : {}),
    title: parsed.title,
    contentHash,
  });

  if (check.status === "unchanged") {
    if (!check.noteId) throw new Error("Upload check did not return the existing note id");
    return { status: "unchanged", noteId: check.noteId };
  }

  if (check.status === "title_match_unchanged" && input.replaceExisting) {
    if (!check.noteId) throw new Error("Upload check did not return the matching note id");
    return { status: "unchanged", noteId: check.noteId };
  }

  if (check.status === "id_not_found" || (
    check.status !== "new" && !input.replaceExisting
  )) {
    return {
      status: "confirmation_required",
      reason: check.status,
      ...(check.noteId ? { noteId: check.noteId } : {}),
    };
  }

  const replacementId = check.status === "new" ? undefined : check.noteId;
  if (check.status !== "new" && !replacementId) {
    throw new Error("Upload check did not return the replacement note id");
  }

  const embeddings = await input.embedder.embed(parsed.chunks, "document");

  const noteId = await input.repository.save({
    ...(replacementId ? { id: replacementId } : {}),
    title: parsed.title,
    contentMd: parsed.contentMd,
    contentHash,
    chunks: parsed.chunks.map((content, index) => {
      const embedding = embeddings[index];
      if (!embedding) throw new Error(`Missing embedding for chunk ${index}`);
      return { content, embedding };
    }),
    linkedTitles: parsed.linkedTitles,
    allowReplacement: Boolean(replacementId),
    ...(check.currentContentHash
      ? { expectedPreviousHash: check.currentContentHash }
      : {}),
  });

  return { status: replacementId ? "replaced" : "created", noteId };
}

export async function embedSearchQuery(query: string, embedder: Embedder): Promise<number[]> {
  const normalized = query.trim();
  if (!normalized) throw new Error("Search query cannot be empty");
  const [embedding] = await embedder.embed([normalized], "query");
  if (!embedding) throw new Error("Missing query embedding");
  return embedding;
}
