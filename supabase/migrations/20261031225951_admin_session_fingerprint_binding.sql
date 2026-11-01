create table if not exists private.admin_session_fingerprints (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_fingerprint text not null check (ip_fingerprint ~ '^[a-f0-9]{64}$'),
  user_agent_fingerprint text not null check (user_agent_fingerprint ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default pg_catalog.now(),
  last_seen_at timestamptz not null default pg_catalog.now(),
  revoked_at timestamptz,
  revoked_reason text check (revoked_reason in ('fingerprint_changed', 'logout'))
);

alter table private.admin_session_fingerprints enable row level security;
revoke all on table private.admin_session_fingerprints from public, anon, authenticated;
revoke create on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

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

create or replace function public.admin_validate_session(
  p_session_id uuid,
  p_ip_fingerprint text,
  p_user_agent_fingerprint text
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.validate_admin_session(p_session_id, p_ip_fingerprint, p_user_agent_fingerprint);
$function$;

revoke all on function public.admin_validate_session(uuid, text, text) from public, anon;
grant execute on function public.admin_validate_session(uuid, text, text) to authenticated;

create or replace function private.revoke_admin_session(p_session_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_user_id is null or p_session_id is null then
    raise exception 'Sessão administrativa inválida.' using errcode = '42501';
  end if;

  select coalesce(u.raw_app_meta_data ->> 'is_admin', 'false') = 'true'
    into v_is_admin
  from auth.users u
  where u.id = v_user_id;

  if v_is_admin is not true then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  update private.admin_session_fingerprints
    set revoked_at = pg_catalog.now(),
        revoked_reason = 'logout',
        last_seen_at = pg_catalog.now()
  where session_id = p_session_id
    and user_id = v_user_id
    and revoked_at is null;

  delete from auth.sessions
  where id = p_session_id
    and user_id = v_user_id;

  return true;
end;
$function$;

revoke all on function private.revoke_admin_session(uuid) from public, anon;
grant execute on function private.revoke_admin_session(uuid) to authenticated;

create or replace function public.admin_revoke_session(p_session_id uuid)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.revoke_admin_session(p_session_id);
$function$;

revoke all on function public.admin_revoke_session(uuid) from public, anon;
grant execute on function public.admin_revoke_session(uuid) to authenticated;
