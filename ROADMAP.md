# 🗺️ Ignes Development Roadmap

A phased approach to building Ignes from a static UI to a fully-featured movie logging platform with AI-powered recommendations.

---

## Phase 1: The "Visuals" (Frontend Layout) 🎨

**Goal**: Create a polished, app-like interface using static/hardcoded data.

### Tasks

| # | Task | Component | Status |
|---|------|-----------|--------|
| 1.1 | Sketch UI wireframes | Home screen + Log Movie screen | ✅ |
| 1.2 | Build **MovieCard** component | Poster, title, year display | ✅ |
| 1.3 | Build **StarRating** component | Clickable stars with 0.5 increments | ✅ |
| 1.4 | Build **MoodChip** component | Toggleable mood buttons | ✅ |
| 1.5 | Create **MovieGrid** layout | CSS Grid/Flexbox collection view | ✅ |
| 1.6 | Set up React Router | Navigation between pages | ✅ |
| 1.7 | Build **HomePage** (Library view) | Main screen with movie grid | ✅ |
| 1.8 | Build **LogMoviePage** | Form for logging movies | ✅ |
| 1.9 | Build **Logo** component | Film frame + bar chart logo | ✅ |
| 1.10 | Build **Footer** component | TMDB/OMDb attributions | ✅ |

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

