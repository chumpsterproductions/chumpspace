import { NextRequest, NextResponse } from "next/server";

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractTitle(html: string, hostname: string) {
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);

  if (ogTitleMatch?.[1] != null) {
    return decodeEntities(ogTitleMatch[1].trim());
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (titleMatch?.[1] != null) {
    const collapsed = titleMatch[1].replace(/\s+/g, " ").trim();
    return decodeEntities(collapsed.length > 0 ? collapsed : hostname);
  }

  return hostname;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") ?? "";

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "invalid protocol" }, { status: 400 });
    }

    const fallback = {
      title: parsed.hostname,
      href: parsed.toString(),
      hostname: parsed.hostname,
      favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(parsed.origin)}`,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const response = await fetch(parsed.toString(), {
        headers: {
          "user-agent": "chumpspace-link-preview/1.0",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);

      if (response.ok == false) {
        return NextResponse.json(fallback, { status: 200 });
      }

      const html = await response.text();

      return NextResponse.json(
        {
          ...fallback,
          title: extractTitle(html, fallback.hostname),
        },
        { status: 200 },
      );
    } catch {
      return NextResponse.json(fallback, { status: 200 });
    }
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
}
