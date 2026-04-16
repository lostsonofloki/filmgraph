# 🗺️ Filmgraph Development Roadmap

A phased approach to building Filmgraph from a static UI to a fully-featured movie logging platform with AI-powered recommendations.

---

## Phase 1: The "Visuals" (Frontend Layout) 🎨

**Goal**: Create a polished, app-like interface using static/hardcoded data.

### Tasks

| #    | Task                              | Component                           | Status |
| ---- | --------------------------------- | ----------------------------------- | ------ |
| 1.1  | Sketch UI wireframes              | Home screen + Log Movie screen      | ✅     |
| 1.2  | Build **MovieCard** component     | Poster, title, year display         | ✅     |
| 1.3  | Build **StarRating** component    | Clickable stars with 0.5 increments | ✅     |
| 1.4  | Build **MoodChip** component      | Toggleable mood buttons             | ✅     |
| 1.5  | Create **MovieGrid** layout       | CSS Grid/Flexbox collection view    | ✅     |
| 1.6  | Set up React Router               | Navigation between pages            | ✅     |
| 1.7  | Build **HomePage** (Library view) | Main screen with movie grid         | ✅     |
| 1.8  | Build **LogMoviePage**            | Form for logging movies             | ✅     |
| 1.9  | Build **Logo** component          | Film frame + bar chart logo         | ✅     |
| 1.10 | Build **Footer** component        | TMDB/OMDb attributions              | ✅     |

### Deliverables

- ✅ Fully functional static UI
- ✅ All core components built and styled
- ✅ Responsive design (desktop + mobile)
- ✅ Custom Logo component
- ✅ Compliant Footer with API attributions

### Success Criteria

- [x] Can navigate between Home and Log Movie screens
- [x] Star rating highlights correctly on click (with 0.5 increments)
- [x] Mood chips toggle on/off
- [x] Movie cards display in a responsive grid
- [x] Logo displays consistently across app
- [x] Footer shows TMDB/OMDb attributions
- [x] Log Movie modal opens with full form

---

## Phase 2: The "Brain" (External Data) 🧠

**Goal**: Replace fake data with real movie information from TMDB API.

### Tasks

