"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "../lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button className="text-button" disabled={busy} onClick={async () => {
      setBusy(true);
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    }} type="button">
      {busy ? "Closing gate…" : "Seal the gate"}
    </button>
  );
}
