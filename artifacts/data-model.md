# Filmgraph Data Model

> Schema reference for grounding NotebookLM on Supabase tables, columns, RLS, and key indexes. Use this when asking "where is X stored?" or "why is this query failing?".

## Tables at a glance

| Table | Purpose | Key columns of interest |
| --- | --- | --- |
| `profiles` | User identity, display, preferences | `username`, `user_providers` |
| `movie_logs` | Per-user movie entries (watched + watchlist) | `tmdb_id`, `watch_status`, `source_upc` |
| `lists` | User-created movie collections | `user_id`, name |
| `list_items` | Movies inside a list | `tmdb_id`, `added_by` |
| `list_members` | Collaborator membership for shared lists | `role` (`owner`/`editor`/`viewer`) |
| `oracle_provider_events` | Oracle telemetry / provider analytics | `provider`, `selected_provider_ids`, `success` |
| `bug_reports` | In-app bug submissions | reporter, message |
| `recommendation_feedback` | User feedback on AI picks | rating signals |
| `friendships` | Social graph (used by friend visibility) | requester / recipient / status |

Constants in `src/constants.js` mirror these table names under `SUPABASE_TABLES`.

---

## `profiles`

User profile row. Created on signup, augmented by username + provider preferences.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK; matches `auth.users.id` |
| `email` | text | Mirrors auth email |
| `username` | text NOT NULL | Lowercased, format `^[a-z0-9_]{3,24}$`, case-insensitive unique |
| `display_name` | text | Editable label |
| `bio` | text | Free-form |
| `avatar_url` | text | Avatar storage URL |
| `user_providers` | jsonb NOT NULL DEFAULT `[]` | Array of TMDb provider IDs the user subscribes to. `CHECK jsonb_typeof = 'array'`. |

**Helper RPC**: `is_username_available(p_username, p_exclude_user_id)` — boolean check; security definer, granted to `authenticated`.

**Migrations**:
- `20260415143000_username_foundation.sql`
- `20260427103000_profile_provider_preferences.sql`

---

## `movie_logs`

Source of truth for the user's entire library + collection.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `tmdb_id` | integer | TMDb movie id |
| `title`, `poster_path`, `release_year` | text/int | Cached metadata |
| `rating` | numeric | 0.0–5.0, 0.1 increments |
| `moods` | text[] / jsonb | 22 possible moods across 3 categories |
| `review` | text | User review |
| `watch_status` | text | `'watched'` or `'to-watch'` (see `WATCH_STATUS`) |
| `watched_at` | timestamptz | Day for History/Calendar |
| `source_upc` | text | UPC code if logged via barcode scan |
| `created_at` / `updated_at` | timestamptz | Standard timestamps |

**Indexes / constraints**:
- Partial unique index on `(user_id, source_upc)` where `source_upc IS NOT NULL AND source_upc <> ''` — enforces anti-double-buy at DB level.

**Migrations**:
- `20260415173000_movie_logs_upc_integrity.sql` (UPC column + unique index)

**Common queries**:
- Library Watched tab → `watch_status = 'watched'`.
- Library Watchlist tab → `watch_status = 'to-watch'`.
- Library Collection tab → `source_upc IS NOT NULL`.
- Profile "Physical Owned" stat → count where `source_upc IS NOT NULL`.
- History calendar → group by `watched_at::date`.

---

## `lists` + `list_items` + `list_members`

Collaborative custom lists. RLS is **membership-driven** — any access goes through `list_members`.

### `lists`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | Original creator (still used for ownership shortcuts) |
| `name`, `description` | text | List metadata |

### `list_items`
| Column | Type | Notes |
| --- | --- | --- |
| `list_id` | uuid | FK → `lists.id` |
| `tmdb_id` | integer | Movie reference |
| `added_by` | uuid | Who added the row (collaborative attribution); falls back to NULL on missing column in older envs |

Unique index `list_items_list_id_tmdb_id_uidx` on `(list_id, tmdb_id)` — one movie per list.

