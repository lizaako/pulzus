alter table public.articles
  add column if not exists conflict_event_type text,
  add column if not exists conflict_country text,
  add column if not exists conflict_location text,
  add column if not exists conflict_latitude double precision,
  add column if not exists conflict_longitude double precision,
  add column if not exists conflict_fatalities integer,
  add column if not exists conflict_description text,
  add column if not exists conflict_severity text;

create index if not exists articles_conflict_published_idx
  on public.articles (published_at desc)
  where conflict_latitude is not null
    and conflict_longitude is not null;
