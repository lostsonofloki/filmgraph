# Filmgraph Architecture Overview

> Top-down map of the Filmgraph system. Use this as the grounding doc when asking NotebookLM "how does X fit together" questions.

## High-level system map

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client (Vite + React)                       │
│  Routes (App.jsx, lazy-loaded)                                       │
│  ├─ Auth pages          ├─ Library / Collection / Up Next            │
│  ├─ Trending / Search   ├─ Discovery (Oracle)                        │
│  ├─ MovieDetail         ├─ Lists / Shared lists                      │
│  └─ Profile / Stats     └─ Admin Oracle Analytics                    │
│                                                                      │
│  State: React state + Supabase session + Service Worker cache        │
│  Mobile: Capacitor wrapper (Android) for native scanner / camera     │
└─────────────┬──────────────────────────┬─────────────────────────────┘
              │                          │
              ▼                          ▼
   ┌───────────────────────┐   ┌──────────────────────────────────────┐
   │ Vercel (Hosting +     │   │ Supabase (Postgres + Auth + RLS)     │
   │   Serverless Funcs)   │   │                                      │
   │                       │   │ Tables: profiles, movie_logs,        │
   │ /api/upc-lookup       │   │   lists, list_items, list_members,   │
   │   (UPC proxy)         │   │   oracle_provider_events, ...        │
   └─────────┬─────────────┘   └──────────────────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                 External APIs (browser-direct)                   │
   │ TMDB · OMDb · Gemini · Groq · OpenRouter · NYT · Fanart · Trakt  │
   │                       upcitemdb.com (via /api/upc-lookup proxy)  │
   └──────────────────────────────────────────────────────────────────┘
```

## Layer responsibilities

| Layer | What it owns | Key files |
| --- | --- | --- |
| Client shell | Routing, auth gating, layout, theming | `src/App.jsx`, `src/components/Header.jsx`, `src/index.css`, `src/App.css` |
| Auth | Supabase session bootstrap + persistence toggle | `src/contexts/AuthContext.jsx`, `src/lib/supabaseClient.js` |
| Pages (lazy) | Top-level routes, each owns its data fetching | `src/pages/*.jsx` |
| Components | Reusable UI primitives (cards, modal, rating) | `src/components/*` |
| API adapters | Thin HTTP wrappers, fail-soft semantics | `src/api/*.js` |
| Domain utils | Cross-cutting logic (Oracle, enrichment, badges) | `src/utils/*` |
| Serverless | Same-origin proxies (CORS-sensitive lookups) | `api/*.js` |
| Migrations | Schema evolution, RLS, indexes | `supabase/migrations/*.sql` |
| Mobile shell | Capacitor wrapper for native camera + secure context | `android/`, Capacitor config |

## Critical data flows

### A. Logging a movie (manual or barcode)
1. User opens `LogMovieModal` (`src/components/LogMovieModal.jsx`).
2. Either:
   - Searches TMDB via `searchMovies()` in `src/api/tmdb.js`, OR
   - Scans a UPC, which calls `lookupMovieByUpc()` in `src/api/upc.js`.
3. UPC path tiers: same-origin `/api/upc-lookup` → direct `upcitemdb.com` → `allorigins.win` proxy.
4. UPC results normalize through `buildSearchTitleCandidates()` then `chooseBestTmdbMatch()` for clean TMDB matching.
5. Submit writes a row into `movie_logs`. UPC scans persist `source_upc` for ownership signals.

### B. Oracle recommendation
1. Discovery page collects vibe/mood + provider preferences (from `profiles.user_providers`).
2. `src/utils/gemini.js` orchestrates: Groq (fast genres) → Gemini (deep reasoning) → TMDB fallback.
3. Each result is verified for watch-provider availability via `getMovieWatchProviders()` in `src/api/tmdb.js`.
4. Results are enriched with rationale + provider badges + watch-now deep links.
5. Provider events (`selected_provider_ids`, `provider_filtered_out_count`, `provider_match_count`) are written to `oracle_provider_events` for analytics.

### C. Optional enrichment (feature-flagged)
1. `MovieDetail.jsx` calls `fetchMovieEnrichment()` in `src/utils/movieEnrichment.js`.
2. Internally runs `Promise.allSettled` across:
   - Editorial: Wikipedia + NYT Top Stories (`src/api/editorial.js`).
   - Visual: Fanart.tv (`src/api/visuals.js`).
   - Tracking: Trakt match (`src/api/trakt.js`).
3. Each adapter is gated behind `VITE_FEATURE_*` flag in `src/config/enrichmentFlags.js`.
4. Failures are swallowed; UI renders enrichment cards only when data resolves successfully.

### D. Physical ownership (Collection)
1. UPC-tagged log writes `movie_logs.source_upc`.
2. `LibraryPage.jsx` Collection tab queries logs where `source_upc IS NOT NULL`.
3. `ProfilePage.jsx` aggregates `Physical Owned` stat from same source.
4. `MovieCard.jsx` renders an "Owned" badge when `showOwnedBadge` is true.
5. `MovieDetail.jsx` shows an ownership banner when matching `source_upc` is found for the user.

## AI orchestration (summary)

| Stage | Provider | Purpose | Tag emitted |
| --- | --- | --- | --- |
| Genre extraction | Groq (LPU) | Sub-500ms vibe → genres | `[ORACLE:groq]` |
| Reasoning | Gemini 1.5 Flash | Multi-movie picks + rationale | `[ORACLE:gemini]` |
| Emergency fallback | OpenRouter chain | Free-tier failover | `[ORACLE:openrouter]` |
| Hard fallback | TMDB direct | Pure metadata recs when AI fails | `[ORACLE:tmdb]` |

Provider tagging flows into `oracleAnalytics` so per-provider success/failure is queryable from the admin route.

## Routing (lazy-loaded)

All major routes use `React.lazy` + `Suspense` in `src/App.jsx` for code-splitting. Loading fallback is a lightweight skeleton; protected routes wrap children in an auth guard from `AuthContext`.

## Service Worker / PWA

- Service worker caches app shell + critical API responses.
- Dev mode unregisters any active SW on mount to avoid stale-client interference with Vite HMR.
- New routes (e.g. `/collection`) and new endpoints (e.g. `/api/upc-lookup`) should be re-evaluated against caching rules whenever they're added.

## Environment surface

All client env vars live in `.env` and Vercel project settings. They follow these conventions:
- `VITE_*` → exposed to client. Use only for non-secret keys.
- `*_API_KEY` without `VITE_` → server-only (functions / build-time).
- `VITE_FEATURE_*` → client-readable feature flags consumed by `src/config/enrichmentFlags.js`.

See `.env.example` for the canonical list and intended scope.

## What this doc is _not_
- Not a step-by-step build guide. See `README.md`.
- Not a feature changelog. See `CHANGELOG.md`.
- Not a phase plan. See `ROADMAP.md`.
- Not a debugging guide. See `artifacts/failure-modes.md`.
- Not a schema reference. See `artifacts/data-model.md`.
