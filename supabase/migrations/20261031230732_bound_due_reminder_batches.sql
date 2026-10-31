create or replace function public.claim_due_deadlines()
returns setof public.deadlines
language sql
volatile
security invoker
set search_path = ''
as $function$
  with due as (
    select d.id
    from public.deadlines d
    where d.status <> 'concluido'
      and d.notified_at is null
      and (d.due_date + coalesce(d.due_time, '09:00'::time)) at time zone d.timezone
          - make_interval(mins => d.reminder_minutes_before) <= now()
      and (d.due_date + coalesce(d.due_time, '09:00'::time)) at time zone d.timezone
          >= now() - interval '1 day'
    order by d.due_date, d.due_time
    limit 100
    for update skip locked
  ), updated as (
    update public.deadlines d
    set notified_at = now()
    from due
    where d.id = due.id
    returning d.*
  )
  select * from updated;
$function$;

revoke all on function public.claim_due_deadlines() from public, anon, authenticated;
grant execute on function public.claim_due_deadlines() to service_role;
