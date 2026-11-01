alter table private.admin_session_fingerprints
  drop constraint if exists admin_session_fingerprints_revoked_reason_check;

alter table private.admin_session_fingerprints
  add constraint admin_session_fingerprints_revoked_reason_check
  check (revoked_reason in ('fingerprint_changed', 'session_expired', 'logout'));

create or replace function private.validate_admin_session(
  p_session_id uuid,
  p_ip_fingerprint text,
  p_user_agent_fingerprint text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_existing private.admin_session_fingerprints%rowtype;
begin
  if v_user_id is null
     or p_session_id is null
     or p_ip_fingerprint !~ '^[a-f0-9]{64}$'
     or p_user_agent_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'Sessão administrativa inválida.' using errcode = '42501';
  end if;

  select coalesce(u.raw_app_meta_data ->> 'is_admin', 'false') = 'true'
    into v_is_admin
  from auth.users u
  where u.id = v_user_id;

  if v_is_admin is not true then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.sessions s
    where s.id = p_session_id
      and s.user_id = v_user_id
  ) then
    return false;
  end if;

  insert into private.admin_session_fingerprints (
    session_id, user_id, ip_fingerprint, user_agent_fingerprint
  )
  values (
    p_session_id, v_user_id, p_ip_fingerprint, p_user_agent_fingerprint
  )
  on conflict (session_id) do nothing;

  select *
    into v_existing
  from private.admin_session_fingerprints
  where session_id = p_session_id
  for update;

  if not found or v_existing.user_id <> v_user_id or v_existing.revoked_at is not null then
    return false;
  end if;

  -- The admin cookie is a short, absolute session: activity never extends this window.
  if v_existing.first_seen_at <= pg_catalog.now() - interval '10 minutes' then
    update private.admin_session_fingerprints
      set revoked_at = pg_catalog.now(),
          revoked_reason = 'session_expired',
          last_seen_at = pg_catalog.now()
    where session_id = p_session_id;

    delete from auth.sessions
    where id = p_session_id
      and user_id = v_user_id;

    return false;
  end if;

  if v_existing.ip_fingerprint <> p_ip_fingerprint
     or v_existing.user_agent_fingerprint <> p_user_agent_fingerprint then
    update private.admin_session_fingerprints
      set revoked_at = pg_catalog.now(),
          revoked_reason = 'fingerprint_changed',
          last_seen_at = pg_catalog.now()
    where session_id = p_session_id;

    delete from auth.sessions
    where id = p_session_id
      and user_id = v_user_id;

    return false;
  end if;

  update private.admin_session_fingerprints
    set last_seen_at = pg_catalog.now()
  where session_id = p_session_id;

  return true;
end;
$function$;

revoke all on function private.validate_admin_session(uuid, text, text) from public, anon;
grant execute on function private.validate_admin_session(uuid, text, text) to authenticated;
