"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileHandle, normalizeDiscordUsername } from "@/lib/utils";

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

async function getActor() {
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

async function requireBoardWorkspaceOwner(boardId: string) {
  const actor = await getActor();
  const { data: board } = await actor.supabase
    .from("boards")
    .select("id, workspace:workspaces(owner_id)")
    .eq("id", boardId)
    .single();

  const workspaceRelation = board?.workspace as { owner_id?: string } | Array<{ owner_id?: string }> | null | undefined;
  const ownerId = Array.isArray(workspaceRelation) ? workspaceRelation[0]?.owner_id : workspaceRelation?.owner_id;

  if (ownerId == null || ownerId !== actor.user.id) {
    throw new Error("Only the workspace owner can do that.");
  }

  return actor;
}

async function logActivity(boardId: string, action: string, details: string, cardId?: string | null) {
  const { supabase, user, email } = await getActor();

  await supabase.from("activity_logs").insert({
    board_id: boardId,
    card_id: cardId ?? null,
    profile_id: user.id,
    action,
    details,
  });
}

function extractMentionHandles(text: string) {
  return new Set(
    Array.from(text.matchAll(/@([a-z0-9._-]+)/gi)).map((match) => normalizeDiscordUsername(match[1])),
  );
}

async function createMentionNotifications(
  actor: Awaited<ReturnType<typeof getActor>>,
  boardId: string,
  cardId: string,
  text: string,
  body: string,
  previousText?: string | null,
) {
  const mentionedHandles = extractMentionHandles(text);

  if (mentionedHandles.size === 0) {
    return;
  }

  if (previousText != null && previousText.length > 0) {
    const previousHandles = extractMentionHandles(previousText);

    for (const handle of previousHandles) {
      mentionedHandles.delete(handle);
    }

    if (mentionedHandles.size === 0) {
      return;
    }
  }

  const { data: board } = await actor.supabase
    .from("boards")
    .select("workspace_id")
    .eq("id", boardId)
    .single();

  const workspaceId = board?.workspace_id;

  if (workspaceId == null) {
    return;
  }

  const { data: members } = await actor.supabase
    .from("workspace_members")
    .select("profile_id, profile:profiles(id, email, full_name, discord_username)")
    .eq("workspace_id", workspaceId);

  const notifications = (members ?? [])
    .map((member: any) => {
      const profile = member.profile;
      const handle = getProfileHandle(profile);

      if (mentionedHandles.has(handle) == false || profile.id === actor.user.id) {
        return null;
      }

      return {
        profile_id: profile.id,
        board_id: boardId,
        card_id: cardId,
        body,
      };
    })
    .filter((value): value is { profile_id: string; board_id: string; card_id: string; body: string } => value != null);

  if (notifications.length > 0) {
    await actor.supabase.from("notifications").insert(notifications);
  }
}

async function moveCompletedCardIfNeeded(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  boardId: string,
  cardId: string,
  isCompleted: boolean,
) {
  if (isCompleted == false) {
    return;
  }

  const { data: board } = await supabase
    .from("boards")
    .select("completed_list_id")
    .eq("id", boardId)
    .single();

  if (board?.completed_list_id == null) {
    return;
  }

  const { data: lastCard } = await supabase
    .from("cards")
    .select("position")
    .eq("list_id", board.completed_list_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("cards")
    .update({
      list_id: board.completed_list_id,
      position: (lastCard?.position ?? -1) + 1,
    })
    .eq("id", cardId);
}

export async function createListAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const { supabase } = await getActor();

  const { data: lastList } = await supabase
    .from("lists")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("lists").insert({
    board_id: boardId,
    title,
    position: (lastList?.position ?? -1) + 1,
  });

  await logActivity(boardId, "list.created", `Created list "${title}".`);
  revalidatePath(`/boards/${boardId}`);
}

export async function updateListTitleAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const listId = String(formData.get("listId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const { supabase } = await getActor();

  await supabase.from("lists").update({ title }).eq("id", listId);
  await logActivity(boardId, "list.renamed", `Renamed a list to "${title}".`);
  revalidatePath(`/boards/${boardId}`);
}

export async function moveListAction(boardId: string, orderedListIds: string[]) {
  const { supabase } = await getActor();

  for (const [index, listId] of orderedListIds.entries()) {
    await supabase.from("lists").update({ position: index }).eq("id", listId);
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function archiveListAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const listId = String(formData.get("listId") ?? "");
  const { supabase } = await getActor();

  await supabase.from("lists").update({ archived_at: new Date().toISOString() }).eq("id", listId);
  await logActivity(boardId, "list.archived", "Archived a list.");
  revalidatePath(`/boards/${boardId}`);
}

export async function createCardAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const listId = String(formData.get("listId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const { supabase, user, email } = await getActor();

  const { data: lastCard } = await supabase
    .from("cards")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: card } = await supabase
    .from("cards")
    .insert({
      board_id: boardId,
      list_id: listId,
      title,
      position: (lastCard?.position ?? -1) + 1,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (card == null) {
    throw new Error("Unable to create card.");
  }

  await supabase.from("card_members").insert({
    card_id: card.id,
    profile_id: user.id,
  });

  await logActivity(boardId, "card.created", `Created card "${title}".`, card.id);
  revalidatePath(`/boards/${boardId}`);
}

export async function updateCardAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const patch = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    is_pinned: String(formData.get("isPinned") ?? "false") === "true",
    due_at: String(formData.get("dueAt") ?? "").trim() || null,
    start_at: String(formData.get("startAt") ?? "").trim() || null,
    cover_color: String(formData.get("coverColor") ?? "").trim() || null,
    is_completed: String(formData.get("isCompleted") ?? "false") === "true",
  };
  const actor = await getActor();
  const { supabase, email, user } = actor;

  const { data: existingCard } = await supabase
    .from("cards")
    .select("description")
    .eq("id", cardId)
    .single();

  await supabase.from("cards").update(patch).eq("id", cardId);
  await moveCompletedCardIfNeeded(supabase, boardId, cardId, patch.is_completed);
  await createMentionNotifications(
    actor,
    boardId,
    cardId,
    patch.description ?? "",
    `${user.user_metadata.full_name ?? email} mentioned you in a card description.`,
    existingCard?.description ?? null,
  );
  await logActivity(boardId, "card.updated", `Updated card "${patch.title}".`, cardId);
  revalidatePath(`/boards/${boardId}`);
}

export async function moveCardAction(
  boardId: string,
  cardId: string,
  nextListId: string,
  orderedCardIds: string[],
) {
  const { supabase } = await getActor();

  await supabase.from("cards").update({ list_id: nextListId }).eq("id", cardId);

  for (const [index, id] of orderedCardIds.entries()) {
    await supabase.from("cards").update({ position: index }).eq("id", id);
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function archiveCardAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const { supabase } = await getActor();

  await supabase.from("cards").update({ archived_at: new Date().toISOString() }).eq("id", cardId);
  await logActivity(boardId, "card.archived", "Archived a card.", cardId);
  revalidatePath(`/boards/${boardId}`);
}

export async function updateBoardSettingsAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const completedListId = String(formData.get("completedListId") ?? "").trim() || null;
  const { supabase } = await getActor();

  await supabase
    .from("boards")
    .update({ completed_list_id: completedListId })
    .eq("id", boardId);

  await logActivity(
    boardId,
    "board.settings.updated",
    completedListId == null ? "Cleared completed card destination." : "Updated completed card destination.",
  );
  revalidatePath(`/boards/${boardId}`);
}

export async function deleteBoardAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const boardName = String(formData.get("boardName") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const { supabase } = await requireBoardWorkspaceOwner(boardId);

  if (boardName.length === 0 || confirmation !== boardName) {
    throw new Error("Type the board name exactly to delete it.");
  }

  const { error } = await supabase.from("boards").delete().eq("id", boardId);

  if (error != null) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/boards/${boardId}`);
  redirect("/dashboard");
}

export async function createLabelAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#4f46e5");
  const { supabase } = await getActor();

  await supabase.from("labels").insert({
    board_id: boardId,
    name,
    color,
  });

  await logActivity(boardId, "label.created", `Created label "${name}".`);
  revalidatePath(`/boards/${boardId}`);
}

export async function toggleCardLabelAction(cardId: string, labelId: string, enabled: boolean, boardId: string) {
  const { supabase } = await getActor();

  if (enabled == true) {
    await supabase.from("card_labels").upsert({ card_id: cardId, label_id: labelId });
  } else {
    await supabase.from("card_labels").delete().eq("card_id", cardId).eq("label_id", labelId);
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function toggleCardMemberAction(cardId: string, profileId: string, enabled: boolean, boardId: string) {
  const { supabase } = await getActor();

  if (enabled == true) {
    await supabase.from("card_members").upsert({ card_id: cardId, profile_id: profileId });
  } else {
    await supabase.from("card_members").delete().eq("card_id", cardId).eq("profile_id", profileId);
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function createChecklistAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const { supabase } = await getActor();

  const { data: lastChecklist } = await supabase
    .from("checklists")
    .select("position")
    .eq("card_id", cardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("checklists").insert({
    card_id: cardId,
    title,
    position: (lastChecklist?.position ?? -1) + 1,
  });

  await logActivity(boardId, "checklist.created", `Added checklist "${title}".`, cardId);
  revalidatePath(`/boards/${boardId}`);
}

export async function addChecklistItemAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const checklistId = String(formData.get("checklistId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const { supabase } = await getActor();

  const { data: lastItem } = await supabase
    .from("checklist_items")
    .select("position")
    .eq("checklist_id", checklistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("checklist_items").insert({
    checklist_id: checklistId,
    text,
    position: (lastItem?.position ?? -1) + 1,
  });

  await logActivity(boardId, "checklist.item.created", `Added checklist item "${text}".`, cardId);
  revalidatePath(`/boards/${boardId}`);
}

export async function toggleChecklistItemAction(itemId: string, nextValue: boolean, boardId: string) {
  const { supabase } = await getActor();

  await supabase.from("checklist_items").update({ is_done: nextValue }).eq("id", itemId);
  revalidatePath(`/boards/${boardId}`);
}

export async function addCommentAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const actor = await getActor();
  const { supabase, user, email } = actor;

  await supabase.from("comments").insert({
    card_id: cardId,
    profile_id: user.id,
    body,
  });

  await createMentionNotifications(
    actor,
    boardId,
    cardId,
    body,
    `${user.user_metadata.full_name ?? email} mentioned you in a comment.`,
  );

  await logActivity(boardId, "comment.created", "Added a comment.", cardId);
  revalidatePath(`/boards/${boardId}`);
}

export async function addAttachmentAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const { supabase } = await getActor();

  await supabase.from("attachments").insert({
    card_id: cardId,
    name,
    url,
  });

  await logActivity(boardId, "attachment.created", `Attached "${name}".`, cardId);
  revalidatePath(`/boards/${boardId}`);
}

export async function uploadCardImageAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const file = formData.get("image");
  const { supabase, user } = await getActor();

  if ((file instanceof File) == false || file.size === 0) {
    throw new Error("Choose an image first.");
  }

  const extension = file.name.split(".").pop() ?? "png";
  const path = `cards/${cardId}/${Date.now()}-${user.id}.${extension}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    upsert: false,
    contentType: file.type,
  });

  if (error != null) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("media").getPublicUrl(path);

  await supabase.from("attachments").insert({
    card_id: cardId,
    name: file.name,
    url: publicUrl,
  });

  await logActivity(boardId, "image.uploaded", `Uploaded image "${file.name}".`, cardId);
  revalidatePath(`/boards/${boardId}`);
}
