
# Real G — Build Plan

A premium, monochrome, dark-themed self-improvement platform with goals, habits, communities, challenges, AI coach, and admin. Built in one pass on this project's actual stack.

## Stack (adjusted from spec)

- TanStack Start + React 19 + TypeScript + Vite (project default; not React Router DOM)
- Tailwind v4 + shadcn/ui + Framer Motion + TanStack Query + Zustand
- Lovable Cloud (Supabase: Postgres, Auth, Storage, Realtime)
- Lovable AI Gateway for the AI Accountability Coach (no OpenAI key needed)
- Google OAuth via Lovable's managed broker
- n8n, PostHog, Vercel are out of scope on Lovable hosting; will use Lovable's hosting and document where n8n hooks would attach later

## Design system

Tokens added to `src/styles.css` (oklch equivalents of the supplied palette): background `#000`, surface, card, elevated, border, white/secondary/muted text, success, warning, error, achievement gold `#D4AF37`. Inter + Poppins via `<link>` in `__root.tsx`. Radii 12–20px, generous spacing, Framer Motion micro-animations, mobile-first.

## Database schema (one migration)

Tables in `public` (each with explicit GRANTs, RLS on, policies scoped to `auth.uid()`):

- `profiles` (id=auth.users.id, username unique, name, avatar_url, bio, interests text[], location, privacy, created_at)
- `user_roles` (user_id, role app_role: user|moderator|admin) + `has_role()` SECURITY DEFINER
- `goals` (user_id, title, category enum, target_date, status, progress, done_today bool, created_at) — supports the "daily goal you tick off" UX
- `habits` (user_id, title, frequency, created_at) + `habit_completions` (habit_id, date) for streak/heatmap
- `communities` (id, slug, name, description, category, created_by, is_default) — seed 4 defaults: Health, Wealth, Relationships, Progress
- `community_members` (community_id, user_id, role)
- `posts` (community_id nullable for global feed, user_id, content, media_urls text[], created_at)
- `post_likes`, `post_comments`, `saved_posts`
- `community_messages` (community_id, user_id, content, media_url, created_at) — realtime chat
- `challenges`, `challenge_participants`
- `accountability_requests`, `accountability_pairs`
- `notifications`, `achievements`, `reports`
- `ai_coach_messages` (user_id, role, content, created_at)

Storage buckets: `avatars` (public), `post-media` (public), `community-media` (public).

## Auth & onboarding

- Google sign-in via `lovable.auth.signInWithOAuth("google", ...)`
- `supabase--configure_social_auth` called for Google
- `_authenticated/route.tsx` integration-managed gate
- Onboarding wizard at `/onboarding` (username → avatar upload → interests → first goals → enter dashboard). Trigger creates a `profiles` row + default `user` role on signup; onboarding marks profile complete.

## Routes

Public (each with own `head()` SEO):
- `/` landing (Hero, Why, Features, How it works, Community/Goal/Habit/Challenges showcase, testimonials, FAQ, final CTA)
- `/about`, `/features`, `/communities` (public preview), `/challenges` (public preview), `/contact`, `/privacy`, `/terms`

Authenticated (`/_authenticated/...`):
- `/dashboard` — widgets: Daily Progress, Goals (today, tickable), Habits (with add-new, streaks, heatmap), Active Challenges, Notifications, Growth Score
- `/feed` — global community feed: text + image/video upload, like/comment/save/report
- `/goals` — full goal manager (create/edit/archive, categories, progress, analytics)
- `/habits` — full habit tracker (add custom habits — no defaults; calendar heatmap, consistency score)
- `/communities` — list 4 defaults + user-created; `+ Create community` button
- `/communities/$slug` — community detail with Posts tab + Chat tab (Supabase Realtime), media uploads
- `/challenges` and `/challenges/$id`
- `/accountability` — matching, requests, check-ins
- `/coach` — AI Accountability Coach (streaming via Edge Function + Lovable AI Gateway)
- `/profile/$username` — public/community-only/private aware
- `/settings`
- `/notifications`

Admin (gated by `has_role('admin')` in a nested `_admin` layout):
- `/admin`, `/admin/users`, `/admin/reports`, `/admin/analytics`

## Server functions

- `profile.functions.ts` — get/update profile, complete onboarding
- `goals.functions.ts` — CRUD, toggle done-today, analytics
- `habits.functions.ts` — CRUD habits, log/unlog completion for a date, streak calc
- `communities.functions.ts` — list, create, join/leave, member counts
- `posts.functions.ts` — feed + community posts, like/comment/save/report
- `messages.functions.ts` — community chat send (reads via realtime subscription on client)
- `challenges.functions.ts`, `accountability.functions.ts`, `notifications.functions.ts`, `achievements.functions.ts`
- `admin.functions.ts` — gated with `has_role('admin')`
- `search.functions.ts` — users/communities/posts/challenges

All protected fns use `requireSupabaseAuth` middleware; `attachSupabaseAuth` registered in `start.ts`.

## AI Accountability Coach

Edge function `supabase/functions/ai-coach/index.ts` proxies to Lovable AI Gateway (`google/gemini-3-flash-preview`, streaming SSE). Persists messages to `ai_coach_messages`. Free in v1. Handles 402/429.

## Communities — exact requested behavior

- Seed exactly 4 default communities: Health, Wealth, Relationships, Progress
- Any user can create additional communities
- Each community page: post wall (text + image/video), realtime chat, members list
- Uploads go to `community-media` bucket; references stored on post/message rows

## Goals & Habits — exact requested behavior

- Dashboard Goals widget: "today's goals" list, each tickable (toggle `done_today`); separate full /goals manager for long-term goals
- Dashboard Habits widget: no defaults; "+ Add habit" opens dialog; each habit shows today's check, streak number, last-7-days dots; full /habits page shows heatmap + analytics

## Components

- Layout: `AppShell` (sidebar nav for authenticated, top nav for public), `MobileTabBar`
- UI: extend existing shadcn primitives, add `StatCard`, `StreakDot`, `HeatmapCalendar`, `GoalRow`, `HabitRow`, `MediaUploader`, `PostCard`, `ChatBubble`, `AchievementBadge`
- All themed via tokens — no hardcoded colors in components

## Security

- RLS on every table; policies use `auth.uid()` and `has_role()`
- Roles in dedicated `user_roles` table (never on profile)
- Zod validation on all server fn inputs (length/format caps)
- Storage policies: owner can write; public read for media buckets; profanity/size checks client-side
- Reports queue with admin moderation actions

## Out of scope for v1 (documented, not built)

- n8n workflows — add webhook surface later
- PostHog — leave hook points
- Payments/subscriptions — explicitly excluded per spec

## Build order (single pass)

1. Enable Lovable Cloud + configure Google auth + ensure LOVABLE_API_KEY
2. Migration: enums, tables, RLS, policies, GRANTs, triggers (auto-create profile + default role), seed 4 communities
3. Storage buckets + policies
4. Design tokens + fonts + AppShell + theming
5. Landing + public pages with SEO heads
6. Auth route + onboarding wizard
7. Dashboard + Goals + Habits (with the exact UX requested)
8. Communities list/detail + posts + realtime chat + media upload + create-community
9. Global Feed
10. Challenges + Accountability + Notifications + Achievements + Profile + Settings + Search
11. AI Coach edge function + UI (streaming)
12. Admin dashboard (users/reports/analytics)
13. Polish, a11y pass, mobile QA

Once you approve, I'll execute this in build mode. You can upload the logo any time — I'll wire it into the nav/landing when it arrives; until then I'll use a clean "REAL G" wordmark placeholder.