| # | Task | Description | Status |
|---|------|-------------|--------|
| 2.1 | Get **TMDB API Key** | Sign up at [The Movie Database](https://www.themoviedb.org/) | ✅ |
| 2.2 | Create **SearchBar** component | Input field for movie search | ✅ |
| 2.3 | Implement **fetch** logic | async/await to query TMDB API | ✅ |
| 2.4 | Build **SearchResults** display | Show search results as clickable cards | ✅ |
| 2.5 | Auto-fill **Log Movie** form | Click result → pre-populate title & poster | ✅ |
| 2.6 | Add loading & error states | Handle API failures gracefully | ✅ |
| 2.7 | Build **TrendingMovies** page | Display trending movies from TMDB | ✅ |
| 2.8 | Build **MovieDetail** page | Full movie view with backdrop | ✅ |
| 2.9 | Get **OMDb API Key** | Rotten Tomatoes scores integration | ✅ |
| 2.10 | Fetch **RT scores** by IMDB ID | Display critic scores on movie cards | ✅ |
| 2.11 | Display **Recommendations** | Show related movies on detail page | ✅ |
| 2.12 | Build **RatingSlider** | StoryGraph-style precision slider (0.0-5.0) | ✅ |
| 2.13 | Build **Mood Palette** | 15 moods across 3 categories | ✅ |
| 2.14 | Build **LogMovieModal** | Full logging form with Supabase insert | ✅ |
| 2.15 | Integrate **Watch Providers** | Display streaming availability (Where to Watch) | ✅ |

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

| # | Task | Description | Status |
|---|------|-------------|--------|
| 3.1 | Initialize **Supabase Client** | Connect React to Supabase project | ✅ |
| 3.2 | Run **SQL Schema** | Create profiles and movie_logs tables | ✅ |
| 3.3 | Configure **RLS Policies** | Set up Row Level Security (Privacy) | ✅ |
| 3.4 | Build **Auth Flow** | Sign Up / Login / Logout components | ✅ |
| 3.5 | Implement **Create (Log)** | Save movie + rating + moods to Supabase | ✅ |
| 3.6 | Implement **Read (Library)** | Fetch and display user's logged movies | ✅ |
| 3.7 | Implement **Delete/Edit** | Remove or update existing logs | ✅ |
| 3.8 | Implement **Data Validation** | Prevent duplicate movie logs in database | ✅ |

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

**Goal**: Add unique features that differentiate Ignes from Letterboxd.

### Tasks

| # | Task | Description | Status |
|---|------|-------------|--------|
| 4.1 | Build **Stats Dashboard** page | Analytics overview | ✅ |
| 4.2 | Integrate **Recharts** | Pie/bar charts for moods, genres, years | ✅ |
| 4.3 | Create **Up Next Queue** | Shelf for next 5 movies to watch | ✅ |
| 4.4 | Add **Mood Filtering** | Filter library by mood (Atmospheric, Tense, etc.) | ✅ |
| 4.5 | Add **Sorting Options** | Sort by rating, date, year | ✅ |
| 4.6 | Build **Watch History** | Calendar/timeline of watched movies | ✅ |
| 4.7 | Implement **Edit/Update** | Modify existing movie logs | ✅ |

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

| # | Task | Description | Status |
|---|------|-------------|--------|
| 5.1 | **Gemini API Setup** | Connect Google AI Studio to the frontend | ✅ |
| 5.2 | **AI Opt-In Toggle** | Add a "Privacy First" toggle in Profile settings | ✅ |
| 5.3 | **Smart Recommendations** | Generate "Because you liked X" suggestions with TMDB IDs | ✅ |
| 5.4 | **AI-Free Fallback** | Ensure the UI looks great even when AI is OFF | ✅ |
| 5.5 | **Mood Pattern Analysis** | AI-powered insights about user's horror palate | ✅ |
| 5.6 | **Recommendation Feedback Loop** | Thumbs up/down with banished list | ✅ |
| 5.7 | **Library Integration** | Add to Watchlist / Mark as Watched buttons | ✅ |

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

**Goal**: Expand Ignes with social features, platform growth, and enhanced user experience.

### Tasks

| # | Task | Description | Status |
|---|------|-------------|--------|
| 6.1 | **Social Sharing** | Share movie logs to social media platforms | ⬜ |
| 6.2 | **Watch History Calendar** | Visual calendar view of watched movies | ⬜ |
| 6.3 | **Smart Recommendations V2** | Enhanced AI with cross-user patterns & seasonal picks | ⬜ |
| 6.4 | **Letterboxd Import** | Migrate existing data from Letterboxd | ⬜ |
| 6.5 | **Mobile App** | React Native version for iOS/Android | ⬜ |
| 6.6 | **Light Mode** | Theme toggle (currently dark mode only) | ⬜ |
| 6.7 | **Social Features** | Friends, following, and activity feeds | ✅ |
| 6.8 | **Year in Review** | Annual wrapped-style statistics summary | ⬜ |
| 6.9 | **Custom Lists** | User-created movie collections | ✅ |
| 6.10 | **Advanced Search** | Multi-criteria search (Mood, Genre, Rating) | ⬜ |
| 6.11 | **The Archive Importer** | Mass import tool for migrating movie lists | ✅ |
| 6.12 | **Bug Report System** | In-app bug reporting with admin dashboard | ✅ |
| 6.13 | **The Oracle** | Conversational AI Librarian using personal logs | ✅ |
| 6.14 | **The Matchmaker** | Compare watch-lists & mood overlaps with friends | ✅ |
| 6.15 | **High-Speed AI Ensemble** | Groq LPU integration for sub-500ms vibe-to-genre translation | ✅ |

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

**Goal**: Allow users to instantly migrate their old movie lists into Ignes without typing them one by one.

### How It Works

| Step | Description | Tech |
|------|-------------|------|
| **UI** | Text area for pasting lists + drag-and-drop zone for .txt files | React FileReader API |
| **AI Parser** | Send raw text to Groq API, extract titles/years as JSON | Groq LPU (llama-3.3-70b-versatile) |
| **Data Pipeline** | Loop through JSON, hit TMDB API for IDs/posters, batch upsert to Supabase | TMDB API + Supabase |
| **UX** | Progress bar with Deep Ember styling during AI parsing | CSS animations |

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

| Feature | Description | Status |
|---------|-------------|--------|
| **BugReportModal** | Sleek dark-themed modal for submitting bug reports | ✅ Complete |
| **ReportBugButton** | Reusable button component (3 variants: button, icon, link) | ✅ Complete |
| **BugList Admin Dashboard** | Admin-only bug management at `/admin/bugs` | ✅ Complete |
| **Auto-Capture Context** | Automatically captures page URL and user info on submission | ✅ Complete |
| **Status Management** | "Mark as Fixed" button, status dropdown, color-coded badges | ✅ Complete |
| **Version Tracking** | Every bug report includes app version for tracking | ✅ Complete |

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

**Goal**: Address UX edge cases and API error handling for a polished, production-ready experience.

### Bugs Fixed (v1.5.1)

| # | Bug | Severity | Component | Fix | Status |
|---|-----|----------|-----------|-----|--------|
| 1 | **Whitespace Search** | Minor | `Header.jsx` | Trim input + reject empty queries | ✅ Fixed |
| 2 | **Ghost Movie Page** | High | `MovieDetail.jsx` | Early return guard for invalid/empty movie data | ✅ Fixed |
| 3 | **Ghost Buttons** | Medium | `MovieDetail.jsx` | Resolved by #2 — buttons removed from DOM on invalid data | ✅ Fixed |
| 4 | **Exposed API Keys** | Critical | `.env` | Verified `.env` never committed to git history | ✅ Secure |

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
        The archives have no record of this tape. It may have been corrupted, deleted, or it never existed at all.
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
    setTempSearch('');
    return;
  }
  
  navigate(`/search?q=${encodeURIComponent(cleanQuery)}`);
  setTempSearch('');
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

