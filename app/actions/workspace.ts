"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getConfiguredSiteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeDiscordUsername, slugify } from "@/lib/utils";

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

async function requireWorkspaceMemberProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null || user.email == null) {
    throw new Error("You must be signed in.");
  }

  const email = user.email;

  await supabase.from("profiles").upsert({
    id: user.id,
    email,
    full_name: user.user_metadata.full_name ?? email.split("@")[0],
    avatar_url: user.user_metadata.avatar_url ?? null,
    discord_username: getDiscordUsername(user),
  });

  return { supabase, user, email };
}

async function requireWorkspaceOwner(workspaceId: string) {
  const actor = await requireWorkspaceMemberProfile();
  const { data: workspace } = await actor.supabase
    .from("workspaces")
    .select("id, owner_id")
    .eq("id", workspaceId)
    .single();

  if (workspace == null || workspace.owner_id !== actor.user.id) {
    throw new Error("Only the workspace owner can do that.");
  }

  return actor;
}

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const { supabase, user } = await requireWorkspaceMemberProfile();
  const workspaceId = crypto.randomUUID();

  if (name.length < 3) {
    throw new Error("Workspace name must be at least 3 characters.");
  }

  const { error } = await supabase
    .from("workspaces")
    .insert({
      id: workspaceId,
      name,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
      owner_id: user.id,
    })

  if (error != null) {
    throw new Error(error.message);
  }

  const { error: membershipError } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    profile_id: user.id,
    role: "owner",
  });

  if (membershipError != null) {
    await supabase.from("workspaces").delete().eq("id", workspaceId);
    throw new Error(membershipError.message);
  }

  revalidatePath("/dashboard");
}

export async function inviteWorkspaceMemberAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const discordUsername = normalizeDiscordUsername(String(formData.get("discordUsername") ?? ""));
  const { supabase } = await requireWorkspaceOwner(workspaceId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("discord_username", discordUsername)
    .maybeSingle();

  if (profile == null) {
    throw new Error("That Discord username does not have an account yet.");
  }

  const { data: existingMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existingMembership == null) {
    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: workspaceId,
      profile_id: profile.id,
      role: "member",
    });

    if (error != null) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/dashboard");
}

export async function createBoardAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "workspace");
  const { supabase, user } = await requireWorkspaceOwner(workspaceId);

  if (name.length < 3) {
    throw new Error("Board name must be at least 3 characters.");
  }

  await supabase.from("boards").insert({
    workspace_id: workspaceId,
    name,
    description: description.length > 0 ? description : null,
    visibility,
    created_by: user.id,
  });

  revalidatePath("/dashboard");
}

export async function toggleBoardStarAction(boardId: string, nextValue: boolean) {
  const { supabase } = await requireWorkspaceMemberProfile();

  await supabase.from("boards").update({ is_starred: nextValue }).eq("id", boardId);

  revalidatePath("/dashboard");
  revalidatePath(`/boards/${boardId}`);
}

export async function uploadWorkspaceIconAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const file = formData.get("icon");
  const { supabase, user } = await requireWorkspaceOwner(workspaceId);

  if ((file instanceof File) == false || file.size === 0) {
    throw new Error("Choose an icon first.");
  }

  const extension = file.name.split(".").pop() ?? "png";
  const path = `workspaces/${workspaceId}/${Date.now()}-${user.id}.${extension}`;
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

  const { error: updateError } = await supabase
    .from("workspaces")
    .update({ icon_url: publicUrl })
    .eq("id", workspaceId);

  if (updateError != null) {
    throw new Error(updateError.message);
  }

  revalidatePath("/dashboard");
}

export async function createWorkspaceInviteLinkAction(workspaceId: string) {
  const { supabase, user } = await requireWorkspaceOwner(workspaceId);
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const configuredSiteUrl = getConfiguredSiteUrl();
  const origin = configuredSiteUrl ?? `${protocol}://${host}`;
  const token = crypto.randomUUID();

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: workspaceId,
    token,
    created_by: user.id,
  });

  if (error != null) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");

  return {
    token,
    url: `${origin}/join/${token}`,
  };
}
