-- Add structured goal fields to athletes for progress tracking
alter table public.athletes
  add column if not exists goal_type text check (goal_type in ('distance_total', 'distance_single', 'session_count')),
  add column if not exists goal_target numeric;
