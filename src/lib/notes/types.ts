export interface ParsedNote {
  title: string;
  contentMd: string;
  bodyMd: string;
  frontmatter: Record<string, unknown>;
  sourceId?: string;
  linkedTitles: string[];
}

export interface NoteRepository {
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
