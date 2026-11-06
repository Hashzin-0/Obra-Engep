-- Fix the signed Vercel rate-limit RPC bypass across PostgREST path formats.
-- Also return a valid PostgREST error detail object for unauthenticated writes.

create or replace function private.enforce_data_api_write_limit()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_method text := upper(coalesce(current_setting('request.method', true), ''));
  v_path text := regexp_replace(coalesce(current_setting('request.path', true), ''), '/+$', '');
  v_claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_role text;
  v_subject text;
  v_forwarded text;
  v_ip inet;
  v_bucket timestamptz := date_trunc('minute', statement_timestamp());
  v_count integer;
  v_hash text;
begin
  if v_method not in ('POST', 'PUT', 'PATCH', 'DELETE') then
    return;
  end if;

  -- PostgREST may expose request.path with a leading slash or API prefix.
  -- The HMAC-protected Vercel RPC must bypass this separate Data API guard.
  if right(v_path, length('rpc/consume_edge_api_rate_limit')) = 'rpc/consume_edge_api_rate_limit' then
    return;
  end if;

  v_role := v_claims ->> 'role';
  if v_role = 'service_role' then
    return;
  end if;
  if v_role not in ('anon', 'authenticated') then
    return;
  end if;

  v_subject := v_claims ->> 'sub';
  if v_subject is null or v_subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'AUTH_REQUIRED', 'message', 'A valid user session is required for write requests.')::text,
      detail = json_build_object('status', 401, 'status_text', 'Unauthorized', 'headers', '{}'::jsonb)::text;
  end if;

  v_hash := encode(extensions.digest(convert_to('user:' || lower(v_subject), 'UTF8'), 'sha256'), 'hex');
  insert into private.edge_api_rate_limits (ip_hash, route_group, window_started_at, request_count)
  values (v_hash, 'data-api-user-write', v_bucket, 1)
  on conflict (ip_hash, route_group, window_started_at)
  do update set request_count = private.edge_api_rate_limits.request_count + 1
  returning request_count into v_count;

  if v_count > 30 then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'RATE_LIMITED', 'message', 'Write request limit exceeded.')::text,
      detail = json_build_object('status', 429, 'status_text', 'Too Many Requests', 'headers', json_build_object('Retry-After', '60'))::text;
  end if;

  v_forwarded := split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1);
  begin
    if length(trim(v_forwarded)) > 0 then
      v_ip := trim(v_forwarded)::inet;
    end if;
  exception when others then
    v_ip := null;
  end;

  if v_ip is not null then
    v_hash := encode(extensions.digest(convert_to('ip:' || host(v_ip), 'UTF8'), 'sha256'), 'hex');
    insert into private.edge_api_rate_limits (ip_hash, route_group, window_started_at, request_count)
    values (v_hash, 'data-api-ip-write', v_bucket, 1)
    on conflict (ip_hash, route_group, window_started_at)
    do update set request_count = private.edge_api_rate_limits.request_count + 1
    returning request_count into v_count;

    if v_count > 25 then
      raise sqlstate 'PGRST' using
        message = json_build_object('code', 'RATE_LIMITED', 'message', 'Source request limit exceeded.')::text,
        detail = json_build_object('status', 429, 'status_text', 'Too Many Requests', 'headers', json_build_object('Retry-After', '60'))::text;
    end if;
  end if;

  if random() < 0.01 then
    delete from private.edge_api_rate_limits
    where window_started_at < v_bucket - interval '1 day';
  end if;
end;
$$;

notify pgrst, 'reload config';
