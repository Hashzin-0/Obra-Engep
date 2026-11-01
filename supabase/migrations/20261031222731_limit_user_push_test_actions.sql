create table if not exists private.user_action_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('push_test')),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, action, window_started_at)
);

alter table private.user_action_rate_limits enable row level security;
grant select, insert, update, delete on private.user_action_rate_limits to authenticated;

create policy user_action_rate_limits_select_own
  on private.user_action_rate_limits for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_action_rate_limits_insert_own
  on private.user_action_rate_limits for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy user_action_rate_limits_update_own
  on private.user_action_rate_limits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy user_action_rate_limits_delete_expired
  on private.user_action_rate_limits for delete to authenticated
  using (
    user_id = (select auth.uid())
    and window_started_at < date_trunc('minute', now()) - interval '2 hours'
  );

create or replace function public.consume_user_action_rate_limit(p_action text)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_bucket timestamptz := date_trunc('minute', statement_timestamp());
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
$$;

revoke all on function public.consume_user_action_rate_limit(text) from public, anon;
grant execute on function public.consume_user_action_rate_limit(text) to authenticated;
