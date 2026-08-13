"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Building2, Copy, LayoutGrid, Link2, LogOut, Plus, Save, Settings, Upload, User, UserPlus } from "lucide-react";
import {
  createBoardAction,
  createWorkspaceAction,
  createWorkspaceInviteLinkAction,
  inviteWorkspaceMemberAction,
  uploadWorkspaceIconAction,
} from "@/app/actions/workspace";
import { signOutAction } from "@/app/actions/auth";
import { updateProfileAction } from "@/app/actions/profile";
import { AccentColorPicker } from "@/components/accent-color-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileInput } from "@/components/ui/file-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceDashboardData } from "@/lib/types";
import { formatTimestamp, getProfileHandle } from "@/lib/utils";

const NOTIFICATION_PERMISSION_KEY = "chumpspace-notification-permission-requested";

export function DashboardShell({ data, initialWorkspaceId }: { data: WorkspaceDashboardData; initialWorkspaceId?: string | null }) {
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(initialWorkspaceId ?? null);
  const [workspaceSettingsId, setWorkspaceSettingsId] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.invites.map((invite) => [invite.workspace_id, `/join/${invite.token}`])),
  );
  const [workspaceActionMessage, setWorkspaceActionMessage] = useState<string | null>(null);
  const seenNotificationIdsRef = useRef(new Set(data.notifications.map((notification) => notification.id)));

  const boardsByWorkspace = useMemo(() => {
    const nextMap = new Map<string, typeof data.boards>();
    for (const board of data.boards) nextMap.set(board.workspace_id, [...(nextMap.get(board.workspace_id) ?? []), board]);
    return nextMap;
  }, [data]);

  const selectedWorkspace = data.workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const selectedWorkspaceBoards = selectedWorkspace ? boardsByWorkspace.get(selectedWorkspace.id) ?? [] : [];
  const selectedWorkspaceSettings = data.workspaces.find((workspace) => workspace.id === workspaceSettingsId) ?? null;

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "default" || window.localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === "true") return;
    window.localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "true");
    window.setTimeout(() => void Notification.requestPermission(), 600);
  }, []);

  useEffect(() => {
    const seenIds = seenNotificationIdsRef.current;
    const freshNotifications = data.notifications.filter((notification) => !seenIds.has(notification.id));
    for (const notification of data.notifications) seenIds.add(notification.id);
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    for (const notification of freshNotifications) {
      const browserNotification = new Notification("new ping", { body: notification.body, tag: notification.id });
      browserNotification.onclick = () => {
        window.focus();
        window.location.href = `/boards/${notification.board_id}`;
      };
    }
  }, [data.notifications]);

  return (
    <div className="grainy-bg min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card/80 px-5 py-5 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/15">C</div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">chumpspace</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight">Hey, {data.profile.full_name ?? data.profile.email.split("@")[0]}</h1>
            </div>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => setShowUserSettings(true)} aria-label="Account settings" title="Account settings">
            <Settings />
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside>
            <Card className="sticky top-5 bg-card/90 backdrop-blur-xl">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><Plus /></div>
                <CardTitle>Create a workspace</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createWorkspaceAction} className="grid gap-3">
                  <Label htmlFor="workspace-name">Workspace name</Label>
                  <Input id="workspace-name" name="name" required placeholder="Studio operations" />
                  <Button size="icon" className="justify-self-end" aria-label="Create workspace" title="Create workspace"><Plus /></Button>
                </form>
              </CardContent>
            </Card>
          </aside>

          <main className="grid min-w-0 gap-6">
            <Card className="bg-card/90 backdrop-blur-xl">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Your workspaces</CardTitle>
                </div>
                <Badge variant="outline">{data.workspaces.length} total</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {data.workspaces.map((workspace) => (
                    <div key={workspace.id} className="group flex flex-col gap-4 rounded-xl border border-border bg-background/35 p-4 transition hover:border-primary/35 hover:bg-accent/45 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        {workspace.icon_url ? (
                          <img src={workspace.icon_url} alt="" className="size-11 shrink-0 rounded-lg border border-border object-cover" />
                        ) : (
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-primary">{workspace.name.slice(0, 2).toUpperCase()}</div>
                        )}
                        <div className="min-w-0">
                          <h2 className="truncate font-semibold">{workspace.name}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">{workspace.boardCount} boards · {workspace.memberCount} members</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge>{workspace.role}</Badge>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setWorkspaceSettingsId(workspace.id)} aria-label={`Open settings for ${workspace.name}`} title="Workspace settings"><Settings /></Button>
                        <Button type="button" variant="secondary" size="icon" onClick={() => setSelectedWorkspaceId(workspace.id)} aria-label={`Open boards in ${workspace.name}`} title="Open boards"><LayoutGrid /></Button>
                      </div>
                    </div>
                  ))}
                  {data.workspaces.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Create your first workspace to get started.</div> : null}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/90 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center gap-2"><Bell className="size-4 text-primary" /><CardTitle className="text-xl">Recent pings</CardTitle></div>
              </CardHeader>
              <CardContent className="grid gap-2">
                {data.notifications.length > 0 ? data.notifications.map((notification) => (
                  <Link key={notification.id} href={`/boards/${notification.board_id}`} className="rounded-lg border border-border bg-background/35 p-4 transition hover:border-primary/35 hover:bg-accent/45">
                    <p className="text-sm">{notification.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatTimestamp(notification.created_at)}</p>
                  </Link>
                )) : <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No pings yet. Mention a teammate with @handle in a comment.</div>}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <Dialog open={selectedWorkspace != null} onOpenChange={(open) => { if (!open) setSelectedWorkspaceId(null); }}>
        <DialogContent className="max-w-2xl">
          {selectedWorkspace ? <>
            <DialogHeader>
              <DialogTitle>{selectedWorkspace.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedWorkspaceBoards.map((board) => (
                <Link key={board.id} href={`/boards/${board.id}`} className="rounded-xl border border-border bg-background/45 p-4 transition hover:border-primary/40 hover:bg-accent">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium">{board.name}</span><Badge variant="outline">{board.visibility}</Badge></div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{board.description ?? "Shared work inside this workspace."}</p>
                </Link>
              ))}
              {selectedWorkspaceBoards.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground sm:col-span-2">No boards here yet.</div> : null}
            </div>
            {selectedWorkspace.role === "owner" ? <>
              <Separator />
              <form action={createBoardAction} className="grid gap-3">
                <div><h3 className="font-medium">Create a board</h3><p className="mt-1 text-sm text-muted-foreground">Start with a name and a short purpose.</p></div>
                <input type="hidden" name="workspaceId" value={selectedWorkspace.id} />
                <Input name="name" required placeholder="Roadmap, sprint, launch…" />
                <Textarea name="description" rows={3} placeholder="What is this board for?" />
                <CustomDropdown name="visibility" options={[{ value: "workspace", label: "Workspace visible" }, { value: "private", label: "Private" }]} />
                <Button size="icon" className="justify-self-end" aria-label="Create board" title="Create board"><Plus /></Button>
              </form>
            </> : null}
          </> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={selectedWorkspaceSettings != null} onOpenChange={(open) => { if (!open) setWorkspaceSettingsId(null); }}>
        <DialogContent>
          {selectedWorkspaceSettings ? <>
            <DialogHeader><DialogTitle>{selectedWorkspaceSettings.name}</DialogTitle></DialogHeader>
            <div className="flex items-center gap-4">
              {selectedWorkspaceSettings.icon_url ? <img src={selectedWorkspaceSettings.icon_url} alt="" className="size-14 rounded-xl border border-border object-cover" /> : <div className="flex size-14 items-center justify-center rounded-xl bg-secondary text-primary"><Building2 /></div>}
            </div>
            <form action={uploadWorkspaceIconAction} className="grid gap-3">
              <input type="hidden" name="workspaceId" value={selectedWorkspaceSettings.id} />
              <Label><span className="mb-2 inline-flex items-center gap-2"><Upload className="size-4" /> Workspace icon</span><FileInput name="icon" accept="image/*" buttonLabel="Choose file" /></Label>
              <Button variant="secondary" size="icon" className="justify-self-end" aria-label="Upload workspace icon" title="Upload workspace icon"><Upload /></Button>
            </form>
            {selectedWorkspaceSettings.role === "owner" ? <>
              <Separator />
              <h3 className="flex items-center gap-2 font-medium"><UserPlus className="size-4 text-primary" /> Invite people</h3>
              <form action={inviteWorkspaceMemberAction} className="flex gap-2">
                <input type="hidden" name="workspaceId" value={selectedWorkspaceSettings.id} />
                <Input name="discordUsername" required placeholder="Discord username" />
                <Button variant="secondary" size="icon" aria-label="Add workspace member" title="Add member"><UserPlus /></Button>
              </form>
              <Button type="button" variant="outline" onClick={() => {
                setWorkspaceActionMessage("Creating invite link…");
                void createWorkspaceInviteLinkAction(selectedWorkspaceSettings.id).then((result) => {
                  setInviteLinks((current) => ({ ...current, [selectedWorkspaceSettings.id]: result.url }));
                  setWorkspaceActionMessage("Invite link ready.");
                }).catch((error: unknown) => setWorkspaceActionMessage(error instanceof Error ? error.message : "Unable to create invite link."));
              }} size="icon" aria-label="Create invite link" title="Create invite link"><Link2 /></Button>
              {inviteLinks[selectedWorkspaceSettings.id] ? <div className="flex gap-2"><Input readOnly value={inviteLinks[selectedWorkspaceSettings.id]} /><Button type="button" size="icon" variant="secondary" onClick={() => { void navigator.clipboard.writeText(inviteLinks[selectedWorkspaceSettings.id]); setWorkspaceActionMessage("Invite link copied."); }} aria-label="Copy invite link" title="Copy invite link"><Copy /></Button></div> : null}
              {workspaceActionMessage ? <p className="text-sm text-muted-foreground">{workspaceActionMessage}</p> : null}
            </> : <p className="text-sm text-muted-foreground">Only the workspace owner can invite new members.</p>}
          </> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showUserSettings} onOpenChange={setShowUserSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle>Account</DialogTitle></DialogHeader>
          <div className="flex items-center gap-4">
            {data.profile.avatar_url ? <img src={data.profile.avatar_url} alt="" className="avatar-ring size-14 object-cover" /> : <div className="avatar-ring flex size-14 items-center justify-center bg-secondary font-medium">{(data.profile.full_name ?? data.profile.email).slice(0, 2)}</div>}
            <div className="min-w-0"><p className="truncate font-medium">{data.profile.full_name ?? "Discord user"}</p><p className="truncate text-sm text-primary">@{getProfileHandle(data.profile)}</p><p className="truncate text-sm text-muted-foreground">{data.profile.email}</p></div>
          </div>
          <form action={updateProfileAction} className="grid gap-3">
            <Label htmlFor="display-name" className="flex items-center gap-2"><User className="size-4" /> Display name</Label>
            <Input id="display-name" name="fullName" defaultValue={data.profile.full_name ?? ""} placeholder="Display name" />
            <Button size="icon" className="justify-self-end" aria-label="Save profile" title="Save profile"><Save /></Button>
          </form>
          <Separator />
          <AccentColorPicker />
          <Separator />
          <form action={signOutAction} className="flex justify-end"><Button variant="outline" size="icon" aria-label="Sign out" title="Sign out"><LogOut /></Button></form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
