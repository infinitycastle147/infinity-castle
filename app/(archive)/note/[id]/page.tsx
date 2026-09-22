import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "../../../../src/lib/supabase/server";
import { NoteWorkbench } from "./workbench";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ?? "Missing note" };
}

export default async function NotePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content_md, created_at, updated_at")
    .eq("id", id)
    .single();
  if (error || !data) notFound();

  const updatedAt = String(data.updated_at);

  return (
    <div className="page">
      <NoteWorkbench note={{
        id: String(data.id),
        title: String(data.title),
        contentMd: String(data.content_md),
        createdAt: String(data.created_at),
        updatedAt,
        updatedAtLabel: new Date(updatedAt).toLocaleString(),
      }} />
    </div>
  );
}
