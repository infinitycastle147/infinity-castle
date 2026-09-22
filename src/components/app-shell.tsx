import type { User } from "@supabase/supabase-js";

import { Archive, Map, Search, SquarePen } from "lucide-react";

import { NavLink } from "./nav-link";
import { SignOutButton } from "./sign-out-button";

export function AppShell({ children, user, noteCount }: {
  children: React.ReactNode;
  user: User;
  noteCount: number;
}) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sigil">
          <div className="sigil-mark" aria-hidden="true">∞</div>
          <div className="sigil-copy">
            <strong>INFINITY CASTLE</strong>
            <span>private archive</span>
          </div>
        </div>
        <span className="nav-label">Choose a chamber</span>
        <nav className="nav-list" aria-label="Primary navigation">
          <NavLink href="/search" label="Seek" icon={<Search />} />
          <NavLink href="/new" label="Inscribe" icon={<SquarePen />} />
          <NavLink href="/graph" label="Atlas" icon={<Map />} />
        </nav>
        <div className="sidebar-foot">
          <div className="system-readout">
            <span>archive</span><strong>online</strong>
            <span>memories</span><strong>{String(noteCount).padStart(3, "0")}</strong>
          </div>
          <div className="user-email"><Archive size={11} /> {user.email}</div>
          <SignOutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
