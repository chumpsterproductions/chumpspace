export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  discord_username: string | null;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  role: "owner" | "admin" | "member";
  boardCount: number;
  memberCount: number;
};

export type WorkspaceInvite = {
  id: string;
  workspace_id: string;
  token: string;
  created_by: string;
  created_at: string;
};

export type BoardSummary = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  visibility: "workspace" | "private";
  is_starred: boolean;
  completed_list_id: string | null;
  archived_at: string | null;
};

export type WorkspaceDashboardData = {
  profile: Profile;
  workspaces: WorkspaceSummary[];
  boards: BoardSummary[];
  notifications: NotificationRecord[];
  invites: WorkspaceInvite[];
};

export type Label = {
  id: string;
  name: string;
  color: string;
  board_id: string;
};

export type BoardMember = {
  profile_id: string;
  role: string;
  profile: Profile;
};

export type Attachment = {
  id: string;
  card_id: string;
  name: string;
  url: string;
  created_at: string;
};

export type Comment = {
  id: string;
  card_id: string;
  body: string;
  created_at: string;
  profile: Profile;
};

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  text: string;
  position: number;
  is_done: boolean;
};

export type Checklist = {
  id: string;
  card_id: string;
  title: string;
  position: number;
  items: ChecklistItem[];
};

export type CardRecord = {
  id: string;
  board_id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  due_at: string | null;
  start_at: string | null;
  cover_color: string | null;
  archived_at: string | null;
  is_completed: boolean;
  labels: Label[];
  members: Profile[];
  attachments: Attachment[];
  comments: Comment[];
  checklists: Checklist[];
};

export type ListRecord = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  archived_at: string | null;
  cards: CardRecord[];
};

export type ActivityRecord = {
  id: string;
  board_id: string;
  card_id: string | null;
  action: string;
  details: string | null;
  created_at: string;
  profile: Profile;
};

export type NotificationRecord = {
  id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  board_id: string;
  card_id: string | null;
};

export type BoardPageData = {
  board: BoardSummary & {
    workspace: {
      id: string;
      name: string;
      slug: string;
      icon_url?: string | null;
    };
  };
  labels: Label[];
  members: BoardMember[];
  lists: ListRecord[];
  activities: ActivityRecord[];
  currentUserId: string;
};
