# Filmgraph Failure Modes & Battle Scars

> Living catalog of things that broke, what caused them, and how they were fixed. Use as the first lookup whenever a regression "feels familiar" or NotebookLM is asked "why is X happening?".

## How to use this doc
- Search by symptom (the bold line).
- Read the "Root cause" before applying any fix — most of these have already shipped guards; if a guard regresses, fix the guard, don't re-invent.
- When you fix a new failure, add a new entry following the same template.

---

## 1. Mobile camera launches but stays black
**Symptom**: User taps "Scan Barcode" on phone. Camera permission is granted, but the `<video>` preview is solid black. UPC never resolves.

**Root cause**: Native `BarcodeDetector` path mounts the stream before the video element is in the DOM, OR the WebView returns a stream the native pipeline cannot render.

**Fix shipped**:
- Mount-timing guard: `waitForElement` helper in `src/components/LogMovieModal.jsx` waits for the scanner DOM target before attach.
- Mobile/native preference: scanner now favors `html5-qrcode` over native `BarcodeDetector` when `isMobileDevice` or `isNativePlatform` is true.
- Cleanup: any tracks opened during the failed native attempt are stopped before falling back.

**Files**: `src/components/LogMovieModal.jsx`.

**If it regresses**: confirm the html5-qrcode branch is still being chosen on mobile, and that the native branch's `getUserMedia` cleanup runs before fallback.

---

## 2. Scanner: "failed to fetch" on UPC lookup (mobile only)
**Symptom**: Scan succeeds, UI says "looking up", then errors with `Failed to fetch`. Desktop works.

**Root cause**: Mobile WebView (and some browsers) block direct `upcitemdb.com` calls due to CORS / mixed-origin handling.

**Fix shipped**: Tiered lookup in `src/api/upc.js`:
1. Same-origin Vercel function `/api/upc-lookup` (preferred).
2. Direct `upcitemdb.com`.
3. `allorigins.win` proxy (last resort).

**Files**: `src/api/upc.js`, `api/upc-lookup.js`, `vercel.json`.

**If it regresses**: verify `vercel.json` rewrite still routes `/api/(.*)` to functions before the SPA fallback. Check Vercel function logs for the `upc-lookup` route.

---

## 3. UPC scan returns wrong/no TMDB match
**Symptom**: Lookup resolves a product, but TMDB search returns nothing relevant or matches the wrong title (e.g. raw title contains `"Blu-Ray + Digital Copy (Bilingual)"`).

**Root cause**: Raw UPC product titles include packaging noise that defeats TMDB search.

**Fix shipped**:
- `buildSearchTitleCandidates()` strips packaging/format noise.
- `chooseBestTmdbMatch()` ranks candidates by year proximity, popularity, and title similarity.

**Files**: `src/api/upc.js`.

**If it regresses**: log the candidate list before TMDB call to confirm cleaning is happening. Add new noise patterns to the cleaner — don't bypass it.

---

## 4. Vite dev: WebSocket connect failure + 504 "Outdated Optimize Dep"
**Symptom**: Console floods with `WebSocket connection to 'ws://localhost:3001/?token=...' failed` and 504s on `recharts.js`, `@supabase_supabase-js.js`, etc.

**Root cause**: Stale Vite optimize cache, often combined with a previously registered service worker fighting HMR.

**Fix shipped**:
- Dev mode now unregisters any active service worker on app mount.
- Vite HMR config hardened in `vite.config.*`.

**Recovery steps**:
1. Stop dev server.
2. Delete `node_modules/.vite`.
3. `npm run dev -- --force`.

---

## 5. Stale module: `does not provide an export named 'TOP_STREAMING_PROVIDERS_US'`
**Symptom**: SyntaxError on `ProfilePage.jsx` import after a refactor.

**Root cause**: Constant moved out of `src/api/tmdb.js` into a dedicated module, and a stale dev cache or stale service worker served the pre-move bundle.

**Fix shipped**: Constant lives in `src/constants/streamingProviders.js`. Imports updated. SW unregistered in dev.

**If it regresses**: hard refresh + clear SW for the dev origin, then verify all imports point to the new module path.

---

## 6. Vercel env add fails for "preview" environment
**Symptom**: `vercel env add VITE_NYT_API_KEY preview` fails with `branch_not_found` or `Cannot set Production Branch "main" for a Preview Environment Variable`.

