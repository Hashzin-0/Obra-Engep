alter policy calculation_history_select_own_or_admin on public.calculation_history
  using ((select auth.uid()) = user_id or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy deadlines_select_own_or_admin on public.deadlines
  using ((select auth.uid()) = user_id or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy favorites_select_own_or_admin on public.favorites
  using ((select auth.uid()) = user_id or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy products_select_own_or_admin on public.products
  using ((select auth.uid()) = user_id or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy profiles_select_own_or_admin on public.profiles
  using ((select auth.uid()) = id or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy projects_select_own_or_admin on public.projects
  using ((select auth.uid()) = user_id or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy feedback_select_own_or_admin on public.feedback
  using ((select auth.uid()) = user_id or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy feedback_admin_update on public.feedback
  using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true')
  with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy feedback_admin_delete on public.feedback
  using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy automotive_catalog_public_read on public.automotive_catalog
  using (is_published = true or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy automotive_catalog_admin_insert on public.automotive_catalog
  with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy automotive_catalog_admin_update on public.automotive_catalog
  using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true')
  with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy automotive_catalog_admin_delete on public.automotive_catalog
  using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy push_subscriptions_select_own_or_admin on public.push_subscriptions
  using ((select auth.uid()) = user_id or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