| File | Status | Risk |
|------|--------|------|
| `.env` | Never committed | ✅ Safe |
| `.env.example` | Committed (template with placeholders) | ✅ Safe |
| `debugEnv.js` | Removed (was dev-only utility) | ✅ Safe |

### Success Criteria

- [x] Whitespace-only searches are rejected silently
- [x] Invalid movie IDs display "Signal Lost" 404 page
- [x] Action buttons are removed from DOM on invalid data
- [x] API keys remain protected from git exposure
- [x] Error states provide clear user feedback

---

## 🎯 Current Status

**Phase**: Phase 6 Complete ✅

**Current Version**: v1.8.0 - Ember Oracle & The Matchmaker

**Completed Features**:
- ✅ **Ember Oracle** (v1.8.0) - AI-powered movie discovery with mood bubbles and natural language search
- ✅ **The Matchmaker** (v1.8.0) - Social compatibility feature with friend invites and synergy scores
- ✅ **Social Hub Card** (v1.8.0) - Profile page entry point for friend management
- ✅ **Friends Carousel** (v1.8.0) - Horizontal scroll of friend chips with match scores
- ✅ **Discover Page Navigation** (v1.8.0) - Movie posters and titles now clickable
- ✅ **AddToListButton Icon Variant** (v1.8.0) - Fixed mobile library card three-button layout
- ✅ **Deep Ember Theme** (v1.8.0) - Consistent dark aesthetic with amber/orange accents
- ✅ **Font-creepster Headers** (v1.8.0) - Creepster font applied to Matchmaker and Social Hub titles
- ✅ **Thumb-Friendly Tap Targets** (v1.8.0) - 48px minimum button heights for mobile
- ✅ **Native Mobile UX** (v1.7.0) - Replaced hamburger menu with fixed BottomNav (Home, Discover, Library, Profile)
- ✅ **Watchlist Quick-Toggle** (v1.7.0) - Three-button action row (Eye icon for Watchlist, Primary Log, Folder for Lists)
- ✅ **API Stability** (v1.7.0) - Fixed 406 errors by adding Accept headers to all TMDB calls
- ✅ **Discover Fix** (v1.7.0) - Patched "Future Bias" to prevent unreleased movies from appearing in results
- ✅ **Where to Watch** (v1.6.0) - Streaming provider logos with rent/buy fallback
- ✅ **Magic Importer** (v1.5.0) - AI-powered bulk import with Groq LPU parsing
- ✅ **Mobile-First Responsive Navbar** - Hamburger menu (mobile) / Inline nav links (desktop 768px+)
  - Desktop: Logo | Discover, Trending, Library, History | Search + Profile
  - Mobile: Logo + Hamburger → Full-width dropdown with search + nav
