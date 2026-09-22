import { NextResponse } from "next/server";

import { GeminiEmbedder } from "../../../src/lib/notes/gemini-embedder";
import { saveMarkdownNote } from "../../../src/lib/notes/service";
import { SupabaseProcessedNoteRepository } from "../../../src/lib/notes/supabase-repository";
import { apiError, authenticatedClient } from "../../../src/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as {
      markdown?: unknown;
      title?: unknown;
      replaceExisting?: unknown;
      createAsNew?: unknown;
    };
    if (typeof body.markdown !== "string" || !body.markdown.trim()) {
      return NextResponse.json({ error: "Markdown content is required" }, { status: 400 });
    }
    if (body.markdown.length > 1_000_000) {
      return NextResponse.json({ error: "Notes must be smaller than 1 MB" }, { status: 413 });
    }

    const result = await saveMarkdownNote({
      markdown: body.markdown,
      ...(typeof body.title === "string" && body.title.trim() ? { title: body.title } : {}),
      replaceExisting: body.replaceExisting === true,
      ignoreSourceId: body.createAsNew === true,
      embedder: new GeminiEmbedder(),
      repository: new SupabaseProcessedNoteRepository(auth.supabase),
    });

    if (result.status === "confirmation_required") {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result, { status: result.status === "created" ? 201 : 200 });
  } catch (error) {
    return apiError(error, "Could not save note");
  }
}
