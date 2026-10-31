drop function if exists public.admin_session_is_active(uuid, uuid);

create or replace function public.admin_session_is_active(
  p_user_id uuid,
  p_session_id uuid,
  p_client_ip inet,
  p_user_agent text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_is_admin boolean := false;
  v_session_ip inet;
  v_session_user_agent text;
begin
  if p_user_id is null
     or p_session_id is null
     or p_client_ip is null
     or p_user_agent is null
     or length(p_user_agent) > 512 then
    return false;
  end if;

  select
    coalesce(u.raw_app_meta_data ->> 'is_admin', 'false') = 'true',
    s.ip,
    s.user_agent
  into
    v_is_admin,
    v_session_ip,
    v_session_user_agent
  from auth.users u
  join auth.sessions s on s.user_id = u.id
  where u.id = p_user_id
    and s.id = p_session_id
    and (s.not_after is null or s.not_after > pg_catalog.now());

  if not found or v_is_admin is not true then
    return false;
  end if;

  if v_session_ip is null
     or v_session_user_agent is null
     or v_session_ip <> p_client_ip
     or v_session_user_agent <> p_user_agent then
    delete from auth.sessions
    where id = p_session_id
      and user_id = p_user_id;
    return false;
  end if;

  return true;
end;
$function$;

revoke all on function public.admin_session_is_active(uuid, uuid, inet, text) from public, anon, authenticated;
grant execute on function public.admin_session_is_active(uuid, uuid, inet, text) to service_role;
