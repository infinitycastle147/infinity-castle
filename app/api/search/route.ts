import { NextResponse } from "next/server";

import { apiError, authenticatedClient } from "../../../src/lib/api";
import { GeminiEmbedder } from "../../../src/lib/notes/gemini-embedder";
import { embedSearchQuery } from "../../../src/lib/notes/service";

export const runtime = "nodejs";

// Keep weak semantic matches out of the result list while retaining room for
// up to five strong matches.
const SEARCH_MATCH_THRESHOLD = 0.5;

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as { query?: unknown; threshold?: unknown };
    if (typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }
    if (body.query.length > 500) {
      return NextResponse.json({ error: "Search query is too long" }, { status: 400 });
    }
    const threshold = typeof body.threshold === "number"
      ? Math.max(-1, Math.min(1, body.threshold))
      : SEARCH_MATCH_THRESHOLD;
    const embedding = await embedSearchQuery(body.query, new GeminiEmbedder());
    const { data, error } = await auth.supabase.rpc("hybrid_search", {
      query_text: body.query,
      query_embedding: embedding,
      match_threshold: threshold,
      vector_weight: 0.55,
      text_weight: 0.45,
      rrf_k: 60,
    });
    if (error) throw error;
    return NextResponse.json({ results: data ?? [] });
  } catch (error) {
    return apiError(error, "Search failed");
  }
}
