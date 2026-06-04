import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getConfiguredSiteUrl,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const configuredSiteUrl = getConfiguredSiteUrl();
  const origin = configuredSiteUrl ?? `${protocol}://${host}`;
  const response = new NextResponse(null, {
    status: 302,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
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
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error != null || data.url == null) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error?.message ?? "Unable to start Discord sign-in.")}`, origin));
  }

  response.headers.set("location", data.url);
  return response;
}
