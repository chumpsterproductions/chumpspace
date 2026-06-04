export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export function getConfiguredSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (value != null && value.length > 0) {
    return value.replace(/\/+$/, "");
  }

  return null;
}
