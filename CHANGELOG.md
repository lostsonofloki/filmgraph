# 📝 Changelog

All notable changes to Filmgraph will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🧪 Next

- Continue optional enrichment rollout (Streaming Availability+) behind feature flags.
- Onboarding for streaming preferences (first-launch modal, inline display).
- Server-side cache table for UPC results.
- Confidence scoring in TMDB matching with user confirmation for ambiguous titles.
- Enrichment failure telemetry into Oracle analytics.

---

## [1.12.11] - April 28, 2026

### 🛠️ Changed

- **Auth email deliverability UX**
  - Added explicit spam/promotions-folder guidance to password-reset flow in `LoginPage` helper and success messaging.
  - Added the same spam/promotions guidance to signup flow success messaging and email field helper copy in `RegisterPage`.
- **Release metadata sync**
  - Aligned app/package versions and roadmap pointer for this UX pass.

### ✅ Quality

- Verified no linter issues in updated auth pages after copy and style updates.

---

## [1.12.10] - April 28, 2026

### 🛠️ Changed

- **Primary-domain SEO hardening**
  - Updated SEO defaults/canonical fallback from `filmgraph.vercel.app` to `filmgraph.app` in the shared head component.
  - Updated crawler metadata to the primary domain (`robots.txt` sitemap URL + sitemap generator default URL).
  - Regenerated `public/sitemap.xml` against `https://filmgraph.app`.
  - Updated launch artifact links to point at the primary domain.

### ✅ Quality

- Domain property is now aligned across head/crawler/link surfaces for Search Console indexing consistency.

---

## [1.12.9] - April 28, 2026

### 🚀 Added

- **SEO discoverability foundation**
  - Added route-level SEO head management with `react-helmet-async` and reusable `SeoHead` component.
  - Added dynamic titles/descriptions/canonical/OG/Twitter tags on key routes (Trending, Search, Discovery, Library, Movie Detail).
  - Added `Movie` JSON-LD schema on `MovieDetail` with title/year/poster/overview plus Filmgraph mood/rating properties when available.
- **Crawler assets + sitemap automation**
  - Added `public/robots.txt` with sitemap declaration.
  - Added sitemap generation script (`scripts/generate-sitemap.mjs`) and npm command `seo:sitemap`.
  - Generated `public/sitemap.xml` from static routes with optional dynamic movie ID support via `SITEMAP_MOVIE_IDS`.
- **Launch content artifact pack**
  - Added reusable launch/reply templates under `artifacts/launch/` for Reddit/Facebook/community posting workflows.

### 🛠️ Changed

- **Shared list reliability**
  - Added adapter-backed `deleteList` API in `src/api/sharedLists.js` and moved UI deletion flow onto that single path.
  - Updated library list deletion to use context adapter flow instead of duplicated direct Supabase calls.
  - Added duplicate list-name guard in shared list creation to prevent accidental repeated list creation by the same user.

### ✅ Quality

- Verified sitemap generation (`npm run seo:sitemap`) and production build (`npm run build`) succeed after SEO integration.

---

## [1.12.8] - April 27, 2026

### 📚 Documentation

- **NotebookLM grounding bundle**
  - Added `artifacts/architecture-overview.md` — top-down system map (client, Supabase, Vercel functions, external APIs, AI orchestration) for grounding NotebookLM Q&A.
  - Added `artifacts/data-model.md` — Supabase schema reference covering `profiles`, `movie_logs`, `lists` family, `oracle_provider_events`, RLS principles, and chronological migration index.
  - Added `artifacts/failure-modes.md` — battle-scar catalog with 12 high-signal regressions (mobile camera black preview, UPC CORS, stale Vite/SW caches, env drift, native secure-context, enrichment crashes, etc.) and a template for adding new entries.
- Joined the existing `artifacts/barcode-scanner-implementation-summary.md` to form a complete NotebookLM source set: architecture + schema + failure modes + feature deep-dive.

### ✅ Quality

- Version bump (`1.12.7` → `1.12.8`) reflects documentation surface area only — no runtime behavior changes.

---

## [1.12.7] - April 27, 2026

### 🚀 Added

- **Streaming-aware Oracle preferences**
  - Added user streaming provider preferences (`user_providers`) with profile/discovery multi-select controls.
  - Added provider-aware Oracle verification metrics columns for analytics (`selected_provider_ids`, `provider_filtered_out_count`, `provider_match_count`).
- **Optional API enrichment scaffold**
  - Added feature-flag controls for editorial, visual, and Trakt enrichments (`VITE_FEATURE_EDITORIAL_ENRICHMENT`, `VITE_FEATURE_VISUAL_ENRICHMENT`, `VITE_FEATURE_TRAKT_ENRICHMENT`).
  - Added non-blocking enrichment adapters for Wikipedia, NYT Top Stories (Movies), Fanart.tv, and Trakt movie matching.
  - Added `MovieDetail` optional enrichment cards that render only when enrichment data is available.

### 🛠️ Changed

- **Oracle provider filtering + watch-now flow**
  - Discovery now persists/uses provider selections, verifies TMDb watch providers per recommendation, and filters suggestions to matching services when configured.
  - Added provider badge surfacing and `Watch Now` deep links in discovery and movie detail experiences.
  - TMDb fallback path now accepts provider-aware constraints and US watch-region context.
- **UI foundation normalization**
  - Consolidated app shell header ownership to `src/components/Header.jsx` and removed duplicate inline header implementation in app shell.
  - Added global design-token primitives in `src/index.css` and route-level page-shell normalization in `src/App.css`.
  - Added development safety hardening for Vite HMR/service-worker conflicts to reduce stale-client behavior.
- **Enrichment reliability guardrails**
  - Enrichment fetches now run independently and fail-soft with Promise-settled orchestration so core movie rendering never blocks.
  - Added `.env.example` documentation for enrichment flags.

### ✅ Quality

- Verified production build succeeds after streaming + UI foundation integration (`npm run build`).
- Confirmed roadmap/docs alignment for completed Phase 1/2 implementation and queued Optional API Enrichment phase.

---

## [1.12.6] - April 16, 2026

### 🚀 Added

- **Oracle Analytics admin surface**
  - Added analytics route at `/admin/oracle-analytics` with provider/fallback visibility.
  - Added Oracle analytics API/util wiring and Supabase `oracle_provider_events` migration support.

### 🛠️ Changed

- **Reliability hardening**
  - Added shared-list schema fallback handling for optional columns (`joined_at`, `added_by`) to avoid hard failures across environments.
  - Hardened importer/list insertion fallback when `added_by` is unavailable.
  - Improved service worker offline fallbacks for navigation and cached API responses.

### ✅ Quality

- Follow-up release sync after GitHub push: changelog/version alignment before deployment.

---

## [1.12.5] - April 16, 2026

### 🚀 Added

- **Phase 6.2 Watch History Calendar**
  - Replaced the `/history` timeline with a month calendar grid that highlights watched days.
  - Added day-level drilldown: selecting an active day reveals all movies watched on that date.
  - Added month navigation controls (`Previous`, `Next`) and a `Jump to Today` shortcut.

### 🛠️ Changed

- **Watch History mobile UX polish**
  - Enforced mobile-friendly touch targets (44px minimum) on calendar controls and day cells.
  - Improved small-screen layout density for calendar and selected-day cards for readability and tap comfort.

### ✅ Quality

- Lint checks pass for updated Watch History files.

---

## [1.12.4] - April 15, 2026

### 🐛 Fixed

- **Auth persistence / Remember Me (hardening)**
  - Clear Supabase session keys (`sb-*` and legacy app key) from both `localStorage` and `sessionStorage` before each login and after logout so switching Remember Me cannot leave orphaned tokens.
  - Local-only `signOut` before `signInWithPassword` resets in-memory auth without an extra network round trip.
  - `onAuthStateChange` clears app user state only on `SIGNED_OUT`, not on other events with a transient missing session.

### ✅ Quality

- Targeted lint passes for auth/session files.
- Production build succeeds (`npm run build`).

---

## [1.12.3] - April 15, 2026

### 🐛 Fixed

- **Auth persistence / unexpected logout**
  - Fixed Remember Me behavior by wiring auth persistence to a deterministic storage preference used by the Supabase storage adapter.
  - Removed unsupported `persistSession` login option usage from sign-in flow and centralized storage preference handling.
  - Default logout now resets preference back to local persistence for the next login session.

### ✅ Quality

- Targeted lint passes for auth/session files.
- Production build succeeds (`npm run build`).

---

## [1.12.2] - April 15, 2026

### 🛠️ Changed

- **Scanner discoverability**
  - Added a primary `📷 Scan Barcode` CTA in the Library header, directly beside `✨ Magic Import`.
  - CTA opens `LogMovieModal` in scan-first mode so users can immediately scan and save from the main Library action row.
- **Scan flow validation**
  - Added a guard in `LogMovieModal` to prevent saving placeholder entries before a valid movie is identified via scanner/lookup.

---

## [1.12.1] - April 15, 2026

### 🛠️ Changed

- **Scanner compatibility hardening**
  - Added browser fallback scanner path in `src/components/LogMovieModal.jsx`: use native `BarcodeDetector` when available, and automatically fall back to `html5-qrcode` when unavailable or when native startup fails.
  - Improved scanner lifecycle cleanup (camera stream + timer + fallback scanner stop/clear) to prevent stuck sessions on mobile.
  - Preserved existing UPC lookup + anti-double-buy integration for both scanner modes.

### 📦 Dependencies

- Added `html5-qrcode` as scanner fallback dependency.

---

## [1.12.0] - April 15, 2026

### 🚀 Added

- **PWA install polish**
  - Added install-prompt UX flow via `beforeinstallprompt` handling (`src/pwa/useInstallPrompt.js`) and app-level install CTA (`src/App.jsx`).
  - Upgraded manifest metadata in `public/manifest.json` and added dedicated app icons (`public/pwa-192.svg`, `public/pwa-512.svg`).
  - Added icon links in `index.html` for stronger installability signals.
