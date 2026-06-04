import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActivityRecord,
  Attachment,
  BoardMember,
  BoardPageData,
  BoardSummary,
  CardRecord,
  Checklist,
  ChecklistItem,
  Comment,
  Label,
  ListRecord,
  NotificationRecord,
  Profile,
  WorkspaceInvite,
  WorkspaceDashboardData,
  WorkspaceSummary,
} from "@/lib/types";

function normalizeProfile(value: any): Profile {
  if (Array.isArray(value)) {
    return value[0] as Profile;
  }

  return value as Profile;
}

function normalizeRelation<T>(value: T | T[]): T {
  if (Array.isArray(value)) {
    return value[0] as T;
  }

  return value as T;
}

export async function getDashboardData(userId: string): Promise<WorkspaceDashboardData> {
  const supabase = await createSupabaseServerClient();

  const [{ data: profile }, { data: memberships }, { data: boards }, { data: notifications }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url, discord_username").eq("id", userId).single(),
    supabase
      .from("workspace_members")
      .select("role, workspace:workspaces(id, name, slug, icon_url)")
      .eq("profile_id", userId),
    supabase
      .from("boards")
      .select("id, workspace_id, name, description, visibility, is_starred, completed_list_id, archived_at")
      .order("is_starred", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, body, created_at, read_at, board_id, card_id")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("workspace_invites")
      .select("id, workspace_id, token, created_by, created_at")
      .eq("created_by", userId)
      .order("created_at", { ascending: false }),
  ]);

  const workspaceIds = new Set<string>();

  const workspaces: WorkspaceSummary[] = (memberships ?? []).map((membership: any) => {
    workspaceIds.add(membership.workspace.id);

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      icon_url: membership.workspace.icon_url ?? null,
      role: membership.role,
      boardCount: 0,
      memberCount: 0,
    };
  });

  const workspaceCount = new Map<string, number>();

  for (const board of boards ?? []) {
    workspaceCount.set(board.workspace_id, (workspaceCount.get(board.workspace_id) ?? 0) + 1);
  }

  const workspaceIdList = Array.from(workspaceIds);
  const memberCount = new Map<string, number>();

  if (workspaceIdList.length > 0) {
    const { data: workspaceMembers } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .in("workspace_id", workspaceIdList);

    for (const membership of workspaceMembers ?? []) {
      memberCount.set(membership.workspace_id, (memberCount.get(membership.workspace_id) ?? 0) + 1);
    }
  }

  const mappedWorkspaces = workspaces.map((workspace) => ({
    ...workspace,
    boardCount: workspaceCount.get(workspace.id) ?? 0,
    memberCount: memberCount.get(workspace.id) ?? 0,
  }));

  const mappedBoards: BoardSummary[] = (boards ?? []).filter((board: any) => workspaceIds.has(board.workspace_id));

  return {
    profile: profile as Profile,
    workspaces: mappedWorkspaces,
    boards: mappedBoards,
    notifications: (notifications ?? []) as NotificationRecord[],
    invites: (invites ?? []) as WorkspaceInvite[],
  };
}