### `list_members`
| Column | Type | Notes |
| --- | --- | --- |
| `list_id` | uuid | FK → `lists.id` |
| `user_id` | uuid | FK → `auth.users.id` |
| `role` | text | `'owner'` / `'editor'` / `'viewer'` |
| `joined_at` | timestamptz | Optional column; some older envs don't have it. Adapter falls back gracefully. |

**RLS summary** (from `20260414120000_phase_6_17_shared_lists.sql`):
- All access (`SELECT/INSERT/UPDATE/DELETE`) on `lists` and `list_items` is gated by membership in `list_members`.
- `list_members` itself is readable to peers and writable by owners (with a self-insert exception for the original list creator becoming `owner`).

---

## `oracle_provider_events`

Telemetry for every Oracle invocation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `provider` | text | `gemini`, `groq`, `openrouter`, `tmdb` |
| `model_used` | text | Specific model id |
| `groq_used` | boolean | True if Groq was part of the chain |
| `latency_ms` | integer | End-to-end latency |
| `success` | boolean | Whether the chain produced usable recommendations |
| `fallback_reason` | text | Why a fallback fired (if any) |
| `error_code` / `error_message` | text | Diagnostic detail |
| `budget_source` | text | Daily budget identifier |
| `request_source` | text | Where the call originated (UI surface) |
| `prompt_type` | text | Vibe / mood preset / NL query type |
| `recommendation_count` | integer | How many movies returned |
| `tmdb_hit_count` / `tmdb_hit_rate` | int / numeric(5,4) | TMDb verification quality |
| `selected_provider_ids` | jsonb DEFAULT `[]` | Streaming providers user filtered on |
| `provider_filtered_out_count` | integer | Recs dropped by provider filter |
| `provider_match_count` | integer | Recs that matched provider filter |
| `created_at` | timestamptz | UTC default |

**Indexes**:
- `(user_id, created_at DESC)` for per-user timelines.
- `(provider, created_at DESC)` for fleet-wide provider trends.

**RLS**:
- Insert allowed when `auth.uid() = user_id`.
- Select restricted to admin email (`sonofloke@gmail.com`).

**Migrations**:
- `20260416103000_oracle_provider_events.sql` (table + RLS)
- `20260427103500_oracle_provider_filter_metrics.sql` (provider filter columns)

---

## `friendships`

Used to gate friend-only visibility (e.g. friend activity surfaces).

| Column | Type | Notes |
| --- | --- | --- |
| `requester_id` | uuid | FK → `auth.users.id` |
| `recipient_id` | uuid | FK → `auth.users.id` |
| `status` | text | `pending` / `accepted` / `blocked` |
| `created_at` / `updated_at` | timestamptz | Standard timestamps |

---

## RLS principles (project-wide)

- Every user-owned table enables RLS.
- Default policy shape: `auth.uid() = user_id` for personal data.
- Membership-based policies (lists) read access through a join on `list_members`.
- Admin-only telemetry tables gate `SELECT` to a hardcoded admin email via `auth.jwt()`.

## Naming + adapter conventions

- Table names live in `src/constants.js → SUPABASE_TABLES`.
- API adapters live in `src/api/*.js` and **must** fail soft when an optional column is missing (see `joined_at`/`added_by` fallback pattern in shared list adapters).
- New columns should always ship with `IF NOT EXISTS` in migrations to keep older envs forward-compatible.

## Migration index (chronological)

| Date | Migration | Adds |
| --- | --- | --- |
| 2026-04-14 | `20260414120000_phase_6_17_shared_lists.sql` | `list_members`, RLS, `list_items.added_by` |
| 2026-04-15 | `20260415143000_username_foundation.sql` | `profiles.username` + RPC |
| 2026-04-15 | `20260415170000_oracle_daily_budget.sql` | Oracle daily budget controls |
| 2026-04-15 | `20260415173000_movie_logs_upc_integrity.sql` | `movie_logs.source_upc` + unique index |
| 2026-04-16 | `20260416103000_oracle_provider_events.sql` | Oracle analytics table |
| 2026-04-27 | `20260427103000_profile_provider_preferences.sql` | `profiles.user_providers` (jsonb) |
| 2026-04-27 | `20260427103500_oracle_provider_filter_metrics.sql` | Provider filter metric columns |