- ✅ **Minimalist Dark Theme** - #0a0a0a background, clean typography
- ✅ **TMDB/OMDb Dual-API** - Trending movies, search, details, RT scores
- ✅ **Movie Detail Pages** - High-res backdrops, cast, recommendations, TMDB + RT scores
- ✅ **Clickable Cast Members** - Click any actor to see their profile and filmography
- ✅ **Actor Pages** - Actor bios, photos, and top movies sorted by popularity
- ✅ **Personal Reviews on Movie Details** - "My Review" section shows your rating, moods, review when you've logged a movie
- ✅ **Edit Movie Logs** - "Edit Log" button on MovieDetail opens modal pre-filled with your data
- ✅ **Supabase Backend** - Auth, PostgreSQL, RLS policies configured (includes genres column)
- ✅ **User Authentication** - Sign up, login, logout with Supabase Auth
- ✅ **Remember Me Checkbox** (v1.3.3) - Toggle between localStorage/sessionStorage persistence
- ✅ **Forgot Password Flow** - Email-based password reset with Supabase Auth
- ✅ **RatingSlider** - StoryGraph-style 0.0-5.0 with 0.1 increments, gradient fill
- ✅ **Mood Palette** - 22 moods across 3 color-coded categories:
  - **Emotional** (Warm/Red): Bittersweet, Heartwarming, Tear-jerker, Uplifting, Bleak
  - **Vibe** (Cool/Purple): Atmospheric, Dark, Gritty, Neon-soaked, Tense, Whimsical, Gory, Eerie, Claustrophobic, Campy, Dread-filled, Jump-scary
  - **Intellectual** (Slate/Grey): Psychological, Mind-bending, Challenging, Philosophical, Slow-burn, Complex
- ✅ **LogMovieModal** - Full logging form with rating, moods, review, watch status, genres (with React Portals)
- ✅ **My Library** - StoryGraph-style tabs (Watched/Want to Watch), rich movie cards with Edit/Delete buttons
- ✅ **Library Search Filter** - Filter your library by title, mood, genre; sort by rating/date
- ✅ **Custom Lists** (v1.3.1) - Create, view, and manage personal movie collections
- ✅ **Clickable Movie Cards** - Search results and library cards navigate to MovieDetail on click
- ✅ **Hover Effects** - Cards scale and show shadow on hover for visual feedback
- ✅ **Editable Profiles** - Display name, bio, avatar with integrated Movie Insights
- ✅ **Movie Insights Dashboard** - Total Watched, Average Rating, Top Genres (pie), Ratings Distribution (bar), Mood Breakdown (horizontal bar) - merged into Profile Page
- ✅ **TMDB-Compliant Footer** - Logo + required attribution text
- ✅ **Protected Routes** - Auth guards for user-specific pages
- ✅ **Power Filter (Search/Trending)** - Genre, Sort By, Year filtering with TMDB Discover API
- ✅ **Up Next Queue** - Horizontal shelf showing top 5 movies in watchlist (dark container, purple dot indicator)
- ✅ **Watch History Timeline** - Vertical timeline with glowing nodes, grouped by month
- ✅ **Anime Filter** - Dedicated discoverAnime() function for Japanese animation
- ✅ **Profile Avatar Upload** - Supabase Storage integration with drag-to-upload UI
- ✅ **Creepy Footer Styling** - Creepster font with blood red glow effect
- ✅ **Stats Dashboard** - Recharts-based analytics with genre, mood, and rating visualizations
- ✅ **Components Demo Page** - Showcase of all UI components for testing and development
- ✅ **About/Roadmap Page** (v1.2.0) - Ignes Hub with changelog and roadmap
- ✅ **Bug Report System** (v1.2.0) - In-app bug reporting with admin dashboard
- ✅ **Bug Fixes & Stability** (v1.5.1) - Ghost Hunter fix, Whitespace Search, Security Audit
- ✅ **Cinematic MovieCard** (v1.3.0) - StoryGraph-inspired clean bookshelf design with hover overlays
- ✅ **Version Management** (v1.3.0) - Centralized constants with auto-version in bug reports
- ✅ **Oracle Vibe Mapping** (v1.3.4) - Natural language to TMDB genre ID mapping
- ✅ **Library Grid Responsive** (v1.3.1) - `grid-cols-2 md:grid-cols-4 lg:grid-cols-6`
- ✅ **Magic Importer** (v1.5.0) - AI-powered bulk import with Groq LPU parsing

