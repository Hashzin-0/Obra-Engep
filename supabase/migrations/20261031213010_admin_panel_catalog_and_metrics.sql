create table if not exists public.automotive_catalog (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Geral' check (char_length(category) between 1 and 80),
  name text not null check (char_length(name) between 1 and 180),
  manufacturer text not null default '',
  ph_type text not null default 'Neutro' check (ph_type in ('Neutro', 'Ácido', 'Alcalino', 'Não informado')),
  target_surfaces text[] not null default '{}',
  dilution_ratio text not null default '',
  dilution_number numeric not null default 1 check (dilution_number > 0),
  action_time_minutes text not null default '',
  yield_info text not null default '',
  instructions text not null default '',
  cautions text[] not null default '{}',
  source_label text not null default '',
  source_url text,
  image_url text,
  verified_date date,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automotive_catalog_source_url_https check (source_url is null or source_url ~* '^https://'),
  constraint automotive_catalog_image_url_https check (image_url is null or image_url ~* '^https://')
);

create index if not exists automotive_catalog_published_order_idx
  on public.automotive_catalog (is_published, sort_order, name);

alter table public.automotive_catalog enable row level security;
grant select on public.automotive_catalog to anon, authenticated;
grant insert, update, delete on public.automotive_catalog to authenticated;

create policy "automotive_catalog_public_read"
  on public.automotive_catalog for select to anon, authenticated
  using (is_published = true or coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "automotive_catalog_admin_insert"
  on public.automotive_catalog for insert to authenticated
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "automotive_catalog_admin_update"
  on public.automotive_catalog for update to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "automotive_catalog_admin_delete"
  on public.automotive_catalog for delete to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "feedback_admin_read"
  on public.feedback for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "feedback_admin_update"
  on public.feedback for update to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "feedback_admin_delete"
  on public.feedback for delete to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');
