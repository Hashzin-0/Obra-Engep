create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists private.user_upload_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, window_started_at)
);

alter table private.user_upload_rate_limits enable row level security;
grant select, insert, update, delete on private.user_upload_rate_limits to authenticated;

create policy user_upload_rate_limits_own_rows
  on private.user_upload_rate_limits
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.consume_user_upload_rate_limit()
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_bucket timestamptz := date_trunc('minute', statement_timestamp());
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  insert into private.user_upload_rate_limits (user_id, window_started_at, request_count)
  values (v_user_id, v_bucket, 1)
  on conflict (user_id, window_started_at)
  do update set request_count = private.user_upload_rate_limits.request_count + 1
  returning request_count into v_count;

  delete from private.user_upload_rate_limits
  where user_id = v_user_id
    and window_started_at < v_bucket - interval '2 hours';

  return v_count <= 10;
end;
$$;

revoke all on function public.consume_user_upload_rate_limit() from public, anon;
grant execute on function public.consume_user_upload_rate_limit() to authenticated;

alter policy user_media_insert
  on storage.objects
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '\.webp$'
    and metadata ->> 'mimetype' = 'image/webp'
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
    and public.consume_user_upload_rate_limit()
  );