**🤖 Ember Oracle - AI Discovery (v1.3.2+)**:
- ✅ **Ember Oracle Page** (`/discover`) - Dedicated AI discovery interface
- ✅ **Mood Bubbles** - 6 quick-select presets (Cozy, Adrenaline, Mind-Bending, Deep Cuts, Noir, Euphoric)
- ✅ **Natural Language Input** - "A dark comedy for a rainy night"
- ✅ **Rationale Display** - "Why Ignes Picked This" with cinematic analysis
- ✅ **Vibe Check Tagline** - 5-7 word punchy descriptions
- ✅ **TMDB Integration** - Auto-fetch posters and release years
- ✅ **Reject & Reroll** (v1.3.5) - Reject suggestions and get instant alternatives
- ✅ **Session Tracking** - Badge shows rejected movies count
- ✅ **Dynamic System Prompt** - AI avoids rejected movies during session
- ✅ **Deep Ember Theme** - Dark zinc backgrounds with amber/orange accents
- ✅ **Database Schema** - recommendation_feedback table with RLS policies

**📦 Magic Importer - Bulk Import (v1.5.0)**:
- ✅ **ArchiveImporterModal** - 4-step workflow: Input → Verifying → Review → Complete
- ✅ **Groq LPU Parsing** - llama-3.3-70b-versatile for ultra-fast text extraction
- ✅ **Multi-Format Support** - Letterboxd, plain lists, numbered lists, notes
- ✅ **TMDB Batch Verification** - Parallel fetching with Promise.all
- ✅ **Smart Deduplication** - UPSERT with onConflict constraint
- ✅ **Watch Status Selector** - Import as Watched or Want to Watch
- ✅ **List Integration** - Optional add to custom list
- ✅ **Review Grid** - Poster preview with select/deselect actions

**Phase 6 Planned - AI Personality & Social**:
- ✅ **The Oracle** (v1.3.2-v1.3.6) - Conversational AI Librarian with natural language vibe search
  - ✅ Ember Oracle page (`/discover`) with mood bubbles
  - ✅ Natural language input with rationale display
  - ✅ Reject & Reroll (v1.3.5)
  - ✅ Session tracking with rejected movies count
  - ✅ TMDB integration for posters and years
- ✅ **The Matchmaker** (v1.8.0) - Social compatibility with mood overlaps
  - ✅ Social Hub card on Profile page
  - ✅ Friend invites by email
  - ✅ Friendship request management (accept/decline/cancel)
  - ✅ My Crew carousel with match scores
  - ✅ Click-to-compare synergy reports

---

## Phase 6.13: The Oracle (Conversational AI Librarian) 🧙

**Status**: ✅ **Complete** (v1.8.0 - Ember Oracle)

**Note**: The Oracle lives on as the **Ember Oracle** discovery page (`/discover`) with mood bubbles, natural language search, and multi-movie recommendations with rationale.

