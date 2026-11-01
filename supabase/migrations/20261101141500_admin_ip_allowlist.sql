-- Require an explicit Supabase Vault IP allowlist for every administrative session.
-- Configure the secret ADMIN_ALLOWED_IPS in Supabase Vault as comma/newline-separated
-- IP addresses or CIDR ranges. An absent or empty list denies all admin access.

do $migration$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'ADMIN_ALLOWED_IPS'
  ) then
    perform vault.create_secret(
      '[]',
      'ADMIN_ALLOWED_IPS',
      'Allowed source IPs/CIDR ranges for Obra-Engep administrative access. Empty list denies all admin access.'
    );
  end if;
end;
$migration$;

create or replace function private.validate_admin_session(
  p_session_id uuid,
  p_client_ip inet,
  p_user_agent text,
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
  v_session_ip inet;
  v_session_user_agent text;
  v_existing private.admin_session_fingerprints%rowtype;
  v_allowed_ips text;
  v_ip_entry text;
  v_ip_allowed boolean := false;
begin
  if v_user_id is null
     or p_session_id is null
     or p_client_ip is null
     or p_user_agent is null
     or length(p_user_agent) < 1
     or length(p_user_agent) > 512
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

  -- Read the allowlist only inside this privileged database function.
  -- Vault encrypts the value at rest; no API role receives access to the secret.
  select s.decrypted_secret
    into v_allowed_ips
  from vault.decrypted_secrets s
  where s.name = 'ADMIN_ALLOWED_IPS'
  order by s.updated_at desc
  limit 1;

  -- Fail closed when the secret is missing, empty, or contains invalid entries.
  if v_allowed_ips is null or btrim(v_allowed_ips) = '' then
    return false;
  end if;

  for v_ip_entry in
    select btrim(entry.value)
    from regexp_split_to_table(v_allowed_ips, E'[,;\n\r\t ]+') as entry(value)
    where btrim(entry.value) <> ''
  loop
    begin
      if p_client_ip <<= v_ip_entry::cidr then
        v_ip_allowed := true;
        exit;
      end if;
    exception when invalid_text_representation then
      return false;
    end;
  end loop;

  if v_ip_allowed is not true then
    return false;
  end if;

  select s.ip, s.user_agent
    into v_session_ip, v_session_user_agent
  from auth.sessions s
  where s.id = p_session_id
    and s.user_id = v_user_id;

  if not found then
    return false;
  end if;

  -- Compare against the original Auth session before accepting the first admin request.
  if v_session_ip is null
     or v_session_user_agent is null
     or v_session_ip <> p_client_ip
     or v_session_user_agent <> p_user_agent then
    update private.admin_session_fingerprints
      set revoked_at = pg_catalog.now(),
          revoked_reason = 'fingerprint_changed',
          last_seen_at = pg_catalog.now()
    where session_id = p_session_id
      and user_id = v_user_id
      and revoked_at is null;

    delete from auth.sessions
    where id = p_session_id
      and user_id = v_user_id;

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

  if not found or v_existing.user_id <> v_user_id then
    return false;
  end if;

  if v_existing.revoked_at is not null then
    delete from auth.sessions
    where id = p_session_id
      and user_id = v_user_id;
    return false;
  end if;

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

revoke all on function private.validate_admin_session(uuid, inet, text, text, text) from public, anon;
grant execute on function private.validate_admin_session(uuid, inet, text, text, text) to authenticated;

create or replace function public.admin_validate_session(
  p_session_id uuid,
  p_client_ip inet,
  p_user_agent text,
  p_ip_fingerprint text,
  p_user_agent_fingerprint text
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.validate_admin_session(
    p_session_id,
    p_client_ip,
    p_user_agent,
    p_ip_fingerprint,
    p_user_agent_fingerprint
  );
$function$;

revoke all on function public.admin_validate_session(uuid, inet, text, text, text) from public, anon;
grant execute on function public.admin_validate_session(uuid, inet, text, text, text) to authenticated;
