"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeDiscordUsername } from "@/lib/utils";

function getDiscordUsername(user: {
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

async function requireActor() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null || user.email == null) {
    throw new Error("You must be signed in.");
  }

  return { supabase, user };
}

export async function updateProfileAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const { supabase, user } = await requireActor();
  const email = user.email as string;

  await supabase.from("profiles").upsert({
    id: user.id,
    email,
    full_name: fullName,
    avatar_url: user.user_metadata.avatar_url ?? null,
    discord_username: getDiscordUsername(user),
  });

  revalidatePath("/dashboard");
}

export async function uploadAvatarAction(formData: FormData) {
  const file = formData.get("avatar");
  const { supabase, user } = await requireActor();
  const email = user.email as string;

  if ((file instanceof File) == false || file.size === 0) {
    throw new Error("Choose an avatar image first.");
  }

  const extension = file.name.split(".").pop() ?? "png";
  const path = `avatars/${user.id}.${extension}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error != null) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("media").getPublicUrl(path);

  await supabase.from("profiles").upsert({
    id: user.id,
    email,
    full_name: user.user_metadata.full_name ?? email.split("@")[0],
    avatar_url: publicUrl,
    discord_username: getDiscordUsername(user),
  });

  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}
