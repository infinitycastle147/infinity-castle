import { createHash } from "node:crypto";

import type { ParsedNote } from "./types";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()
    .concat("\n");
}

export function hashParsedNote(note: ParsedNote): string {
  const contentFrontmatter = Object.fromEntries(
    Object.entries(note.frontmatter).filter(([key]) => key !== "id"),
  );
  const canonicalContent = JSON.stringify({
    // The effective title can come from the editor rather than frontmatter or
    // an H1, so it must participate in identity and change detection.
    title: note.title,
    frontmatter: canonicalize(contentFrontmatter),
    body: normalizeMarkdown(note.bodyMd),
  });

  return createHash("sha256").update(canonicalContent, "utf8").digest("hex");
}
