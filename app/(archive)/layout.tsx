import { redirect } from "next/navigation";

import { AppShell } from "../../src/components/app-shell";
import { createClient } from "../../src/lib/supabase/server";

export default async function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { count } = await supabase.from("notes").select("id", { count: "exact", head: true });
  return <AppShell user={authData.user} noteCount={count ?? 0}>{children}</AppShell>;
}
