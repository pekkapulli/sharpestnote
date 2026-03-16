-- Teacher-composed pieces persisted for stable sharing URLs.
-- Run this in Supabase SQL editor.

create table if not exists public.teacher_pieces (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  piece_fingerprint text,
  piece_code text not null,
  piece_label text not null,
  instrument text not null,
  teacher_note text,
  custom_unit_material jsonb not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_pieces
  add column if not exists piece_fingerprint text;

update public.teacher_pieces
set piece_fingerprint = md5(custom_unit_material::text)
where piece_fingerprint is null;

create index if not exists teacher_pieces_teacher_id_idx
  on public.teacher_pieces (teacher_id);

create index if not exists teacher_pieces_created_at_idx
  on public.teacher_pieces (created_at desc);

create unique index if not exists teacher_pieces_teacher_fingerprint_unique_idx
  on public.teacher_pieces (teacher_id, piece_fingerprint);

alter table public.teacher_pieces enable row level security;

drop policy if exists "Teacher can read own pieces" on public.teacher_pieces;
create policy "Teacher can read own pieces"
  on public.teacher_pieces
  for select
  to authenticated
  using ((select auth.uid()) = teacher_id);

drop policy if exists "Teacher can insert own pieces" on public.teacher_pieces;
create policy "Teacher can insert own pieces"
  on public.teacher_pieces
  for insert
  to authenticated
  with check ((select auth.uid()) = teacher_id);

drop policy if exists "Teacher can update own pieces" on public.teacher_pieces;
create policy "Teacher can update own pieces"
  on public.teacher_pieces
  for update
  to authenticated
  using ((select auth.uid()) = teacher_id)
  with check ((select auth.uid()) = teacher_id);

drop policy if exists "Teacher can delete own pieces" on public.teacher_pieces;
create policy "Teacher can delete own pieces"
  on public.teacher_pieces
  for delete
  to authenticated
  using ((select auth.uid()) = teacher_id);

drop policy if exists "Anyone can read published teacher pieces" on public.teacher_pieces;
create policy "Anyone can read published teacher pieces"
  on public.teacher_pieces
  for select
  to anon, authenticated
  using (is_published = true);

create or replace function public.set_teacher_pieces_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_pieces_set_updated_at on public.teacher_pieces;
create trigger teacher_pieces_set_updated_at
before update on public.teacher_pieces
for each row
execute function public.set_teacher_pieces_updated_at();
