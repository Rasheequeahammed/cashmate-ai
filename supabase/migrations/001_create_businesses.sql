-- 001_create_businesses.sql
-- Business profile, one per authenticated user (PRD §13.1, §16.1).

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  owner_name text not null,
  phone text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_name_not_blank check (length(btrim(name)) > 0),
  constraint businesses_owner_name_not_blank check (length(btrim(owner_name)) > 0),
  constraint businesses_type_check check (
    type in ('Retail', 'Freelance', 'Agency', 'Consulting', 'Contracting', 'Service', 'Other')
  )
);

alter table public.businesses enable row level security;

create policy "Users can select their own business"
  on public.businesses for select
  using (user_id = auth.uid());

create policy "Users can insert their own business"
  on public.businesses for insert
  with check (user_id = auth.uid());

create policy "Users can update their own business"
  on public.businesses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No DELETE policy: with RLS enabled, deletes are denied for authenticated users.
