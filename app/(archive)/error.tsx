"use client";

import Link from "next/link";

export default function ArchiveError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page narrow"><div className="panel"><div className="panel-body"><span className="eyebrow">A closed door</span><h1 className="page-title">Unable to open the archive</h1><p className="page-deck">Your pages could not be loaded. Try opening the door again.</p><div className="action-row"><button className="button primary" onClick={reset}>Try again</button><Link href="/pages" className="button">Back to pages</Link></div></div></div></div>;
}
