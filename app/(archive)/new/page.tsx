import type { Metadata } from "next";

import { NewNoteWorkbench } from "./workbench";

export const metadata: Metadata = { title: "Inscribe" };

export default function NewNotePage() {
  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <span className="eyebrow">New memory · blank room</span>
          <h1 className="page-title">Inscribe a <span className="accent">passage</span></h1>
          <p className="page-deck">Write here or recover a Markdown file. Links in double brackets become doors.</p>
        </div>
      </header>
      <NewNoteWorkbench />
    </div>
  );
}
