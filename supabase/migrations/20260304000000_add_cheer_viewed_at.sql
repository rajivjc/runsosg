-- Add viewed_at timestamp to cheers for read receipts
alter table public.cheers
  add column viewed_at timestamptz default null;

-- Index for efficient "unviewed cheers" queries
create index if not exists idx_cheers_viewed_at on public.cheers(viewed_at)
  where viewed_at is null;
