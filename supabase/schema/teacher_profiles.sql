-- Teacher profiles for Sharpest Note auth MVP
-- Run this in Supabase SQL editor.

create table if not exists public.teacher_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_profiles
  add column if not exists studio_name text,
  add column if not exists teacher_role text,
  add column if not exists credits integer not null default 0,
  add column if not exists credits_refreshed_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_accepted_version text,
  add column if not exists email_opt_in boolean not null default false;

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

create or replace function public.get_profile_with_credits()
returns table (teacher_role text, credits integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid := auth.uid();
  role_value text;
  role_from_profile text;
  role_from_jwt text;
  refreshed_at timestamptz;
  monthly_amount integer;
begin
  if current_uid is null then
    return;
  end if;

  select
    nullif(
      lower(
        trim(
          coalesce(
            to_jsonb(p) ->> 'teacher_role',
            to_jsonb(p) ->> 'role'
          )
        )
      ),
      ''
    ),
    p.credits_refreshed_at
  into role_from_profile, refreshed_at
  from public.teacher_profiles as p
  where p.id = current_uid;

  if not found then
    return;
  end if;

  role_from_jwt := nullif(
    lower(
      trim(
        coalesce(
          auth.jwt() -> 'app_metadata' ->> 'teacher_role',
          auth.jwt() -> 'app_metadata' ->> 'role'
        )
      )
    ),
    ''
  );

  role_value := coalesce(role_from_profile, role_from_jwt);

  if role_value = 'core' then
    monthly_amount := 15;
  elsif role_value in ('institution_teacher', 'admin', 'owner') then
    monthly_amount := null;
  else
    monthly_amount := 3;
  end if;

  if refreshed_at is null or date_trunc('month', refreshed_at) < date_trunc('month', now()) then
    if monthly_amount is null then
      update public.teacher_profiles as p
      set credits_refreshed_at = now()
      where p.id = current_uid
        and (
          p.credits_refreshed_at is null
          or date_trunc('month', p.credits_refreshed_at) < date_trunc('month', now())
        );
    else
      update public.teacher_profiles as p
      set
        credits = coalesce(p.credits, 0) + monthly_amount,
        credits_refreshed_at = now()
      where p.id = current_uid
        and (
          p.credits_refreshed_at is null
          or date_trunc('month', p.credits_refreshed_at) < date_trunc('month', now())
        );
    end if;
  end if;

  return query
    select role_value, coalesce(p.credits, 0)::integer
    from public.teacher_profiles as p
    where p.id = current_uid;
end;
$$;

revoke all on function public.get_profile_with_credits() from public;
grant execute on function public.get_profile_with_credits() to authenticated;

-- Referral system columns
alter table public.teacher_profiles
  add column if not exists referred_by_studio text,
  add column if not exists referral_rewarded_at timestamptz;

-- Returns the public display info for a studio name (callable by anonymous users).
-- Used by the /join landing page before any authentication.
create or replace function public.get_teacher_by_studio_name(p_studio_name text)
returns table (display_name text, studio_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select p.display_name, p.studio_name
    from public.teacher_profiles as p
    where lower(p.studio_name) = lower(trim(p_studio_name))
    limit 1;
end;
$$;

revoke all on function public.get_teacher_by_studio_name(text) from public;
grant execute on function public.get_teacher_by_studio_name(text) to anon;
grant execute on function public.get_teacher_by_studio_name(text) to authenticated;

-- Awards 3 bonus credits to both the new teacher and their referrer on first piece publish.
-- Idempotent: does nothing if already rewarded, if no referral recorded, or on self-referral.
create or replace function public.award_referral_credits(new_teacher_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referred_by text;
  v_rewarded_at timestamptz;
  v_referrer_id uuid;
begin
  select referred_by_studio, referral_rewarded_at
  into v_referred_by, v_rewarded_at
  from public.teacher_profiles
  where id = new_teacher_id;

  if not found then
    return false;
  end if;

  -- Already processed
  if v_rewarded_at is not null then
    return false;
  end if;

  -- No referral recorded
  if v_referred_by is null or trim(v_referred_by) = '' then
    return false;
  end if;

  select id into v_referrer_id
  from public.teacher_profiles
  where lower(studio_name) = lower(trim(v_referred_by))
  limit 1;

  -- Mark as processed even when no valid referrer or self-referral (prevents future retries)
  if v_referrer_id is null or v_referrer_id = new_teacher_id then
    update public.teacher_profiles
    set referral_rewarded_at = now()
    where id = new_teacher_id;
    return false;
  end if;

  -- Award credits to both parties in the same transaction
  update public.teacher_profiles
  set credits = credits + 3,
      referral_rewarded_at = now()
  where id = new_teacher_id;

  update public.teacher_profiles
  set credits = credits + 3
  where id = v_referrer_id;

  return true;
end;
$$;

revoke all on function public.award_referral_credits(uuid) from public;
grant execute on function public.award_referral_credits(uuid) to authenticated;
