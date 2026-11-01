-- Counter rows are writable only by the narrowly scoped SECURITY DEFINER
-- routines below. Authenticated users cannot reset their own rate limits.
revoke all on table
  private.admin_rate_limits,
  private.user_upload_rate_limits,
  private.user_action_rate_limits
from public, anon, authenticated;

drop policy if exists admin_rate_limits_select_own on private.admin_rate_limits;
drop policy if exists admin_rate_limits_insert_own on private.admin_rate_limits;
drop policy if exists admin_rate_limits_update_own on private.admin_rate_limits;
drop policy if exists admin_rate_limits_delete_expired on private.admin_rate_limits;

drop policy if exists user_upload_rate_limits_select_own on private.user_upload_rate_limits;
drop policy if exists user_upload_rate_limits_insert_own on private.user_upload_rate_limits;
drop policy if exists user_upload_rate_limits_update_own on private.user_upload_rate_limits;
drop policy if exists user_upload_rate_limits_delete_expired on private.user_upload_rate_limits;
drop policy if exists user_upload_rate_limits_own_rows on private.user_upload_rate_limits;

drop policy if exists user_action_rate_limits_select_own on private.user_action_rate_limits;
drop policy if exists user_action_rate_limits_insert_own on private.user_action_rate_limits;
drop policy if exists user_action_rate_limits_update_own on private.user_action_rate_limits;
drop policy if exists user_action_rate_limits_delete_expired on private.user_action_rate_limits;

alter table private.admin_rate_limits enable row level security;
alter table private.user_upload_rate_limits enable row level security;
alter table private.user_action_rate_limits enable row level security;

revoke create on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.consume_admin_rate_limit(p_action text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_bucket timestamptz := pg_catalog.date_trunc('minute', pg_catalog.statement_timestamp());
  v_limit integer;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  select coalesce(u.raw_app_meta_data ->> 'is_admin', 'false') = 'true'
    into v_is_admin
  from auth.users u
  where u.id = v_user_id;

  if v_is_admin is not true then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  case p_action
    when 'read' then v_limit := 90;
    when 'write' then v_limit := 20;
    when 'session' then v_limit := 5;
    else raise exception 'Operação de limite inválida.' using errcode = '22023';
  end case;

  insert into private.admin_rate_limits (user_id, action, window_started_at, request_count)
  values (v_user_id, p_action, v_bucket, 1)
  on conflict (user_id, action, window_started_at)
  do update set request_count = private.admin_rate_limits.request_count + 1
  returning request_count into v_count;

  delete from private.admin_rate_limits
  where user_id = v_user_id
    and window_started_at < v_bucket - interval '2 hours';

  return v_count <= v_limit;
end;
$function$;

revoke all on function private.consume_admin_rate_limit(text) from public, anon;
grant execute on function private.consume_admin_rate_limit(text) to authenticated;

create or replace function public.admin_consume_rate_limit(p_action text)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.consume_admin_rate_limit(p_action);
$function$;

revoke all on function public.admin_consume_rate_limit(text) from public, anon;
grant execute on function public.admin_consume_rate_limit(text) to authenticated;

create or replace function private.consume_user_upload_rate_limit()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_bucket timestamptz := pg_catalog.date_trunc('minute', pg_catalog.statement_timestamp());
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
$function$;

revoke all on function private.consume_user_upload_rate_limit() from public, anon;
grant execute on function private.consume_user_upload_rate_limit() to authenticated;

create or replace function public.consume_user_upload_rate_limit()
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.consume_user_upload_rate_limit();
$function$;

revoke all on function public.consume_user_upload_rate_limit() from public, anon;
grant execute on function public.consume_user_upload_rate_limit() to authenticated;

create or replace function private.consume_user_action_rate_limit(p_action text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_bucket timestamptz := pg_catalog.date_trunc('minute', pg_catalog.statement_timestamp());
  v_limit integer;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  case p_action
    when 'push_test' then v_limit := 5;
    else raise exception 'Operação de limite inválida.' using errcode = '22023';
  end case;

  insert into private.user_action_rate_limits (user_id, action, window_started_at, request_count)
  values (v_user_id, p_action, v_bucket, 1)
  on conflict (user_id, action, window_started_at)
  do update set request_count = private.user_action_rate_limits.request_count + 1
  returning request_count into v_count;

  delete from private.user_action_rate_limits
  where user_id = v_user_id
    and window_started_at < v_bucket - interval '2 hours';

  return v_count <= v_limit;
end;
$function$;

revoke all on function private.consume_user_action_rate_limit(text) from public, anon;
grant execute on function private.consume_user_action_rate_limit(text) to authenticated;

create or replace function public.consume_user_action_rate_limit(p_action text)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.consume_user_action_rate_limit(p_action);
$function$;

revoke all on function public.consume_user_action_rate_limit(text) from public, anon;
grant execute on function public.consume_user_action_rate_limit(text) to authenticated;