- **Scanner MVP + UPC pipeline**
  - Added live camera barcode scanning in `LogMovieModal` using `BarcodeDetector` + rear-camera constraints where available.
  - Added UPC lookup pipeline (`src/api/upc.js`) that resolves barcode data and pre-fills movie context via TMDB search.
  - Wired scanner/lookup output into existing anti-double-buy and UPC integrity save flow.

### 🛠️ Changed

- **Roadmap progress sync**
  - Marked PWA install polish and scanner-integrated anti-double-buy milestones complete in Phase 7 sections.

---

## [1.11.1] - April 15, 2026

### 🛠️ Changed

- **AI provider hardening**
  - Tightened Groq genre-extraction response contract to strict JSON object shape for better parser reliability.
  - Hardened Gemini initialization path to fail clearly when key is missing, allowing fallback flow to proceed deterministically.
- **Environment setup docs**
  - Added `VITE_OPENROUTER_API_KEY` to `.env.example`.
  - Updated `README.md` prerequisites and setup snippet for Groq + OpenRouter key requirements.
- **Infrastructure activation**
  - Applied Phase 7.1 and 7.3 database migrations in Supabase (`oracle_daily_budget`, `movie_logs_upc_integrity`) and verified resulting objects.
  - Added `VITE_OPENROUTER_API_KEY` to Vercel Production and Development environments.

---

## [1.11.0] - April 15, 2026

### 🚀 Added

- **Phase 7.1 Oracle hardening**
  - Added provider fallback ladder beyond Gemini with OpenRouter emergency fallback in `src/utils/gemini.js`.
  - Added Oracle budget utility `src/utils/oracleBudget.js` with Supabase RPC-first checks and local fallback counters.
  - Added Supabase migration `20260415170000_oracle_daily_budget.sql` for daily usage tracking + authenticated RPCs.
- **Phase 7.2 PWA + offline foundation**
  - Added service worker `public/sw.js` with app-shell caching and TMDB/OMDb API cache fallback.
  - Added service worker registration via `src/pwa/registerServiceWorker.js` and app bootstrap integration.
  - Added IndexedDB-backed queue `src/utils/offlineQueue.js` for offline movie-log writes with auto flush on reconnect.
- **Phase 7.3 discovery + collection integrity**
  - Added natural-language library query parsing in `src/utils/naturalLanguageSort.js` and integrated it into `LibraryPage`.
  - Added anti-double-buy checks in `AddToListButton` and `LogMovieModal` via `src/utils/collectionIntegrity.js`.
  - Added UPC integrity migration `20260415173000_movie_logs_upc_integrity.sql` and optional UPC field in log modal.

### 🛠️ Changed

- **Discovery context hydration**
  - Oracle request context now prioritizes Top 20 watched + Last 5 to-watch + curated list items before prompt assembly.
- **Offline UX**
  - Library and Discovery now display offline-state messaging for clearer behavior when disconnected.
- **Sync behavior**
  - App root now attempts queued-log flush on startup and when network connectivity returns.

---

## [1.10.1] - April 15, 2026

### 🚀 Added

- **Username foundation for social/collaboration flows**
  - Added migration `20260415143000_username_foundation.sql` to enforce `profiles.username` consistency.
  - Backfills missing usernames, enforces lowercase/format validation, and adds a case-insensitive unique index.
  - Added RPC `is_username_available(p_username, p_exclude_user_id)` for frontend availability checks.

### 🛠️ Changed

- **Registration**
  - Sign-up now includes a required `username` field.
  - Validates username format and checks availability before account creation.
  - Persists username in both `auth.user_metadata` and `profiles`.
- **Profile Settings**
  - Added editable username field alongside display name.
  - Username updates now validate format + uniqueness before save.
- **Utilities**
  - Added `src/api/usernames.js` with normalization/validation/availability helpers.

### ✅ Quality

- Lint passes cleanly (`npm run lint`)
- Production build succeeds (`npm run build`)

---

## [1.10.0] - April 15, 2026

### 🚀 Added

- **Phase 6.17 MVP — Collaborative Shared Lists**
  - **Invite system (owner-only)**: owners can invite collaborators by UUID, email, or username from list detail.
  - **Role model**: collaborators support `owner`, `editor`, and `viewer` permissions with role update/remove controls.
  - **Membership-aware list loading**: shared lists now appear across Library and Add-to-List flows (not just owned lists).
  - **Attribution metadata**: list items include `added_by` profile context for per-item “Added by …” display.
  - **Realtime sync**: active shared list auto-refreshes when collaborators mutate `list_items`.

### 🛠️ Changed

- **ListContext now shared-aware**
  - Added role helpers (`isListOwner`, `canEditList`) and collaborator actions (`inviteCollaborator`, `changeCollaboratorRole`, `removeCollaborator`).
  - List creation and item mutation paths now use shared-list API patterns and role checks.
- **Library UI**
  - Added collaborators panel in list detail with invite input, role badges, role editing, and removal actions.
  - “My Lists” tab label updated to **Lists** and list cards now indicate owner/shared role context.
- **Action Menu Sync**
  - `AddToListButton` and Oracle discovery quick-add now include shared lists.
  - Viewer-role lists are visible but disabled for edits with explicit viewer indicators.

### ✅ Quality

- Lint passes cleanly (`npm run lint`)
- Production build succeeds (`npm run build`)

---

## [1.9.6] - April 15, 2026

### 🚀 Added

- **Phase 6.18.5 — Crew deep navigation on Movie Detail**
  - **Hero**: “Directed by” and “Written by” lines with links to `/actor/:id` (deduped from TMDB `credits.crew`)
  - **Behind the camera**: New section for featured roles (Director of Photography, Editor, Original Music Composer, Production Design) with the same poster grid + links as Cast
- Cast section was already linked; this completes person-profile navigation for key crew

---

## [1.9.5] - April 15, 2026

### 🧰 Added

- **ESLint** (flat `eslint.config.js`) for Vite + React: `eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
- **Scripts**: `npm run lint` / `npm run lint:fix`
- **Lint scope**: `src/` only; build output, `node_modules`, `scripts/`, and `*.config.js` ignored

### 🐛 Fixed (found by lint)

- **Header.jsx** — Added missing `useNavigate` import; merged duplicate `onClick` on mobile Oracle button
- **DiscoveryPage.jsx** — Removed invalid conditional `useToast()` call (hooks must run unconditionally)
- **OracleOverlay.jsx** — Dropped unused default React import (JSX runtime)

---

## [1.9.4] - April 14, 2026

### 🐛 Fixed

- **Supabase `/lists` HTTP 500** — RLS on `lists` and `list_members` was still mutually recursive (`lists` queried `list_members`, owner policy on `list_members` queried `lists`). Replaced those checks with `SECURITY DEFINER` helpers (`list_owned_by_user`, `user_is_member_of_list`, `user_can_edit_shared_list`) so membership/ownership checks do not re-enter RLS. Updated `list_items` policy to use the same pattern.
- **Movie detail log noise** — Removed the `console.log` for the normal “no log yet” case; `userLog` is now cleared with `setUserLog(null)` when there is no row.

### ℹ️ Notes (not app bugs)

- **React DevTools** — Browser hint only; optional install.
- **Vercel Analytics (dev)** — Expected: debug mode does not send events in development.
- **Google Analytics `g/collect` failed** — Common on `localhost` (ad blockers, privacy extensions, or network). Does not affect core app behavior.

---

## [1.9.3] - April 14, 2026

### 🚀 Added

- **Actor Filmography Filters (Phase 6.18.4)** — Smart filtering on person profile pages:
  - **Genre chips** — Only genres present in this actor’s loaded credits; multi-select uses OR logic (match any selected genre).
  - **Decade chips** — Filter by release decade (Pre-1970 through 2030s) when applicable.
  - **Logged only** — Show credits you’ve already logged (requires sign-in).
  - **Clear filters** — One control to reset genre, decade, and logged-only state.
  - **Sticky filter bar** — On viewports ≤768px, filters stick to the top while scrolling the grid (solid background, no bleed-through).
- **Larger credit sample** — Filmography list increased from 40 to 150 TMDB cast entries (poster + popularity sorted) so filters have more to work with.

---

## [1.9.2] - April 14, 2026

### 🛠️ Changed

- **Footer Credits Link** - Updated `Developed by Josh Jenkins` to link directly to Linktree: `https://linktr.ee/sonofloke`
- **Roadmap Sync (Phase 6.18)** - Marked completed items now reflected in code:
  - 6.18.2 UI Categorization (Movies vs People search results)
  - 6.18.3 Advanced Person Profiles (`person/{id}/movie_credits`)
  - 6.18.6 Logged Indicators on actor filmography cards

### 🐛 Fixed

- **Supabase Lists 500 Error** - Resolved recursive RLS policy issue on `list_members` that caused `/rest/v1/lists` to intermittently return HTTP 500
- **List Query Payload Regression** - Restored `added_at` selection in `list_items` query now that schema is verified
- **Lists Update Payload** - Removed non-existent `updated_at` write from list updates to prevent schema mismatch failures

---

## [1.9.1] - April 14, 2026

### 📊 Added

- **Vercel Analytics** - Installed `@vercel/analytics` with `<Analytics />` component in `App.jsx`
- **Google Analytics 4** - Added GA4 tag (`G-V9YRL159CM`) to `index.html` head section
- **Page View Tracking** - Automatic tracking of navigation events via Vercel Analytics
- **Dual Analytics Setup** - Both Vercel and Google Analytics running simultaneously

---

## [1.9.0] - April 14, 2026

### 🔥 Rebrand

- **Ignes → Filmgraph** - Complete project rename across all source files, components, documentation, and configuration
- **FilmgraphLogo Component** - Renamed from IgnesLogo with updated CSS classes and branding
- **Session Storage Keys** - Changed from `ignes_temp_session` to `filmgraph_temp_session`
- **AI System Prompts** - Updated all Gemini prompts to reference Filmgraph
- **GitHub Repository** - Updated to `https://github.com/lostsonofloki/filmgraph`

### 🚀 Added

#### Global Multi-Search (TMDB /search/multi)

