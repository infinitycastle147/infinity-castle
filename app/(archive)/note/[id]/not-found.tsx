import Link from "next/link";

export default function NoteNotFound() {
  return <div className="page narrow"><div className="empty"><div><span className="empty-glyph">404</span><p>This room has fallen out of the map.</p><Link className="button" href="/graph">Return to atlas</Link></div></div></div>;
}
