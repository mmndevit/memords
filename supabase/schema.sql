-- Vocabulary storage for Memords.
-- Run this in the Supabase SQL editor (or `supabase db push`) to create the
-- table the app reads from and writes to.

create table if not exists public.words (
  id            uuid primary key default gen_random_uuid(),
  english       text        not null,
  russian       text        not null,
  translations  text[]      not null default '{}',
  transcription text        not null default '',
  audio_url     text,
  definitions   jsonb       not null default '[]',
  examples      text[]      not null default '{}',
  created_at    timestamptz not null default now()
);

-- Newest words first is the app's default ordering.
create index if not exists words_created_at_idx
  on public.words (created_at desc);

-- Row Level Security -------------------------------------------------------
-- The app ships with no auth, so the policies below make the table readable
-- and writable by the public `anon` role. This is fine for a personal/demo
-- deployment. For a real multi-user app: add a `user_id uuid references
-- auth.users` column, enable Supabase Auth, and scope every policy with
-- `auth.uid() = user_id` so each learner sees only their own words.

alter table public.words enable row level security;

create policy "Public read"   on public.words for select using (true);
create policy "Public insert" on public.words for insert with check (true);
create policy "Public delete" on public.words for delete using (true);