| #    | Task                            | Description                                                  | Status |
| ---- | ------------------------------- | ------------------------------------------------------------ | ------ |
| 2.1  | Get **TMDB API Key**            | Sign up at [The Movie Database](https://www.themoviedb.org/) | ✅     |
| 2.2  | Create **SearchBar** component  | Input field for movie search                                 | ✅     |
| 2.3  | Implement **fetch** logic       | async/await to query TMDB API                                | ✅     |
| 2.4  | Build **SearchResults** display | Show search results as clickable cards                       | ✅     |
| 2.5  | Auto-fill **Log Movie** form    | Click result → pre-populate title & poster                   | ✅     |
| 2.6  | Add loading & error states      | Handle API failures gracefully                               | ✅     |
| 2.7  | Build **TrendingMovies** page   | Display trending movies from TMDB                            | ✅     |
| 2.8  | Build **MovieDetail** page      | Full movie view with backdrop                                | ✅     |
| 2.9  | Get **OMDb API Key**            | Rotten Tomatoes scores integration                           | ✅     |
| 2.10 | Fetch **RT scores** by IMDB ID  | Display critic scores on movie cards                         | ✅     |
| 2.11 | Display **Recommendations**     | Show related movies on detail page                           | ✅     |
| 2.12 | Build **RatingSlider**          | StoryGraph-style precision slider (0.0-5.0)                  | ✅     |
| 2.13 | Build **Mood Palette**          | 15 moods across 3 categories                                 | ✅     |
| 2.14 | Build **LogMovieModal**         | Full logging form with Supabase insert                       | ✅     |
| 2.15 | Integrate **Watch Providers**   | Display streaming availability (Where to Watch)              | ✅     |

### API Endpoints (TMDB)

```
GET /trending/movie/{time_window}
GET /search/movie?q={movie_name}
GET /movie/{movie_id}
GET /movie/{movie_id}/recommendations
GET /movie/{movie_id}/watch/providers
GET /movie/{movie_id}/images
```

### API Endpoints (OMDb)

```
GET /?apikey={key}&i={imdb_id}&plot=full
```

### Deliverables

- ✅ Working movie search (OMDb)
- ✅ Trending movies display (TMDB)
- ✅ Movie detail pages with backdrops
- ✅ Rotten Tomatoes scores integration
- ✅ Movie recommendations
- ✅ Real movie posters and metadata
- ✅ Seamless form auto-fill from search
- ✅ Streaming provider display (Where to Watch)

### Success Criteria

- [x] Typing a movie name returns relevant results
- [x] Trending movies display with backdrop images
- [x] Movie detail pages show full information
- [x] Rotten Tomatoes scores visible on cards
- [x] Recommendations section shows related movies
- [x] Clicking a result opens Log Movie form with data pre-filled
- [x] Handles network errors and no-results scenarios
- [x] Where to Watch displays streaming providers with logos

---

## Phase 3: The "Memory" (Supabase & Authentication) 💾

**Goal**: Persist user data and protect private logs using Supabase.

### Tasks

| #   | Task                           | Description                              | Status |
| --- | ------------------------------ | ---------------------------------------- | ------ |
| 3.1 | Initialize **Supabase Client** | Connect React to Supabase project        | ✅     |
| 3.2 | Run **SQL Schema**             | Create profiles and movie_logs tables    | ✅     |
| 3.3 | Configure **RLS Policies**     | Set up Row Level Security (Privacy)      | ✅     |
| 3.4 | Build **Auth Flow**            | Sign Up / Login / Logout components      | ✅     |
| 3.5 | Implement **Create (Log)**     | Save movie + rating + moods to Supabase  | ✅     |
| 3.6 | Implement **Read (Library)**   | Fetch and display user's logged movies   | ✅     |
| 3.7 | Implement **Delete/Edit**      | Remove or update existing logs           | ✅     |
| 3.8 | Implement **Data Validation**  | Prevent duplicate movie logs in database | ✅     |

### Database Schema

```sql
-- movie_logs table
{
  id: UUID,                  -- Primary key
  user_id: UUID,             -- References auth.users
  tmdb_id: INTEGER,          -- TMDB movie ID
  title: TEXT,               -- Movie title
  year: INTEGER,             -- Release year
  poster: TEXT,              -- TMDB poster URL
  rating: NUMERIC,           -- User rating (0.5-5 increments)
  moods: TEXT[],             -- ['atmospheric', 'dark', etc.]
  review: TEXT,              -- Private notes
  watch_status: TEXT,        -- 'watched' | 'to-watch'
  created_at: TIMESTAMP,     -- When logged
  updated_at: TIMESTAMP      -- Last modified
}
```

### Deliverables

- ✅ Supabase client initialized
- ✅ SQL schema with RLS policies
- ✅ User authentication (email/password)
- ✅ Movie logging modal with form
- ✅ Supabase insert function

### Success Criteria

- [x] Users can sign up and log in
- [x] Logged-in users can log movies with ratings and moods
- [x] Data persists in Supabase database
- [x] Users can view their personal library
- [x] Users can edit and delete their logs

---

## Phase 4: The "StoryGraph" Polish (Advanced) ✨

**Goal**: Add unique features that differentiate Filmgraph from Letterboxd.

### Tasks

| #   | Task                           | Description                                       | Status |
| --- | ------------------------------ | ------------------------------------------------- | ------ |
| 4.1 | Build **Stats Dashboard** page | Analytics overview                                | ✅     |
| 4.2 | Integrate **Recharts**         | Pie/bar charts for moods, genres, years           | ✅     |
| 4.3 | Create **Up Next Queue**       | Shelf for next 5 movies to watch                  | ✅     |
| 4.4 | Add **Mood Filtering**         | Filter library by mood (Atmospheric, Tense, etc.) | ✅     |
| 4.5 | Add **Sorting Options**        | Sort by rating, date, year                        | ✅     |
| 4.6 | Build **Watch History**        | Calendar/timeline of watched movies               | ✅     |
| 4.7 | Implement **Edit/Update**      | Modify existing movie logs                        | ✅     |

### Dashboard Metrics

- 📊 Most-watched moods (bar chart)
- 📊 Movies watched per month (bar chart)
- 📊 Average rating over time (displayed)
- 📊 Top genres (pie chart)

### Deliverables

- ✅ Interactive stats dashboard (ProfilePage + StatsDashboard)
- ✅ "Up Next" queue feature (LibraryPage)
- ✅ Mood-based filtering (LibraryPage)
- ✅ Advanced sorting options (LibraryPage)

### Success Criteria

- [x] Dashboard displays accurate, visual statistics
- [x] Can filter library by mood
- [x] Can sort by rating, date, or year
- [x] Can view watch history calendar

---

## Phase 5: The Smart Edge (AI Integration) 🤖

**Goal**: Add intelligent, opt-in features to enhance discovery while respecting user privacy.

### Tasks

| #   | Task                             | Description                                              | Status |
| --- | -------------------------------- | -------------------------------------------------------- | ------ |
| 5.1 | **Gemini API Setup**             | Connect Google AI Studio to the frontend                 | ✅     |
| 5.2 | **AI Opt-In Toggle**             | Add a "Privacy First" toggle in Profile settings         | ✅     |
| 5.3 | **Smart Recommendations**        | Generate "Because you liked X" suggestions with TMDB IDs | ✅     |
| 5.4 | **AI-Free Fallback**             | Ensure the UI looks great even when AI is OFF            | ✅     |
| 5.5 | **Mood Pattern Analysis**        | AI-powered insights about user's horror palate           | ✅     |
| 5.6 | **Recommendation Feedback Loop** | Thumbs up/down with banished list                        | ✅     |
| 5.7 | **Library Integration**          | Add to Watchlist / Mark as Watched buttons               | ✅     |

### Deliverables

- ✅ Google AI Studio integration (@google/generative-ai)
- ✅ Privacy-first opt-in settings (AI Discovery toggle in Profile)
- ✅ SQL schema update (ai_enabled column)
- ✅ AI-powered movie recommendations with TMDB IDs
- ✅ Mood pattern analysis and curator insights
- ✅ Graceful fallback when AI is disabled
- ✅ Feedback system (thumbs up/down saves to recommendation_feedback table)
- ✅ Banished list - AI won't suggest rejected movies again
- ✅ Direct library integration (Add to Watchlist, Mark as Watched)
- ✅ LogMovieModal integration for instant rating

### Success Criteria

- [x] Users can enable/disable AI features in Profile settings
- [x] Smart recommendations generate based on watch history and moods
- [x] App functions fully without AI enabled (privacy-first default)
- [x] Clear privacy indicators ("Your data is never used for training")
- [x] AI provides personalized "curator's notes" about user's taste
- [x] Thumbs down removes movie and adds to banished list
- [x] Recommendations include TMDB IDs for library integration
- [x] Users can add recommendations directly to watchlist or log as watched

---

## Phase 6: Future Enhancements (Post-v1.0) 🚀

**Goal**: Expand Filmgraph with social features, platform growth, and enhanced user experience.

### Tasks

| #    | Task                         | Description                                                  | Status |
| ---- | ---------------------------- | ------------------------------------------------------------ | ------ |
| 6.1  | **Social Sharing**           | Share movie logs to social media platforms                   | ⬜     |
| 6.2  | **Watch History Calendar**   | Visual calendar view of watched movies                       | ✅     |
| 6.3  | **Smart Recommendations V2** | Enhanced AI with cross-user patterns & seasonal picks        | ⬜     |
| 6.4  | **Letterboxd Import**        | Migrate existing data from Letterboxd                        | ⬜     |
| 6.5  | **Mobile App (Deferred)**    | React Native version for iOS/Android (pushed back)           | ⏸️     |
| 6.6  | **Light Mode**               | Theme toggle (currently dark mode only)                      | ⬜     |
| 6.7  | **Social Features**          | Friends, following, and activity feeds                       | ✅     |
| 6.8  | **Year in Review**           | Annual wrapped-style statistics summary                      | ⬜     |
| 6.9  | **Custom Lists**             | User-created movie collections                               | ✅     |
| 6.10 | **Advanced Search**          | Multi-criteria search (Mood, Genre, Rating)                  | ⬜     |
| 6.11 | **The Archive Importer**     | Mass import tool for migrating movie lists                   | ✅     |
| 6.12 | **Bug Report System**        | In-app bug reporting with admin dashboard                    | ✅     |
| 6.13 | **The Oracle**               | Conversational AI Librarian using personal logs              | ✅     |
| 6.14 | **The Matchmaker**           | Compare watch-lists & mood overlaps with friends             | ✅     |
| 6.15 | **High-Speed AI Ensemble**   | Groq LPU integration for sub-500ms vibe-to-genre translation | ✅     |

### Deliverables

- Social media integration for sharing logs
- Calendar visualization for watch history
- Cross-platform mobile application
- Theme customization (dark/light mode)
- Data import tools from competing platforms
- **The Archive Importer**: AI-powered mass import with text/file upload

---

## Phase 6.11: The Archive Importer (Mass Import Tool) 📥

**Status**: ✅ **Complete** (v1.5.0)

**Goal**: Allow users to instantly migrate their old movie lists into Filmgraph without typing them one by one.

### How It Works

| Step              | Description                                                               | Tech                               |
| ----------------- | ------------------------------------------------------------------------- | ---------------------------------- |
| **UI**            | Text area for pasting lists + drag-and-drop zone for .txt files           | React FileReader API               |
| **AI Parser**     | Send raw text to Groq API, extract titles/years as JSON                   | Groq LPU (llama-3.3-70b-versatile) |
| **Data Pipeline** | Loop through JSON, hit TMDB API for IDs/posters, batch upsert to Supabase | TMDB API + Supabase                |
| **UX**            | Progress bar with Deep Ember styling during AI parsing                    | CSS animations                     |

### User Flow

1. User navigates to Library page and clicks "✨ Magic Import"
2. Pastes text list from Letterboxd, notes, or any format
3. Clicks "✨ Parse List" button
4. Groq extracts movie titles and years (~300-600ms)
5. TMDB verification fetches official IDs and posters in parallel
6. User reviews parsed list with posters and selects movies to import
7. Clicks "📥 Import X Movies" → Batch upsert to Supabase
8. Success screen shows imported/skipped/duplicates counts

### Technical Implementation

- **ArchiveImporterModal** - 4-step modal: Input → Verifying → Review → Complete
- **parseArchiveWithGroq()** - Groq API integration with system prompt engineering
- **verifyBatchWithTMDB()** - Parallel TMDB fetching with Promise.all
- **batchSaveMovies()** - Single UPSERT request with onConflict deduplication
- **Smart Features**:
  - Multi-format parsing (Letterboxd, plain lists, numbered lists, notes)
  - Watch status selector (Watched / Want to Watch)
  - Optional list integration (add all imported to custom list)
  - Duplicate detection via database constraint
  - Select All / Deselect All quick actions

### Success Criteria

- [x] Users can paste a text list and get parsed results
- [x] AI correctly extracts 90%+ of movie titles
- [x] TMDB verification fetches correct posters
- [x] Batch import completes without duplicates
- [x] Progress indicators show real-time status
- [x] Users can select/deselect individual movies
- [x] Optional watch status and list assignment

---

## Phase 6.12: Bug Report System (In-App Reporting) 🐛

**Goal**: Enable users to submit bug reports directly from the app with automatic context capture and admin dashboard for triage.

### Features

| Feature                     | Description                                                 | Status      |
| --------------------------- | ----------------------------------------------------------- | ----------- |
| **BugReportModal**          | Sleek dark-themed modal for submitting bug reports          | ✅ Complete |
| **ReportBugButton**         | Reusable button component (3 variants: button, icon, link)  | ✅ Complete |
| **BugList Admin Dashboard** | Admin-only bug management at `/admin/bugs`                  | ✅ Complete |
| **Auto-Capture Context**    | Automatically captures page URL and user info on submission | ✅ Complete |
| **Status Management**       | "Mark as Fixed" button, status dropdown, color-coded badges | ✅ Complete |
| **Version Tracking**        | Every bug report includes app version for tracking          | ✅ Complete |

### How It Works

1. **User Encounters Bug** - Clicks "Report Bug" button in footer or About page
2. **Modal Opens** - Pre-filled with user email and current page URL
3. **User Describes Issue** - Text area for detailed bug description
4. **Submit to Supabase** - Bug saved to `bug_reports` table with RLS policies
5. **Admin Reviews** - Admin accesses `/admin/bugs` dashboard (protected by email)
6. **Triage & Fix** - Admin updates status, tracks fixes across versions

### Technical Requirements

- Supabase `bug_reports` table with RLS policies
- Admin email protection (`sonofloke@gmail.com` only)
- Auto-capture page URL and user context
- Version constant in `src/constants.js`
- Status management (Open, In Progress, Fixed, Won't Fix)
- Toast notifications for success/error feedback

### Database Schema

```sql
-- bug_reports table
{
  id: UUID,
  user_id: UUID,
  user_email: TEXT,
  page_url: TEXT,
  description: TEXT,
  status: TEXT,              -- 'open' | 'in-progress' | 'fixed' | 'won't-fix'
  app_version: TEXT,         -- e.g., '1.3.7'
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### Success Criteria

- [x] Users can submit bug reports from any page
- [x] Page URL and user info auto-captured
- [x] Admin dashboard accessible only by admin email
- [x] Bug status can be updated (Mark as Fixed)
- [x] Version tracking included in every report
- [x] Toast notifications provide user feedback

---

## Phase 6.16: Bug Fixes & Stability 🔧

**Goal**: Address UX edge cases, database schema conflicts, and API error handling for a polished, production-ready experience.

### Bugs Fixed (v1.8.1 - The Anniversary Patch)

| #   | Bug                            | Severity | Component        | Fix                                                                                                                     | Status   |
| --- | ------------------------------ | -------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Matchmaker 400/406 Errors**  | High     | `Supabase SQL`   | Added explicit Foreign Keys connecting `friendships` to `profiles` table.                                               | ✅ Fixed |
| 2   | **Matchmaker White Screen**    | Critical | `Matchmaker.jsx` | Added Optional Chaining (`?.`) and stable `ui-avatars.com` fallbacks to prevent crashes on null profiles.               | ✅ Fixed |
| 3   | **0% Synergy (Privacy Lock)**  | High     | `Supabase RLS`   | Fixed RLS policy on `movie_logs` using `::uuid` casting to allow friends to view each other's libraries for comparison. | ✅ Fixed |
| 4   | **Schema Naming Conflict**     | High     | `Database`       | Reconciled `poster` vs `poster_path` by creating a Generated Virtual Column, and ensured `genres` column exists.        | ✅ Fixed |
| 5   | **Discover 'Add to List' 400** | High     | `Discover.jsx`   | Stripped `genres` from the insert payload to prevent Postgres type-casting rejections on quick-adds.                    | ✅ Fixed |
| 6   | **Gemini Parsing Crash**       | Medium   | `AI API`         | Switched from `gemini-1.5-flash-lite-preview` to stable `gemini-1.5-flash` to prevent 503 stream drops.                 | ✅ Fixed |

### The "Ghost Hunter" Fix

**Problem**: TMDB returns `200 OK` with empty or malformed objects for invalid movie IDs, causing blank pages with fully-armed action buttons.

**Solution**: Add an early return guard in `MovieDetail.jsx` that checks for missing data before rendering:

```javascript
// Ghost Hunter Fix - catches invalid IDs, empty data, or TMDB returning 200 OK with no data
if (!movie || !movie.title) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-4xl font-creepster text-accent mb-4">Signal Lost</h2>
      <p className="text-text-muted mb-8 max-w-md">
        The archives have no record of this tape. It may have been corrupted,
        deleted, or it never existed at all.
      </p>
      <button onClick={handleBack} className="btn-primary">
        Return to Library
      </button>
    </div>
  );
}
```

### Whitespace Search Fix

**Problem**: Submitting whitespace-only searches returns empty results, giving users the "silent treatment" (bad UX).

**Solution**: Trim and validate search input in `Header.jsx`:

```javascript
const handleSubmit = (e) => {
  e.preventDefault();

  // Trim whitespace from search query
  const cleanQuery = tempSearch.trim();

  // Reject empty queries - prevent searching whitespace
  if (!cleanQuery) {
    setTempSearch("");
    return;
  }

  navigate(`/search?q=${encodeURIComponent(cleanQuery)}`);
  setTempSearch("");
  setIsSearchVisible(false);
  setIsMobileMenuOpen(false);
};
```

### Security Audit

**API Key Protection**: Verified that `.env` file has never been committed to git history.

```bash
$ git log --all --full-history -- .env
# (empty output = secure)
```

| File           | Status                                 | Risk    |
| -------------- | -------------------------------------- | ------- |
| `.env`         | Never committed                        | ✅ Safe |
| `.env.example` | Committed (template with placeholders) | ✅ Safe |
| `debugEnv.js`  | Removed (was dev-only utility)         | ✅ Safe |

### Success Criteria

- [x] Whitespace-only searches are rejected silently
- [x] Invalid movie IDs display "Signal Lost" 404 page
- [x] Action buttons are removed from DOM on invalid data
- [x] API keys remain protected from git exposure
- [x] Error states provide clear user feedback

---

## 🎯 Current Status

**Phase**: Phase 7.1 + 7.2 + 7.3 core foundations shipped ✅

**Current Version**: v1.12.6 - Oracle Analytics + Reliability Hardening

**Completed Features**:

- ✅ **v1.12.5 Highlights** - Watch History Calendar replaced timeline on `/history`, added day-level drilldown, and mobile touch-target/readability polish.
- ✅ **Oracle Foundation** - Hybrid AI routing (Groq + Gemini), deterministic fallback behavior, and discovery stability.
- ✅ **Oracle Guardrails** - Daily-budget controls via Supabase RPC + local fallback safeguards.
- ✅ **PWA/Offline Core** - Service worker, cached app shell/API responses, IndexedDB queue, and reconnect sync.
- ✅ **Collection Integrity Core** - Anti-double-buy checks for log/list flows with UPC groundwork in schema.
- ✅ **Library UX Core** - Natural-language sort/filter parser integrated into library controls.
- ✅ **Social Core** - Matchmaker, social hub, invites/requests, and synergy dashboard are live.
- ✅ **Importer Core** - Magic Importer parsing, TMDB verification, dedupe, and batch save flow are live.
- ✅ **Identity Core** - Username constraints, availability RPC, and username-first social invites shipped.

---

## Phase 6.13: The Oracle (Conversational AI Librarian) 🧙

**Status**: ✅ **Complete** (v1.8.0 - Oracle)

**Note**: The Oracle lives on as the **Oracle** discovery page (`/discover`) with mood bubbles, natural language search, and multi-movie recommendations with rationale.

**Goal**: Transform the AI from a recommendation engine into a conversational librarian with personality, wit, and deep knowledge of your viewing habits.

### Features (Implemented in Oracle)

| Feature                      | Description                                                                        | Status         |
| ---------------------------- | ---------------------------------------------------------------------------------- | -------------- |
| **Natural Language Search**  | Ask by feeling, not genre                                                          | ✅ Implemented |
| **Mood Bubbles**             | 6 quick-select presets (Cozy, Adrenaline, Mind-Bending, Deep Cuts, Noir, Euphoric) | ✅ Implemented |
| **Rationale Display**        | "Why Filmgraph Picked This" with cinematic analysis                                | ✅ Implemented |
| **Vibe Check**               | Punchy 5-7 word taglines for each recommendation                                   | ✅ Implemented |
| **Reject & Reroll**          | Reject entire batch and get new alternatives                                       | ✅ Implemented |
| **Session Tracking**         | Badge showing rejected movies count                                                | ✅ Implemented |
| **Library Integration**      | Watched, Watchlist, Add to List buttons                                            | ✅ Implemented |
| **Zero-Duplicate Guarantee** | AI never recommends movies you've already logged                                   | ✅ Implemented |
| **Personalized Context**     | AI analyzes your high-rated films before recommending                              | ✅ Implemented |

### Technical Implementation

- **Multi-Movie Output** - Returns 3-5 curated recommendations per query
- **Hybrid AI Orchestration** - Groq LPU for genre extraction + Gemini for deep reasoning
- **Three-Bucket Memory** - Fetches Watched + Watchlist + Custom Lists in parallel
- **Taste Triangulation** - AI sees your favorites before generating recommendations
- **Concurrent TMDB Fetching** - Parallel poster/metadata requests for all movies

---

## Phase 6.14: The Matchmaker (Social Compatibility) 👥

**Status**: ✅ **Complete** (v1.8.0)

**Goal**: Help users find friends with compatible taste and discover movies through social overlap analysis.

### Features (Implemented)

| Feature                        | Description                                    | Example                                         |
| ------------------------------ | ---------------------------------------------- | ----------------------------------------------- |
| **Social Hub Card**            | Profile page entry point for friend management | "Social Hub" section with Manage Friends button |
| **Friend Invites**             | Search and invite users by email               | "User not found" toast if email doesn't exist   |
| **Friendship Requests**        | Incoming/outgoing request management           | Accept, Decline, Cancel actions                 |
| **My Crew**                    | List of accepted friends with match scores     | Horizontal carousel of friend chips             |
| **Pending Requests**           | Track sent requests awaiting response          | Shows receiver name with Cancel button          |
| **Requests**                   | Incoming requests with accept/decline actions  | Shows sender name with Accept/Decline           |
| **Synergy Score**              | Randomized compatibility percentage            | "70-100% Match" badge on each friend            |
| **Click-to-Compare**           | Navigate to compatibility report               | `/matchmaker/${friendId}` route                 |
| **Deep Ember Theme**           | Consistent dark aesthetic                      | Amber accents, zinc backgrounds                 |
| **Font-creepster Headers**     | Distinctive Creepster font                     | Applied to page title and section headers       |
| **Thumb-Friendly Tap Targets** | 48px minimum button heights                    | Mobile-optimized action buttons                 |

### How It Works

1. **Navigate to Profile** - Social Hub card visible on `/profile`
2. **Invite Friends** - Enter email address, send friend request
3. **Manage Requests** - Accept incoming, cancel outgoing requests
4. **View Friends** - Scroll friend carousel with match scores
5. **Compare Taste** - Click any friend to view synergy report

### Technical Implementation

- **Existing `friendships` Table** - No new SQL required
- **Supabase Queries** - Parallel fetch for sent/received/accepted friendships
- **React Router Links** - All navigation uses `<Link>` components
- **Toast Notifications** - Success/error feedback for all actions
- **Avatar Integration** - Supabase Storage public URLs

### Success Criteria

- [x] Users can add/remove friends via email invites
- [x] Friendship requests can be accepted or declined
- [x] Accepted friends display in carousel with match scores
- [x] Click-to-compare navigates to synergy dashboard
- [x] Deep Ember theme with font-creepster styling
- [x] Thumb-friendly 48px tap targets for mobile
- [x] "User not found" toast for invalid email invites

---

## Phase 6.15: High-Speed AI Ensemble (Groq LPU Integration) 🚀

**Goal**: Transition the Oracle to a multi-model architecture for near-instant response times while maintaining deep reasoning capabilities.

### Overview

| Component                     | Description                                                                         | Status               |
| ----------------------------- | ----------------------------------------------------------------------------------- | -------------------- |
| **Groq LPU Infrastructure**   | Leverage Groq's Language Processing Unit hardware for ultra-low-latency inference   | ✅ Complete (v1.4.0) |
| **Llama 3 Integration**       | Deploy Llama 3 models on Groq for sub-500ms vibe-to-genre translations              | ✅ Complete (v1.4.0) |
| **Hybrid AI Architecture**    | Groq for fast pattern matching + Gemini for deep reasoning                          | ✅ Complete (v1.4.0) |
| **Multi-Model Orchestration** | Intelligent routing between Groq (fast) and Gemini (deep) based on query complexity | ✅ Complete (v1.4.0) |

### Technical Distinction

> **⚠️ Important**: This integration uses **Groq's LPU (Language Processing Unit) hardware infrastructure** — a specialized chip designed for ultra-fast AI inference. This is **not** related to Elon Musk's xAI chatbot (Grok). Groq provides the hardware layer that runs open-source models like Llama 3 at unprecedented speeds.

### How It Works (Implemented in v1.4.0)

1. **User Submits Vibe Query** - "I want something dark and mind-bending"
2. **Groq LPU Processing** - `llama-3.3-70b-versatile` instantly parses natural language → genre IDs (300-600ms)
3. **Latency Achieved** - Sub-500ms average response for vibe-to-genre translation ✅
4. **Gemini Deep Reasoning** - Complex recommendations use Gemini 3.1 Flash Lite Preview
5. **Multi-Movie Response** - 3-5 curated films with fast genre mapping + rich cinematic analysis

### Architecture (Live)

```
User Query → Groq LPU (llama-3.3-70b-versatile) → Genre IDs (300-600ms)
           ↓
    Gemini 3.1 Flash Lite → 3-5 Movies + Deep Analysis + Rationale
           ↓
    Oracle UI → Posters + Years + "Why Filmgraph Picked This" (per movie)
