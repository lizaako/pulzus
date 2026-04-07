create table if not exists public.active_conflict_zones (
  event_id text primary key,
  zone_key text not null unique,
  event_date timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  event_type text not null,
  country text not null,
  location text not null,
  latitude double precision not null,
  longitude double precision not null,
  fatalities integer not null default 0,
  description text not null,
  summary text,
  source text not null,
  severity text not null default 'low',
  article_count integer not null default 0,
  report_count integer not null default 0,
  activity_score numeric(10, 2) not null default 0,
  trend text not null default 'stable',
  source_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists active_conflict_zones_activity_idx
  on public.active_conflict_zones (activity_score desc, last_seen_at desc);

create index if not exists active_conflict_zones_country_idx
  on public.active_conflict_zones (country, location);

alter table public.active_conflict_zones enable row level security;

drop policy if exists "Public read active conflict zones" on public.active_conflict_zones;
create policy "Public read active conflict zones"
  on public.active_conflict_zones
  for select
  using (true);
