-- Tighten distributed API and Supabase Data API write budgets.
-- Vercel WAF Project Rule independently limits all /api/* requests to 25/min per IP.

-- Add per-authenticated-user limits to the Vercel API gate and raise the shared-IP
-- ceiling to accommodate multiple legitimate users behind a corporate NAT.

create or replace function private.consume_edge_api_rate_limit(
  p_client_ip text,
  p_method text,
  p_path text,
  p_epoch bigint,
  p_signature text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ip inet;
  v_secret text;
  v_payload text;
  v_expected text;
  v_claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  v_role text;
  v_subject text;
  v_now_epoch bigint := floor(extract(epoch from clock_timestamp()) / 30)::bigint;
  v_bucket timestamptz := date_trunc('minute', statement_timestamp());
  v_ip_hash text;
  v_user_hash text;
  v_group text;
  v_limit integer;
  v_count integer;
begin
  if p_client_ip is null or length(p_client_ip) > 64
     or p_method not in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')
     or p_path is null or length(p_path) > 512
     or left(p_path, 5) <> '/api/' or position('?' in p_path) > 0
     or p_epoch is null or abs(p_epoch - v_now_epoch) > 1
     or p_signature is null or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception 'Request signature rejected.' using errcode = '42501';
  end if;

  begin
    v_ip := p_client_ip::inet;
  exception when others then
    raise exception 'Request signature rejected.' using errcode = '42501';
  end;

  select c.hmac_secret into v_secret
  from private.edge_api_rate_limit_config c
  where c.singleton = true;

  if v_secret is null then
    raise exception 'Rate limit service unavailable.' using errcode = '55000';
  end if;

  v_payload := p_client_ip || E'\n' || p_method || E'\n' || p_path || E'\n' || p_epoch::text;
  v_expected := encode(
    extensions.hmac(convert_to(v_payload, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256'),
    'hex'
  );

  if v_expected <> p_signature then
    raise exception 'Request signature rejected.' using errcode = '42501';
  end if;

  v_role := v_claims ->> 'role';
  v_subject := v_claims ->> 'sub';

  -- A valid Supabase JWT adds a per-user bucket, so rotating IPs does not reset
  -- the account's API budget. Anonymous requests still receive the IP bucket.
  if v_role = 'authenticated'
     and v_subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_user_hash := encode(extensions.digest(convert_to('user:' || lower(v_subject), 'UTF8'), 'sha256'), 'hex');
    insert into private.edge_api_rate_limits (ip_hash, route_group, window_started_at, request_count)
    values (v_user_hash, 'api-authenticated-user', v_bucket, 1)
    on conflict (ip_hash, route_group, window_started_at)
    do update set request_count = private.edge_api_rate_limits.request_count + 1
    returning request_count into v_count;

    if v_count > 30 then
      return false;
    end if;
  end if;

  v_ip_hash := encode(extensions.digest(convert_to(host(v_ip), 'UTF8'), 'sha256'), 'hex');
  if p_path = '/api/admin/session' then
    v_group := 'admin-session';
    v_limit := 20;
  else
    v_group := 'api-global';
    v_limit := 25;
  end if;

  insert into private.edge_api_rate_limits (ip_hash, route_group, window_started_at, request_count)
  values (v_ip_hash, v_group, v_bucket, 1)
  on conflict (ip_hash, route_group, window_started_at)
  do update set request_count = private.edge_api_rate_limits.request_count + 1
  returning request_count into v_count;

  if v_count % 100 = 0 then
    delete from private.edge_api_rate_limits
    where window_started_at < v_bucket - interval '1 day';
  end if;

  return v_count <= v_limit;
end;
$$;


create or replace function private.enforce_data_api_write_limit()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_method text := upper(coalesce(current_setting('request.method', true), ''));
  v_path text := coalesce(current_setting('request.path', true), '');
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

  -- The signed Vercel edge check is a separate, pre-handler request.
  if v_path = 'rpc/consume_edge_api_rate_limit' then
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
      detail = json_build_object('status', 401, 'status_text', 'Unauthorized')::text;
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
