alter table private.user_action_rate_limits
  drop constraint if exists user_action_rate_limits_action_check;

alter table private.user_action_rate_limits
  add constraint user_action_rate_limits_action_check
  check (action in ('push_test', 'push_subscribe'));

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
    when 'push_subscribe' then v_limit := 10;
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

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.consume_user_action_rate_limit('push_subscribe')
  );

create or replace function private.enforce_push_subscription_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_other_subscriptions integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));

  select count(*)::integer
    into v_other_subscriptions
  from public.push_subscriptions p
  where p.user_id = new.user_id
    and p.endpoint <> new.endpoint;

  if v_other_subscriptions >= 20 then
    raise exception 'Limite de vinte dispositivos com notificações por usuário atingido.'
      using errcode = '54000';
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_push_subscription_cap() from public, anon;
grant execute on function private.enforce_push_subscription_cap() to authenticated;

drop trigger if exists enforce_push_subscription_cap on public.push_subscriptions;
create trigger enforce_push_subscription_cap
before insert or update of user_id, endpoint
on public.push_subscriptions
for each row execute function private.enforce_push_subscription_cap();
