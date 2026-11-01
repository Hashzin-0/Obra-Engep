create or replace function public.claim_due_deadlines()
returns setof public.deadlines
language sql
security invoker
set search_path = ''
as $function$
  with due as (
    select id
    from public.deadlines
    where status <> 'concluido'
      and notified_at is null
      and (due_date + coalesce(due_time, '09:00'::time)) at time zone timezone
          - pg_catalog.make_interval(mins => reminder_minutes_before) <= pg_catalog.now()
      and (due_date + coalesce(due_time, '09:00'::time)) at time zone timezone
          >= pg_catalog.now() - interval '1 day'
    order by due_date, due_time
    for update skip locked
  ), updated as (
    update public.deadlines d
    set notified_at = pg_catalog.now()
    from due
    where d.id = due.id
    returning d.*
  )
  select * from updated;
$function$;

revoke all on function public.claim_due_deadlines() from public, anon, authenticated;
grant execute on function public.claim_due_deadlines() to service_role;

create or replace function public.dispatch_due_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  base_url text;
  cron_secret text;
begin
  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'SUPABASE_URL'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'CRON_SECRET'
  limit 1;

  if base_url is null or cron_secret is null then
    raise notice 'SUPABASE_URL/CRON_SECRET ausentes no Vault; lembrete não enviado.';
    return;
  end if;

  perform net.http_post(
    url := pg_catalog.rtrim(base_url, '/') || '/functions/v1/send-reminders',
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
end;
$function$;

revoke all on function public.dispatch_due_reminders() from public, anon, authenticated;
grant execute on function public.dispatch_due_reminders() to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Profissional'))
  on conflict (id) do nothing;

  insert into public.app_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
