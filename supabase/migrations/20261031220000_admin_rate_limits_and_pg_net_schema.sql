create table if not exists public.admin_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('read', 'write', 'session')),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, action, window_started_at)
);

alter table public.admin_rate_limits enable row level security;

grant select, insert, update, delete on public.admin_rate_limits to authenticated;

create policy "admin_rate_limits_admin_own_rows"
  on public.admin_rate_limits
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  with check (
    user_id = (select auth.uid())
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
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

  insert into public.admin_rate_limits (user_id, action, window_started_at, request_count)
  values (v_user_id, p_action, v_bucket, 1)
  on conflict (user_id, action, window_started_at)
  do update set request_count = public.admin_rate_limits.request_count + 1
  returning request_count into v_count;

  delete from public.admin_rate_limits
  where user_id = v_user_id
    and window_started_at < v_bucket - interval '2 hours';

  return v_count <= v_limit;
end;
$$;

revoke all on function public.admin_consume_rate_limit(text) from public, anon;
grant execute on function public.admin_consume_rate_limit(text) to authenticated;

-- pg_net is non-relocatable. The queue was checked before this migration and was empty.
drop extension pg_net;
create extension pg_net with schema extensions;
