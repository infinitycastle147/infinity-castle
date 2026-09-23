import { describe, expect, it } from "vitest";

import { assertAttachmentReferences, extractAttachmentIds } from "../src/lib/notes/attachments";

const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";

describe("note attachments", () => {
  it("finds and deduplicates positional attachment markers", () => {
    const markdown = `![First](attachment:${FIRST_ID})\n\n![Again](attachment:${FIRST_ID})`;
    expect(extractAttachmentIds(markdown)).toEqual([FIRST_ID]);
  });

  it("accepts references backed by existing images or current uploads", () => {
    const markdown = `![Old](attachment:${FIRST_ID})\n\n![New](attachment:${SECOND_ID})`;
    const uploads = new Map([[SECOND_ID, {} as File]]);
    expect(() => assertAttachmentReferences(markdown, uploads, [FIRST_ID])).not.toThrow();
  });

  it("rejects a marker that has neither metadata nor an upload", () => {
    const markdown = `![Missing](attachment:${FIRST_ID})`;
    expect(() => assertAttachmentReferences(markdown, new Map())).toThrow(/do not have an attached file/);
  });
});
