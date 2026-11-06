-- Consolidate the published/admin read policy and add user-controlled LGPD records.
-- Existing user data remains untouched; new tables are empty at creation.

drop policy if exists app_updates_admin_read on public.app_updates;
drop policy if exists app_updates_read on public.app_updates;

create policy app_updates_select_published_or_admin
  on public.app_updates
  for select
  to authenticated
  using (
    published_at <= now()
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true'
  );

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  request_type text not null check (request_type in (
    'access', 'correction', 'deletion', 'portability', 'information', 'other'
  )),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'received' check (status in (
    'received', 'in_progress', 'completed', 'rejected'
  )),
  response_note text check (response_note is null or char_length(response_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_user_created_idx
  on public.privacy_requests (user_id, created_at desc);

alter table public.privacy_requests enable row level security;

grant select, insert on public.privacy_requests to authenticated;

create policy privacy_requests_select_own_or_admin
  on public.privacy_requests
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true'
  );

create policy privacy_requests_insert_own
  on public.privacy_requests
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy privacy_requests_admin_update
  on public.privacy_requests
  for update
  to authenticated
  using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true')
  with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');

drop trigger if exists set_privacy_requests_updated_at on public.privacy_requests;
create trigger set_privacy_requests_updated_at
  before update on public.privacy_requests
  for each row execute function public.set_updated_at();

create table if not exists public.privacy_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  purpose text not null check (purpose in ('push_notifications')),
  action text not null check (action in ('granted', 'revoked')),
  policy_version text not null check (char_length(policy_version) between 1 and 40),
  source text not null default 'web_push_permission'
    check (source in ('web_push_permission')),
  created_at timestamptz not null default now()
);

create index if not exists privacy_consent_events_user_created_idx
  on public.privacy_consent_events (user_id, created_at desc);

alter table public.privacy_consent_events enable row level security;

grant select, insert on public.privacy_consent_events to authenticated;

create policy privacy_consent_events_select_own_or_admin
  on public.privacy_consent_events
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true'
  );

create policy privacy_consent_events_insert_own
  on public.privacy_consent_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
