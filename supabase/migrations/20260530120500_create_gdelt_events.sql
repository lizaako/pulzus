create table if not exists public.gdelt_events (
  id text primary key,
  event_date timestamptz not null,
  country_code text,
  lat double precision,
  lng double precision,
  event_code text,
  goldstein_scale numeric(5, 2) not null,
  source_url text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists gdelt_events_country_code_idx
  on public.gdelt_events (country_code);

create index if not exists gdelt_events_event_date_idx
  on public.gdelt_events (event_date desc);

alter table public.gdelt_events enable row level security;

drop policy if exists "Public read gdelt events" on public.gdelt_events;
create policy "Public read gdelt events"
  on public.gdelt_events
  for select
  using (true);
