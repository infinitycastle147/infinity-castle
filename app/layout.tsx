import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/vt323";
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Infinity Castle", template: "%s · Infinity Castle" },
  description: "A private, linked archive for notes that refuse to stay still.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="world-noise" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
