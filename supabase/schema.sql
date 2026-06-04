create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  discord_username text,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_discord_username_key
on public.profiles(discord_username)
where discord_username is not null;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_url text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, profile_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  visibility text not null default 'workspace',
  is_starred boolean not null default false,
  completed_list_id uuid references public.lists(id) on delete set null,
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  due_at timestamptz,
  start_at timestamptz,
  cover_color text,
  is_completed boolean not null default false,
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  color text not null default '#4f46e5'
);

create table if not exists public.card_members (
  card_id uuid not null references public.cards(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (card_id, profile_id)
);

create table if not exists public.card_labels (
  card_id uuid not null references public.cards(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (card_id, label_id)
);

create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  title text not null,
  position integer not null default 0
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  text text not null,
  position integer not null default 0,
  is_done boolean not null default false
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  name text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid references public.cards(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid references public.cards(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_boards_workspace on public.boards(workspace_id);
create index if not exists idx_workspace_invites_workspace on public.workspace_invites(workspace_id, created_at desc);
create index if not exists idx_lists_board on public.lists(board_id, position);
create index if not exists idx_cards_list on public.cards(list_id, position);
create index if not exists idx_cards_board on public.cards(board_id);
create index if not exists idx_comments_card on public.comments(card_id, created_at desc);
create index if not exists idx_activity_board on public.activity_logs(board_id, created_at desc);
create index if not exists idx_notifications_profile on public.notifications(profile_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.boards enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;
alter table public.labels enable row level security;
alter table public.card_members enable row level security;
alter table public.card_labels enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id and profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.workspaces
    where id = target_workspace_id and owner_id = auth.uid()
  );
$$;

create or replace function public.card_workspace_id(target_card_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select boards.workspace_id
  from public.cards
  join public.boards on boards.id = cards.board_id
  where cards.id = target_card_id;
$$;

create or replace function public.board_workspace_id(target_board_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.boards where id = target_board_id;
$$;

create policy "profiles are visible to signed in users" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles manage themselves" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update themselves" on public.profiles
  for update using (auth.uid() = id);

create policy "workspace members can read workspaces" on public.workspaces
  for select using (public.is_workspace_member(id) or owner_id = auth.uid());

create policy "signed in users create workspaces" on public.workspaces
  for insert with check (auth.uid() = owner_id);

create policy "owners can update workspaces" on public.workspaces
  for update using (owner_id = auth.uid());

create policy "workspace members can read membership" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "workspace owners can read invites" on public.workspace_invites
  for select using (
    exists (
      select 1
      from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

create policy "authenticated users can redeem invites" on public.workspace_invites
  for select using (auth.role() = 'authenticated');

create policy "workspace owners can create invites" on public.workspace_invites
  for insert with check (
    exists (
      select 1
      from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
    and created_by = auth.uid()
  );

create policy "workspace owners and admins can manage membership" on public.workspace_members
  for insert with check (
    exists (
      select 1
      from public.workspaces
      where id = workspace_members.workspace_id
        and owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.workspace_members as existing_member
      where existing_member.workspace_id = workspace_members.workspace_id
        and existing_member.profile_id = auth.uid()
        and existing_member.role in ('owner', 'admin')
    )
  );

create policy "workspace members can read boards" on public.boards
  for select using (public.is_workspace_member(workspace_id));

create policy "workspace owners can create boards" on public.boards
  for insert with check (
    auth.uid() = created_by
    and exists (
      select 1
      from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

create policy "workspace members can update boards" on public.boards
  for update using (public.is_workspace_member(workspace_id));

create policy "workspace owners can delete boards" on public.boards
  for delete using (
    exists (
      select 1
      from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

create policy "workspace members can read lists" on public.lists
  for select using (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "workspace members can create lists" on public.lists
  for insert with check (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "workspace members can update lists" on public.lists
  for update using (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "workspace members can read cards" on public.cards
  for select using (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "workspace members can create cards" on public.cards
  for insert with check (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "workspace members can update cards" on public.cards
  for update using (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "workspace members can read labels" on public.labels
  for select using (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "workspace members can manage labels" on public.labels
  for all using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "workspace members can manage card members" on public.card_members
  for all using (public.is_workspace_member(public.card_workspace_id(card_id)))
  with check (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "workspace members can manage card labels" on public.card_labels
  for all using (public.is_workspace_member(public.card_workspace_id(card_id)))
  with check (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "workspace members can read checklists" on public.checklists
  for select using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "workspace members can manage checklists" on public.checklists
  for all using (public.is_workspace_member(public.card_workspace_id(card_id)))
  with check (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "workspace members can read checklist items" on public.checklist_items
  for select using (
    public.is_workspace_member(
      (
        select boards.workspace_id
        from public.checklists
        join public.cards on cards.id = checklists.card_id
        join public.boards on boards.id = cards.board_id
        where checklists.id = checklist_id
      )
    )
  );

create policy "workspace members can manage checklist items" on public.checklist_items
  for all using (
    public.is_workspace_member(
      (
        select boards.workspace_id
        from public.checklists
        join public.cards on cards.id = checklists.card_id
        join public.boards on boards.id = cards.board_id
        where checklists.id = checklist_id
      )
    )
  )
  with check (
    public.is_workspace_member(
      (
        select boards.workspace_id
        from public.checklists
        join public.cards on cards.id = checklists.card_id
        join public.boards on boards.id = cards.board_id
        where checklists.id = checklist_id
      )
    )
  );

create policy "workspace members can manage comments" on public.comments
  for all using (public.is_workspace_member(public.card_workspace_id(card_id)))
  with check (public.is_workspace_member(public.card_workspace_id(card_id)) and auth.uid() = profile_id);

create policy "workspace members can manage attachments" on public.attachments
  for all using (public.is_workspace_member(public.card_workspace_id(card_id)))
  with check (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "workspace members can manage activity" on public.activity_logs
  for all using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)) and auth.uid() = profile_id);

create policy "users can read their own notifications" on public.notifications
  for select using (auth.uid() = profile_id);

create policy "workspace members can create notifications" on public.notifications
  for insert with check (
    public.is_workspace_member(public.board_workspace_id(board_id))
  );

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public media is readable" on storage.objects
  for select using (bucket_id = 'media');

create policy "authenticated users upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');

create policy "authenticated users update their media" on storage.objects
  for update to authenticated using (bucket_id = 'media');
