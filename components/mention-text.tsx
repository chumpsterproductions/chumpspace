"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe } from "lucide-react";
import { parseRichText } from "@/lib/utils";

type LinkPreview = {
  favicon: string;
  href: string;
  hostname: string;
  title: string;
};

const previewCache = new Map<string, LinkPreview>();

function fallbackPreview(url: string): LinkPreview {
  try {
    const parsed = new URL(url);
    return {
      title: parsed.hostname,
      href: url,
      hostname: parsed.hostname,
      favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(parsed.origin)}`,
    };
  } catch {
    return {
      title: url,
      href: url,
      hostname: url,
      favicon: "",
    };
  }
}

function LinkChip({ url }: { url: string }) {
  const initialPreview = useMemo(() => previewCache.get(url) ?? fallbackPreview(url), [url]);
  const [preview, setPreview] = useState<LinkPreview>(initialPreview);

  useEffect(() => {
    const cached = previewCache.get(url);

    if (cached != null) {
      setPreview(cached);
      return;
    }

    let isActive = true;

    void fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { cache: "no-store" })
      .then(async (response) => {
        if (response.ok == false) {
          throw new Error("preview request failed");
        }

        return response.json() as Promise<LinkPreview>;
      })
      .then((nextPreview) => {
        if (isActive == false) {
          return;
        }

        previewCache.set(url, nextPreview);
        setPreview(nextPreview);
      })
      .catch(() => {
        if (isActive == false) {
          return;
        }

        const fallback = fallbackPreview(url);
        previewCache.set(url, fallback);
        setPreview(fallback);
      });

    return () => {
      isActive = false;
    };
  }, [url]);

  return (
    <a
      href={preview.href}
      target="_blank"
      rel="noreferrer"
      title={preview.href}
      className="my-1 inline-flex max-w-full items-center gap-2 border border-[#7ea6ff] bg-[#7ea6ff]/10 px-2.5 py-1 text-[#a9c0ff] transition hover:border-[#a9c0ff] hover:bg-[#7ea6ff]/16"
    >
      {preview.favicon.length > 0 ? (
        <img src={preview.favicon} alt="" className="h-4 w-4 shrink-0" />
      ) : (
        <Globe className="h-4 w-4 shrink-0" />
      )}
      <span className="truncate">{preview.title}</span>
    </a>
  );
}

export function MentionText({ text }: { text: string }) {
  const parts = useMemo(() => parseRichText(text), [text]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part) => {
        if (part.type === "mention") {
          return (
            <span key={part.id} className="mention">
              {part.value}
            </span>
          );
        }

        if (part.type === "link") {
          return <LinkChip key={part.id} url={part.value} />;
        }

        return <span key={part.id}>{part.value}</span>;
      })}
    </span>
  );
}
