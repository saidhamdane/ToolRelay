-- ToolRelay initial schema
-- Run this against your Supabase Postgres database. The Supabase CLI can also
-- pick this up automatically when placed in supabase/migrations/.

create extension if not exists "pgcrypto";

-- =============================
-- profiles
-- =============================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================
-- tools
-- =============================
create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  endpoint_url text not null,
  method text not null default 'POST' check (method in ('GET', 'POST')),
  auth_header_name text,
  auth_header_value text,
  input_schema jsonb,
  output_example jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tools_user_id_idx on public.tools(user_id);
create index if not exists tools_slug_idx on public.tools(slug);

alter table public.tools enable row level security;

drop policy if exists "tools_select_own" on public.tools;
create policy "tools_select_own"
  on public.tools for select
  using (auth.uid() = user_id);

drop policy if exists "tools_select_public" on public.tools;
create policy "tools_select_public"
  on public.tools for select
  using (is_public = true);

drop policy if exists "tools_insert_own" on public.tools;
create policy "tools_insert_own"
  on public.tools for insert
  with check (auth.uid() = user_id);

drop policy if exists "tools_update_own" on public.tools;
create policy "tools_update_own"
  on public.tools for update
  using (auth.uid() = user_id);

drop policy if exists "tools_delete_own" on public.tools;
create policy "tools_delete_own"
  on public.tools for delete
  using (auth.uid() = user_id);

-- Maintain updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tools_touch_updated_at on public.tools;
create trigger tools_touch_updated_at
  before update on public.tools
  for each row execute function public.touch_updated_at();

-- =============================
-- usage_logs
-- =============================
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status_code integer,
  latency_ms integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_user_id_idx on public.usage_logs(user_id);
create index if not exists usage_logs_tool_id_idx on public.usage_logs(tool_id);
create index if not exists usage_logs_created_at_idx on public.usage_logs(created_at desc);

alter table public.usage_logs enable row level security;

drop policy if exists "usage_logs_select_own" on public.usage_logs;
create policy "usage_logs_select_own"
  on public.usage_logs for select
  using (auth.uid() = user_id);

-- =============================
-- subscriptions
-- =============================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan text not null default 'free',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Note: Inserts and updates to subscriptions are performed by the service role
-- (Stripe webhook). RLS blocks anon/auth roles by default, so no insert/update
-- policy is defined here; the service role bypasses RLS.
