import { describe, expect, it } from "vitest";

import { hashParsedNote } from "../src/lib/notes/content-hash";
import { addNoteIdToMarkdown, parseNote } from "../src/lib/notes/parser";

describe("parseNote", () => {
  it("reads frontmatter, chunks paragraphs under headings, and deduplicates wikilinks", () => {
    const note = parseNote(`---
title: Castle Map
tags: [place]
---
# Ignored as title

First paragraph links to [[North Tower]] and [[North Tower|the tower]].

## Gate

Second paragraph links to [[Courtyard#Fountain]].
`);

    expect(note.title).toBe("Castle Map");
    expect(note.frontmatter.tags).toEqual(["place"]);
    expect(note.linkedTitles).toEqual(["North Tower", "Courtyard"]);
    expect(note.chunks).toEqual([
      "Ignored as title\n\nFirst paragraph links to [[North Tower]] and [[North Tower|the tower]].",
      "Ignored as title > Gate\n\nSecond paragraph links to [[Courtyard#Fountain]].",
    ]);
  });

  it("falls back to the H1 for the title", () => {
    const note = parseNote("# A Note\n\nBody text.");
    expect(note.title).toBe("A Note");
  });

  it("keeps fenced code containing blank lines in one paragraph", () => {
    const note = parseNote("# Code\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```");
    expect(note.chunks).toHaveLength(1);
    expect(note.chunks[0]).toContain("const b = 2");
  });

  it("adds a stable id for download without changing the content hash", () => {
    const markdown = "---\ntitle: Test\ntags: [one, two]\n---\nBody.\n";
    const noteId = "44444444-4444-4444-8444-444444444444";
    const exported = addNoteIdToMarkdown(markdown, noteId);
    const reparsed = parseNote(exported);

    expect(reparsed.sourceId).toBe(noteId);
    expect(hashParsedNote(reparsed)).toBe(hashParsedNote(parseNote(markdown)));
  });

  it("normalizes line endings and trailing whitespace when hashing", () => {
    const unix = parseNote("# Test\n\nBody.\n");
    const windows = parseNote("# Test  \r\n\r\nBody.  \r\n");
    expect(hashParsedNote(windows)).toBe(hashParsedNote(unix));
  });
});
