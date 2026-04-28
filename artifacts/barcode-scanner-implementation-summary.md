# Barcode Scanner Implementation Summary

## Feature scope
- Implement reliable barcode scanning and UPC-based movie lookup for mobile and web.
- Prevent scanner dead-ends by allowing manual fallback and resilient lookup paths.

## Core flow
1. User opens log modal and taps **Scan Barcode** (`src/components/LogMovieModal.jsx`).
2. Scanner attempts camera startup and reads UPC.
3. UPC lookup runs through `lookupMovieByUpc()` (`src/api/upc.js`).
4. Lookup resolves source title and attempts TMDB match.
5. User can save movie log with ownership metadata (`source_upc`) even when lookup is partial.

## Reliability hardening shipped
- Scanner startup reliability:
  - Added mount-timing guard for scanner target initialization.
  - Added mobile/native-specific scanner path preference.
  - Added camera startup fallback from rear-camera constraints to generic video stream.
  - Added scanner diagnostics and clearer runtime error messaging.
- Native/mobile behavior:
  - Secure-context gate now allows native app context.
  - Mobile flow favors `html5-qrcode` where native preview paths can go black.
- UPC lookup robustness:
  - Added timeout handling and clearer network/CORS error mapping.
  - Added title cleaning and candidate search matching for TMDB (e.g., strips packaging noise like Blu-ray/Digital copy labels).
  - Added server-side UPC proxy endpoint (`api/upc-lookup.js`) and prioritized same-origin proxy calls to reduce mobile CORS failures.

## Ownership/collection integration
- `movie_logs.source_upc` is treated as physical ownership signal.
- Library now has a dedicated **Collection** shelf using UPC-backed logs.
- Profile shows **Physical Owned** count.
- Movie detail shows ownership banner when UPC-backed entry exists.

## Key files
- `src/components/LogMovieModal.jsx`
- `src/api/upc.js`
- `api/upc-lookup.js`
- `vercel.json`
- `src/pages/LibraryPage.jsx`
- `src/pages/ProfilePage.jsx`
- `src/pages/MovieDetail.jsx`

## Operational guardrails
- Lookup failures never block manual logging.
- Optional enrichments remain fail-soft and non-blocking.
- All updates validated via targeted lint checks and production build.

## Remaining risk / next steps
- For long-term scale, add server-side cache table for UPC results to reduce repeated external lookups.
- Add confidence scoring in TMDB matching to prompt user confirmation on ambiguous title matches.
