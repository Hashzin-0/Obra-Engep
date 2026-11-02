-- The dashboard uses a SECURITY INVOKER function so row-level security remains active.
-- Allow administrators to count all app updates, including unpublished/future entries.
drop policy if exists app_updates_admin_read on public.app_updates;
create policy app_updates_admin_read
  on public.app_updates
  for select
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');
