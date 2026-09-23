import { NextResponse } from "next/server";

import { apiError, authenticatedClient } from "../../../../src/lib/api";
import { GeminiEmbedder } from "../../../../src/lib/notes/gemini-embedder";
import { saveMarkdownNote } from "../../../../src/lib/notes/service";
import { SupabaseProcessedNoteRepository } from "../../../../src/lib/notes/supabase-repository";
import {
  assertAttachmentReferences,
  getNoteAttachments,
  removeAllNoteAttachments,
  syncNoteAttachments,
} from "../../../../src/lib/notes/attachments";
import { readNoteRequest } from "../../../../src/lib/notes/request";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = await readNoteRequest(request);
    if (!body.markdown.trim()) {
      return NextResponse.json({ error: "Markdown content is required" }, { status: 400 });
    }
    if (body.markdown.length > 1_000_000) {
      return NextResponse.json({ error: "Notes must be smaller than 1 MB" }, { status: 413 });
    }
    const currentAttachments = await getNoteAttachments(auth.supabase, id);
    assertAttachmentReferences(
      body.markdown,
      body.attachments,
      currentAttachments.map((attachment) => attachment.id),
    );

    const result = await saveMarkdownNote({
      noteId: id,
      markdown: body.markdown,
      ...(body.title ? { title: body.title } : {}),
      replaceExisting: true,
      embedder: new GeminiEmbedder(),
      repository: new SupabaseProcessedNoteRepository(auth.supabase),
    });
    if (result.status === "confirmation_required") {
      return NextResponse.json(result, { status: 409 });
    }
    await syncNoteAttachments({
      client: auth.supabase,
      userId: auth.user.id,
      noteId: result.noteId,
      markdown: body.markdown,
      uploads: body.attachments,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "Could not update note");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    await removeAllNoteAttachments(auth.supabase, id);
    const { error } = await auth.supabase.from("notes").delete().eq("id", id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, "Could not delete note");
  }
}
