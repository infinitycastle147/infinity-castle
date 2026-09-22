"use client";

import { KeyRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "../../src/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setState("sending");
    const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/search";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });

    if (authError) {
      setError(authError.message);
      setState("idle");
      return;
    }
    setState("sent");
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <span className="eyebrow">Authorized keeper only</span>
      <h2>Open the gate</h2>
      <p>No password. A one-use passage will arrive in your inbox.</p>
      <div className="field">
        <label htmlFor="email">Keeper address</label>
        <input className="input" id="email" type="email" autoComplete="email" required
          placeholder="you@domain.com" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      {state === "sent" && <p className="notice success" role="status">Passage sent. Check your inbox.</p>}
      <div className="action-row">
        <span className="note-meta">Signup is sealed</span>
        <button className="button primary" disabled={state !== "idle"} type="submit">
          <KeyRound /> {state === "sending" ? "Sending…" : state === "sent" ? "Sent" : "Send passage"}
        </button>
      </div>
    </form>
  );
}
