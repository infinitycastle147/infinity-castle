import { describe, expect, it, vi } from "vitest";

import { saveMarkdownNote } from "../src/lib/notes/service";
import type { NoteRepository, UploadCheck } from "../src/lib/notes/types";

describe("note service", () => {
  it("saves Markdown and wikilinks without derived index data", async () => {
    const repository: NoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({ status: "new" })),
      save: vi.fn(async () => "note-id"),
    };

    const result = await saveMarkdownNote({
      markdown: "# Test\n\nOne.\n\nTwo with [[Other]].",
      repository,
    });

    expect(result).toEqual({ status: "created", noteId: "note-id" });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test",
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      allowReplacement: false,
      linkedTitles: ["Other"],
    }));
  });

  it("does not save an unchanged upload with a stable frontmatter id", async () => {
    const noteId = "11111111-1111-4111-8111-111111111111";
    const repository: NoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({ status: "unchanged", noteId })),
      save: vi.fn(),
    };

    const result = await saveMarkdownNote({
      markdown: `---\nid: ${noteId}\n---\n# Test\n\nUnchanged.`,
      repository,
    });

    expect(result).toEqual({ status: "unchanged", noteId });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("requires confirmation for a title-only match before replacement", async () => {
    const noteId = "22222222-2222-4222-8222-222222222222";
    const repository: NoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({
        status: "title_match_changed",
        noteId,
        currentContentHash: "a".repeat(64),
      })),
      save: vi.fn(),
    };

    const result = await saveMarkdownNote({ markdown: "# Test\n\nChanged.", repository });

    expect(result).toEqual({
      status: "confirmation_required",
      reason: "title_match_changed",
      noteId,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("replaces a changed note after explicit confirmation", async () => {
    const noteId = "33333333-3333-4333-8333-333333333333";
    const previousHash = "b".repeat(64);
    const repository: NoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({
        status: "replacement_required",
        noteId,
        currentContentHash: previousHash,
      })),
      save: vi.fn(async () => noteId),
    };

    const result = await saveMarkdownNote({
      markdown: `---\nid: ${noteId}\n---\n# Test\n\nChanged.`,
      replaceExisting: true,
      repository,
    });

    expect(result).toEqual({ status: "replaced", noteId });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: noteId,
      allowReplacement: true,
      expectedPreviousHash: previousHash,
    }));
  });

  it("compares route and frontmatter UUIDs case-insensitively", async () => {
    const noteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const repository: NoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({ status: "unchanged", noteId })),
      save: vi.fn(),
    };

    await expect(saveMarkdownNote({
      noteId: noteId.toUpperCase(),
      markdown: `---\nid: ${noteId}\n---\n# Test`,
      repository,
    })).resolves.toEqual({ status: "unchanged", noteId });
    expect(repository.checkUpload).toHaveBeenCalledWith(expect.objectContaining({ id: noteId }));
  });
});
