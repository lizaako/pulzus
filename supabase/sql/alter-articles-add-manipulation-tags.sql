alter table public.articles
  add column if not exists manipulation_tags text[];
