-- Coach badges table
create table if not exists public.coach_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

-- Enable RLS
alter table public.coach_badges enable row level security;

-- RLS policies
create policy "Users can view their own badges"
  on public.coach_badges for select
  using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists idx_coach_badges_user_id on public.coach_badges(user_id);
