-- Persistent short-link mapping in Supabase.
-- Run this in Supabase SQL editor.

create table if not exists public.short_links (
  id text primary key,
  teacher_piece_id uuid references public.teacher_pieces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.short_links
  add column if not exists teacher_piece_id uuid references public.teacher_pieces(id) on delete cascade;

alter table public.short_links
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.short_links
  add column if not exists created_at timestamptz not null default now();

create index if not exists short_links_created_by_idx
  on public.short_links (created_by);

create index if not exists short_links_teacher_piece_id_idx
  on public.short_links (teacher_piece_id);

create unique index if not exists short_links_piece_creator_unique_idx
  on public.short_links (teacher_piece_id, created_by);

alter table public.short_links enable row level security;

drop policy if exists "Anyone can read short links" on public.short_links;
create policy "Anyone can read short links"
  on public.short_links
  for select
  to anon, authenticated
  using (
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

create or replace function public.ensure_short_link_for_piece(
  input_teacher_piece_id uuid,
  input_short_link_id text
)
returns table (
  short_link_id text,
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
  current_role text;
  current_credits integer;
  unlimited_access boolean := false;
  existing_short_link_id text;
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

  select s.id
  into existing_short_link_id
  from public.short_links as s
  where s.teacher_piece_id = input_teacher_piece_id
    and s.created_by = current_uid
  limit 1;

  select p.teacher_role::text, coalesce(p.credits, 0)::integer
  into current_role, current_credits
  from public.teacher_profiles as p
  where p.id = current_uid
  for update;

  if not found then
    raise exception 'Teacher profile not found';
  end if;

  unlimited_access := current_role in ('institution_teacher', 'admin', 'owner');

  if existing_short_link_id is not null then
    return query
      select
        existing_short_link_id,
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

  insert into public.short_links (id, teacher_piece_id, created_by)
  values (normalized_short_link_id, input_teacher_piece_id, current_uid);

  return query
    select
      normalized_short_link_id,
      (not unlimited_access),
      unlimited_access,
      current_credits,
      true;
end;
$$;

revoke all on function public.ensure_short_link_for_piece(uuid, text) from public;
grant execute on function public.ensure_short_link_for_piece(uuid, text) to authenticated;
