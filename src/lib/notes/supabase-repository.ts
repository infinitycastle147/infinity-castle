import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProcessedNoteRepository,
  UploadCheck,
  UploadCheckStatus,
} from "./types";

const UPLOAD_STATUSES = new Set<UploadCheckStatus>([
  "new",
  "unchanged",
  "replacement_required",
  "title_match_unchanged",
  "title_match_changed",
  "id_not_found",
]);

export class SupabaseProcessedNoteRepository implements ProcessedNoteRepository {
  constructor(private readonly client: SupabaseClient) {}

  async checkUpload(
    input: Parameters<ProcessedNoteRepository["checkUpload"]>[0],
  ): Promise<UploadCheck> {
    const { data, error } = await this.client.rpc("check_note_upload", {
      candidate_note_id: input.id ?? null,
      candidate_title: input.title,
      candidate_content_hash: input.contentHash,
    });

    if (error) throw new Error(`Could not inspect upload: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : undefined;
    if (!row || typeof row.upload_status !== "string" ||
      !UPLOAD_STATUSES.has(row.upload_status as UploadCheckStatus)) {
      throw new Error("Database returned an invalid upload status");
    }

    return {
      status: row.upload_status as UploadCheckStatus,
      ...(typeof row.matched_note_id === "string" ? { noteId: row.matched_note_id } : {}),
      ...(typeof row.current_content_hash === "string"
        ? { currentContentHash: row.current_content_hash }
        : {}),
    };
  }

  async save(input: Parameters<ProcessedNoteRepository["save"]>[0]): Promise<string> {
    const { data, error } = await this.client.rpc("save_processed_note", {
      note_title: input.title,
      note_content_md: input.contentMd,
      note_content_hash: input.contentHash,
      note_chunks: input.chunks,
      linked_titles: input.linkedTitles,
      existing_note_id: input.id ?? null,
      allow_replacement: input.allowReplacement,
      expected_previous_hash: input.expectedPreviousHash ?? null,
    });

    if (error) throw new Error(`Could not save note: ${error.message}`);
    if (typeof data !== "string") throw new Error("Database did not return a note id");
    return data;
  }
}
