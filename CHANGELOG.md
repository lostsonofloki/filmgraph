# 📝 Changelog

All notable changes to Ignes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-03-24

### 🎉 Added

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
