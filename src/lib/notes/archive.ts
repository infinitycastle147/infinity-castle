import { createClient } from "../supabase/server";

export type ArchivePage = { id: string; title: string; createdAt: string; updatedAt: string };

export async function getArchive() {
  const supabase = await createClient();
  // Range through the archive so Supabase's default row limit cannot hide pages.
  const readNotes = async () => {
    const result: ArchivePage[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("notes")
        .select("id, title, created_at, updated_at").order("id").range(offset, offset + 499);
      if (error) throw new Error("Could not load your pages. Please try again.");
      result.push(...(data ?? []).map((note) => ({ id: String(note.id), title: String(note.title), createdAt: String(note.created_at), updatedAt: String(note.updated_at) })));
      if (!data || data.length < 500) return result;
    }
  };
  const readEdges = async () => {
    const result: { source: string; target: string }[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("edges").select("note_id, linked_note_id")
        .order("note_id").order("linked_note_id").range(offset, offset + 499);
      if (error) throw new Error("Could not load your connections. Please try again.");
      result.push(...(data ?? []).map((edge) => ({ source: String(edge.note_id), target: String(edge.linked_note_id) })));
      if (!data || data.length < 500) return result;
    }
  };
  const [pages, edges] = await Promise.all([readNotes(), readEdges()]);
  return { pages, edges };
}
