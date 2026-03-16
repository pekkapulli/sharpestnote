-- Teacher profiles for Sharpest Note auth MVP
-- Run this in Supabase SQL editor.

create table if not exists public.teacher_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_profiles enable row level security;

drop policy if exists "Teacher can read own profile" on public.teacher_profiles;
create policy "Teacher can read own profile"
  on public.teacher_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Teacher can insert own profile" on public.teacher_profiles;
create policy "Teacher can insert own profile"
  on public.teacher_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Teacher can update own profile" on public.teacher_profiles;
create policy "Teacher can update own profile"
  on public.teacher_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.set_teacher_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_profiles_set_updated_at on public.teacher_profiles;
create trigger teacher_profiles_set_updated_at
before update on public.teacher_profiles
for each row
execute function public.set_teacher_profile_updated_at();
