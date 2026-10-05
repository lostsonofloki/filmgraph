# 🎬 Filmgraph

**Your Personal Movie Logging & AI Discovery Platform**

Filmgraph is a React-based web application that lets you log, track, and visualize your movie-watching journey. Unlike traditional platforms like Letterboxd, Filmgraph focuses on emotional tracking, AI-powered discovery, and deep cinematic insights with the **Oracle** — your personal film curator.

---

## ✨ Features

### Core Functionality
- **Trending Movies**: Browse trending movies from TMDB with beautiful backdrop images
- **Movie Search**: Search for any movie using TMDB API with global header search bar
- **Movie Details**: View detailed information with high-res backdrops, cast, and recommendations
- **📺 Where to Watch**: See streaming providers for any movie (Netflix, Hulu, Prime, etc.)
  - Provider logos displayed with hover tooltips
  - Shows free streaming, rental, and purchase options
  - US region support with smart deduplication
- **Rotten Tomatoes Scores**: See critic scores fetched from OMDb API
- **Personal Reviews**: Log movies with ratings, moods, reviews, and watch status
- **My Library**: StoryGraph-style library with Watched/Want to Watch tabs and rich movie cards
- **Custom Lists**: Create and manage personalized movie collections
- **✨ Magic Importer**: Bulk import entire movie lists from Letterboxd, notes, or any text format
  - AI-powered parsing with Groq LPU extracts titles and years automatically
  - TMDB verification fetches official posters and metadata
  - Smart deduplication skips movies you've already logged
  - Optional list integration adds imported movies to custom collections
- **Edit Reviews**: Click "Edit Log" to update your existing movie reviews
- **Mood Palette**: Tag movies with 22 moods across 3 categories (Emotional, Vibe, Intellectual)
- **Precision Rating Slider**: StoryGraph-style 0.0-5.0 rating with 0.1 increments
- **Clickable Movie Cards**: Click any movie card to view full details
- **Clickable Cast Members**: Click any actor to see their profile and filmography
- **Actor Pages**: Actor bios, photos, and top movies sorted by popularity
- **Stats Dashboard**: Visualize your watching habits with Top Genres, Mood Breakdown, and Ratings Distribution charts

### 🤖 AI Features (Oracle)
- **Oracle v2.1**: Multi-movie AI discovery with natural language vibe search
- **Multi-Movie Recommendations**: Returns 3-5 curated films per query (cult classics + deep cuts)
- **Hybrid AI Orchestration**: Groq LPU for fast genre extraction + Gemini for deep reasoning
- **Sub-500ms Genre Parsing**: Ultra-fast vibe-to-genre translation via Groq's LPU hardware
- **Personalized Oracle**: AI knows your entire library (watched + watchlist + custom lists)
- **Zero-Duplicate Guarantee**: All known movies banned from recommendations automatically
- **Taste Triangulation**: AI analyzes your high-rated films before suggesting new discoveries
- **Mood Bubbles**: 6 quick-select presets (Cozy, Adrenaline, Mind-Bending, Deep Cuts, Noir, Euphoric)
- **Reject & Reroll**: Reject entire batch and get instant alternative recommendations
- **Deep Cut Recommendations**: AI prioritizes obscure gems over mainstream blockbusters
- **Rationale Display**: "Why Filmgraph Picked This" with specific cinematic analysis for each film
- **Vibe Check Tagline**: 5-7 word punchy essence descriptions per movie
- **Session Tracking**: Tracks rejected movies to avoid repeat suggestions
- **Concurrent Data Fetching**: All movie posters/data load in parallel for faster UX
- **Streaming-Aware Discovery**: Optional provider preference filtering prioritizes titles on services you actually have
- **Watch Now Deep Links**: Provider availability and direct watch links surfaced from TMDb watch-provider data
- **Optional API Enrichment Flags**: Editorial (NYT/Wikipedia), Visual (Fanart.tv), and Tracking (Trakt) enrichments can be toggled independently and fail-soft.

### Advanced Features
- **Mobile-First Responsive Navbar**: Hamburger menu (mobile) / Inline nav links (desktop 768px+)
  - **Desktop View**: Logo | Discover, Trending, Library, History | Search + Profile
  - **Mobile View**: Logo + Hamburger → Full-width dropdown with search + nav
