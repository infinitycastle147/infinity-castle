import { NextResponse } from "next/server";

import { apiError, authenticatedClient } from "../../../../../src/lib/api";
import { addNoteIdToMarkdown } from "../../../../../src/lib/notes/parser";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const { data, error } = await auth.supabase
      .from("notes")
      .select("title, content_md")
      .eq("id", id)
      .single();
    if (error || !data) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const filename = `${String(data.title).replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "note"}.md`;
    return new NextResponse(addNoteIdToMarkdown(String(data.content_md), id), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Could not export note");
  }
}
