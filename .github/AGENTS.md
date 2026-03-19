# Sharpest Note Agent Guardrails

Purpose: Keep agent changes aligned with current business behavior for teacher credits and composer share links.

## Scope

These rules apply to all edits that touch:

- Composer sharing flow
- Teacher credit accounting
- Short-link creation and resolution
- Supabase SQL migrations for the above

## Business Rules (Current)

1. Teacher starting credits:

- New teacher profiles start with 10 credits.

2. Monthly free credits:

- Standard teachers get 1 free credit per month.
- Monthly accrual is login-triggered and month-aware (catch-up for missed months).
- Unlimited roles do not consume share credits.

3. Share link lifecycle:

- A share link is active for 6 months from creation.
- If an active link already exists for the same teacher and piece, reuse it (no extra credit).
- If no active link exists, creating a new share link consumes 1 credit.
- Expired links must not resolve for students.
- Multiple short links per teacher piece are allowed historically.

4. Credit semantics:

- Cost is tied to creating a new active link after expiry, not to editing/saving a piece.
- Referral bonus logic is separate and should not bypass the share credit rules.

## Product Terminology (Canonical)

- Use "Share the assignment" for the teacher action of creating/reusing a student-facing share link.
- Avoid "publish" wording in new UI copy unless referring to legacy code fields like `is_published`.

Piece lifecycle labels:

- `Draft`: piece exists privately and is not currently active for student assignment delivery.
- `Active`: there is an active (unexpired) assignment link.
- `Expiring`: active assignment link is nearing expiry.
- `Reassign`: previous assignment link expired; creating a new assignment link consumes 1 credit and returns state to `Active`.

Lifecycle flow:

- `Draft -> Active -> Expiring -> Reassign -> Active`

## Source of Truth

Primary source of truth is database logic, then server endpoints, then UI copy.

Enforcement order:

1. Supabase SQL function and policies

- supabase/schema/short_links.sql
- supabase/schema/teacher_profiles.sql

2. Server behavior

- src/routes/api/share/custom/+server.ts
- src/routes/s/[id]/+server.ts
- src/hooks.server.ts
- src/routes/teachers/composer/edit/+page.server.ts
- src/routes/api/teacher-pieces/share/+server.ts

3. UI messaging

- src/lib/components/composer/ComposerShareCard.svelte
- src/routes/teachers/composer/edit/+page.svelte

## Change Protocol

When changing any business rule above, update all three layers in one change set:

1. SQL source of truth
2. Server logic consuming SQL outputs
3. UI copy and statuses

Also run:

- npm run check

## Do Not Reintroduce

- One-link-per-piece unique behavior.
- Messaging that says re-share is always free after first publish.
- Expiry windows other than 6 months unless explicitly changed by product decision.
