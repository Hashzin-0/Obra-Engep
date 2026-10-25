-- OBra ENGEP · schema principal do Supabase
-- Execute com: supabase db push (ou cole no SQL Editor do projeto)
-- Todas as tabelas de dados do usuário usam RLS por auth.uid().

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfil e preferências
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Profissional',
  profession text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  theme text not null default 'system' check (theme in ('dark', 'light', 'system')),
  font_scale numeric(4, 2) not null default 1 check (font_scale between 0.8 and 2),
  notifications_enabled boolean not null default false,
  default_project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  enabled boolean not null default false,
  reminders_enabled boolean not null default true,
  updates_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Projetos, versões, mídias e prazos
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  type text not null default 'arquitetonica' check (type in ('arquitetonica', 'eletrica', 'hidraulica', 'estrutural')),
  stage text not null default 'estudo_preliminar' check (stage in ('estudo_preliminar', 'executivo')),
  scale text not null default '1:50',
  data jsonb not null default '{"walls":[],"openings":[],"electrical":[],"hydraulic":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  label text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null default 'photo' check (kind in ('photo', 'document', 'label')),
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_id uuid references public.projects(id) on delete set null,
  project_name text,
  title text not null,
  description text not null default '',
  due_date date not null,
  due_time time,
  timezone text not null default 'America/Sao_Paulo',
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido')),
  category text not null default 'obra' check (category in ('obra', 'eletrica', 'hidraulica', 'estrutural', 'seguranca', 'estetica', 'alvara')),
  reminder_minutes_before integer not null default 1440 check (reminder_minutes_before >= 0),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Caderno, favoritos, histórico e calculadoras
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  content text not null default '',
  category text not null default 'geral',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_type text not null check (item_type in ('calculadora', 'norma', 'manual', 'projeto', 'produto', 'nota')),
  item_id text not null,
  title text not null,
  subtitle text not null default '',
  module_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table if not exists public.calculation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  category text not null check (category in ('eletrica', 'hidraulica', 'materiais', 'conversoes')),
  result_value numeric,
  result_unit text not null default '',
  formula text not null default '',
  premises text not null default '',
  inputs jsonb not null default '{}'::jsonb,
  limit_warning text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Produtos e checklists pessoais
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  manufacturer text not null default '',
  ph_type text not null default 'Neutro' check (ph_type in ('Neutro', 'Ácido', 'Alcalino')),
  target_surfaces text[] not null default '{}',
  dilution_ratio text not null default '',
  dilution_number numeric not null default 1,
  action_time_minutes text not null default '',
  yield_info text not null default '',
  instructions text not null default '',
  cautions text[] not null default '{}',
  source_label text not null default '',
  verified_date date,
  label_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  norm_id text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, norm_id)
);