**Root cause**: The project only has a `main` branch, so there is no preview branch to attach the env var to.

**Workaround**: Set the var only for `development` and `production` (`vercel env add ... development`, `vercel env add ... production`). Skip `preview` until a real preview branch exists.

---

## 7. Datadog setup blocked on missing keys
**Symptom**: `Missing DD_API_KEY or DD_APPLICATION_KEY in .env` when wiring up daily error investigation.

**Root cause**: User did not have a Datadog account / paid plan.

**Resolution**: Pivoted away from Datadog. Daily error investigation runs on Vercel logs with a fail-soft GitHub Action that no-ops when credentials are missing rather than crashing the workflow.

**Lesson**: Any new observability integration must "fail-soft" when its credentials are absent — never break the build/scheduled job.

---

## 8. Streaming service picker invisible after refactor
**Symptom**: User reports "I do not see a way to choose my streaming services" after a Phase 2 UI normalization sweep.

**Root cause**: UI/state blocks for provider multi-select were dropped during the foundation refactor on `DiscoveryPage.jsx` and `ProfilePage.jsx`.

**Fix shipped**: Restored selection state, persisted into `profiles.user_providers`, surfaced in both Discovery (filter chip) and Profile (settings card).

**If it regresses**: confirm both pages still read `user_providers` from the latest profile snapshot and that the Profile editor writes back through the profile update API.

---

## 9. Service worker serving stale bundle in production
**Symptom**: New deploy is live, but users still see the old version (no enrichment cards, missing provider picker, etc.).

**Root cause**: Service worker cached the old shell + chunks. Without a versioned cache bust, returning users get pre-deploy code.

**Mitigation pattern**:
- App version (`APP_VERSION` in `src/constants.js`) is bumped on every release; surface it in the footer/profile so users can verify.
- Service worker should evict old chunks on activation. When adding new routes (e.g. `/collection`) or new endpoints (e.g. `/api/upc-lookup`), audit the SW caching strategy in the same PR.

**If it regresses**: ask the user to "hard refresh" / clear site data while we investigate; then check whether the SW's precache list excluded a new chunk.

---

## 10. Optional API enrichment crashing the detail page
**Symptom**: Movie detail page goes blank after enabling a `VITE_FEATURE_*` flag.

**Root cause**: An enrichment adapter throws synchronously, or returns an unexpected shape, and the consumer doesn't guard.

**Fix shipped (must stay)**:
- `src/utils/movieEnrichment.js` uses `Promise.allSettled` so one failure cannot block sibling fetches.
- `MovieDetail.jsx` only renders enrichment cards when data is non-null.
- Each adapter (`src/api/editorial.js`, `visuals.js`, `trakt.js`) returns `null` on any failure path, never throws to the caller.

**Rule**: Adding a new enrichment adapter requires:
1. Feature-flag gate.
2. Internal try/catch returning `null` on failure.
3. Consumer renders nothing when result is `null`.

---

## 11. Local `.env` and Vercel env drift
**Symptom**: A feature works locally but breaks (or vice versa) after deploy.

**Root cause**: New env var added to `.env` but not pushed to Vercel project settings (or the inverse).

**Fix pattern**:
- Always add the variable to `.env.example` as the source of truth.
- For client-readable flags, prefix with `VITE_`. For server-only secrets, don't.
- Run `vercel env ls` to confirm parity before promoting.

---

## 12. Native build secure-context check blocks camera
**Symptom**: Capacitor Android build refuses to start the camera even though the WebView has camera permission, citing missing secure context.

**Root cause**: `window.isSecureContext` reports `false` inside the Capacitor WebView, but the native context is fundamentally trusted.

**Fix shipped**: `LogMovieModal.jsx` skips the secure-context gate when `isNativePlatform` is true.

**If it regresses**: confirm Capacitor platform detection still resolves correctly; do not loosen the secure-context gate for plain web origins.

---

## Adding a new entry
Use this template:

```md
## N. <symptom in user-visible language>
**Symptom**: <what the user sees>
**Root cause**: <one or two sentences>
**Fix shipped**: <bulleted summary of the guard>
**Files**: <comma-separated>
**If it regresses**: <what to check first>
```

Keep entries short. Long context belongs in the relevant feature artifact (e.g. `barcode-scanner-implementation-summary.md`); this doc is a triage index, not a postmortem archive.
