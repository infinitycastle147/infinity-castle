"use client";

import { KeyRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "../../src/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "code" | "verifying">("idle");
  const [error, setError] = useState("");

  async function sendOtp() {
    setError("");
    setState("sending");
    const normalizedEmail = email.trim();
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    });

    if (authError) {
      setError(authError.message);
      setState("idle");
      return;
    }
    setSentEmail(normalizedEmail);
    setOtp("");
    setState("code");
  }

  async function verifyOtp() {
    setError("");
    setState("verifying");
    const { error: authError } = await createClient().auth.verifyOtp({
      email: sentEmail,
      token: otp,
      type: "email",
    });

    if (authError) {
      setError(authError.message);
      setState("code");
      return;
    }

    const requestedNext = searchParams.get("next");
    const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/search";
    router.replace(next);
    router.refresh();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === "code") await verifyOtp();
    else if (state === "idle") await sendOtp();
  }

  function changeEmail() {
    setError("");
    setOtp("");
    setSentEmail("");
    setState("idle");
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <span className="eyebrow">Authorized keeper only</span>
      <h2>Open the gate</h2>
      <p>
        {state === "code" || state === "verifying"
          ? `Enter the one-time code sent to ${sentEmail}.`
          : "No password. A one-time code will arrive in your inbox."}
      </p>
      <div className="field">
        <label htmlFor="email">Keeper address</label>
        <input className="input" id="email" type="email" autoComplete="email" required
          placeholder="you@domain.com" value={email} disabled={state !== "idle"}
          onChange={(event) => setEmail(event.target.value)} />
      </div>
      {(state === "code" || state === "verifying") && (
        <div className="field otp-field">
          <label htmlFor="otp">One-time code</label>
          <input className="input" id="otp" type="text" inputMode="numeric" autoComplete="one-time-code"
            minLength={6} maxLength={10} pattern="[0-9]{6,10}" required autoFocus
            placeholder="123456" value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 10))} />
        </div>
      )}
      {error && <p className="notice error" role="alert">{error}</p>}
      {state === "code" && <p className="notice success" role="status">Code sent. Check your inbox.</p>}
      <div className="action-row">
        {state === "code" || state === "verifying" ? (
          <button className="button quiet" disabled={state === "verifying"} type="button" onClick={changeEmail}>
            Change email
          </button>
        ) : <span className="note-meta">Signup is sealed</span>}
        <button className="button primary" disabled={state === "sending" || state === "verifying"} type="submit">
          <KeyRound /> {state === "sending" ? "Sending…" : state === "verifying" ? "Verifying…" : state === "code" ? "Verify code" : "Send code"}
        </button>
      </div>
    </form>
  );
}