- **Watch History Timeline**: Vertical timeline of watched movies grouped by month
- **Up Next Queue**: Maintain a curated shelf of your next 5 movies to watch
- **User Authentication**: Secure login/signup with Supabase Auth
- **Remember Me**: Toggle between persistent (localStorage) and session-only (sessionStorage) login
- **Forgot Password Flow**: Email-based password reset with Supabase Auth
- **Editable Profiles**: Customizable display names and bios with avatar upload
- **Streaming Service Preferences**: Profile-level provider selection to guide Oracle recommendation filtering
- **Row Level Security**: Secure data policies protecting user movie logs

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18+, React Router, Vite |
| **Styling** | CSS Grid, Flexbox, Custom Components |
| **External APIs** | TMDB (movie data, recommendations), OMDb (Rotten Tomatoes scores), NYT Top Stories, Fanart.tv, Trakt |
| **Backend/Database** | Supabase (Auth, PostgreSQL, RLS) |
| **AI Integration** | Google Gemini API + Groq LPU (hybrid orchestration for multi-movie recommendations) |
| **Visualization** | Recharts (charts and graphs) |

---

## 📁 Project Structure

```
Filmgraph/
├── src/
│   ├── components/
│   │   ├── GlobalSearch.jsx     # Global search bar in header
│   │   ├── FilmgraphLogo.jsx        # Filmgraph flame logo component
│   │   ├── Logo.jsx             # Legacy logo component
│   │   ├── Footer.jsx           # App footer with TMDB/OMDb attributions
│   │   ├── MovieCard.jsx        # Movie card with poster, title, RT score
│   │   ├── RatingSlider.jsx     # StoryGraph-style precision rating slider (0.0-5.0)
│   │   ├── MoodChip.jsx         # Categorized mood selector (Emotional/Vibe/Intellectual)
│   │   ├── LogMovieModal.jsx    # Modal for logging movies with full form
│   │   ├── ProtectedRoute.jsx   # Auth guard for protected pages
│   │   ├── SearchBar.jsx        # Movie search input with loading state
│   │   ├── SearchResults.jsx    # Grid of movie search results
│   │   ├── StarRating.jsx       # Clickable star rating component
│   │   ├── QuickLaunchButton.jsx # Windows quick launch button
│   │   └── *.css                # Component styles
│   ├── pages/
│   │   ├── TrendingMovies.jsx   # Trending movies backdrop grid (Home)
│   │   ├── SearchPage.jsx       # TMDB search functionality with Power Filter
│   │   ├── MovieDetail.jsx      # Movie details with backdrop & recommendations
│   │   ├── ActorPage.jsx        # Actor bio and filmography page
│   │   ├── LoginPage.jsx        # User login form
│   │   ├── RegisterPage.jsx     # User signup form
│   │   ├── LibraryPage.jsx      # User library with tabs (Watched/Want to Watch)
│   │   ├── ProfilePage.jsx      # Editable user profile with AI Discovery
│   │   ├── WatchHistory.jsx     # Timeline of watched movies grouped by month
│   │   ├── StatsDashboard.jsx   # Analytics dashboard with charts
│   │   ├── ComponentsDemo.jsx   # Component showcase page
│   │   ├── SupabaseDemo.jsx     # Supabase connection demo
│   │   └── *.css                # Page styles
│   ├── context/
│   │   └── UserContext.jsx      # User authentication state (Supabase Auth)
│   ├── api/
│   │   ├── tmdb.js              # TMDB API (trending, details, recommendations, discover)
│   │   └── omdb.js              # OMDb API (Rotten Tomatoes scores)
│   ├── utils/
│   │   └── gemini.js            # Gemini AI integration for recommendations
│   ├── assets/                  # Static assets and images
│   ├── supabaseClient.js        # Supabase client initialization
│   ├── App.jsx                  # Main app with routing
│   ├── App.css                  # Global styles
│   └── index.jsx                # Entry point
├── resources/                   # TMDB attribution logos
├── public/
├── index.html
├── package.json
├── vite.config.js
├── .env                         # Environment variables (TMDB, Supabase, Gemini keys)
├── .env.example                 # Environment variables template
├── launch.bat                   # Quick launch script for Windows
├── ROADMAP.md                   # Development roadmap
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- TMDB API Key ([Get it free](https://www.themoviedb.org/settings/api))
- OMDb API Key ([Get it free](http://www.omdbapi.com/apikey.aspx)) - Already configured
- Gemini API Key ([Get it free](https://aistudio.google.com/app/apikey)) - For AI features
- Groq API Key ([Get it free](https://console.groq.com/keys)) - For fast genre extraction
- OpenRouter API Key ([Get it](https://openrouter.ai/keys)) - Emergency AI fallback

### Installation

```bash
# Clone the repository
cd Filmgraph

