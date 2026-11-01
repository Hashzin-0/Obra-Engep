alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_length_check
  check (length(endpoint) between 1 and 2048);

alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_allowed_check
  check (
    endpoint ~* '^https://(fcm\.googleapis\.com|push\.services\.mozilla\.com|([a-z0-9-]+\.)+push\.services\.mozilla\.com|web\.push\.apple\.com|([a-z0-9-]+\.)+notify\.windows\.com)/'
  );

alter table public.push_subscriptions
  add constraint push_subscriptions_p256dh_check
  check (length(p256dh) between 40 and 200 and p256dh ~ '^[A-Za-z0-9+/_=-]+$');

alter table public.push_subscriptions
  add constraint push_subscriptions_auth_check
  check (length(auth) between 16 and 100 and auth ~ '^[A-Za-z0-9+/_=-]+$');

alter table public.push_subscriptions
  add constraint push_subscriptions_user_agent_length_check
  check (user_agent is null or length(user_agent) <= 512);

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
    when 'broadcast' then
      v_limit := 3;
      v_bucket := pg_catalog.date_trunc('hour', pg_catalog.statement_timestamp());
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

create or replace function public.admin_session_is_active(
  p_user_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from auth.users u
    join auth.sessions s on s.user_id = u.id
    where u.id = p_user_id
      and s.id = p_session_id
      and coalesce(u.raw_app_meta_data ->> 'is_admin', 'false') = 'true'
      and (s.not_after is null or s.not_after > pg_catalog.now())
  );
$function$;

revoke all on function public.admin_session_is_active(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_session_is_active(uuid, uuid) to service_role;
