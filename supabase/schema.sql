-- EcoScan community schema.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_emoji text not null default '🌱',
  city text,
  created_at timestamptz not null default now()
);

do $$ begin
  create type public.post_type as enum ('cleanup', 'badge', 'level', 'streak');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.post_type not null,
  caption text,
  before_url text,
  after_url text,
  items_removed int,
  xp_earned int,
  badge_id text,
  level_reached int,
  streak_days int,
  city text not null default 'default',
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_city_idx on public.posts (city, created_at desc);

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- Everything is world-readable (it is a public community feed); writes are
-- restricted to the owning user.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);

drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "posts are readable by everyone" on public.posts;
create policy "posts are readable by everyone"
  on public.posts for select using (true);

drop policy if exists "users insert their own posts" on public.posts;
create policy "users insert their own posts"
  on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "users delete their own posts" on public.posts;
create policy "users delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

drop policy if exists "reactions are readable by everyone" on public.reactions;
create policy "reactions are readable by everyone"
  on public.reactions for select using (true);

drop policy if exists "users insert their own reactions" on public.reactions;
create policy "users insert their own reactions"
  on public.reactions for insert with check (auth.uid() = user_id);

drop policy if exists "users delete their own reactions" on public.reactions;
create policy "users delete their own reactions"
  on public.reactions for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: cleanup before/after photos
-- Photos are uploaded ONLY when a user explicitly chooses to share a quest.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('cleanup-photos', 'cleanup-photos', true)
on conflict (id) do nothing;

drop policy if exists "cleanup photos are publicly readable" on storage.objects;
create policy "cleanup photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'cleanup-photos');

drop policy if exists "authenticated users upload cleanup photos" on storage.objects;
create policy "authenticated users upload cleanup photos"
  on storage.objects for insert
  with check (bucket_id = 'cleanup-photos' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Feed view: posts joined with author + reaction count, ready for the UI.
-- ---------------------------------------------------------------------------

create or replace view public.feed_posts
with (security_invoker = true) as
select
  p.id,
  p.user_id,
  p.type,
  p.caption,
  p.before_url,
  p.after_url,
  p.items_removed,
  p.xp_earned,
  p.badge_id,
  p.level_reached,
  p.streak_days,
  p.city,
  p.created_at,
  pr.username,
  pr.avatar_emoji,
  coalesce(r.reaction_count, 0) as reaction_count
from public.posts p
join public.profiles pr on pr.id = p.user_id
left join (
  select post_id, count(*) as reaction_count
  from public.reactions
  group by post_id
) r on r.post_id = p.id;