-- ---------------------------------------------------------------------------
-- Biblioteca técnica (conteúdo público, somente leitura pelo app)
-- ---------------------------------------------------------------------------
create table if not exists public.library_items (
  id text primary key,
  kind text not null check (kind in ('nr', 'abnt', 'legislacao', 'manual', 'sujeira')),
  code text not null,
  title text not null,
  summary text not null default '',
  body jsonb not null default '{}'::jsonb,
  official_url text,
  jurisdiction text,
  verified_at date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  version text,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  message text not null,
  contact_email text,
  page text,
  status text not null default 'aberto' check (status in ('aberto', 'em_analise', 'resolvido')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notificações push
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);
create index if not exists project_versions_project_idx on public.project_versions (project_id, created_at desc);
create index if not exists project_media_project_idx on public.project_media (project_id);
create index if not exists deadlines_user_due_idx on public.deadlines (user_id, due_date, due_time);
create index if not exists deadlines_pending_idx on public.deadlines (due_date, due_time) where status <> 'concluido' and notified_at is null;
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);
create index if not exists history_user_created_idx on public.calculation_history (user_id, created_at desc);
create index if not exists products_user_created_idx on public.products (user_id, created_at desc);
create index if not exists push_user_idx on public.push_subscriptions (user_id);
create index if not exists library_kind_idx on public.library_items (kind, sort_order);
create index if not exists feedback_user_created_idx on public.feedback (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at before update on public.app_settings
for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists deadlines_updated_at on public.deadlines;
create trigger deadlines_updated_at before update on public.deadlines
for each row execute function public.set_updated_at();

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at before update on public.notes
for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists checklists_updated_at on public.checklists;
create trigger checklists_updated_at before update on public.checklists
for each row execute function public.set_updated_at();

drop trigger if exists library_items_updated_at on public.library_items;
create trigger library_items_updated_at before update on public.library_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Perfil criado automaticamente no primeiro acesso anônimo/autenticado
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Profissional'))
  on conflict (id) do nothing;

  insert into public.app_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.project_media enable row level security;
alter table public.deadlines enable row level security;
alter table public.notes enable row level security;
alter table public.favorites enable row level security;
alter table public.calculation_history enable row level security;
alter table public.products enable row level security;
alter table public.checklists enable row level security;
alter table public.library_items enable row level security;
alter table public.app_updates enable row level security;
alter table public.feedback enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles for all to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "app_settings_own" on public.app_settings;
create policy "app_settings_own" on public.app_settings for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_own" on public.notification_preferences;
create policy "notification_preferences_own" on public.notification_preferences for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_own" on public.projects;
create policy "projects_own" on public.projects for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "project_versions_own" on public.project_versions;
create policy "project_versions_own" on public.project_versions for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "project_media_own" on public.project_media;
create policy "project_media_own" on public.project_media for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "deadlines_own" on public.deadlines;
create policy "deadlines_own" on public.deadlines for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_own" on public.notes;
create policy "notes_own" on public.notes for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own" on public.favorites for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calculation_history_own" on public.calculation_history;
create policy "calculation_history_own" on public.calculation_history for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "products_own" on public.products;
create policy "products_own" on public.products for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "checklists_own" on public.checklists;
create policy "checklists_own" on public.checklists for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "library_items_read" on public.library_items;
create policy "library_items_read" on public.library_items for select to anon, authenticated
using (true);

drop policy if exists "app_updates_read" on public.app_updates;
create policy "app_updates_read" on public.app_updates for select to authenticated
using (published_at <= now());

drop policy if exists "feedback_own" on public.feedback;
create policy "feedback_own" on public.feedback for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "feedback_insert" on public.feedback;
create policy "feedback_insert" on public.feedback for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage privado para fotos, rótulos e documentos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-media',
  'user-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "user_media_read" on storage.objects;
create policy "user_media_read" on storage.objects for select to authenticated
using (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_media_insert" on storage.objects;
create policy "user_media_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_media_update" on storage.objects;
create policy "user_media_update" on storage.objects for update to authenticated
using (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_media_delete" on storage.objects;
create policy "user_media_delete" on storage.objects for delete to authenticated
using (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Reivindica prazos vencidos de forma atômica, evitando envio duplicado
create or replace function public.claim_due_deadlines()
returns setof public.deadlines
language sql
security definer
set search_path = public
as $$
  with due as (
    select id
    from public.deadlines
    where status <> 'concluido'
      and notified_at is null
      and (due_date + coalesce(due_time, '09:00'::time)) at time zone timezone
          - make_interval(mins => reminder_minutes_before) <= now()
      and (due_date + coalesce(due_time, '09:00'::time)) at time zone timezone
          >= now() - interval '1 day'
    order by due_date, due_time
    for update skip locked
  ), updated as (
    update public.deadlines d
    set notified_at = now()
    from due
    where d.id = due.id
    returning d.*
  )
  select * from updated;
$$;

revoke all on function public.claim_due_deadlines() from public, anon, authenticated;
grant execute on function public.claim_due_deadlines() to service_role;

-- ---------------------------------------------------------------------------
-- Agendamento do envio de lembretes via pg_cron + pg_net
-- Configure no Supabase Vault:
--   SUPABASE_URL  = https://<project-ref>.supabase.co
--   CRON_SECRET   = <segredo compartilhado com a Edge Function>
-- ---------------------------------------------------------------------------
create or replace function public.dispatch_due_reminders()
returns void
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  base_url text;
  cron_secret text;
begin
  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'SUPABASE_URL'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'CRON_SECRET'
  limit 1;

  if base_url is null or cron_secret is null then
    raise notice 'SUPABASE_URL/CRON_SECRET ausentes no Vault; lembrete não enviado.';
    return;
  end if;

  perform net.http_post(
    url := rtrim(base_url, '/') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('obra-engep-reminders');
    exception when others then
      null;
    end;
    perform cron.schedule(
      'obra-engep-reminders',
      '* * * * *',
      'select public.dispatch_due_reminders();'
    );
  end if;
end;
$$;
