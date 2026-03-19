-- Persistent short-link mapping in Supabase.
-- Run this in Supabase SQL editor.

create table if not exists public.short_links (
  id text primary key,
  teacher_piece_id uuid references public.teacher_pieces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 months')
);

alter table public.short_links
  add column if not exists teacher_piece_id uuid references public.teacher_pieces(id) on delete cascade;

alter table public.short_links
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.short_links
  add column if not exists created_at timestamptz not null default now();

alter table public.short_links
  add column if not exists expires_at timestamptz not null default (now() + interval '6 months');

update public.short_links
set expires_at = coalesce(expires_at, created_at + interval '6 months', now() + interval '6 months')
where expires_at is null;

create index if not exists short_links_created_by_idx
  on public.short_links (created_by);

create index if not exists short_links_teacher_piece_id_idx
  on public.short_links (teacher_piece_id);

drop index if exists public.short_links_piece_creator_unique_idx;

create index if not exists short_links_teacher_piece_created_active_idx
  on public.short_links (teacher_piece_id, created_by, expires_at desc, created_at desc);

alter table public.short_links enable row level security;

drop policy if exists "Anyone can read short links" on public.short_links;
create policy "Anyone can read short links"
  on public.short_links
  for select
  to anon, authenticated
  using (
    expires_at > now()
    and
    exists (
      select 1
      from public.teacher_pieces as p
      where p.id = teacher_piece_id
        and p.is_published = true
    )
  );

drop policy if exists "Authenticated users can insert short links" on public.short_links;
create policy "Authenticated users can insert short links"
  on public.short_links
  for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and exists (
      select 1
      from public.teacher_pieces as p
      where p.id = teacher_piece_id
        and p.teacher_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete own created links" on public.short_links;
create policy "Users can delete own created links"
  on public.short_links
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

drop function if exists public.ensure_short_link_for_piece(uuid, text);
drop function if exists public.ensure_short_link_for_piece(uuid, text, boolean);

create or replace function public.ensure_short_link_for_piece(
  input_teacher_piece_id uuid,
  input_short_link_id text,
  input_force_renew boolean default false
)
returns table (
  short_link_id text,
  short_link_expires_at timestamptz,
  consumed_credit boolean,
  has_unlimited_credits boolean,
  remaining_credits integer,
  created_new boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid := auth.uid();
  resolved_role text;
  role_from_profile text;
  role_from_jwt text;
  current_credits integer;
  unlimited_access boolean := false;
  existing_short_link_id text;
  existing_short_link_expires_at timestamptz;
  renewed_expires_at timestamptz := now() + interval '6 months';
  normalized_short_link_id text := trim(input_short_link_id);
begin
  if current_uid is null then
    raise exception 'Unauthorized';
  end if;

  if input_teacher_piece_id is null then
    raise exception 'teacher_piece_id is required';
  end if;

  if normalized_short_link_id is null or length(normalized_short_link_id) = 0 then
    raise exception 'short_link_id is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_uid::text || ':' || input_teacher_piece_id::text, 0)
  );

  perform 1
  from public.teacher_pieces as p
  where p.id = input_teacher_piece_id
    and p.teacher_id = current_uid;

  if not found then
    raise exception 'Teacher piece not found';
  end if;

  select s.id, s.expires_at
  into existing_short_link_id, existing_short_link_expires_at
  from public.short_links as s
  where s.teacher_piece_id = input_teacher_piece_id
    and s.created_by = current_uid
    and s.expires_at > now()
  order by s.expires_at desc, s.created_at desc
  limit 1;

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
    coalesce(p.credits, 0)::integer
  into role_from_profile, current_credits
  from public.teacher_profiles as p
  where p.id = current_uid
  for update;

  if not found then
    raise exception 'Teacher profile not found';
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

  resolved_role := coalesce(role_from_profile, role_from_jwt);
  unlimited_access := coalesce(resolved_role in ('institution_teacher', 'admin', 'owner'), false);

  if existing_short_link_id is not null and not coalesce(input_force_renew, false) then
    return query
      select
        existing_short_link_id,
        existing_short_link_expires_at,
        false,
        unlimited_access,
        current_credits,
        false;
    return;
  end if;

  if not unlimited_access then
    update public.teacher_profiles as p
    set credits = coalesce(p.credits, 0) - 1
    where p.id = current_uid
      and coalesce(p.credits, 0) > 0
    returning coalesce(p.credits, 0)::integer
    into current_credits;

    if not found then
      raise exception 'INSUFFICIENT_CREDITS';
    end if;
  end if;

  if existing_short_link_id is not null and coalesce(input_force_renew, false) then
    update public.short_links as s
    set expires_at = renewed_expires_at
    where s.id = existing_short_link_id
      and s.teacher_piece_id = input_teacher_piece_id
      and s.created_by = current_uid;

    return query
      select
        existing_short_link_id,
        renewed_expires_at,
        (not unlimited_access),
        unlimited_access,
        current_credits,
        false;
    return;
  end if;

  insert into public.short_links (id, teacher_piece_id, created_by, expires_at)
  values (
    normalized_short_link_id,
    input_teacher_piece_id,
    current_uid,
    now() + interval '6 months'
  );

  return query
    select
      normalized_short_link_id,
      now() + interval '6 months',
      (not unlimited_access),
      unlimited_access,
      current_credits,
      true;
end;
$$;

revoke all on function public.ensure_short_link_for_piece(uuid, text, boolean) from public;
grant execute on function public.ensure_short_link_for_piece(uuid, text, boolean) to authenticated;
