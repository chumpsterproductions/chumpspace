# Chumpspace

Chumpspace is a semi-barebones Trello-style collaboration app built with Next.js App Router and Supabase, designed to deploy on the Vercel free plan.

## Included features

- Email/password auth, Discord auth, and account profiles
- Workspaces with member invitations
- Boards with visibility and starring
- Drag-and-drop lists and cards
- Card details with descriptions, due dates, start dates, cover colors, completion state
- Labels, assignees, checklists, comments, attachments, image uploads, activity feed
- `@handle` mentions with dashboard notifications
- Profile photo uploads
- Card and list archiving
- Lightweight collaboration via periodic refresh, which keeps the app Vercel-friendly

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase Auth + Postgres + Storage
- `@dnd-kit` for drag and drop

## Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](/C:/Users/ivads/Documents/GAME-PROJECTS/RBX-PROJECTS/chumpspace/supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

If you only have the older legacy client key available, you can use:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. In Supabase Auth settings:
   - Set the site URL to your Vercel domain or local URL.
   - Add `/auth/callback` as an auth redirect path if you enable email confirmation or OAuth later.
   - Enable Discord provider if you want Discord sign-in.
   - If you want instant local signup, disable email confirmation for development.
5. Run:

```bash
npm install
npm run dev
```

## Deploying to Vercel

1. Push this project to GitHub.
2. Import it into Vercel.
3. Add the same two environment variables in Vercel.
4. Deploy.

Because auth, Postgres, storage, and mentions are handled by Supabase's free tier, the app stays within Vercel free-plan constraints without requiring a paid service.
