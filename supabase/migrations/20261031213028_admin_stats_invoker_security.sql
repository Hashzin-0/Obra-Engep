create policy "profiles_admin_read"
  on public.profiles for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "projects_admin_read"
  on public.projects for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "calculation_history_admin_read"
  on public.calculation_history for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "deadlines_admin_read"
  on public.deadlines for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "favorites_admin_read"
  on public.favorites for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "products_admin_read"
  on public.products for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create policy "push_subscriptions_admin_read"
  on public.push_subscriptions for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') <> 'true' then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'registered_users', (select count(*) from public.profiles),
    'projects', (select count(*) from public.projects),
    'calculations', (select count(*) from public.calculation_history),
    'deadlines', (select count(*) from public.deadlines),
    'favorites', (select count(*) from public.favorites),
    'personal_products', (select count(*) from public.products),
    'catalog_products', (select count(*) from public.automotive_catalog),
    'published_products', (select count(*) from public.automotive_catalog where is_published),
    'feedback_total', (select count(*) from public.feedback),
    'feedback_open', (select count(*) from public.feedback where status = 'aberto'),
    'feedback_review', (select count(*) from public.feedback where status = 'em_analise'),
    'feedback_resolved', (select count(*) from public.feedback where status = 'resolvido'),
    'push_subscriptions', (select count(*) from public.push_subscriptions),
    'app_updates', (select count(*) from public.app_updates)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
