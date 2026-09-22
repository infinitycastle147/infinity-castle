export const EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingTask = "document" | "query";

export interface ParsedNote {
  title: string;
  contentMd: string;
  bodyMd: string;
  frontmatter: Record<string, unknown>;
  sourceId?: string;
  chunks: string[];
  linkedTitles: string[];
}

export interface EmbeddedChunk {
  content: string;
  embedding: number[];
}

export interface Embedder {
  embed(texts: string[], task: EmbeddingTask): Promise<number[][]>;
}

export interface ProcessedNoteRepository {
  checkUpload(input: {
    id?: string;
    title: string;
    contentHash: string;
  }): Promise<UploadCheck>;
  save(input: {
    id?: string;
    title: string;
    contentMd: string;
    contentHash: string;
    chunks: EmbeddedChunk[];
    linkedTitles: string[];
    allowReplacement: boolean;
    expectedPreviousHash?: string;
  }): Promise<string>;
}

export type UploadCheckStatus =
  | "new"
  | "unchanged"
  | "replacement_required"
  | "title_match_unchanged"
  | "title_match_changed"
  | "id_not_found";

export interface UploadCheck {
  status: UploadCheckStatus;
  noteId?: string;
  currentContentHash?: string;
}

export type SaveMarkdownResult =
  | { status: "created" | "replaced" | "unchanged"; noteId: string }
  | {
      status: "confirmation_required";
      reason: Exclude<UploadCheckStatus, "new" | "unchanged">;
      noteId?: string;
    };
