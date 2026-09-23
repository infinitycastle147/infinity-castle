import { isAttachmentId, validateImageFile } from "./attachments";

export type NoteRequest = {
  markdown: string;
  title?: string;
  replaceExisting: boolean;
  createAsNew: boolean;
  attachments: Map<string, File>;
};

export async function readNoteRequest(request: Request): Promise<NoteRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    const body = await request.json() as {
      markdown?: unknown;
      title?: unknown;
      replaceExisting?: unknown;
      createAsNew?: unknown;
    };
    return {
      markdown: typeof body.markdown === "string" ? body.markdown : "",
      ...(typeof body.title === "string" && body.title.trim() ? { title: body.title.trim() } : {}),
      replaceExisting: body.replaceExisting === true,
      createAsNew: body.createAsNew === true,
      attachments: new Map(),
    };
  }

  const form = await request.formData();
  const markdown = form.get("markdown");
  const title = form.get("title");
  const attachments = new Map<string, File>();
  form.forEach((value, key) => {
    if (!key.startsWith("attachment:") || !(value instanceof File)) return;
    const id = key.slice("attachment:".length).toLowerCase();
    if (!isAttachmentId(id)) throw new Error("An image has an invalid attachment ID");
    validateImageFile(value);
    attachments.set(id, value);
  });

  return {
    markdown: typeof markdown === "string" ? markdown : "",
    ...(typeof title === "string" && title.trim() ? { title: title.trim() } : {}),
    replaceExisting: form.get("replaceExisting") === "true",
    createAsNew: form.get("createAsNew") === "true",
    attachments,
  };
}
