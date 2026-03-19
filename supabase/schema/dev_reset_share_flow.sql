-- DEV ONLY: reset composer/share state for credit flow testing.
-- This intentionally removes all saved teacher pieces and short links,
-- then restores teacher credits to the default baseline.

begin;

truncate table public.short_links, public.teacher_pieces;

update public.teacher_profiles
set
  credits = 10,
  credits_refreshed_at = now(),
  referral_rewarded_at = null;

commit;

-- Optional verification queries:
-- select count(*) as teacher_piece_count from public.teacher_pieces;
-- select count(*) as short_link_count from public.short_links;
-- select id, credits, credits_refreshed_at from public.teacher_profiles order by updated_at desc nulls last limit 20;
