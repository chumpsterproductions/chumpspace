import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getDiscordUsername } from "@/lib/auth";

function parseRequestCookies(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return {
          name: part,
          value: "",
        };
      }

      return {
        name: part.slice(0, separatorIndex),
        value: decodeURIComponent(part.slice(separatorIndex + 1)),
      };
    }) ?? [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const response = NextResponse.redirect(new URL(next, request.url));

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return parseRequestCookies(request);
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );

  if (code != null) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error != null) {
      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, request.url));
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email != null) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata.full_name ?? user.email.split("@")[0],
        avatar_url: user.user_metadata.avatar_url ?? null,
        discord_username: getDiscordUsername(user),
      });
    }
  }

  return response;
}
