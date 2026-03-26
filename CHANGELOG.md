# 📝 Changelog

All notable changes to Ignes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Latest Version: 1.3.12 (March 26, 2026)

**Highlights:**
- 🔍 Mobile search moved to header (no longer in hamburger menu)
- 🧭 Search icon toggles full-width input on mobile
- ⌨️ Form submit only - no navigation on keystroke
- 🤖 Ember Oracle library integration (Watched, Watchlist, Add to List buttons)
- 🏠 IGNES logo now acts as home button
- 🔒 OMDb API fixed - HTTPS to prevent Mixed Content errors
- 📋 ROADMAP.md updated - Task consistency fixes, added Data Validation task
- 🎯 DiscoveryPage textarea uses controlled input pattern
- 🚀 Dev server runs on port 3000

**Quick Links:**
- [Full v1.3.12 Notes](#1312---march-26-2026)
- [v1.3.11 Notes](#1311---march-26-2026)
- [Roadmap](./ROADMAP.md)
- [README](./README.md)

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

#### IGNES Logo Home Button
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

#### Ember Oracle Library Integration
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
- 🔧 Logo text "IGNES" now visible on all screen sizes
- 📝 Changelog page with dedicated route (/changelog)
- 🤖 Ember Oracle with Reject & Reroll feature
- 🔐 Remember Me checkbox with dynamic storage
- 📱 Responsive library grid (`grid-cols-2 md:grid-cols-4 lg:grid-cols-6`)
- 🎯 Oracle vibe mapping fixed - "Brain Mush" now works

**Quick Links:**
- [Full v1.3.8 Notes](#138---march-24-2026)
- [Ember Oracle v1.3.2](#132---march-24-2026)
- [Roadmap](./ROADMAP.md)
- [README](./README.md)

---

## [1.3.8] - March 24, 2026

### 🐛 Fixed

#### Logo Text Visibility
- **IGNES Text Now Visible on Mobile** - Removed `hidden sm:inline` class
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
- **Navigation** - "Back to Ignes Hub" and "Back to Home" links
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

#### Ember Oracle - AI Discovery Engine
- **Mood Bubbles** - 6 quick-select presets (Cozy, Adrenaline, Mind-Bending, Deep Cuts, Noir, Euphoric)
- **Custom Prompt Input** - Natural language vibe description
- **AI System Prompt** - Elite film historian persona that prioritizes deep cuts over mainstream picks
- **Rationale Display** - "Why Ignes Picked This" section with specific cinematic analysis
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
- `src/pages/DiscoveryPage.jsx` - Main Ember Oracle component
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
- **Footer Version Display** - Dynamic "Ignes v{VERSION}" badge
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
- **Ignes Hub** - Central information hub with About, Changelog, and Roadmap
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
- **IgnesLogo** - Custom film frame + bar chart logo

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
