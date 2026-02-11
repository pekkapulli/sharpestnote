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
