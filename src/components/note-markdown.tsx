"use client";

import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

export type DisplayAttachment = {
  id: string;
  fileName: string;
  url: string;
};

export function displayMarkdown(markdown: string) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

export function NoteMarkdown({
  markdown,
  attachments,
}: {
  markdown: string;
  attachments: DisplayAttachment[];
}) {
  const attachmentById = new Map(attachments.map((attachment) => [attachment.id, attachment]));

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url, key, node) => {
        if (key === "src" && node.tagName === "img" && /^attachment:[0-9a-f-]{36}$/i.test(url)) {
          return url;
        }
        return defaultUrlTransform(url);
      }}
      components={{
        img({ src, alt }) {
          if (typeof src !== "string" || !src) return null;
          if (src.startsWith("attachment:")) {
            const attachment = attachmentById.get(src.slice("attachment:".length).toLowerCase());
            if (!attachment) {
              return <span className="missing-image">Image unavailable · {alt || "untitled"}</span>;
            }
            return (
              // Signed Storage URLs are intentionally rendered without image optimization.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="note-image" src={attachment.url} alt={alt || attachment.fileName} loading="lazy" />
            );
          }
          return (
            // Markdown can also contain ordinary remote image URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="note-image" src={src} alt={alt || ""} loading="lazy" />
          );
        },
      }}
    >
      {displayMarkdown(markdown)}
    </Markdown>
  );
}
