import type { Metadata } from "next";

import { ArchiveViews } from "../../../src/components/archive-views";
import { getArchive } from "../../../src/lib/notes/archive";
import { PageList } from "./page-list";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesPage() {
  const { pages, edges } = await getArchive();
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">The archive · page by page</span>
          <h1 className="page-title">Your collected <span className="accent">pages</span></h1>
          <p className="page-deck">A quiet place to find a thought, pick up a thread, or begin another.</p>
        </div>
        <ArchiveViews active="pages" />
      </header>
      <PageList pages={pages} edges={edges} />
    </div>
  );
}