- **searchMulti Function** - New API endpoint in `tmdb.js` returns both movies and people from a single query
- **Mixed Results Display** - SearchResults component now visually distinguishes movies from people with media-type badges
- **Person Cards** - Profile-image results with 1:1 aspect ratio, department label, and "Person" badge
- **Movie Cards** - Standard 2:3 poster cards with "Movie" badge
- **Deep Linking** - Person results navigate to `/actor/${id}`, movie results to `/movie/${id}`

#### Person Profile Hub (ActorPage Rewrite)

- **Concurrent Data Fetching** - `Promise.all` fetches bio and movie_credits simultaneously on mount
- **Enhanced Bio Section** - Profile image, name, department badge, birthday, birthplace, and full biography
- **Expanded Filmography** - Shows top 40 movies by popularity (up from 20) with character roles
- **Deep Ember Redesign** - Dark zinc backgrounds, amber accents, responsive layout

#### "Watched" Badge (Supabase Cross-Reference)

- **Logged ID Fetching** - Lightweight query fetches only `tmdb_id` column from `movie_logs` for authenticated user
- **Cross-Reference Engine** - Compares logged IDs against actor's filmography via `Set.has()` lookup
- **Watched Badge** - Subtle amber checkmark overlay on posters user has already logged
- **Real-Time** - Badge appears automatically when user logs movies

### 🛠️ Changed

- **SearchPage.jsx** - Migrated from `searchMovies` to `searchMulti` for mixed results
- **SearchResults.jsx** - Complete rewrite to handle both movie and person result types
- **ActorPage.jsx** - Full rewrite with `Promise.all` concurrent fetching, Supabase cross-reference, and Watched badge
- **ActorPage.css** - Complete CSS overhaul with filmography grid, watched badge, and responsive design
- **SearchResults.css** - Added media-type badges, person card styling, and department labels

---

## [1.8.3] - April 7, 2026

### 🐛 Fixed

- 🔧 **Edit Movie Log Poster Update Error** - Fixed "column 'poster' can only be updated to DEFAULT"
  - Removed `poster` field from all insert/update payloads in `LogMovieModal.jsx`
  - `poster` is a Supabase generated column and cannot be explicitly written to
  - Both insert and update operations now exclude `poster` entirely
- 🔢 **"N/A" Integer Cast Error** - Fixed "invalid input syntax for type integer: 'N/A'"
  - Changed `movieYear` fallback from `'N/A'` string to `null`
  - Added `parseInt(year, 10)` sanitization before sending `year` to Supabase
  - Prevents Postgres integer column type mismatch on missing release dates

---

## [1.8.2] - April 1, 2026

### 🐛 Fixed

- 🔧 **Archive Importer Batch Save Error** - Fixed Supabase generated column conflict
  - Changed `poster` to `poster_path` in `batchSaveMovies` function
  - Removed URL construction (stores raw `poster_path` instead of full URL)
  - Payload now excludes non-DEFAULT values for generated columns
  - Final insert format: `{ user_id, tmdb_id, title, year, poster_path, watch_status, rating, moods, review, genres }`

### 🧪 Added

- 📸 **Playwright Portfolio Screenshot Tests** - Automated high-res screenshots for portfolio
  - Desktop (1920x1080): Matchmaker, Oracle, Stats pages
  - Mobile (390x844): Library page
  - Auto-authentication via `/login` with credential wait
  - Output to `portfolio-screenshots/` folder
  - Run with: `npx playwright test portfolio-screenshots --project=chromium`

---

## [1.8.1] - March 29, 2026

### 🐛 Fixed

- 🔧 **Discover Page 400 Error** - Fixed Supabase payload schema mismatch in Watchlist button
  - Changed `poster` to `poster_path` to match current database schema
  - Removed redundant fields (`year`, `rating`, `moods`, `review`) from insert payload
  - Only essential fields now sent: `user_id`, `tmdb_id`, `title`, `poster_path`, `watch_status`

---

## Latest Version: 1.8.0 (March 29, 2026)

**Highlights:**

- 🔮 **Oracle** - AI-powered movie discovery with mood-based recommendations
- 🤝 **The Matchmaker** - Social compatibility feature for comparing movie tastes with friends
- 🎭 **6 Mood Presets** - Quick-select bubbles for instant vibe matching
- 📱 **Mobile Navigation** - Discover page movie cards now clickable
- 🎨 **Deep Ember Theme** - Consistent dark aesthetic with amber/orange accents

**Quick Links:**

