const SHORT_QUERY_THRESHOLD = 0.72;
const STANDARD_QUERY_THRESHOLD = 0.62;

/**
 * Short searches have very little semantic context, so their nearest vector
 * neighbours need substantially stronger evidence than a phrase or question.
 * Exact lexical matches are handled independently by the SQL search function.
 */
export function semanticMatchThreshold(query: string): number {
  const terms = query.trim().match(/[\p{L}\p{N}]+/gu) ?? [];
  return terms.length <= 2 ? SHORT_QUERY_THRESHOLD : STANDARD_QUERY_THRESHOLD;
}

/**
 * Keep the highest-ranked match for each note. The search RPC already returns
 * results in relevance order, so retaining the first match also retains the
 * best chunk to use as that page's preview.
 *
 * This is a defensive fallback for clients connected to a database that has
 * not applied the page-level search migration yet.
 */
export function uniquePageResults<T extends { note_id: string }>(
  results: readonly T[],
): T[] {
  const seenNoteIds = new Set<string>();
  return results.filter((result) => {
    if (seenNoteIds.has(result.note_id)) return false;
    seenNoteIds.add(result.note_id);
    return true;
  });
}
