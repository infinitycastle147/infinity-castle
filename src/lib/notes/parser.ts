import matter from "gray-matter";

import type { ParsedNote } from "./types";

const WIKILINK_PATTERN = /\[\[([^\[\]]+?)\]\]/g;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function inferTitle(content: string, frontmatter: Record<string, unknown>): string {
  if (typeof frontmatter.title === "string" && frontmatter.title.trim()) {
    return frontmatter.title.trim();
  }

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (match?.[1]) return match[1].trim();
  }

  throw new Error("A note needs a frontmatter title or an H1 heading");
}

function extractLinkedTitles(content: string): string[] {
  const links = new Map<string, string>();

  for (const match of content.matchAll(WIKILINK_PATTERN)) {
    const rawTarget = match[1]?.split("|", 1)[0]?.split("#", 1)[0]?.trim();
    if (rawTarget) links.set(rawTarget.toLocaleLowerCase(), rawTarget);
  }

  return [...links.values()];
}

export function parseNote(
  markdown: string,
  options: { title?: string } = {},
): ParsedNote {
  const parsed = matter(markdown);
  const frontmatter = parsed.data as Record<string, unknown>;
  const title = options.title?.trim() || inferTitle(parsed.content, frontmatter);
  const rawSourceId = frontmatter.id;

  if (rawSourceId !== undefined && (
    typeof rawSourceId !== "string" || !UUID_PATTERN.test(rawSourceId)
  )) {
    throw new Error("Frontmatter id must be a valid UUID");
  }

  return {
    title,
    contentMd: markdown,
    bodyMd: parsed.content,
    frontmatter,
    ...(typeof rawSourceId === "string" ? { sourceId: rawSourceId.toLowerCase() } : {}),
    linkedTitles: extractLinkedTitles(parsed.content),
  };
}

export function addNoteIdToMarkdown(markdown: string, noteId: string): string {
  if (!UUID_PATTERN.test(noteId)) throw new Error("noteId must be a valid UUID");
  const parsed = matter(markdown);
  return matter.stringify(parsed.content, { ...parsed.data, id: noteId });
}