export async function getBoardPageData(boardId: string, userId: string): Promise<BoardPageData> {
  const supabase = await createSupabaseServerClient();

  const { data: board } = await supabase
    .from("boards")
    .select("id, workspace_id, name, description, visibility, is_starred, completed_list_id, archived_at, workspace:workspaces(id, name, slug, icon_url)")
    .eq("id", boardId)
    .single();

  if (board == null) {
    notFound();
  }

  const [
    { data: memberships },
    { data: labels },
    { data: lists },
    { data: cards },
    { data: activities },
  ] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("profile_id, role, profile:profiles(id, email, full_name, avatar_url, discord_username)")
      .eq("workspace_id", board.workspace_id),
    supabase.from("labels").select("id, board_id, name, color").eq("board_id", boardId).order("name"),
    supabase
      .from("lists")
      .select("id, board_id, title, position, archived_at")
      .eq("board_id", boardId)
      .order("position"),
    supabase
      .from("cards")
      .select("id, board_id, list_id, title, description, position, due_at, start_at, cover_color, archived_at, is_completed")
      .eq("board_id", boardId)
      .order("position"),
    supabase
      .from("activity_logs")
      .select("id, board_id, card_id, action, details, created_at, profile:profiles(id, email, full_name, avatar_url, discord_username)")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const cardIds = (cards ?? []).map((card: any) => card.id);
  const safeCardIds = cardIds.length > 0 ? cardIds : ["00000000-0000-0000-0000-000000000000"];

  const [
    { data: cardMembers },
    { data: cardLabels },
    { data: checklists },
    { data: comments },
    { data: attachments },
  ] = await Promise.all([
    supabase
      .from("card_members")
      .select("card_id, profile_id, profile:profiles(id, email, full_name, avatar_url, discord_username)")
      .in("card_id", safeCardIds),
    supabase
      .from("card_labels")
      .select("card_id, label_id")
      .in("card_id", safeCardIds),
    supabase
      .from("checklists")
      .select("id, card_id, title, position")
      .in("card_id", safeCardIds)
      .order("position"),
    supabase
      .from("comments")
      .select("id, card_id, body, created_at, profile:profiles(id, email, full_name, avatar_url, discord_username)")
      .in("card_id", safeCardIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("attachments")
      .select("id, card_id, name, url, created_at")
      .in("card_id", safeCardIds)
      .order("created_at", { ascending: false }),
  ]);

  const checklistIds = (checklists ?? []).map((checklist: any) => checklist.id);
  const safeChecklistIds = checklistIds.length > 0
    ? checklistIds
    : ["00000000-0000-0000-0000-000000000000"];

  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("id, checklist_id, text, position, is_done")
    .in("checklist_id", safeChecklistIds)
    .order("position");

  const labelMap = new Map<string, Label>((labels ?? []).map((label: any) => [label.id, label]));
  const memberByCard = new Map<string, Profile[]>();
  const labelByCard = new Map<string, Label[]>();
  const checklistByCard = new Map<string, Checklist[]>();
  const checklistItemsByChecklist = new Map<string, ChecklistItem[]>();
  const commentsByCard = new Map<string, Comment[]>();
  const attachmentsByCard = new Map<string, Attachment[]>();

  for (const row of cardMembers ?? []) {
    const existing = memberByCard.get(row.card_id) ?? [];
    existing.push(normalizeProfile(row.profile));
    memberByCard.set(row.card_id, existing);
  }

  for (const row of cardLabels ?? []) {
    const existing = labelByCard.get(row.card_id) ?? [];
    const label = labelMap.get(row.label_id);

    if (label != null) {
      existing.push(label);
      labelByCard.set(row.card_id, existing);
    }
  }

  for (const item of checklistItems ?? []) {
    const existing = checklistItemsByChecklist.get(item.checklist_id) ?? [];
    existing.push(item as ChecklistItem);
    checklistItemsByChecklist.set(item.checklist_id, existing);
  }

  for (const checklist of checklists ?? []) {
    const existing = checklistByCard.get(checklist.card_id) ?? [];
    existing.push({
      ...(checklist as Omit<Checklist, "items">),
      items: checklistItemsByChecklist.get(checklist.id) ?? [],
    });
    checklistByCard.set(checklist.card_id, existing);
  }

  for (const comment of comments ?? []) {
    const existing = commentsByCard.get(comment.card_id) ?? [];
    existing.push({
      ...comment,
      profile: normalizeProfile(comment.profile),
    } as Comment);
    commentsByCard.set(comment.card_id, existing);
  }

  for (const attachment of attachments ?? []) {
    const existing = attachmentsByCard.get(attachment.card_id) ?? [];
    existing.push(attachment as Attachment);
    attachmentsByCard.set(attachment.card_id, existing);
  }

  const cardsByList = new Map<string, CardRecord[]>();

  for (const card of cards ?? []) {
    const existing = cardsByList.get(card.list_id) ?? [];
    existing.push({
      ...(card as Omit<CardRecord, "labels" | "members" | "attachments" | "comments" | "checklists">),
      labels: labelByCard.get(card.id) ?? [],
      members: memberByCard.get(card.id) ?? [],
      attachments: attachmentsByCard.get(card.id) ?? [],
      comments: commentsByCard.get(card.id) ?? [],
      checklists: checklistByCard.get(card.id) ?? [],
    });
    cardsByList.set(card.list_id, existing);
  }

  const mappedLists: ListRecord[] = (lists ?? []).map((list: any) => ({
    ...list,
    cards: (cardsByList.get(list.id) ?? []).sort((a, b) => a.position - b.position),
  }));

  return {
    board: {
      ...board,
      workspace: normalizeRelation(board.workspace),
    } as BoardPageData["board"],
    labels: (labels ?? []) as Label[],
    members: (memberships ?? []).map((membership: any) => ({
      ...membership,
      profile: normalizeProfile(membership.profile),
    })) as BoardMember[],
    lists: mappedLists,
    activities: (activities ?? []).map((activity: any) => ({
      ...activity,
      profile: normalizeProfile(activity.profile),
    })) as ActivityRecord[],
    currentUserId: userId,
  };
}
