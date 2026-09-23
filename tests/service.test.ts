import { describe, expect, it, vi } from "vitest";

import { embedSearchQuery, saveMarkdownNote } from "../src/lib/notes/service";
import type {
  Embedder,
  ProcessedNoteRepository,
  UploadCheck,
} from "../src/lib/notes/types";

describe("note service", () => {
  it("embeds parsed chunks and sends one processed payload to the repository", async () => {
    const embedder: Embedder = {
      embed: vi.fn(async (texts, task) => {
        expect(task).toBe("document");
        return texts.map(() => [0.1, 0.2]);
      }),
    };
    const repository: ProcessedNoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({ status: "new" })),
      save: vi.fn(async () => "note-id"),
    };

    const result = await saveMarkdownNote({
      markdown: "# Test\n\nOne.\n\nTwo with [[Other]].",
      embedder,
      repository,
    });

    expect(result).toEqual({ status: "created", noteId: "note-id" });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test",
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      allowReplacement: false,
      linkedTitles: ["Other"],
      chunks: [
        { content: "Test\n\nOne.", embedding: [0.1, 0.2] },
        { content: "Test\n\nTwo with [[Other]].", embedding: [0.1, 0.2] },
      ],
    }));
  });

  it("does not re-embed an unchanged upload with a stable frontmatter id", async () => {
    const noteId = "11111111-1111-4111-8111-111111111111";
    const embedder: Embedder = { embed: vi.fn() };
    const repository: ProcessedNoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({ status: "unchanged", noteId })),
      save: vi.fn(),
    };

    const result = await saveMarkdownNote({
      markdown: `---\nid: ${noteId}\n---\n# Test\n\nUnchanged.`,
      embedder,
      repository,
    });

    expect(result).toEqual({ status: "unchanged", noteId });
    expect(embedder.embed).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("requires confirmation for a title-only match before replacement", async () => {
    const noteId = "22222222-2222-4222-8222-222222222222";
    const embedder: Embedder = { embed: vi.fn() };
    const repository: ProcessedNoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({
        status: "title_match_changed",
        noteId,
        currentContentHash: "a".repeat(64),
      })),
      save: vi.fn(),
    };

    const result = await saveMarkdownNote({
      markdown: "# Test\n\nChanged.",
      embedder,
      repository,
    });

    expect(result).toEqual({
      status: "confirmation_required",
      reason: "title_match_changed",
      noteId,
    });
    expect(embedder.embed).not.toHaveBeenCalled();
  });

  it("replaces a changed note after explicit confirmation", async () => {
    const noteId = "33333333-3333-4333-8333-333333333333";
    const previousHash = "b".repeat(64);
    const embedder: Embedder = { embed: vi.fn(async () => [[0.1, 0.2]]) };
    const repository: ProcessedNoteRepository = {
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
      embedder,
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
    const repository: ProcessedNoteRepository = {
      checkUpload: vi.fn(async (): Promise<UploadCheck> => ({ status: "unchanged", noteId })),
      save: vi.fn(),
    };

    await expect(saveMarkdownNote({
      noteId: noteId.toUpperCase(),
      markdown: `---\nid: ${noteId}\n---\n# Test`,
      embedder: { embed: vi.fn() },
      repository,
    })).resolves.toEqual({ status: "unchanged", noteId });
    expect(repository.checkUpload).toHaveBeenCalledWith(expect.objectContaining({ id: noteId }));
  });

  it("uses the retrieval-query task for search", async () => {
    const embedder: Embedder = {
      embed: vi.fn(async () => [[0.3, 0.4]]),
    };
    await expect(embedSearchQuery("  castle  ", embedder)).resolves.toEqual([0.3, 0.4]);
    expect(embedder.embed).toHaveBeenCalledWith(["castle"], "query");
  });
});
