import matter from "gray-matter";

import type { ParsedNote } from "./types";

const WIKILINK_PATTERN = /\[\[([^\[\]]+?)\]\]/g;
const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const DEFAULT_MAX_CHUNK_CHARS = 1800;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTACHMENT_IMAGE_PATTERN = /!\[[^\]]*\]\(attachment:[0-9a-f-]{36}(?:\s+["'][^"']*["'])?\)/gi;

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

function splitLongText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const pieces: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars + 1);
    const sentenceBreak = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
    );
    const whitespaceBreak = window.lastIndexOf(" ");
    const cutAt = sentenceBreak >= Math.floor(maxChars * 0.55)
      ? sentenceBreak + 1
      : whitespaceBreak >= Math.floor(maxChars * 0.55)
        ? whitespaceBreak
        : maxChars;

    pieces.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  if (remaining) pieces.push(remaining);
  return pieces;
}

function chunkMarkdown(content: string, title: string, maxChars: number): string[] {
  // Positional attachment markers belong in the note but carry no useful text
  // for semantic search, so they never enter the embedding input.
  content = content.replace(ATTACHMENT_IMAGE_PATTERN, "");
  const chunks: string[] = [];
  const headingStack: string[] = [];
  let paragraph: string[] = [];
  let inFence = false;

  const headingContext = () => headingStack.join(" > ");
  const flush = () => {
    const body = paragraph.join("\n").trim();
    paragraph = [];
    if (!body) return;

    const prefix = headingContext();
    const available = Math.max(200, maxChars - (prefix ? prefix.length + 2 : 0));
    for (const piece of splitLongText(body, available)) {
      chunks.push(prefix ? `${prefix}\n\n${piece}` : piece);
    }
  };

  for (const line of content.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      paragraph.push(line);
      inFence = !inFence;
      continue;
    }

    if (!inFence) {
      const heading = line.match(HEADING_PATTERN);
      if (heading?.[1] && heading[2]) {
        flush();
        const level = heading[1].length;
        headingStack.length = level - 1;
        headingStack[level - 1] = heading[2].trim();
        continue;
      }

      if (!line.trim()) {
        flush();
        continue;
      }
    }

    paragraph.push(line);
  }

  flush();
  return chunks.length ? chunks : [title];
}

export function parseNote(
  markdown: string,
  options: { title?: string; maxChunkChars?: number } = {},
): ParsedNote {
  const parsed = matter(markdown);
  const frontmatter = parsed.data as Record<string, unknown>;
  const title = options.title?.trim() || inferTitle(parsed.content, frontmatter);
  const maxChars = options.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS;
  const rawSourceId = frontmatter.id;

  if (maxChars < 200) throw new Error("maxChunkChars must be at least 200");
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
    ...(typeof rawSourceId === "string" ? { sourceId: rawSourceId } : {}),
    chunks: chunkMarkdown(parsed.content, title, maxChars),
    linkedTitles: extractLinkedTitles(parsed.content),
  };
}

export function addNoteIdToMarkdown(markdown: string, noteId: string): string {
  if (!UUID_PATTERN.test(noteId)) throw new Error("noteId must be a valid UUID");
  const parsed = matter(markdown);
  return matter.stringify(parsed.content, { ...parsed.data, id: noteId });
}