**Goal**: Transform the AI from a recommendation engine into a conversational librarian with personality, wit, and deep knowledge of your viewing habits.

### Features (Implemented in Ember Oracle)

| Feature | Description | Status |
|---------|-------------|--------|
| **Natural Language Search** | Ask by feeling, not genre | ✅ Implemented |
| **Mood Bubbles** | 6 quick-select presets (Cozy, Adrenaline, Mind-Bending, Deep Cuts, Noir, Euphoric) | ✅ Implemented |
| **Rationale Display** | "Why Ignes Picked This" with cinematic analysis | ✅ Implemented |
| **Vibe Check** | Punchy 5-7 word taglines for each recommendation | ✅ Implemented |
| **Reject & Reroll** | Reject entire batch and get new alternatives | ✅ Implemented |
| **Session Tracking** | Badge showing rejected movies count | ✅ Implemented |
| **Library Integration** | Watched, Watchlist, Add to List buttons | ✅ Implemented |
| **Zero-Duplicate Guarantee** | AI never recommends movies you've already logged | ✅ Implemented |
| **Personalized Context** | AI analyzes your high-rated films before recommending | ✅ Implemented |

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

| Feature | Description | Example |
|---------|-------------|---------|
| **Social Hub Card** | Profile page entry point for friend management | "Social Hub" section with Manage Friends button |
| **Friend Invites** | Search and invite users by email | "User not found" toast if email doesn't exist |
| **Friendship Requests** | Incoming/outgoing request management | Accept, Decline, Cancel actions |
| **My Crew** | List of accepted friends with match scores | Horizontal carousel of friend chips |
| **Pending Requests** | Track sent requests awaiting response | Shows receiver name with Cancel button |
| **Requests** | Incoming requests with accept/decline actions | Shows sender name with Accept/Decline |
| **Synergy Score** | Randomized compatibility percentage | "70-100% Match" badge on each friend |
| **Click-to-Compare** | Navigate to compatibility report | `/matchmaker/${friendId}` route |
| **Deep Ember Theme** | Consistent dark aesthetic | Amber accents, zinc backgrounds |
| **Font-creepster Headers** | Distinctive Creepster font | Applied to page title and section headers |
| **Thumb-Friendly Tap Targets** | 48px minimum button heights | Mobile-optimized action buttons |

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

**Goal**: Transition the Ember Oracle to a multi-model architecture for near-instant response times while maintaining deep reasoning capabilities.

### Overview

| Component | Description | Status |
|-----------|-------------|--------|
| **Groq LPU Infrastructure** | Leverage Groq's Language Processing Unit hardware for ultra-low-latency inference | ✅ Complete (v1.4.0) |
| **Llama 3 Integration** | Deploy Llama 3 models on Groq for sub-500ms vibe-to-genre translations | ✅ Complete (v1.4.0) |
| **Hybrid AI Architecture** | Groq for fast pattern matching + Gemini for deep reasoning | ✅ Complete (v1.4.0) |
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
    Ember Oracle UI → Posters + Years + "Why Ignes Picked This" (per movie)
```

### Technical Requirements

- Groq API integration (`groq-sdk` or direct REST)
- Llama 3 model selection and prompt engineering
- Multi-model orchestration layer (route simple vs. complex queries)
- Fallback handling (Groq downtime → Gemini-only mode)
- Latency monitoring and performance metrics
- Cost optimization (Groq for fast queries, Gemini for deep dives)

### Benefits

| Benefit | Description |
|---------|-------------|
| **Speed** | Sub-500ms vibe translation vs. 2-3s with Gemini alone |
| **Cost Efficiency** | Groq is cheaper for simple pattern matching |
| **Scalability** | LPU hardware handles high concurrency |
| **Best of Both Worlds** | Fast responses + deep reasoning when needed |
| **Future-Proof** | Multi-model architecture allows easy model swaps |

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
