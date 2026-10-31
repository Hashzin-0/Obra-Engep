alter policy app_settings_own on public.app_settings
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy notification_preferences_own on public.notification_preferences
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy checklists_own on public.checklists
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy notes_own on public.notes
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy project_media_own on public.project_media
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy project_versions_own on public.project_versions
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy calculation_history_own on public.calculation_history;
drop policy calculation_history_admin_read on public.calculation_history;
create policy calculation_history_select_own_or_admin on public.calculation_history
  for select to authenticated
  using ((select auth.uid()) = user_id or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
create policy calculation_history_insert_own on public.calculation_history
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy calculation_history_update_own on public.calculation_history
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy calculation_history_delete_own on public.calculation_history
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy deadlines_own on public.deadlines;
drop policy deadlines_admin_read on public.deadlines;
create policy deadlines_select_own_or_admin on public.deadlines
  for select to authenticated
  using ((select auth.uid()) = user_id or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
create policy deadlines_insert_own on public.deadlines
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy deadlines_update_own on public.deadlines
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy deadlines_delete_own on public.deadlines
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy favorites_own on public.favorites;
drop policy favorites_admin_read on public.favorites;
create policy favorites_select_own_or_admin on public.favorites
  for select to authenticated
  using ((select auth.uid()) = user_id or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
create policy favorites_insert_own on public.favorites
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy favorites_update_own on public.favorites
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy favorites_delete_own on public.favorites
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy products_own on public.products;
drop policy products_admin_read on public.products;
create policy products_select_own_or_admin on public.products
  for select to authenticated
  using ((select auth.uid()) = user_id or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
create policy products_insert_own on public.products
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy products_update_own on public.products
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy products_delete_own on public.products
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy profiles_own on public.profiles;
drop policy profiles_admin_read on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

drop policy projects_own on public.projects;
drop policy projects_admin_read on public.projects;
create policy projects_select_own_or_admin on public.projects
  for select to authenticated
  using ((select auth.uid()) = user_id or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
create policy projects_insert_own on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy projects_update_own on public.projects
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy projects_delete_own on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy feedback_own on public.feedback;
drop policy feedback_admin_read on public.feedback;
create policy feedback_select_own_or_admin on public.feedback
  for select to authenticated
  using ((select auth.uid()) = user_id or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy feedback_insert on public.feedback
  with check ((select auth.uid()) = user_id);
alter policy feedback_admin_update on public.feedback
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true')
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy feedback_admin_delete on public.feedback
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');

alter policy automotive_catalog_public_read on public.automotive_catalog
  using (is_published = true or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy automotive_catalog_admin_insert on public.automotive_catalog
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy automotive_catalog_admin_update on public.automotive_catalog
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true')
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
alter policy automotive_catalog_admin_delete on public.automotive_catalog
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');

drop policy push_subscriptions_own on public.push_subscriptions;
drop policy push_subscriptions_admin_read on public.push_subscriptions;
create policy push_subscriptions_select_own_or_admin on public.push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id and consume_user_action_rate_limit('push_subscribe'::text));
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and consume_user_action_rate_limit('push_subscribe'::text));
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists admin_session_fingerprints_user_id_idx on private.admin_session_fingerprints (user_id);
create index if not exists app_updates_created_by_idx on public.app_updates (created_by);
create index if not exists automotive_catalog_created_by_idx on public.automotive_catalog (created_by);
create index if not exists deadlines_project_id_idx on public.deadlines (project_id);
create index if not exists project_media_user_id_idx on public.project_media (user_id);
create index if not exists project_versions_user_id_idx on public.project_versions (user_id);
