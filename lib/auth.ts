import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeDiscordUsername } from "@/lib/utils";

export function getDiscordUsername(user: {
  app_metadata?: { provider?: string };
  user_metadata?: Record<string, any>;
}) {
  if (user.app_metadata?.provider !== "discord") {
    return null;
  }

  const candidate =
    user.user_metadata?.preferred_username ??
    user.user_metadata?.user_name ??
    user.user_metadata?.username ??
    null;

  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return null;
  }

  return normalizeDiscordUsername(candidate);
}

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  const user = await getSessionUser();

  if (user == null) {
    redirect("/");
  }

  return user;
}

export async function syncProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null || user.email == null) {
    return null;
  }

  const email = user.email;

  await supabase.from("profiles").upsert({
    id: user.id,
    email,
    full_name: user.user_metadata.full_name ?? email.split("@")[0],
    avatar_url: user.user_metadata.avatar_url ?? null,
    discord_username: getDiscordUsername(user),
  });

  return user;
}
