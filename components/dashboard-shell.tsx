"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, PlusSquare, Settings, Upload, User, UserPlus, X } from "lucide-react";
import {
  createBoardAction,
  createWorkspaceAction,
  createWorkspaceInviteLinkAction,
  inviteWorkspaceMemberAction,
  uploadWorkspaceIconAction,
} from "@/app/actions/workspace";
import { signOutAction } from "@/app/actions/auth";
import { updateProfileAction, uploadAvatarAction } from "@/app/actions/profile";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import type { WorkspaceDashboardData } from "@/lib/types";
import { formatTimestamp, getProfileHandle } from "@/lib/utils";

const NOTIFICATION_PERMISSION_KEY = "chumpspace-notification-permission-requested";

function buildInviteLink(token: string) {
  if (typeof window === "undefined") {
    return `/join/${token}`;
  }

  return `${window.location.origin}/join/${token}`;
}

export function DashboardShell({
  data,
  initialWorkspaceId,
}: {
  data: WorkspaceDashboardData;
  initialWorkspaceId?: string | null;
}) {
  const router = useRouter();
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspaceSettingsId, setWorkspaceSettingsId] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [workspaceActionMessage, setWorkspaceActionMessage] = useState<string | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set(data.notifications.map((notification) => notification.id)));
  const workspaceOptions = data.workspaces.map((workspace) => ({
    value: workspace.id,
    label: workspace.name,
  }));
  const boardsByWorkspace = useMemo(() => {
    const nextMap = new Map<string, typeof data.boards>();

    for (const board of data.boards) {
      const existing = nextMap.get(board.workspace_id) ?? [];
      existing.push(board);
      nextMap.set(board.workspace_id, existing);
    }

    return nextMap;
  }, [data.boards]);
  const selectedWorkspace = selectedWorkspaceId == null
    ? null
    : data.workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const selectedWorkspaceBoards = selectedWorkspace == null
    ? []
    : boardsByWorkspace.get(selectedWorkspace.id) ?? [];
  const selectedWorkspaceSettings = workspaceSettingsId == null
    ? null
    : data.workspaces.find((workspace) => workspace.id === workspaceSettingsId) ?? null;

  useEffect(() => {
    if (initialWorkspaceId == null) {
      return;
    }

    setSelectedWorkspaceId(initialWorkspaceId);
  }, [initialWorkspaceId]);

  useEffect(() => {
    setInviteLinks(
      Object.fromEntries(
        data.invites.map((invite) => [invite.workspace_id, buildInviteLink(invite.token)]),
      ),
    );
  }, [data.invites]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [router]);

  useEffect(() => {
    if ("Notification" in window == false) {
      return;
    }

    if (Notification.permission !== "default") {
      return;
    }

    if (window.localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === "true") {
      return;
    }

    window.localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "true");

    window.setTimeout(() => {
      void Notification.requestPermission();
    }, 600);
  }, []);

  useEffect(() => {
    const seenIds = seenNotificationIdsRef.current;
    const freshNotifications = data.notifications.filter((notification) => seenIds.has(notification.id) == false);

    for (const notification of data.notifications) {
      seenIds.add(notification.id);
    }

    if (freshNotifications.length === 0) {
      return;
    }

    if ("Notification" in window == false || Notification.permission !== "granted") {
      return;
    }

    for (const notification of freshNotifications) {
      const browserNotification = new Notification("new ping", {
        body: notification.body,
        tag: notification.id,
      });

      browserNotification.onclick = () => {
        window.focus();
        window.location.href = `/boards/${notification.board_id}`;
      };
    }
  }, [data.notifications]);

  return (
    <div className="min-h-screen grainy-bg px-4 py-6 sm:px-6 lg:px-8 lowercase">
      <div className={`mx-auto max-w-7xl transition duration-200 ${(selectedWorkspace || showUserSettings || selectedWorkspaceSettings) ? "pointer-events-none blur-sm" : ""}`}>
        <header className="relative mb-6 flex flex-col gap-4 border border-[var(--border)] bg-[var(--panel)] px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.3em] text-white/60">workspace hub</p>
            <h1 className="mt-2 text-3xl font-semibold">
              welcome back, {data.profile.full_name ?? data.profile.email}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowUserSettings(true)}
            className="surface flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium transition hover:border-[var(--border-strong)]"
          >
            <Settings className="h-4 w-4" />
            settings
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="grid gap-6">
            <section className="panel p-5">
              <div className="flex items-center gap-2">
                <PlusSquare className="h-5 w-5 text-[#a9c0ff]" />
                <h2 className="text-xl font-semibold">create workspace</h2>
              </div>
              <form action={createWorkspaceAction} className="mt-4 grid gap-3">
                <input name="name" required placeholder="studio operations" className="surface px-4 py-3" />
                <button className="bg-[linear-gradient(135deg,#5c87ff,#3d6cff)] px-4 py-3 font-medium text-white">
                  create workspace
                </button>
              </form>
            </section>

          </aside>

          <main className="grid gap-6">
            <section className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-[0.25em] text-[var(--muted)]">your spaces</p>
                  <h2 className="mt-2 text-2xl font-semibold">workspaces</h2>
                </div>
              </div>

              <div className="soft-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
                {data.workspaces.map((workspace) => (
                  <div key={workspace.id} className="surface min-w-[32rem] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {workspace.icon_url ? (
                          <img src={workspace.icon_url} alt="" className="h-11 w-11 shrink-0 border border-[var(--border)] object-cover" />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-medium text-[#a9c0ff]">
                            {workspace.name.slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="min-w-0 break-words text-xl font-semibold leading-tight">{workspace.name}</h3>
                          <p className="mt-3 text-sm text-[var(--muted)]">
                            {workspace.boardCount} boards . {workspace.memberCount} members
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                        <span className="border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-xs tracking-[0.2em] text-[#a9c0ff]">
                          {workspace.role}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWorkspaceSettingsId(workspace.id)}
                          className="surface p-2 text-white/80 transition hover:border-[var(--border-strong)]"
                          aria-label={`Open settings for ${workspace.name}`}
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedWorkspaceId(workspace.id)}
                          className="surface px-3 py-2 text-xs tracking-[0.2em] text-white/80 transition hover:border-[var(--border-strong)]"
                        >
                          boards
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <div>
                <p className="inline-flex items-center gap-2 text-xs tracking-[0.25em] text-[var(--muted)]">
                  <Bell className="h-4 w-4" />
                  mentions
                </p>
                <h2 className="mt-2 text-2xl font-semibold">recent pings</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {data.notifications.length > 0 ? data.notifications.map((notification) => (
                  <Link key={notification.id} href={`/boards/${notification.board_id}`} className="surface min-w-0 p-4 transition hover:border-[var(--border-strong)]">
                    <p className="break-words text-sm">{notification.body}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">{formatTimestamp(notification.created_at)}</p>
                  </Link>
                )) : (
                  <div className="surface p-4 text-sm text-[var(--muted)]">
                    no mentions yet. use @handles in comments to ping teammates.
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>

      {selectedWorkspace ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close workspace boards"
            onClick={() => setSelectedWorkspaceId(null)}
            className="absolute inset-0 bg-black/55"
          />
          <div className="relative z-[161] w-full max-w-2xl border border-[var(--border-strong)] bg-[var(--panel)] p-6 text-white shadow-[0_35px_140px_rgba(0,0,0,0.72)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.25em] text-[var(--muted)]">{selectedWorkspace.name}</p>
                <h2 className="mt-2 text-3xl font-semibold">boards</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  choose a board from this workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkspaceId(null)}
                className="surface p-3 text-white/80 transition hover:border-[var(--border-strong)]"
                aria-label="Close workspace boards"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {selectedWorkspaceBoards.length > 0 ? selectedWorkspaceBoards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="surface grid gap-2 px-4 py-4 transition hover:border-[var(--border-strong)]"
                >
                  <span className="font-medium text-white">{board.name}</span>
                  <span className="text-xs tracking-[0.2em] text-[var(--muted)]">{board.visibility}</span>
                  <span className="text-sm text-[var(--muted)]">
                    {board.description ?? "shared work inside this workspace."}
                  </span>
                </Link>
              )) : (
                <div className="surface px-4 py-4 text-sm text-[var(--muted)] sm:col-span-2">
                  no boards in this workspace yet.
                </div>
              )}
            </div>

            {selectedWorkspace.role === "owner" ? (
              <div className="mt-6 border-t border-[var(--border)] pt-6">
                <div className="flex items-center gap-2">
                  <PlusSquare className="h-4 w-4 text-[#a9c0ff]" />
                  <h3 className="text-lg font-semibold">create board</h3>
                </div>
                <form action={createBoardAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="workspaceId" value={selectedWorkspace.id} />
                  <input name="name" required placeholder="roadmap, sprint, launch" className="surface px-4 py-3" />
                  <textarea name="description" rows={3} placeholder="what is this board for?" className="surface px-4 py-3" />
                  <CustomDropdown
                    name="visibility"
                    options={[
                      { value: "workspace", label: "workspace visible" },
                      { value: "private", label: "private" },
                    ]}
                  />
                  <button className="bg-[linear-gradient(135deg,#5c87ff,#3d6cff)] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90">
                    create board
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedWorkspaceSettings ? (
        <div className="fixed inset-0 z-[165] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close workspace settings"
            onClick={() => setWorkspaceSettingsId(null)}
            className="absolute inset-0 bg-black/55"
          />
          <div className="relative z-[166] w-full max-w-xl border border-[var(--border-strong)] bg-[var(--panel)] p-6 text-white shadow-[0_35px_140px_rgba(0,0,0,0.72)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.25em] text-[var(--muted)]">workspace settings</p>
                <h2 className="mt-2 text-3xl font-semibold">{selectedWorkspaceSettings.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setWorkspaceSettingsId(null)}
                className="surface p-3 text-white/80 transition hover:border-[var(--border-strong)]"
                aria-label="Close workspace settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-start gap-4">
              {selectedWorkspaceSettings.icon_url ? (
                <img src={selectedWorkspaceSettings.icon_url} alt="" className="h-16 w-16 shrink-0 border border-[var(--border)] object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] text-lg font-medium text-[#a9c0ff]">
                  {selectedWorkspaceSettings.name.slice(0, 2)}
                </div>
              )}
              <div className="text-sm text-[var(--muted)]">
                upload a workspace icon and it will show beside the workspace name.
              </div>
            </div>

            <form action={uploadWorkspaceIconAction} className="mt-6 grid gap-3">
              <input type="hidden" name="workspaceId" value={selectedWorkspaceSettings.id} />
              <label className="grid gap-2 text-xs tracking-[0.2em] text-[var(--muted)]">
                <span className="inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  workspace icon
                </span>
                <input name="icon" type="file" accept="image/*" className="surface px-4 py-3 text-sm tracking-normal text-white" />
              </label>
              <button className="surface px-4 py-3 text-sm font-medium">upload icon</button>
            </form>

            {selectedWorkspaceSettings.role === "owner" ? (
              <div className="mt-6 border-t border-[var(--border)] pt-6">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-[#a9c0ff]" />
                  <h3 className="text-lg font-semibold">invite people</h3>
                </div>
                <form action={inviteWorkspaceMemberAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="workspaceId" value={selectedWorkspaceSettings.id} />
                  <input name="discordUsername" required placeholder="discord username" className="surface px-4 py-3" />
                  <button className="surface px-4 py-3 text-sm font-medium transition hover:border-[var(--border-strong)]">
                    add to workspace
                  </button>
                </form>

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceActionMessage("creating invite link...");

                      void createWorkspaceInviteLinkAction(selectedWorkspaceSettings.id)
                        .then((result) => {
                          setInviteLinks((current) => ({
                            ...current,
                            [selectedWorkspaceSettings.id]: result.url,
                          }));
                          setWorkspaceActionMessage("invite link ready.");
                        })
                        .catch((error: unknown) => {
                          setWorkspaceActionMessage(error instanceof Error ? error.message : "unable to create invite link.");
                        });
                    }}
                    className="surface px-4 py-3 text-sm font-medium transition hover:border-[var(--border-strong)]"
                  >
                    create invite link
                  </button>
                  {inviteLinks[selectedWorkspaceSettings.id] ? (
                    <div className="grid gap-2">
                      <input
                        readOnly
                        value={inviteLinks[selectedWorkspaceSettings.id]}
                        className="surface px-4 py-3 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(inviteLinks[selectedWorkspaceSettings.id]);
                          setWorkspaceActionMessage("invite link copied.");
                        }}
                        className="surface px-4 py-3 text-sm font-medium transition hover:border-[var(--border-strong)]"
                      >
                        copy invite link
                      </button>
                    </div>
                  ) : null}
                  {workspaceActionMessage ? (
                    <p className="text-sm text-[var(--muted)]">{workspaceActionMessage}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
                only the workspace owner can invite new members.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showUserSettings ? (
        <div className="fixed inset-0 z-[170] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setShowUserSettings(false)}
            className="absolute inset-0 bg-black/55"
          />
          <div className="relative z-[171] w-full max-w-xl border border-[var(--border-strong)] bg-[var(--panel)] p-6 text-white shadow-[0_35px_140px_rgba(0,0,0,0.72)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.25em] text-[var(--muted)]">account</p>
                <h2 className="mt-2 text-3xl font-semibold">settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUserSettings(false)}
                className="surface p-3 text-white/80 transition hover:border-[var(--border-strong)]"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-start gap-4">
              {data.profile.avatar_url ? (
                <img src={data.profile.avatar_url} alt="" className="avatar-ring h-16 w-16 shrink-0 object-cover" />
              ) : (
                <div className="avatar-ring flex h-16 w-16 shrink-0 items-center justify-center bg-[var(--surface-soft)] text-lg">
                  {(data.profile.full_name ?? data.profile.email).slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 text-sm text-[var(--muted)]">
                <p className="break-words font-medium text-white">{data.profile.full_name ?? "discord user"}</p>
                <p className="mt-1 break-all text-[#a9c0ff]">@{getProfileHandle(data.profile)}</p>
                <p className="mt-1 break-all blur-sm transition hover:blur-none">{data.profile.email}</p>
              </div>
            </div>

            <form action={updateProfileAction} className="mt-6 grid gap-3">
              <label className="grid gap-2 text-xs tracking-[0.2em] text-[var(--muted)]">
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4" />
                  display name
                </span>
                <input name="fullName" defaultValue={data.profile.full_name ?? ""} placeholder="display name" className="surface px-4 py-3 text-sm tracking-normal text-white" />
              </label>
              <button className="bg-[linear-gradient(135deg,#5c87ff,#3d6cff)] px-4 py-3 text-sm font-medium text-white">
                save profile
              </button>
            </form>

            <form action={uploadAvatarAction} className="mt-3 grid gap-3">
              <label className="grid gap-2 text-xs tracking-[0.2em] text-[var(--muted)]">
                <span className="inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  avatar
                </span>
                <input name="avatar" type="file" accept="image/*" className="surface px-4 py-3 text-sm tracking-normal text-white" />
              </label>
              <button className="surface px-4 py-3 text-sm font-medium">upload avatar</button>
            </form>

            <form action={signOutAction} className="mt-3">
              <button className="surface w-full px-4 py-3 text-sm font-medium transition hover:border-[var(--border-strong)]">
                sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
