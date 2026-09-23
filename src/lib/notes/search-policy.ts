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
