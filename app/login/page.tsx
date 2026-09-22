import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Enter" };

export default function LoginPage() {
  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="castle-glyph" aria-hidden="true">♜</div>
        <div className="login-claim">
          <span className="eyebrow">Archive node · 01</span>
          <h1>INFINITY <span>CASTLE</span></h1>
          <p>A private map of ideas, passages, and the hidden doors between them.</p>
        </div>
      </section>
      <section className="login-form-wrap">
        <Suspense fallback={<div className="login-form"><span className="eyebrow">Waking the gate…</span></div>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
