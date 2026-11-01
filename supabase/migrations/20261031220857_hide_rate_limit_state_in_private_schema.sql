-- Keep rate-limit counters out of the PostgREST-exposed public schema and prevent
-- authenticated callers from resetting the active minute bucket.
alter table public.admin_rate_limits set schema private;

drop policy if exists admin_rate_limits_admin_own_rows on private.admin_rate_limits;
create policy admin_rate_limits_select_own
  on private.admin_rate_limits for select to authenticated
  using (user_id = (select auth.uid()) and coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');
create policy admin_rate_limits_insert_own
  on private.admin_rate_limits for insert to authenticated
  with check (user_id = (select auth.uid()) and coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');
create policy admin_rate_limits_update_own
  on private.admin_rate_limits for update to authenticated
  using (user_id = (select auth.uid()) and coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
  with check (user_id = (select auth.uid()) and coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');
create policy admin_rate_limits_delete_expired
  on private.admin_rate_limits for delete to authenticated
  using (
    user_id = (select auth.uid())
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
    and window_started_at < date_trunc('minute', now()) - interval '2 hours'
  );

drop policy if exists user_upload_rate_limits_own_rows on private.user_upload_rate_limits;
create policy user_upload_rate_limits_select_own
  on private.user_upload_rate_limits for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_upload_rate_limits_insert_own
  on private.user_upload_rate_limits for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy user_upload_rate_limits_update_own
  on private.user_upload_rate_limits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy user_upload_rate_limits_delete_expired
  on private.user_upload_rate_limits for delete to authenticated
  using (
    user_id = (select auth.uid())
    and window_started_at < date_trunc('minute', now()) - interval '2 hours'
  );

create or replace function public.admin_consume_rate_limit(p_action text)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
  v_bucket timestamptz := date_trunc('minute', statement_timestamp());
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') <> 'true' then
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
$$;

revoke all on function public.admin_consume_rate_limit(text) from public, anon;
grant execute on function public.admin_consume_rate_limit(text) to authenticated;
