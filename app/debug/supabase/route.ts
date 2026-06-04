import { NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

function mask(value: string) {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 12)}...${value.slice(-6)}`;
}

export async function GET() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  return NextResponse.json({
    hasUrl: url.length > 0,
    hasKey: key.length > 0,
    url,
    keyPreview: mask(key),
    keySource: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        : "missing",
  });
}