# Install dependencies
npm install

# Create .env file with your API keys
cp .env.example .env

# Edit .env and add your API keys:
# VITE_TMDB_API_KEY=your_actual_tmdb_api_key
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# VITE_GEMINI_API_KEY=your_gemini_api_key
# VITE_GROQ_API_KEY=your_groq_api_key
# VITE_OPENROUTER_API_KEY=your_openrouter_api_key

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quick Launch (Windows)
Double-click `launch.bat` to start the dev server and open the app automatically.

### Daily Vercel Error Investigation

A scheduled GitHub Action is available at `.github/workflows/vercel-error-investigation.yml` to investigate recurring deployment/runtime failures every day.

- Schedule: daily at `12:00 UTC` (07:00 CDT during DST)
- Script: `scripts/investigate-vercel-errors.mjs`
- Output: workflow summary + `vercel-error-report` artifact

Set these repository secrets before enabling the workflow:

- `VERCEL_TOKEN` (required)
- `VERCEL_PROJECT_ID` (optional, defaults to local `.vercel/project.json` value)
- `VERCEL_TEAM_ID` (optional, defaults to local `.vercel/project.json` value)

If `VERCEL_TOKEN` is missing, the workflow exits gracefully and publishes a setup-needed report instead of failing the entire job.

### Supabase Keep-Alive (Free Plan Anti-Pausing)

Supabase pauses Free plan projects that do not get enough **database** activity over about
7 days. Their own guidance is that a few user requests to the database each day is what
keeps a project off the pause list. A paused project takes the whole app down until someone
restores it by hand.

Two independent schedulers each run three times a day. Every run performs three cheap
PostgREST reads (one row, one column), so a single healthy scheduler is already several
queries per day:

| Trigger | Where | Schedule (UTC) |
| --- | --- | --- |
| Vercel Cron | `api/supabase-keepalive.js` | `01:00`, `09:00`, `17:00` (Hobby fires sometime in that hour) |
| GitHub Actions | `.github/workflows/supabase-keepalive.yml` | `05:15`, `13:15`, `21:15` |

Hobby accounts can only register cron expressions that run once per day, which is why the
Vercel side is three separate daily entries instead of one `0 1,9,17 * * *` expression.
GitHub Actions is the second trigger because GitHub disables scheduled workflows after 60
days of repository inactivity, while Vercel Cron is tied to the deployment.

Only a query that reaches Postgres counts. `/auth/v1/health` returns 200 without touching
the database, and a PostgREST `PGRST205` (missing table) is answered from the schema cache
the same way. The ping is a real table read. It tries `keepalive_heartbeat`, then
`upc_cache`, then `profiles`, and repeats the first table that answers.

**Set `CRON_SECRET` in Vercel before this route is deployed.** Vercel sends it as
`Authorization: Bearer ...` on cron invocations. The route returns 503 and does not query
the database when the secret is missing, and 401 for any other caller. Redeploy after
adding or changing the variable so the function picks it up. The database URL and anon key
are the existing `SUPABASE_URL` / `VITE_SUPABASE_URL` and `SUPABASE_ANON_KEY` /
`VITE_SUPABASE_ANON_KEY` values.

The GitHub Actions job prefers its own `SUPABASE_URL` and `SUPABASE_ANON_KEY` repository
secrets and queries PostgREST directly. If those are unset but `CRON_SECRET` is set to the
same value as Vercel, the job calls `https://filmgraph.app/api/supabase-keepalive` instead.
If neither pair is set, the job **fails**. A green run that never touched Postgres is how
the previous daily schedule missed the pause warning.

