# Sharpest Note

The Sharpest Note is a browser-based music learning platform for beginner orchestral players. It combines printable sheet music with interactive practice tools, lightweight games, and audio analysis utilities that run directly in the browser—no accounts required.

## What the app does (by route)

### Public pages

- `/` — Landing page describing the product, with demo units and quick navigation.
- `/units` — Browse published units and demos.
- `/unit/[code]` — Unit overview page with access gating, printable/demo download links, and a list of pieces.
- `/unit/[code]/[piece]` — Piece hub with audio player (when available) and links to practice games.
- `/teachers` — Teacher-focused overview and demo unit downloads.
- `/parents` — Parent-focused explanation and usage guidance.
- `/faq` — FAQ and licensing information.
- `/privacy` — Privacy policy.
- `/store` — Redirects to `/units` (placeholder store route).

### Practice tools & games

- `/unit/[code]/[piece]/melody` — Melody practice game (full access required).
- `/unit/[code]/[piece]/blocks` — Random phrase practice (free).
- `/unit/[code]/[piece]/scales` — Scale practice (free).
- `/unit/[code]/[piece]/steps` — Interval/step practice (free).
- `/unit/[code]/[piece]/defend` — Defensive “space monsters” game using piece notes (full access required).
- `/sight-game` — Choose instrument/key/mode and launch the sight‑reading game.
- `/sight-game/[instrument]/[key]/[mode]` — Sight‑reading game session.
- `/games/hz-force` — “Hz Force” pitch‑controlled arcade game.
- `/tuner` — Live instrument tuner with mic selection.

### Audio analysis & ML tooling

- `/audio-analysis` — Real‑time spectrum/flux/phase visualization and onset monitoring.
- `/onset-analysis` — Onset‑detection analysis, latency diagnostics, and configuration tuning.
- `/onset-training` — Recording and labeling tool for onset‑training data collection.

### API endpoints

- `POST /api/access` — Proxies access checks to a Cloudflare Worker.
- `POST /api/access/lookup` — Proxies access key lookups to a Cloudflare Worker.
- `POST /api/save-training-data` — Accepts training data and returns a timestamped filename.

## Development

Install dependencies and run the dev server:

```sh
npm install
npm run dev
```

## Teacher auth setup (Supabase)

Teacher login uses Supabase Auth.

1. Create your local env file:

```sh
cp .env.example .env
```

2. Fill these values in `.env`:

```sh
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
```

You can find them in Supabase Dashboard:

- Project Settings -> API -> Project URL
- Project Settings -> API -> publishable key
- Project Settings -> API -> secret key

`SUPABASE_SECRET_KEY` is server-only. Never prefix it with `PUBLIC_`.

3. Configure Supabase Auth URLs:

- Authentication -> URL Configuration -> Site URL
- Authentication -> URL Configuration -> Redirect URLs

Add at least:

- `http://localhost:5173/auth/callback`
- `https://your-production-domain.com/auth/callback`

4. For Cloudflare deployment, set the same vars with Wrangler:

```sh
npx wrangler secret put PUBLIC_SUPABASE_URL
npx wrangler secret put PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SECRET_KEY
```

If you use a Cloudflare Pages style setup instead of Worker secrets, add both keys in the Cloudflare dashboard environment variables for your production and preview environments.

Legacy compatibility: `PUBLIC_SUPABASE_ANON_KEY` still works as a fallback, but new setups should use `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Then run the teacher profile SQL in Supabase SQL editor:

- `supabase/schema/teacher_profiles.sql`

After setup:

- Visit `/teachers/login` to sign in with magic link, email/password, or Google OAuth.
- `/teachers/composer` is now protected and redirects to login when unauthenticated.
