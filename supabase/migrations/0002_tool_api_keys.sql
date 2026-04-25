-- Per-tool API keys.
-- Private tools require a matching `x-toolrelay-key` header on every call to
-- /api/run/[slug]. Public tools remain open. Keys are stored hashed; the
-- plaintext value is only returned at generation time.

create table if not exists public.tool_api_keys (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null unique references public.tools(id) on delete cascade,
  key_prefix text not null,            -- public-safe display prefix, e.g. 'trk_AbCdEf'
  key_hash text not null,              -- sha256(plaintext) hex
  created_at timestamptz not null default now()
);

create index if not exists tool_api_keys_tool_id_idx on public.tool_api_keys(tool_id);

alter table public.tool_api_keys enable row level security;

drop policy if exists "tool_api_keys_select_own" on public.tool_api_keys;
create policy "tool_api_keys_select_own"
  on public.tool_api_keys for select
  using (
    exists (
      select 1 from public.tools t
      where t.id = tool_api_keys.tool_id
        and t.user_id = auth.uid()
    )
  );

-- Inserts/updates/deletes are performed by the service role only (the proxy
-- and tool-creation/regeneration endpoints). No insert policy is defined.
