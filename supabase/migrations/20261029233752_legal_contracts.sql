create table if not exists public.legal_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null,
  title text not null check (char_length(title) between 1 and 240),
  content text not null,
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_contracts_user_updated_idx
  on public.legal_contracts (user_id, updated_at desc);

alter table public.legal_contracts enable row level security;

drop policy if exists "legal_contracts_select_own" on public.legal_contracts;
create policy "legal_contracts_select_own" on public.legal_contracts
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "legal_contracts_insert_own" on public.legal_contracts;
create policy "legal_contracts_insert_own" on public.legal_contracts
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "legal_contracts_update_own" on public.legal_contracts;
create policy "legal_contracts_update_own" on public.legal_contracts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "legal_contracts_delete_own" on public.legal_contracts;
create policy "legal_contracts_delete_own" on public.legal_contracts
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.legal_contracts to authenticated;
