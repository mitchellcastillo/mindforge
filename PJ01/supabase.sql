-- Ejecuta este script en Supabase SQL Editor
-- Crea tabla de mapas por usuario con Row Level Security

create extension if not exists "pgcrypto";

create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maps_user_updated_idx on public.maps(user_id, updated_at desc);

create or replace function public.set_maps_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_maps_updated_at on public.maps;
create trigger trg_maps_updated_at
before update on public.maps
for each row
execute function public.set_maps_updated_at();

alter table public.maps enable row level security;

-- Cada usuario solo puede ver sus propios mapas
create policy "maps_select_own"
on public.maps
for select
using (auth.uid() = user_id);

create policy "maps_insert_own"
on public.maps
for insert
with check (auth.uid() = user_id);

create policy "maps_update_own"
on public.maps
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "maps_delete_own"
on public.maps
for delete
using (auth.uid() = user_id);