- [Full v1.8.0 Notes](#180---march-29-2026)
- [Previous: v1.7.0](#170---march-28-2026)
- [Roadmap](./ROADMAP.md)
- [README](./README.md)

---

## [1.8.0] - March 29, 2026

### 🚀 Added

#### Oracle - AI-Powered Discovery

- **Mood Bubbles** - 6 quick-select presets with icons:
  - 🕯️ **Cozy** - Warm, comforting films for quiet nights
  - 🔥 **Adrenaline** - High-octane action and thrills
  - 🧠 **Mind-Bending** - Reality-twisting, thought-provoking cinema
  - 💎 **Deep Cuts** - Obscure gems most viewers haven't seen
  - 🌑 **Noir** - Dark, atmospheric crime with moral ambiguity
  - ✨ **Euphoric** - Uplifting films that leave you feeling alive
- **Natural Language Input** - "A sci-fi film that explores loneliness with stunning visuals"
- **Vibe Check** - Punchy 5-7 word taglines for each recommendation
- **Rationale Display** - "Why Filmgraph Picked This" with cinematic analysis
- **Reject & Reroll** - Reject entire batch and get new recommendations
- **Session Tracking** - Badge showing rejected movies count
- **TMDB Integration** - Auto-fetch posters, release years, and metadata
- **Library Integration**:
  - **Watched Button** - Log movie with rating instantly
  - **Watchlist Button** - Add to watchlist in one click
  - **Add to List** - Dropdown to add to custom lists
  - **View on TMDB** - Direct link to TMDB movie page

#### The Matchmaker - Social Compatibility (Phase 6.14)

- **Social Hub Card** - New section on Profile page with friend management
- **Friend Invites** - Search and invite users by email
- **Friendship Requests** - Incoming/outgoing request management
- **My Crew** - List of accepted friends with match scores
- **Pending Requests** - Track sent requests awaiting response
- **Requests** - Incoming requests with accept/decline actions
- **Synergy Score** - Randomized compatibility percentage (70-100%)
- **Click-to-Compare** - Tap any friend chip to view compatibility report
- **Deep Ember Theme** - Consistent dark zinc backgrounds with amber accents
- **Font-creepster Headers** - Distinctive Creepster font for titles
- **Thumb-Friendly Tap Targets** - 48px minimum button heights

#### Profile Page Enhancements

- **Social Hub Section** - Dedicated area for friend management
- **Friends Carousel** - Horizontal scroll of friend chips with avatars
- **Add Friend Chip** - Quick access button to invite new friends
- **Match Score Badges** - Green compatibility percentage on each friend
- **Link Navigation** - All friend elements use React Router Link components

### 🐛 Fixed

#### Discover Page Navigation

- **Problem**: Movie posters and titles on `/discover` results were not clickable
- **Fix**: Wrapped poster and title in `<Link to="/movie/${movie.id}">` components
- **Styling**: Added `.rec-poster-link` and `.rec-title-link` CSS classes
- **Hover Effects**: Poster scales and title turns orange on hover
- **No Default Link Styling**: Removed underlines and color shifts

#### AddToListButton Mobile Layout

- **Problem**: `variant="icon"` prop was ignored, breaking mobile library cards
- **Fix**: Added `variant` prop to function signature with default `'default'`
- **Icon Variant**: Renders compact 44x44px icon-only button when `variant="icon"`
- **Three-Button Layout**: Edit Log, Add to List, Delete now fit side-by-side on mobile
- **Styling**: Matches other mobile action buttons with amber border and hover effects

### 🎨 UI/UX

#### Deep Ember Theme

- **Background**: #0a0a0a dark zinc base
- **Accents**: Amber (#f97316) and orange (#ea580c) gradients
- **Borders**: Subtle zinc-800/900 borders
- **Shadows**: Orange-tinted glow effects on hover
- **Typography**: Clean hierarchy with proper spacing

#### Mood Bubble Design

- **Grid Layout**: Auto-fit responsive grid (min 140px)
- **Active State**: Orange gradient background with glow
- **Hover Effects**: Lift animation with border highlight
- **Icon + Label**: Clear visual hierarchy with emoji icons

#### Matchmaker Styling

- **Header**: Large Creepster font title with orange glow
- **Input Fields**: 16px padding, 48px min-height for touch targets
- **Buttons**: Gradient backgrounds with hover lift
- **Cards**: Dark zinc backgrounds with subtle borders
- **Avatars**: 48px circular with gradient fallbacks

### 🛠️ Changed

#### New Files

- **DiscoveryPage.jsx** - Complete AI discovery interface
- **DiscoveryPage.css** - Deep Ember themed styling
- **MatchmakerPage.jsx** - Social compatibility management
- **MatchmakerPage.css** - Responsive friend management UI

#### Updated Files

- **ProfilePage.jsx** - Added Social Hub section with friend carousel
- **ProfilePage.css** - Social hub and friend chip styling
- **App.jsx** - Added `/discover` and `/matchmaker` routes
- **index.css** - Added `.font-creepster` utility class

#### Backend Integration

- **getHybridRecommendation()** - Multi-movie AI recommendations with Groq + Gemini
- **fetchUserMovieHistory()** - Three-bucket memory fetch (Watched + Watchlist + Lists)
- **friendships Table** - Existing table for social connections
- **Zero-Duplicate Guarantee** - Combines session rejections with lifetime library

### ⚡ Performance

#### AI Orchestration

- **Groq Genre Extraction** - ~300-600ms for ultra-fast vibe-to-genre translation
- **Parallel TMDB Fetching** - Concurrent poster/metadata requests
- **Three-Bucket Fetch** - Promise.all for sub-500ms data prep
- **Efficient Joins** - `lists!inner(user_id)` eliminates N+1 queries

#### Social Features

- **Parallel Friendship Queries** - Sent/received/accepted fetched simultaneously
- **Optimized Avatar Loading** - Public URLs from Supabase Storage
- **Lazy Loading** - Friend chips render on demand

### 📝 Documentation

#### Updated Files

- **CHANGELOG.md** - Comprehensive v1.8.0 release notes
- **ROADMAP.md** - Phase 6.14 (Matchmaker) marked complete
- **ROADMAP.md** - Oracle features documented

---

## [1.7.0] - March 28, 2026

### 🐛 Fixed

#### Bug 1: HTTP 406 Not Acceptable Error

- **Root Cause**: TMDB API requests missing proper Accept header
- **Fix**: Added `Accept: application/json` header to all TMDB fetch calls
- **Affected Functions**:
  - `getMovieDetails()` - Movie detail pages
  - `searchMovies()` - Search functionality
  - `getTrendingMovies()` - Trending movies homepage
  - `getRecommendations()` - Related movies on detail page
  - `discoverMovies()` - Discovery/filter functionality
  - `fetchWatchProviders()` - Where to Watch section
- **Error Handling**: Added `response.ok` checks with descriptive error messages

#### Bug 2: Watchlist vs Custom List Confusion

- **Problem**: Users confused about where movies were being saved
- **Solution**: Separated actions into three distinct buttons with clear icons and labels

### 🚀 Added

#### Quick Watchlist Toggle

- **Eye Icon Button**: Visual indicator with eye icon
- **One-Click Toggle**: Adds/removes movie from watchlist instantly
- **Active State**: Button highlights when movie is in watchlist
- **Smart Handling**:
  - If no log exists: Creates new log with `watch_status: 'to-watch'`
  - If log exists with rating: Clears watch_status (keeps rating)
  - If log exists without rating: Deletes log entry
  - If already in watchlist: Removes from watchlist
- **Toast Notifications**: Success feedback for all actions

#### Three-Button Action Layout

- **Watchlist Button** (left): Quick toggle with eye icon
  - Shows "Watchlist" or "In Watchlist" based on status
  - Gray background, active state with white text
- **Log Movie Button** (center, primary): Opens full logging modal
  - Prominent red gradient background
  - Shows "Log Movie" or "Edit Log" based on existing log
- **Add to List Button** (right): Adds to custom user-created lists
  - Standard button styling
  - Opens dropdown with list selection

### 🎨 UI/UX

#### Button Design

- **Dark Theme**: Zinc-900 backgrounds, gray borders
- **Hover Effects**: Lift animation with shadow
- **Active States**: Visual feedback for toggled watchlist
- **Icons**: SVG eye icon for watchlist, plus icon for log movie
- **Tooltips**: Title attribute explains action on hover

#### Mobile Responsive

- **Vertical Stacking**: Buttons stack on screens < 480px
- **Full Width**: Each button takes full width on mobile
- **Touch Targets**: Maintained 44px minimum height

### 🛠️ Changed

#### Backend (`src/api/tmdb.js`)

- **All Fetch Calls**: Added `headers: { 'Accept': 'application/json' }` option
- **Error Handling**: Added `if (!response.ok)` checks before parsing JSON
- **Error Messages**: Descriptive TMDB API error messages with status codes

#### Frontend (`src/pages/MovieDetail.jsx`)

- **New Import**: `useToast` from ToastContext for notifications
- **New Handler**: `handleToggleWatchlist()` function for quick watchlist toggle
- **Supabase Queries**: Uses `movie_logs` table with `watch_status` field
- **State Updates**: Updates `userLog` state after watchlist changes
- **Action Buttons**: Replaced 2-button layout with 3-button layout

#### Styling (`src/pages/MovieDetail.css`)

- **New Classes**:
  - `.movie-actions` - Flex container with gap spacing
  - `.watchlist-btn` - Watchlist toggle button styling
  - `.watchlist-btn.active` - Active/highlighted state
  - `.log-movie-btn-primary` - Primary log movie button
  - Mobile responsive rules for button stacking

### ⚡ Performance

#### API Reliability

- **Prevents 406 Errors**: Proper headers eliminate failed requests
- **Better Error Messages**: Clear debugging for API failures
- **Consistent Pattern**: All fetch calls use same header structure

### 📝 Documentation

#### Updated Files

- **CHANGELOG.md** - Comprehensive v1.7.0 release notes
- **ROADMAP.md** - Bug fixes marked as complete

---

## [1.6.0] - March 28, 2026

### 🚀 Added

#### Where to Watch Feature

- **`fetchWatchProviders()`** - New TMDB API integration for watch provider data
- **US Region Support** - Fetches streaming availability for United States
- **Three-Tier Display**:
  - **Priority 1**: Free streaming providers (flatrate)
  - **Fallback**: Rent options (marked with orange "R" badge)
  - **Fallback**: Buy options (marked with blue "B" badge)
- **Provider Logos** - Displays official provider artwork from TMDB
- **Hover Tooltips** - Shows provider name on hover with CSS tooltip

### 🎨 UI/UX

#### Visual Design

- **Dark Theme Integration** - Zinc-900 backgrounds matching app aesthetic
- **Rounded Corners** - `rounded-xl` (12px) provider logos
- **Hover Effects** - Scale up (1.1x) with shadow glow on hover
- **Clean Layout** - Providers displayed below genres, above action buttons
- **Mobile Responsive** - Smaller logos (42px) on screens < 640px

#### Smart Deduplication

- **Name-Based Filtering** - Uses `Map` to deduplicate by provider name
- **Handles Variants** - "Netflix" and "Netflix with ads" collapse to single entry
- **First Occurrence Wins** - Keeps primary provider tier when duplicates exist

### 🛠️ Changed

#### Backend (`src/api/tmdb.js`)

- **New Function**: `fetchWatchProviders(tmdbId)` - Fetches US watch provider data
- **API Endpoint**: `/movie/{movie_id}/watch/providers`
- **Error Handling** - Graceful fallback returns `null` on failure

#### Frontend (`src/pages/MovieDetail.jsx`)

- **New State**: `watchProviders` - Stores flatrate/rent/buy arrays
- **Fetch Integration** - Called alongside movie details in `fetchMovieData()`
- **Conditional Rendering** - Only displays section when providers exist
- **Deduplication Logic** - `Array.from(new Map(...).values())` pattern

#### Styling (`src/pages/MovieDetail.css`)

- **New Classes**:
  - `.watch-providers-section` - Container with border-top separator
  - `.watch-section-title` - Uppercase label with zinc-400 color
  - `.provider-logo-wrapper` - Individual provider card with hover effects
  - `.provider-tooltip` - Hover tooltip with arrow pointer
  - `.provider-logo-wrapper.rent::before` - Orange "R" badge
  - `.provider-logo-wrapper.buy::before` - Blue "B" badge

### ⚡ Performance

#### API Efficiency

- **Single Request** - One TMDB call per movie detail page load
- **Cached Results** - Provider data stored in component state
- **Parallel-Ready** - Could be combined with other fetches in future optimization

### 📝 Documentation

#### Updated Files

- **CHANGELOG.md** - Comprehensive v1.6.0 release notes
- **README.md** - Where to Watch feature documentation
- **ROADMAP.md** - Streaming integration marked as complete

### 🐛 Fixed

#### Bug Prevention

- **Missing Logo Handling** - Only renders providers with valid `logo_path`
- **Empty State** - Section hidden if no providers available
- **Provider Name Display** - Tooltip shows full name even for truncated logos

---

## [1.5.1] - March 26, 2026

### 🚀 Added

#### Magic Importer - Bulk Movie Import System

- **ArchiveImporterModal Component** - New 4-step modal workflow for bulk imports
- **Step 1: Input** - Paste messy text from Letterboxd, notes, or any format
- **Step 2: Verifying** - Auto-verify all parsed movies against TMDB in parallel
- **Step 3: Review** - Select/deselect individual movies before importing
- **Step 4: Complete** - Success screen with import statistics (saved/skipped/errors)

#### AI-Powered Text Parsing

- **`parseArchiveWithGroq()`** - New Groq LPU integration for intelligent text parsing
- **Multi-Format Support**:
  - Letterboxd exports: `"The Shawshank Redemption (1994) ★★★★☆"`
  - Plain lists: `"Pulp Fiction, 1994"`
  - Notes: `"Watched: Inception (2010) - loved it!"`
  - Numbered lists: `"1. The Matrix (1999)"`
  - Just titles: `"Shrek"` or `"Jaws"` (year optional)
  - Single movie: `"The Godfather"`
- **Smart Extraction** - Ignores ratings, reviews, notes, and extra text
- **JSON Output** - Returns clean `{title, year}` pairs for downstream processing
- **Flexible Parsing** - Handles single movie objects and arrays from Groq

#### TMDB Batch Verification

- **`verifyBatchWithTMDB()`** - Parallel TMDB API calls for all parsed movies
- **Promise.allSettled Pattern** - Handles partial failures gracefully
- **Status Tracking** - Each movie tagged as `found`, `not_found`, or `error`
- **Poster Preview** - Shows TMDB posters in review grid for visual confirmation

#### Smart Import Options

- **Watch Status Selector** - Import as "Watched" or "Want to Watch"
- **List Integration** - Optional dropdown to add all imported movies to a custom list
- **Duplicate Detection** - UPSERT with `onConflict: 'user_id, tmdb_id'` prevents duplicates
- **Select All/Deselect All** - Quick actions for bulk selection

#### Poster Migration Tool

- **`posterMigration.js`** - Utility to fix broken poster URLs for existing imports
- **Refresh Posters Button** - One-click migration in Library header
- **Automatic Conversion** - Relative paths to full TMDB URLs
- **TMDB Fallback** - Fetches missing posters using TMDB ID
- **Rate Limiting** - 100ms delay between requests to avoid API throttling

### 🎨 UI/UX Improvements

#### Navigation Enhancements

- **Active Page Indicators** - Orange underline on desktop nav, highlighted background on mobile
- **Mobile Menu Animation** - Smooth slide-down with fade effect
- **Improved Touch Targets** - 44px minimum height for mobile nav links
- **Hover States** - Background highlight and padding shift on mobile nav

#### Loading States

- **Skeleton Loaders** - Shimmer animation placeholders instead of "Loading..." text
- **MovieCardSkeleton** - Poster + title placeholder for movie cards
- **MovieGridSkeleton** - 12-item grid for library loading states
- **Better perceived performance** - Visual feedback during data fetch

#### Visual Polish

- **Enhanced MovieCard Hover** - Increased scale (1.03x), stronger orange shadow glow
- **Smoother Animations** - 700ms image zoom transition
- **Typography Hierarchy** - Defined h1/h2/h3 with responsive sizes
- **Max-Width Container** - 1400px content width with responsive padding
- **Smooth Scrolling** - Enabled in html for better navigation
- **Mobile Button Stacking** - Full-width vertical layout on small screens

#### Library Improvements

- **Button Reordering** - Magic Import → Create List → Refresh Posters
- **Responsive Layout** - Buttons stack vertically on mobile (< 640px)
- **Better Touch Targets** - Full-width buttons for easier tapping

### 🛠️ Changed

#### Frontend (`src/pages/LibraryPage.jsx`)

- **Magic Import Button** - Added "✨ Magic Import" button in library header
- **Import Modal Integration** - `showImportModal` state and `ArchiveImporterModal` component
- **Refresh Handler** - Library refreshes automatically after successful import
- **Poster Refresh Handler** - `handleRefreshPosters` migration function

#### New Files

- **ArchiveImporterModal.jsx** - 4-step modal component with React Portal
- **ArchiveImporterModal.css** - Deep Ember themed modal styling
- **importer.js** - Utility module with Groq parsing and TMDB verification
- **posterMigration.js** - Poster URL migration utility
- **Skeleton.jsx** - Loading skeleton components
- **Skeleton.css** - Shimmer animation styles

#### Backend (`src/utils/importer.js`)

- **`parseArchiveWithGroq()`** - Groq API integration with system prompt engineering
- **`verifyBatchWithTMDB()`** - Batch TMDB verification with error handling
- **`batchSaveMovies()`** - Optimized single-request UPSERT for movie_logs table
- **Full Poster URLs** - Saves complete TMDB URLs instead of relative paths

### ⚡ Performance

#### Parallel Processing

- **Groq Parsing** - ~300-600ms for typical lists (10-30 movies)
- **TMDB Verification** - Parallel fetching reduces total time by 70-80%
- **Batch Save** - Single network request vs. N individual inserts

#### Deduplication Efficiency

- **Database-Level** - `onConflict` constraint handles duplicates automatically
- **No Pre-Checks Needed** - Eliminates need for separate existence queries
- **Skipped Count Tracking** - Reports how many movies were already in library

### 🎨 UI/UX

#### Modal Design

- **Step-by-Step Wizard** - Clear progression with visual feedback
- **Review Grid** - Card-based layout with posters and parsed vs. TMDB titles
- **Checkbox Selection** - Individual toggle with select/deselect all actions
- **Loading States** - Spinner and progress indicators during verification
- **Success Stats** - Post-import breakdown of saved/skipped/errors

#### Deep Ember Theme

- **Dark Zinc Backgrounds** - Consistent with app aesthetic
- **Amber Accents** - Orange highlights for primary actions
- **Status Indicators** - Red for not found, green for success
- **Responsive Grid** - Multi-column layout for review cards

### 📝 Documentation

#### Updated Files

- **CHANGELOG.md** - Comprehensive v1.5.0 release notes
- **README.md** - Magic Importer feature documentation
- **ROADMAP.md** - Bulk import marked as complete

### 🐛 Fixed

#### Bug Fixes

- **Modal Portal Rendering** - Uses `createPortal` for proper z-index stacking
- **Checkbox Event Bubbling** - `stopPropagation` prevents card click conflicts
- **Empty State Handling** - Graceful handling of lists with no custom lists
- **Year Parsing** - Handles "N/A" for movies without release years
- **Poster Fallback** - Shows "No Poster" placeholder when TMDB has no image
- **Groq JSON Parsing** - Handles single movie objects in addition to arrays
- **Single Movie Import** - Now accepts titles without years (e.g., "Shrek", "Jaws")
- **TMDB Fallback Search** - Tries title-only search if year search fails

### 🧹 Code Quality

#### Removed Debug Code

- **App.jsx** - Removed debug console.log
- **DiscoveryPage.jsx** - Removed render-time debug logs
- **supabaseClient.js** - Removed verbose initialization logs
- **index.jsx** - Removed debug log and debugEnv import
- **debugEnv.js** - Deleted unused debug utility file

#### Improved Code Organization

- **Cleaner Console Output** - Only essential error/warning logs remain
- **Better Component Structure** - Separated skeleton loading components
- **Reduced Code Bloat** - Net reduction of 110 lines while adding features

### 🛠️ Changed

#### Frontend (`src/pages/LibraryPage.jsx`)

- **Magic Import Button** - Added "✨ Magic Import" button in library header
- **Import Modal Integration** - `showImportModal` state and `ArchiveImporterModal` component
- **Refresh Handler** - Library refreshes automatically after successful import

#### New Files

- **ArchiveImporterModal.jsx** - 4-step modal component with React Portal
- **ArchiveImporterModal.css** - Deep Ember themed modal styling
- **importer.js** - Utility module with Groq parsing and TMDB verification

#### Backend (`src/utils/importer.js`)

- **`parseArchiveWithGroq()`** - Groq API integration with system prompt engineering
- **`verifyBatchWithTMDB()`** - Batch TMDB verification with error handling
- **`batchSaveMovies()`** - Optimized single-request UPSERT for movie_logs table

### ⚡ Performance

#### Parallel Processing

- **Groq Parsing** - ~300-600ms for typical lists (10-30 movies)
- **TMDB Verification** - Parallel fetching reduces total time by 70-80%
- **Batch Save** - Single network request vs. N individual inserts

#### Deduplication Efficiency

- **Database-Level** - `onConflict` constraint handles duplicates automatically
- **No Pre-Checks Needed** - Eliminates need for separate existence queries
- **Skipped Count Tracking** - Reports how many movies were already in library

### 🎨 UI/UX

#### Modal Design

- **Step-by-Step Wizard** - Clear progression with visual feedback
- **Review Grid** - Card-based layout with posters and parsed vs. TMDB titles
- **Checkbox Selection** - Individual toggle with select/deselect all actions
- **Loading States** - Spinner and progress indicators during verification
- **Success Stats** - Post-import breakdown of saved/skipped/errors

#### Deep Ember Theme

- **Dark Zinc Backgrounds** - Consistent with app aesthetic
- **Amber Accents** - Orange highlights for primary actions
- **Status Indicators** - Red for not found, green for success
- **Responsive Grid** - Multi-column layout for review cards

### 📝 Documentation

#### Updated Files

- **CHANGELOG.md** - Comprehensive v1.5.0 release notes
- **README.md** - Magic Importer feature documentation
- **ROADMAP.md** - Bulk import marked as complete

### 🐛 Fixed

#### Bug Fixes

- **Modal Portal Rendering** - Uses `createPortal` for proper z-index stacking
- **Checkbox Event Bubbling** - `stopPropagation` prevents card click conflicts
- **Empty State Handling** - Graceful handling of lists with no custom lists
- **Year Parsing** - Handles "N/A" for movies without release years
- **Poster Fallback** - Shows "No Poster" placeholder when TMDB has no image
- **Groq JSON Parsing** - Handles single movie objects in addition to arrays
- **Single Movie Import** - Now accepts titles without years (e.g., "Shrek", "Jaws")

---

## [1.4.1] - March 26, 2026

**Highlights:**

- 🧠 **Personalized Oracle** - AI now knows your ENTIRE movie history (zero duplicates guaranteed)
- 📚 **Three-Bucket Memory Fetch** - Watched + Watchlist + Custom Lists loaded in parallel
- 🎯 **Taste Triangulation** - AI analyzes your high-rated films before recommending
- ⚡ **Optimized Supabase Joins** - Efficient `lists!inner(user_id)` join for custom lists

**Quick Links:**

- [Full v1.4.1 Notes](#141---march-26-2026)
- [Previous: v1.4.0](#140---march-26-2026)
- [Roadmap](./ROADMAP.md)
- [README](./README.md)

---

## [1.4.1] - March 26, 2026

### 🚀 Added

#### Personalized Oracle - Zero-Duplicate Recommendations

- **`fetchUserMovieHistory()`** - New function fetches user's entire movie library in parallel
- **Three-Bucket System**:
  - **Bucket 1**: Watched movies (`movie_logs` where `watch_status = 'watched'`)
  - **Bucket 2**: Watchlist (`movie_logs` where `watch_status = 'to-watch'`)
  - **Bucket 3**: Custom list items (`list_items` with `lists!inner(user_id)` join)
- **Deduplication Engine**: Combines all three buckets into `allKnownTitles` array (no duplicates)
- **Taste Profile Builder**: Filters for high-rated watched (≥4.0) + curated list items only
- **AI Context Injection**: Sends taste profile to Gemini for intelligent taste matching

### 🛠️ Changed

#### Frontend (`src/pages/DiscoveryPage.jsx`)

- **New Function**: `fetchUserMovieHistory()` - Parallel Supabase fetch with optimized join
- **`handleDiscover()`** - Now calls history fetch before AI request
- **Rejection Logic**: Combines session rejections + lifetime library for zero-duplicate guarantee
- **Console Logging**: Added `📚 Oracle Memory` and `🚫 Excluding X known movies` debug output

#### Backend (`src/utils/gemini.js`)

- **Prompt Update**: Added `🚫 REJECTED MOVIES LIST` section with explicit "DO NOT VIOLATE" warning
- **Taste Triangulation**: New `🎯 TASTE TRIANGULATION` instruction for AI to match user aesthetic
- **Context Label**: Changed `USER CONTEXT` → `USER CONTEXT (Curated Favorites)` for clarity
- **Dynamic List Truncation**: Shows first 80 titles with "...and X more" for large libraries

### ⚡ Performance

#### Query Optimization

- **Parallel Fetch**: `Promise.all()` runs library + list_items queries simultaneously (~100-200ms)
- **Efficient Join**: `lists!inner(user_id)` eliminates need for subquery or N+1 queries
- **Selective Columns**: Only fetches `title, watch_status, rating` (no unnecessary data)
- **O(n) Deduplication**: `new Set()` ensures fast deduplication even with large libraries

#### Memory Efficiency

- **Taste Profile Limit**: Sends max 40 titles to AI to prevent token bloat
- **Full Ban List**: All known titles sent as rejected (no limit, ensures zero duplicates)

### 📝 Documentation

#### Updated Files

- **CHANGELOG.md** - Comprehensive v1.4.1 release notes
- **ROADMAP.md** - Updated Phase 6.15 success criteria (Reliability ↑99.9% vs Cost ↓30%)
- **ROADMAP.md** - Added technical notes about model verification & Gemini 503 mitigation

### 🐛 Fixed

#### Potential Issues Prevented

- **Duplicate Recommendations**: AI can no longer suggest movies user already logged
- **Taste Mismatches**: AI now sees user's actual favorites before recommending
- **Query Performance**: Join approach faster than subquery for custom lists fetch

---

## [1.4.0] - March 26, 2026

### 🚀 Added

#### Multi-Movie Recommendation Engine

- **Oracle v2** - Returns 3-5 unique movie recommendations per query instead of single picks
- **Curated Mix** - AI instructed to blend well-known cult classics with obscure deep cuts
- **Enhanced Prompt** - Requests diverse genres, narrative complexity, and emotional resonance
- **JSON Wrapper Format** - `{ recommendations: [...] }` structure for scalable responses

#### Hybrid AI Orchestration Layer

- **Groq LPU Integration** - `llama-3.3-70b-versatile` for ultra-fast genre extraction
- **Multi-Model Pipeline** - User Query → Groq Genre IDs → Gemini with context → Recommendations
- **Fallback Mode** - Automatic bypass to Gemini-only if Groq is unavailable
- **Latency Tracking** - Performance metrics logged for monitoring (target: sub-500ms)
- **Genre Context Injection** - Extracted genres passed to Gemini for informed recommendations

#### Concurrent Data Fetching

- **Promise.all() Implementation** - TMDB data fetched for all 3-5 movies simultaneously
- **Index-Aligned Results** - TMDB responses preserve order to prevent data mismatches
- **Graceful Fallbacks** - Missing posters handled per-movie without breaking layout

### 🛠️ Changed

#### Backend (`src/utils/gemini.js`)

- **`getHybridRecommendation()`** - Completely rewritten for multi-movie output
- **Prompt Engineering** - Now requests 3-5 movies with specific diversity requirements
- **Token Limit Increased** - `maxOutputTokens: 1500` for longer multi-movie responses
- **Return Format** - Changed from single object to `{ recommendations: Array, _meta: Object }`
- **Validation** - Added response format checking for robust error handling

#### Frontend (`src/pages/DiscoveryPage.jsx`)

- **State Variables** - `recommendation` → `recommendations[]`, `tmdbData` → `tmdbResults[]`
- **HandleDiscover** - Rewritten to process arrays and concurrent TMDB fetching
- **Render Logic** - Maps over recommendations array with safe index-based TMDB matching
- **Modal Handling** - Added `selectedMovieForModal` state for per-movie logging
- **Reject & Reroll** - Now rejects entire batch instead of single movie

#### New Utility (`src/utils/groq.js`)

- **`fetchGroqGenres()`** - Extracts TMDB genre IDs from natural language queries
- **`TMDB_GENRES`** - Exported genre mapping for shared use across modules
- **Error Handling** - Graceful fallback with detailed error messages
- **Response Parsing** - Handles both bare array and `{ genre_ids: [] }` formats

### 📝 Documentation

#### Updated Files

- **README.md** - Updated Oracle section to reflect multi-movie output
- **ROADMAP.md** - Marked Hybrid AI Architecture as complete
- **CHANGELOG.md** - Comprehensive v1.4.0 release notes

### ⚡ Performance

#### Latency Improvements

- **Groq Genre Extraction** - ~300-600ms (target: sub-500ms average)
- **Concurrent TMDB Fetching** - Parallel requests reduce total load time by 60-70%
- **Total Time-to-First-Card** - Reduced from ~3s to ~1.5s for 4-movie recommendations

### 🐛 Fixed

#### Data Integrity

- **Index Alignment Bug Prevention** - TMDB results kept in order (no filtering) to prevent mismatches
- **Safe Render Logic** - Each movie card independently handles missing data
- **Modal State** - Fixed modal to work with array-based recommendations

---

## [1.3.12] - March 26, 2026

### 🐛 Fixed

#### OMDb API Mixed Content Error

- **HTTP → HTTPS** - Changed OMDb API URL from `http://` to `https://`
- **Vercel Deployment Fix** - Resolves "Mixed Content" browser errors
- **Secure Fetch** - All API requests now use secure HTTPS endpoints

### 📝 Documentation

#### ROADMAP.md Consistency Fixes

- **Phase 2.5** - Marked Auto-fill Log Movie form as ✅ Complete
- **Phase 3.6/3.7** - Marked Read/Library and Delete/Edit as ✅ Complete
- **Phase 3.8** - Added Data Validation task (prevent duplicate logs)
- **Remember Me** - Changed from ✅ to 🏗️ (needs refinement)
- **Success Criteria** - Updated to match actual implementation status

---

## [1.3.11] - March 26, 2026

### 🐛 Fixed

#### FILMGRAPH Logo Home Button

- **Mobile Logo Now Clickable** - Wrapped in Link to navigate to home (/)
- **Consistent Behavior** - Both mobile and desktop logos now act as home buttons

---

## [1.3.9] - March 25, 2026

### 🐛 Fixed

#### Mobile Search Input Focus Loss - COMPLETE FIX

- **Search Moved to Header** - Removed from hamburger dropdown entirely
- **Magnifying Glass Toggle** - Tap icon to expand full-width search input
- **Logo Hides During Search** - Clean transition when search is active
- **X Button to Close** - Clear input and return to logo view
- **Independent State** - Search visibility separate from hamburger menu
- **Controlled Input Pattern** - `useState` for text, NO navigation on onChange
- **Form Submit Only** - Navigate ONLY when user presses Enter or clicks submit

### 🎉 Added

#### Header Search System Rewrite

- **Desktop** - Search bar always visible in header (right side)
- **Mobile** - Magnifying glass icon next to logo
- **isSearchVisible State** - Toggles between logo and search input
- **Deep Ember Styling** - Zinc-900 background, amber-500 border on focus
- **AutoFocus** - Input gains focus immediately when expanded
- **Same Pattern for DiscoveryPage** - Controlled textarea with handleSubmit

#### Oracle Library Integration

- **Watched Button** - Opens LogMovieModal pre-filled with movie data
- **Watchlist Button** - Direct Supabase insert with watch_status: 'to-watch'
- **Add to List Button** - Dropdown to select from user's custom lists
- **Toast Notifications** - Success/error feedback for all actions
- **Deep Ember Theme** - Amber borders, zinc backgrounds, proper hover states

### 📁 Modified Files

- `src/App.jsx` - Header component rewritten with inline mobile search
- `src/pages/DiscoveryPage.jsx` - Library integration buttons with handlers
- `src/pages/DiscoveryPage.css` - Added .lib-action-btn and .list-dropdown styles

### 🎨 UI/UX

- **Mobile Header Layout** - Logo | Search Icon + Hamburger
- **Expanded Search** - [Search input..........] ✕
- **No Menu Conflicts** - Search independent of hamburger state
- **Focus Preserved** - Input stays focused until explicit submit
- **Dropdown Fix** - List dropdown positioned correctly with high z-index

---

## Latest Version: 1.3.8 (March 24, 2026)

**Highlights:**

- 🔧 Logo text "FILMGRAPH" now visible on all screen sizes
- 📝 Changelog page with dedicated route (/changelog)
- 🤖 Oracle with Reject & Reroll feature
- 🔐 Remember Me checkbox with dynamic storage
- 📱 Responsive library grid (`grid-cols-2 md:grid-cols-4 lg:grid-cols-6`)
- 🎯 Oracle vibe mapping fixed - "Brain Mush" now works

**Quick Links:**

- [Full v1.3.8 Notes](#138---march-24-2026)
- [Oracle v1.3.2](#132---march-24-2026)
- [Roadmap](./ROADMAP.md)
- [README](./README.md)

---

## [1.3.8] - March 24, 2026

### 🐛 Fixed

#### Logo Text Visibility

- **FILMGRAPH Text Now Visible on Mobile** - Removed `hidden sm:inline` class
- **Consistent Branding** - Logo + text visible on ALL screen sizes
- **Flex Alignment** - `flex items-center gap-2` ensures proper spacing

---

## [1.3.7] - March 24, 2026

### 🐛 Fixed

#### AboutPage Changelog Link

- **Broken Link Fixed** - Changed from raw markdown link to React Router `<Link to="/changelog">`
- **New Route Added** - `/changelog` route now exists in App.jsx

### 🎉 Added

#### ChangelogPage Component

- **Dedicated Changelog Page** - Full-page view of version history
- **Version Sections** - v1.3.1 through v1.3.6 documented with badges
- **Navigation** - "Back to Filmgraph Hub" and "Back to Home" links
- **Deep Ember Theme** - Dark zinc backgrounds with orange accents
- **Mobile Responsive** - Stacked layout on small screens

### 📁 New Files

- `src/pages/ChangelogPage.jsx` - Full changelog display component
- `src/pages/ChangelogPage.css` - Styling with responsive breakpoints

---

## [1.3.6] - March 24, 2026

### 🐛 Fixed

#### Header Mobile Layout - COMPLETE REWRITE

- **Mobile-First Design** - Default layout is mobile, desktop uses `hidden md:flex`
- **Top Row Clean** - Only Logo (left) and Hamburger (right) on mobile
- **No Vertical Spillover** - Desktop nav properly hidden on mobile with `hidden md:block`
- **Single Oracle Icon** - Only ONE sparkle icon inside search input (no duplicates)
- **Search Bar Positioning** - Desktop: inline with nav | Mobile: full-width in dropdown

### 🎉 Added

#### Navigation Links Updated

- **Discover** - Now first in nav list, routes to `/discover`, orange highlight
- **Trending** - Routes to `/` (home)
- **Library** - Routes to `/library`
- **History** - Routes to `/history`

#### Mobile Dropdown Menu

- **Full-Width Search** - `fullWidth={true}` prop makes search bar take full width
- **Touch Targets** - `py-2` padding on all nav links for easy tapping
- **User Section** - Profile + Logout separated by border-top, includes 👤 icon
- **Auto-Close** - All links call `setIsMobileMenuOpen(false)` on click
- **Deep Ember Theme** - Dark zinc background (`bg-zinc-950`), subtle borders

### 🎨 UI/UX

- **Flex Layout** - `justify-between items-center w-full` for proper header alignment
- **Hamburger Toggle** - X icon when open, 3-lines when closed
- **Profile Badge** - Orange username with uppercase tracking
- **Login Button** - Only shows in mobile menu when not authenticated

### 📁 Modified Files

- `src/App.jsx` - Complete Header rewrite with OracleOverlay component

---

## [1.3.5] - 2026-03-24

### 🐛 Fixed

#### DiscoveryPage useEffect Crash

- **Stable Dependency Array** - Changed `useEffect` to depend only on `user?.id` (stable value)
- **Auto-Discover Hook** - Now depends only on `customPrompt` string, not function references
- **Error Prevention** - "The final argument passed to useEffect changed size between renders" crash resolved

### 🎉 Added

#### Reject & Reroll Feature

- **Reject Button** - "Reject & Reroll" button on recommendation cards
- **Deep Ember Styling** - Dark zinc background (`#171717`), red border (`#dc2626`), amber text (`#fca5a5`)
- **Hover Effect** - Red glow shadow on hover, subtle lift animation
- **Session Tracking** - Badge shows count of rejected movies this session
- **Auto Reroll** - Automatically fetches new recommendation after rejection

#### AI Logic Updates

- **rejectedIds State** - Tracks TMDB IDs of rejected movies
- **rejectedTitles State** - Tracks titles of rejected movies
- **Dynamic System Prompt** - Appends rejected movies to AI prompt: `"REJECTED MOVIES (DO NOT SUGGEST): Title 1, Title 2"`
- **Persistent Avoidance** - AI will not suggest rejected movies again during session

### 🎨 UI/UX

- **Flex Wrap Actions** - Action buttons wrap cleanly on mobile
- **Rejected Badge** - Red pill badge with count
- **Disabled State** - Button disabled during discovery

### 📁 Modified Files

- `src/pages/DiscoveryPage.jsx` - Added reject state, handler, and updated AI prompt logic
- `src/pages/DiscoveryPage.css` - Added `.reject-reroll-btn` and `.rejected-count` styles

---

## [1.3.4] - 2026-03-24

### 🧠 Fixed

#### Oracle Vibe Mapping - ACTUALLY FIXED THIS TIME

- **Multi-Word Phrase Parsing** - `parseVibe()` now checks exact phrases first ("brain mush", "mind-bending", etc.)
- **SearchPage Genre Handling** - Now reads `?genres=` URL param and triggers TMDB Discover API
- **Console Debug Logs** - Added emoji-prefixed logs for tracking Oracle flow:
  - 🔮 Oracle received vibe
  - 🎭 Parsed genres
  - ✅ Using DISCOVER mode
  - 📝 Using TEXT SEARCH mode
  - 🧭 Navigating to URL

#### Vibe Mappings Verified:

- "Brain Mush" → `[35, 10751]` → `/search?genres=35,10751&q=Brain+Mush` ✅
- "Mind-Bending" → `[878, 9648, 53]` → Comedy/Sci-Fi/Mystery ✅
- "Sick Day" → `[16, 10751, 35]` → Animation/Family/Comedy ✅

### 📁 Modified Files

- `src/App.jsx` - Fixed `parseVibe()` with multi-word priority matching + debug logs
- `src/pages/SearchPage.jsx` - Added `?genres=` URL param handling + auto-trigger discover mode

---

## [1.3.3] - 2026-03-24

### 🔐 Added

#### Remember Me Checkbox (Login Page)

- **Dynamic Storage Persistence** - Toggle between localStorage and sessionStorage
- **Default: Checked** - Persists across browser closes by default
- **Unchecked** - Session-only login (cleared when tab closes)
- **Deep Ember Styling** - `bg-zinc-800`, `border-zinc-700`, `accent-amber-500`
- **Placement** - Above Sign In button with `flex items-center gap-2 mb-4`

### 🧠 Fixed

#### Oracle Vibe Mapping

- **Custom Mood Bubbles** - Added mappings for UI-specific vibes:
  - `'brain mush'` → `[35, 10751]` (Comedy + Family)
  - `'mind-bending'` → `[878, 9648, 53]` (Sci-Fi + Mystery + Thriller)
  - `'cozy'` → `[10751, 16, 35]` (Family + Animation + Comedy)
  - `'deep cuts'` → `[18, 99]` (Drama + Documentary)
  - `'sick day'` → `[16, 10751, 35]` (Animation + Family + Comedy)
  - `'noir'` → `[80, 53]` (Crime + Thriller)
  - `'euphoric'` → `[35, 10749]` (Comedy + Romance)
- **Empty Array Safety** - Never appends `&genres=` if no matches found
- **Fallback Logic** - Unmapped queries use TMDB text search only (no genres param)

### 📁 Modified Files

- `src/supabaseClient.js` - Added `SupabaseStorageAdapter` class + `createSupabaseWithStorage()` export
- `src/pages/LoginPage.jsx` - Added Remember Me checkbox with storage toggle logic
- `src/App.jsx` - Expanded `VIBE_MAP` with custom mood bubble mappings

---

## [1.3.2] - 2026-03-24

### 🎉 Added

#### Oracle - AI Discovery Engine

- **Mood Bubbles** - 6 quick-select presets (Cozy, Adrenaline, Mind-Bending, Deep Cuts, Noir, Euphoric)
- **Custom Prompt Input** - Natural language vibe description
- **AI System Prompt** - Elite film historian persona that prioritizes deep cuts over mainstream picks
- **Rationale Display** - "Why Filmgraph Picked This" section with specific cinematic analysis
- **Vibe Check Tagline** - 5-7 word punchy essence description
- **TMDB Integration** - Automatic poster and year fetching for verified movies
- **User Context** - AI considers user's top-rated films for personalized suggestions
- **Protected Route** - `/discover` page with auth guard

### 🧠 AI Enhancements

- **discoverMovies Function** - New Gemini AI endpoint for single deep-cut recommendations
- **Temperature 0.9** - Higher creativity for obscure picks
- **JSON-Only Output** - Clean parsing with markdown cleanup
- **System Prompt Engineering** - Explicit instructions to avoid IMDB Top 250 defaults

### 🎨 UI/UX

- **Deep Ember Theme** - Dark zinc backgrounds (#0a0a0a, #171717) with amber/orange accents
- **Animated Oracle Icon** - Pulsing 🔮 emoji
- **Responsive Grid** - 2-column mood bubbles on mobile, 6 on desktop
- **Card Layout** - Poster left, content right on desktop; stacked on mobile
- **Hover Effects** - Mood bubbles glow with orange shadow when active

### 📁 New Files

- `src/pages/DiscoveryPage.jsx` - Main Oracle component
- `src/pages/DiscoveryPage.css` - Deep Ember styling with animations
- `src/utils/gemini.js` - Added `discoverMovies()` function
- `src/api/tmdb.js` - Added `fetchTMDBMovie()` utility

---

## [1.3.1] - 2026-03-24

### 🐛 Fixed

#### Library Grid Layout

- **Posters Overflow** - Changed from single column to responsive grid
- **Grid Layout** - `grid-cols-2 md:grid-cols-4 lg:grid-cols-6`
- **Poster Sizing** - `aspect-[2/3]` with `object-cover` to prevent stretching
- **Gap Spacing** - Reduced gap for tighter, cleaner layout
- **Mobile Optimization** - 2 columns on mobile, 4 on tablet, 6 on desktop

#### Custom Lists

- **tmdb_id Column** - Added missing column to `list_items` table
- **List View Grid** - Posters now display in responsive grid instead of stack
- **Remove Button** - Hover overlay with instant remove from list

### 🎨 UI Improvements

#### Deep Ember Theme

- **Title Styling** - `text-zinc-300` with `text-orange-500` hover state
- **Hover Effects** - Black overlay with Remove button on list items
- **Card Design** - `rounded-lg` with `bg-zinc-900` backdrop

---

## [1.3.0] - 2026-03-24

### 🎉 Added

#### Custom Lists Feature

- **Create Custom Lists** - Organize movies into personal collections
- **Add to List Button** - Quick add from any movie card
- **List Management** - View, edit, and delete lists from Library
- **List Detail View** - See all movies in a list with remove option
- **Bug Fix** - Fixed `tmdb_id` column missing in `list_items` table

#### Cinematic UI Overhaul

- **StoryGraph-Inspired Design** - Clean "bookshelf" aesthetic for movie library
- **Hover Overlay Actions** - Edit, Delete, Add to List only visible on hover
- **Fixed Aspect Ratio** - `aspect-[2/3]` ensures perfect grid uniformity
- **Minimalist Cards** - Removed tags, reviews, and buttons from static view
- **Backdrop Blur Effects** - Modern frosted glass overlays on hover
- **Cleaner Grid Layout** - Larger `gap-8` spacing for breathing room

#### Version Management System

- **Centralized Constants** - `src/constants.js` with `APP_VERSION`
- **Auto-Version Bug Reports** - Every bug submission includes app version
- **Footer Version Display** - Dynamic "Filmgraph v{VERSION}" badge
- **Admin Version Tracking** - BugList displays which version bugs occurred in

#### AI Personality Features (Planned)

- **The Oracle** - Conversational AI Librarian with personality modes
  - Snarky, Supportive, Academic, Hype personas
  - Multi-turn conversations with context memory
  - Mood-based natural language queries
  - Quick action buttons (Add to Watchlist/Mark as Watched)
- **The Matchmaker** - Social compatibility features
  - Friend system with taste overlap scores
  - Mood compatibility analysis
  - Blind recommendations from friends
  - Watch party sync

### 🎨 UI/UX Improvements

- **Poster-First Design** - Clean cinematic appearance
- **Hover-Triggered Actions** - No cluttered buttons on cards
- **Rating Badge Redesign** - Top-right corner with star icon
- **Title Overlay** - Movie title appears in hover overlay
- **Details Modal** - View moods and reviews on demand
- **Tailwind Utilities** - `group`, `group-hover`, `backdrop-blur`, `aspect-[2/3]`

### 🗄️ Database Changes

- **bug_reports.app_version** - Track which version bugs occur in
- **Planned: oracle_sessions** - Chat history for The Oracle
- **Planned: friendships** - Friend connections for The Matchmaker

### 📁 New Files

- `src/constants.js` - Centralized version and configuration

### 🔄 Modified Files

- `src/components/MovieCard.jsx` - Complete cinematic redesign
- `src/components/Footer.jsx` - Dynamic version display
- `src/components/BugReportModal.jsx` - Auto-include app version
- `src/components/BugList.jsx` - Display version in admin dashboard
- `src/pages/LibraryPage.jsx` - Use new MovieCard component
- `src/pages/LibraryPage.css` - Removed old card styles
- `src/pages/AboutPage.jsx` - Use APP_VERSION constant
- `ROADMAP.md` - Added The Oracle and The Matchmaker features

---

## [1.2.0] - 2026-03-24

### 🎉 Added

#### Tailwind CSS Integration

- **Tailwind CSS v4** - Full utility-first CSS framework integration
- **@tailwindcss/postcss** - PostCSS plugin for Tailwind
- **Custom Deep Ember Theme** - Extended color palette with deep-ember colors
- **Tailwind Config** - Custom configuration for project-specific utilities

#### About/Roadmap Page

- **AboutPage Component** - New page at `/about` showing project info
- **Filmgraph Hub** - Central information hub with About, Changelog, and Roadmap
- **Interactive Roadmap** - Version pills showing v1.2.0, v1.3.0, v2.0.0 plans
- **Version Badge** - Current version display (v1.2.0)
- **Footer Link** - "About / Roadmap" link added to footer

#### Bug Report System

- **BugReportModal** - Sleek dark-themed modal for submitting bug reports
- **ReportBugButton** - Reusable button component (3 variants: button, icon, link)
- **BugList Admin Dashboard** - Admin-only bug management at `/admin/bugs`
- **Bug Reports API** - Functions for CRUD operations on bug reports
  - `updateBugStatus(bugId, newStatus)` - Update bug status
  - `fetchBugReports()` - Fetch all bug reports
  - `deleteBugReport(bugId)` - Delete a bug report
- **Auto-Capture Data** - Automatically captures page URL and user info on submission
- **Status Management** - "Mark as Fixed" button, status dropdown, color-coded badges
- **Admin Protection** - Only accessible by sonofloke@gmail.com

### 🗄️ Database Changes

- **bug_reports Table** - Live in Supabase with RLS policies
  - Fields: id, user_id, user_email, page_url, description, status, created_at, updated_at
  - RLS tied to admin email (sonofloke@gmail.com)

### 🎨 UI/UX Improvements

- **Matching Footer Buttons** - Report Bug and About buttons now have consistent styling
- **Orange Accent Theme** - Deep ember/orange color scheme throughout
- **Loading States** - Spinners and disabled states for all async actions
- **Toast Notifications** - Success/error feedback for bug reports
- **Responsive Design** - Mobile-optimized layouts for all new components

### 📁 New Files

- `src/api/bugReports.js` - Bug report API functions
- `src/components/BugReportModal.jsx` - Bug report modal
- `src/components/BugReportModal.css` - Modal styling
- `src/components/ReportBugButton.jsx` - Reusable report button
- `src/components/ReportBugButton.css` - Button variants styling
- `src/components/BugList.jsx` - Admin bug dashboard
- `src/components/BugList.css` - Dashboard styling
- `src/pages/AboutPage.jsx` - About/Roadmap page
- `src/pages/AboutPage.css` - Page styling
- `src/index.css` - Main Tailwind imports and utilities
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration

### 🔄 Modified Files

- `src/App.jsx` - Added /about and /admin/bugs routes
- `src/index.jsx` - Import index.css for Tailwind
- `src/components/Footer.jsx` - Added ReportBugButton
- `src/components/Footer.css` - Footer actions styling
- `src/pages/AboutPage.jsx` - Integrated ReportBugButton
- `src/pages/AboutPage.css` - Removed duplicate button styles
- `ROADMAP.md` - Updated with v1.2.0 completion
- `package.json` - Version bump to 1.2.0

---

## [1.1.0] - 2026-03-24

### 🎉 Added

#### Custom Lists Feature

- **Custom Lists Database Schema** - New `lists` and `list_items` tables in Supabase with RLS policies
- **ListContext** - React context for managing user lists (create, delete, add/remove movies)
- **AddToListButton Component** - Dropdown button to add movies to custom lists
- **CreateListModal Component** - Modal for creating new lists with name, description, and privacy settings
- **Toast Notifications** - Global toast system for success/error messages

#### Integration Points

- **Movie Detail Page** - Add to List button next to Log Movie button
- **Library Page** - Add to List button on library cards (Watched/To Watch tabs)
- **Up Next Queue** - Add to List button on watchlist queue cards

#### UI/UX Improvements

- **Matching Button Styles** - All action buttons (Add to List, Edit, Delete) now have consistent gradient styling
  - Add to List: Red gradient (`#991b1b` → `#7f1d1d`)
  - Edit: Purple gradient (`#7e22ce` → `#6b21a8`)
  - Delete: Dark red gradient (`#7f1d1d` → `#5c1515`)
- **Compact Button Sizing** - Reduced button sizes to fit better on library cards
- **Toast Notifications** - Green success toasts, red error toasts with slide-in animation

### 🗄️ Database Changes

- **New Tables**:
  - `lists` - User custom lists (id, user_id, name, description, is_public, created_at, updated_at)
  - `list_items` - Movies in lists (id, list_id, tmdb_id, title, poster_path, added_at)
- **RLS Policies** - Row-level security for both tables (users can only access their own data)
- **Indexes** - Performance indexes on user_id, list_id, and tmdb_id

### 📁 New Files

- `src/context/ListContext.jsx` - List management context
- `src/context/ToastContext.jsx` - Toast notification system
- `src/context/Toast.css` - Toast styling
- `src/components/AddToListButton.jsx` - Add to List button component
- `src/components/AddToListButton.css` - Button styling
- `src/components/CreateListModal.jsx` - Create list modal
- `src/components/CreateListModal.css` - Modal styling
- `supabase-lists.sql` - Database schema for custom lists

### 🔄 Modified Files

- `src/App.jsx` - Added ToastProvider wrapper
- `src/pages/LibraryPage.jsx` - Added AddToListButton to cards
- `src/pages/LibraryPage.css` - Updated button styles
- `src/pages/MovieDetail.jsx` - Added AddToListButton to detail page
- `src/pages/MovieDetail.css` - Added movie-actions container

---

## [1.0.0] - 2026-03-XX

### 🎉 Initial Release

#### Core Features

- **User Authentication** - Sign up, login, logout with Supabase Auth
- **Movie Logging** - Log movies with ratings (0.0-5.0), moods, reviews, and watch status
- **Movie Details** - Full movie information from TMDB with backdrops, cast, and recommendations
- **Trending Movies** - Browse trending movies with backdrop grid
- **Search & Discovery** - Search movies with power filters (genre, year, sort)
- **Personal Library** - StoryGraph-style tabs (Watched/Want to Watch)
- **Watch History** - Vertical timeline of watched movies grouped by month
- **Profile Page** - Editable profiles with avatar upload
- **Stats Dashboard** - Recharts-based analytics (genres, moods, ratings distribution)
- **AI Recommendations** - Google Gemini-powered smart recommendations with feedback loop
- **Rotten Tomatoes Scores** - RT critic scores on movie cards

#### UI Components

- **MovieCard** - Rich movie cards with posters and RT scores
- **LogMovieModal** - Full logging form with rating slider and mood palette
- **RatingSlider** - StoryGraph-style 0.0-5.0 precision slider
- **Mood Palette** - 22 moods across 3 categories (Emotional, Vibe, Intellectual)
- **StarRating** - Clickable star ratings with 0.5 increments
- **FilmgraphLogo** - Custom film frame + bar chart logo

#### Backend

- **Supabase Integration** - PostgreSQL database with RLS policies
- **TMDB API** - Movie data, trending, search, recommendations
- **OMDb API** - Rotten Tomatoes scores integration
- **Google Gemini AI** - Smart recommendations and mood analysis

---

## Versioning Strategy

### Semantic Versioning (SemVer)

- **MAJOR.MINOR.PATCH** (e.g., 1.1.0)
- **MAJOR** - Breaking changes (e.g., 2.0.0)
- **MINOR** - New features, backward compatible (e.g., 1.1.0)
- **PATCH** - Bug fixes, minor improvements (e.g., 1.1.1)

### Release Checklist

- [ ] Update version in `package.json`
- [ ] Update this CHANGELOG
- [ ] Test all major features
- [ ] Build and verify no errors
- [ ] Commit with version tag (e.g., `v1.1.0`)

---

## Future Versions

### [1.2.0] - Planned

- Social sharing features
- Watch history calendar view
- Light mode toggle

### [2.0.0] - Planned

- Mobile app (React Native)
- Social features (friends, following, feeds)
- Letterboxd import tool
