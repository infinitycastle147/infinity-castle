import type { Metadata } from "next";

import { SearchConsole } from "./search-console";

export const metadata: Metadata = { title: "Seek" };

export default function SearchPage() {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Hybrid divination · text + meaning</span>
          <h1 className="page-title">Seek the <span className="accent">archive</span></h1>
          <p className="page-deck">Ask plainly. The castle listens for exact words and nearby ideas.</p>
        </div>
      </header>
      <SearchConsole />
    </div>
  );
}
