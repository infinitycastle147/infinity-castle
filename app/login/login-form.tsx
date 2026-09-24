"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "../../src/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSigningIn(true);

    const { data, error: authError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.code === "invalid_credentials"
        ? "The email or password is incorrect."
        : authError.message);
      setIsSigningIn(false);
      return;
    }

    if (!data.session) {
      setError("Sign-in succeeded, but no session was created. Please try again.");
      setIsSigningIn(false);
      return;
    }

    const requestedNext = searchParams.get("next");
    const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/search";
    router.replace(next);
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit} aria-busy={isSigningIn}>
      <span className="eyebrow">Authorized keeper only</span>
      <h2>Open the gate</h2>
      <p>Enter your keeper credentials. No email or external mail provider is required.</p>
      <div className="field">
        <label htmlFor="email">Keeper address</label>
        <input className="input" id="email" type="email" autoComplete="email" required
          placeholder="you@domain.com" value={email} disabled={isSigningIn}
          onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="password-input">
          <input className="input" id="password" type={showPassword ? "text" : "password"}
            autoComplete="current-password" required disabled={isSigningIn}
            placeholder="Enter your password" value={password}
            onChange={(event) => setPassword(event.target.value)} />
          <button type="button" disabled={isSigningIn} aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}>
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="action-row">
        <span className="note-meta">Signup is sealed</span>
        <button className="button primary" disabled={isSigningIn} type="submit">
          <KeyRound /> {isSigningIn ? "Opening…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
