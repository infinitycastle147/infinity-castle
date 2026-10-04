import Link from "next/link";
import { List, Network, Plus } from "lucide-react";

export function ArchiveViews({ active }: { active: "pages" | "graph" }) {
  return (
    <div className="archive-actions">
      <nav className="view-switch" aria-label="Archive view">
        <Link href="/pages" aria-current={active === "pages" ? "page" : undefined}><List size={15} /> List</Link>
        <Link href="/graph" aria-current={active === "graph" ? "page" : undefined}><Network size={15} /> Graph</Link>
      </nav>
      <Link href="/new" className="button primary"><Plus /> New page</Link>
    </div>
  );
}
