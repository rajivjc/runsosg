-- Cheers: short encouragement messages from caregivers to athletes
create table if not exists public.cheers (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) <= 100),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.cheers enable row level security;

-- Caregivers can view cheers they sent
create policy "Caregivers can view own cheers"
  on public.cheers for select
  using (auth.uid() = user_id);

-- Coaches/admins can view all cheers
create policy "Coaches can view all cheers"
  on public.cheers for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'coach'))
  );

-- Indexes
create index if not exists idx_cheers_athlete_id on public.cheers(athlete_id);
create index if not exists idx_cheers_created_at on public.cheers(created_at desc);