```

### Technical Requirements

- Groq API integration (`groq-sdk` or direct REST)
- Llama 3 model selection and prompt engineering
- Multi-model orchestration layer (route simple vs. complex queries)
- Fallback handling (Groq downtime → Gemini-only mode)
- Latency monitoring and performance metrics
- Cost optimization (Groq for fast queries, Gemini for deep dives)

### Benefits

| Benefit                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| **Speed**               | Sub-500ms vibe translation vs. 2-3s with Gemini alone |
| **Cost Efficiency**     | Groq is cheaper for simple pattern matching           |
| **Scalability**         | LPU hardware handles high concurrency                 |
| **Best of Both Worlds** | Fast responses + deep reasoning when needed           |
| **Future-Proof**        | Multi-model architecture allows easy model swaps      |

### Success Criteria

- [x] Groq LPU integration completes successfully ✅
- [x] Vibe-to-genre translation achieves sub-500ms latency ✅ (avg 300-600ms)
- [x] Multi-model routing works seamlessly (simple → Groq, complex → Gemini) ✅
- [x] Fallback mode functions during Groq downtime ✅
- [x] Reliability/Uptime increases to 99.9% ✅ (Groq fallback handles Gemini 503 errors)
- [x] User experience remains smooth with hybrid architecture ✅
- [x] Clear distinction from xAI/Grok in documentation ✅
- [x] Multi-movie recommendations (3-5 films per query) ✅

### 🔧 Technical Notes & Future Considerations

#### Model ID Verification (March 2026)

> **Current**: `llama-3.3-70b-versatile` is the production model.
> **Watch**: Monitor Groq docs for `openai/gpt-oss-120b` — the newer production king may offer better latency/cost ratio for sub-500ms targets.

#### Gemini 3.1 Flash Lite Preview Stability

> **Status**: This model has shown 503 errors in production.
> **Mitigation**: The hybrid orchestration includes automatic fallback to Gemini-only mode when Preview models fail.
> **Long-term**: Consider migrating to stable Gemini 2.0 Flash for production reliability.

#### Phase 6.14 "Matchmaker" — Technically Unlocked ✅

> With Groq extracting Genre IDs from user queries, the Matchmaker feature (comparing two users' "Top 5 Extracted Genres") is now trivial to implement. The infrastructure is already in place.

---

## 📝 Notes

- **Tech Stack Pivot**: Using Supabase instead of Node/Express + MongoDB
  - No backend server to maintain
  - Built-in authentication
  - Row Level Security for privacy
  - Real-time database included

- **Environment Variables**: Check console for "Supabase Connected:" log on load
  - Supabase Project: `gmbpvpdudqktexiijtlr`
  - `.env` file supports both `VITE_` and `REACT_APP_` prefixes
  - Never commit `.env` to Git

- **Mood Palette**: Moods are color-coded by category for quick visual scanning
- **Rating Slider**: Precision 0.1 increments with gradient fill that tracks progress
- **Quick Launch**: Double-click `launch.bat` to start dev server

---

## Phase 6.17: Collaborative Shared Lists 🤝

**Status**: ✅ **Complete** (v1.10.1)

**Goal**: Upgrade custom lists into multiplayer experiences where friends can co-curate movie collections in real-time.

### Tasks

| #      | Task                 | Description                                                                           | Status |
| ------ | -------------------- | ------------------------------------------------------------------------------------- | ------ |
| 6.17.1 | **Database Schema**  | Extend existing `lists` + `list_items` with `list_members` and `list_items.added_by` attribution support. | ✅     |
| 6.17.2 | **RLS Security**     | Policy: `auth.uid()` must exist in `list_members` to view/edit the list.              | ✅     |
| 6.17.3 | **Invite System**    | Allow adding collaborators via UUID, email, or username.                              | ✅     |
| 6.17.4 | **Action Menu Sync** | Shared lists appear dynamically in the "Add to List" modal.                           | ✅     |
| 6.17.5 | **Attribution UI**   | Show per-item `added_by` identity text/profile metadata for who added each movie.     | ✅     |
| 6.17.6 | **Real-Time Sync**   | Use Supabase Realtime to update the list live when a friend adds a movie.             | ✅     |

---

## Phase 6.18: Robust Search & Deep Discovery 🔍

**Status**: ✅ **Complete** (v1.9.6)

**Goal**: Expand the search engine to handle cast/crew and provide deep-linking across the entire TMDB filmography.

### Tasks

| #      | Task                         | Description                                                                         | Status |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------- | ------ |
| 6.18.1 | **Global Search Update**     | Update search logic to hit `search/person` alongside movies.                        | ✅     |
| 6.18.2 | **UI Categorization**        | Visually separate "Movies" and "People" in search dropdowns/results.                | ✅     |
| 6.18.3 | **Advanced Person Profiles** | Enhance existing actor pages with full `person/{id}/movie_credits` endpoints.       | ✅     |
| 6.18.4 | **Smart Filtering**          | Add genre toggles on actor pages (e.g., "Show Horror Only").                        | ✅     |
| 6.18.5 | **Deep Navigation**          | Ensure all Cast/Crew names on Movie Details link to Person Profiles.                | ✅     |
| 6.18.6 | **"Logged" Indicators**      | Add a visual badge on filmography grids showing which movies you've already logged. | ✅     |

---

## Phase 6.19: Username Foundation & Identity 🪪

**Status**: ✅ **Complete** (v1.10.1)

**Goal**: Establish consistent, human-readable identities for social and collaboration flows.

### Tasks

| #      | Task                          | Description                                                                                       | Status |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| 6.19.1 | **Profiles Username Column**  | Add/normalize `profiles.username` values and enforce lowercase format constraints.               | ✅     |
| 6.19.2 | **Uniqueness Enforcement**    | Add case-insensitive unique index for `profiles.username`.                                        | ✅     |
| 6.19.3 | **Availability RPC**          | Add `is_username_available` RPC for frontend validation checks.                                   | ✅     |
| 6.19.4 | **Registration Validation**   | Require valid unique username during sign-up flow.                                                | ✅     |
| 6.19.5 | **Profile Edit Validation**   | Allow username edits with format/uniqueness validation and metadata sync.                         | ✅     |
| 6.19.6 | **Shared List Invite Support**| Support inviting collaborators by username in addition to UUID/email.                             | ✅     |

---

## Phase 7: Monetization & Founders Plan 💸

**Status**: 🛠️ **Planned**
**Priority**: ⬇️ **Lowest (Deferred)**

**Goal**: Document monetization direction while keeping execution deferred until core product quality, growth, and feature depth are stronger.

> **Current Direction**: Monetization is intentionally deprioritized right now. Focus remains on product polish, reliability, discovery quality, and user growth.

### The "100 User Rule"

- **Zero Monetization**: No ads, no fees, and no paywalls until the platform reaches 100 active/concurrent users.
- **Primary Focus**: Pure user growth and user-experience polish.

### The Founders Pack (First 100 Users)

- **Lifetime Pro**: First 100 users receive all future Pro features for $0 forever.
- **Ad-Free Forever**: Founders never see ads, even after monetization launches.
- **Founders Badge**: Unique badge/icon on profile and Oracle interface.
- **Early Access**: Priority beta access for Barcode Scanner and Natural Language Sorting.

### Post-100 Monetization

- **One-Time Unlock**: New users pay a single $5-$10 unlock to remove ads and access Pro features.
- **No Subscriptions**: Keep Filmgraph "buy once, own forever" to avoid subscription fatigue.

### Pro Features to Gate (Post-100)

- **Collection Integrity**: Anti-double-buy barcode scanner logic.
- **Unlimited Oracle**: Unlimited natural language queries (free tier gets daily cap).
- **Offline Database**: Full local cache for browsing library without signal.

---

## Phase 7.1: Oracle AI Infrastructure (Zero-Cost) 🤖

**Status**: ✅ **Core Foundation Shipped** (v1.11.0+)
**Priority**: 🔥 **High (Active Focus)**

**Goal**: Ensure Oracle recommendations remain reliable, low-cost, and resilient under provider failures.

### Tasks

- **Primary Model**: Gemini 1.5 Flash for knowledge/database query reasoning.
- **Secondary Model**: Groq for speed and instant UI response.
- **Emergency Fallback**: OpenRouter model array for automatic failover when free tiers are rate-limited.
- **Context Hydration**: Inject user history context (Top 20 / Last 5) into prompts for personalization.
- **Cost Protection**: Hard $0 spending cap across all API dashboards.

### Success Criteria

- [x] Fallback ladder returns recommendations when primary provider is unavailable.
- [x] Context hydration includes focused recent/favorite user history slices.
- [x] Daily Oracle budget controls are enforced through database-backed checks.
- [ ] Add provider analytics dashboard for response quality and failure trend tracking.

---

## Phase 7.2: PWA & Offline Features 📱

**Status**: ✅ **Core Foundation Shipped** (v1.11.0+)
**Priority**: 🔥 **High (Active Focus)**

**Goal**: Deliver native-feeling reliability by keeping key flows usable during low or no connectivity.

### Tasks

- **Native Experience**: Full PWA transition with Add to Home Screen support.
- **Barcode Scanning**: `html5-qrcode` integration for physical media UPC scans.
- **Offline Mode**: Service Workers + IndexedDB for offline library access.
- **Background Sync**: Queue movie logs offline and sync when connection returns.

### Success Criteria

- [x] Service worker caches app shell and critical API responses.
- [x] Offline queue stores log actions and flushes when connectivity returns.
- [x] Discovery and Library surfaces show clear offline-state messaging.
- [x] Add install prompt UX and app-icon validation for full PWA polish.

---

## Phase 7.3: Vibe Filters & Collection Logic 🎭

**Status**: ✅ **Core Foundation Shipped** (v1.11.0+)
**Priority**: 🔥 **High (Active Focus)**

**Goal**: Improve discovery precision and prevent duplicate collection actions before they happen.

### Tasks

- **Background Noise**: Low-stakes, rewatchable content lane.
- **Lock In**: High-engagement titles that require full attention.
- **Trash but Fun**: Guilty-pleasure mode.
- **Dark/Weird Comedy**: Dedicated vibe lane for niche taste.
- **Natural Language Sorting**: Complex Oracle queries (for example: "Under 90 mins, unwatched, dark comedy").
- **Collection Integrity**: Anti-double-buy alerts during barcode scans.

### Success Criteria

- [x] Natural-language sort/filter parsing is available in library workflows.
- [x] Anti-double-buy checks run before list/log write operations.
- [x] UPC schema support exists to enforce per-user barcode uniqueness.
- [x] Add live camera scanner flow wired into UPC duplicate checks.

---

## Phase 7.4: Porch Talk Protocol 🏆

**Status**: 🛠️ **Planned**
**Priority**: ⚪ **Medium**

**Goal**: Create competitive group-viewing interactions that connect personal picks and consensus outcomes.

### Tasks

- **Playoff Bracket Grid**: Competitive movie matchup bracket with voting.
- **Dual Results**: Separate personal-bracket outcomes and overall group consensus.
- **Integration**: Direct link flow from `kuhlshit.com` to Filmgraph marathon page.
- **Leaderboard**: Consensus picks and "spooky season" stats based on ratings.

### Success Criteria

- [ ] Users can create and vote in bracket rounds.
- [ ] Personal and group totals are stored and rendered separately.
- [ ] Leaderboard updates from aggregate rating and vote data.

---

## Phase 7.5: Upcoming Technical Goals ⚙️

**Status**: 🛠️ **Planned**
**Priority**: 🔥 **High (Active Focus)**

**Goal**: Complete the remaining platform work needed for scanner-first mobile logging and resilient discovery.

### Tasks

- **PWA Transition**: Deliver Add to Home Screen native-feel experience without app-store overhead.
- **Barcode Scanner Integration**: Implement with `html5-qrcode` or `quagga2`.
- **API Lookups**: Auto-populate movie metadata from UPC scans via OMDb/TMDB.
- **Mobile Hardware Access**: Browser camera access optimized for fast logging.

### Success Criteria

- [x] Scanner can detect UPC and resolve movie metadata from external APIs.
- [x] Scanner includes fallback path when native `BarcodeDetector` is unavailable.
- [ ] Mobile camera flow is stable across supported browsers/devices.
- [x] Scanner-to-log flow integrates with anti-double-buy checks.
- [x] Scanner entry is discoverable from primary Library actions (next to Magic Import).