Optionally set `SUPABASE_SERVICE_ROLE_KEY` to also record each ping's timestamp once the
`keepalive_heartbeat` migration is applied. That write is bookkeeping; the reads are what
count as activity.

Applying the migration is recommended but not required: production does not have
`keepalive_heartbeat` yet, and the ping already falls back to `upc_cache`. Prefer the
dedicated table so the keep-alive does not depend on another table's RLS staying as it is.

Run it by hand at any time:

```bash
npm run supabase:keepalive
```

Anything that cannot reach the database exits non-zero, including missing credentials.
The reported status says what to do:

| Status | Meaning |
| --- | --- |
| `alive` | The requested reads reached Postgres. |
| `host-unresolved` | The hostname does not resolve. **This is what a paused project looks like** — pausing removes the DNS record. Otherwise a typo in `SUPABASE_URL`. |
| `paused` | The edge returned 540/544, seen while a project is transitioning. |
| `no-ping-target` | Connected, but no candidate table exists. `PGRST205` is answered from PostgREST's schema cache without touching Postgres, so this does **not** reset the inactivity window. |
| `unreachable` / `timed-out` | Network or budget failure. |
| `not-configured` | Secrets absent. The route returns 503 and the script exits non-zero. |
| `partial` | At least one read reached Postgres, but not the requested count. Exits non-zero. |

Two quirks worth knowing, both observed on a freshly restored project: for roughly the first
minute PostgREST returns `PGRST002` ("could not query the database for the schema cache")
and then briefly reports *every* table as `PGRST205`, as though the whole schema were empty.
Both are transient, so the ping retries them rather than failing over or giving up.

> **The only guaranteed fix is the Pro plan.** Paid projects are never auto-paused. The
> keep-alive removes the practical problem on the Free plan but depends on schedulers that
> can be disabled, throttled, or delayed.

---

## 📋 Development Roadmap

See [ROADMAP.md](./ROADMAP.md) for the detailed development plan.

### Current Status: Phase 6 In Progress 🚀

**Phase 5: AI Integration** is complete with:
- ✅ Gemini AI-powered recommendations
- ✅ Privacy-first opt-in toggle
- ✅ Banished list (never suggest rejected movies again)
- ✅ Library integration (Add to Watchlist / Mark as Watched)
- ✅ TMDB verification for all AI suggestions

**Phase 6: Oracle & Social** is underway:
- ✅ **Oracle** (v1.3.2) - Conversational AI with natural language vibe search
- ✅ **Mood Bubbles** - 6 quick-select presets for instant discovery
- ✅ **Reject & Reroll** (v1.3.5) - Reject suggestions and get alternatives
- ✅ **Custom Lists** (v1.3.1) - User-created movie collections
- ✅ **Remember Me** (v1.3.3) - Dynamic storage persistence toggle
- ✅ **Magic Importer** (v1.5.0) - AI-powered bulk import for movie lists
- ⬜ **The Matchmaker** - Social compatibility with mood overlaps
- ⬜ **Social Sharing** - Share movie logs to social media

---

## 📄 License

**All Rights Reserved.**

This project is proprietary software. You may not use, copy, modify, distribute, or create derivative works from this software without explicit permission from the author.

For licensing inquiries or permission requests, please contact the project author.

---

## 🙏 Acknowledgments

- Movie data provided by [The Movie Database (TMDB)](https://www.themoviedb.org/)
- Rotten Tomatoes scores via [OMDb API](http://www.omdbapi.com/)
- AI recommendations powered by [Google Gemini API](https://aistudio.google.com/)
- Inspired by Letterboxd and StoryGraph

---

## 🔥 Brand Assets

### Filmgraph Logo
The Filmgraph logo features a flame symbol with a geometric 'I' cutout, representing the spark of discovery in your film journey.

**Colors:**
- Deep Ember Burgundy: `#991b1b` (primary)
- Amethyst: `#7e22ce` (accent)
- Dark Background: `#0a0a0a`

**Usage:**
```jsx
import FilmgraphLogo from './components/FilmgraphLogo';

// Header logo (with text)
<FilmgraphLogo size={40} showText={true} />

// Just the flame symbol
<FilmgraphLogo size={40} showText={false} />
```
