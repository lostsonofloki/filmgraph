# Supabase migration notes

Six new files in `supabase/migrations/`. Paste each into the Supabase SQL editor
**in the order below** and run it whole — each file is one `BEGIN … COMMIT`, so a
failure rolls the whole file back and leaves nothing half applied.

Every file is safe to run twice. None of them drop or truncate user data. The one
exception, called out in step 6, deletes duplicate rows from `ai_cache`, which is a
derived cache of AI suggestions, not user content.

> **Deploy the app code first, then run the SQL.** The new front-end no longer asks
> for `profiles.email` anywhere, so it works against the old and the new database.
> The old front-end does not: step 1 makes `email` unreadable, and the shipped bundle
> still selects it when it renders list collaborators. If you run the SQL first,
> anyone on a cached bundle sees the Library list shelf and member chips fail until
> they reload. The email exposure stays live until step 1 runs, so run it right after
> the deploy, not next week.

---

## Before you start

Save the current policies so you can put them back. Run this and keep the output:

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'friendships', 'movie_logs',
    'lists', 'list_members', 'list_items',
    'upc_cache', 'ai_cache'
  )
ORDER BY tablename, cmd, policyname;
```

Also save the current grants on `profiles`:

```sql
SELECT grantee, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'profiles'
UNION ALL
SELECT grantee, privilege_type, '(whole table)'
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY grantee, privilege_type;
```

Steps 1, 3 and 4 **replace the entire policy set** on the tables they touch. That is
deliberate: the live policies have drifted from this repo, RLS policies are OR'd
together, so one forgotten permissive policy would undo the fix. If you had a custom
policy on any of those tables that is not described here, it is gone after these runs
and you will need to re-add it from the output above.

---

## 1. `20260926090000_profiles_email_privacy.sql`

**Riskiest step after step 3. Users will notice nothing if it goes right.**

**What it does**

- Adds `lookup_profile_identity(text)`, a `SECURITY DEFINER` function that takes an
  email **or** a username and returns only `id, username, display_name, avatar_url`.
  Granted to `authenticated` only.
- Adds an index on `lower(email)` so that lookup is not a table scan.
- Replaces every policy on `profiles` with: read for any signed-in user, insert and
  update only your own row, nothing for `anon`.
- Revokes table-level `SELECT`/`INSERT`/`UPDATE` on `profiles` and re-grants them
  column by column for every column **except `email`**.

**Why the column grants.** RLS is row-level; it cannot hide one column. Other users
still have to read `username`, `display_name` and `avatar_url` — friend cards, list
member chips and the joined reads on the Matchmaker page all need them, and those
joins cannot be pointed at a view without breaking the relationship PostgREST infers
from the foreign key. Column privileges are the only tool that hides a single column,
so that is what is used.

**What still works**

- Reading your own profile (everything except `email`).
- Reading other users' `username`, `display_name`, `avatar_url`.
- Updating your own profile: display name, username, bio, avatar, provider prefs.
- Invite by email or username, now via the RPC.
- Invite by user id, still a direct read (it never involved `email`).

**What changes**

- `email` is unreadable through the API for everybody, including yourself. The app
  never used it; your own address comes from the auth session.
- `email` is no longer writable by a user either, which also closes a squat: setting
  your own row's email to someone else's address would have intercepted invites sent
  to it.
- `anon` cannot read `profiles` at all. The keep-alive job is unaffected — it pings
  `keepalive_heartbeat` first and only falls back to `profiles` if that and
  `upc_cache` are both unreadable.
- **`SELECT *` on `profiles` now fails.** Nothing in the app does it. If you add a
  column to `profiles` later, re-run the last `DO` block in this file or the new
  column will be unreadable.

**Verify**

```sql
-- expect: email absent, everything else present
SELECT grantee, column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND grantee = 'authenticated' AND privilege_type = 'SELECT'
ORDER BY column_name;
```

Then, from a terminal with your anon key — expect `401`/permission denied, not rows:

```
curl -s -o /dev/null -w '%{http_code}\n' \
  "$SUPABASE_URL/rest/v1/profiles?select=id,email&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

In the app: open Library, confirm collaborator names and avatars still render, then
invite someone by email and by username.

**Roll back**

```sql
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);
```

That reopens the hole, so treat it as an emergency measure only.

---

## 2. `20260926091000_profiles_signup_trigger.sql`

**What it does**

- Adds `on_auth_user_created` on `auth.users`, which creates the `profiles` row from
  `raw_user_meta_data` (`username`, `display_name`). A taken username is suffixed
  (`newbie_1`) rather than failing.
- Adds `on_auth_user_email_changed`, which keeps `profiles.email` in step with an
  address change in auth so invite-by-email keeps finding the person.
- Backfills a profile row for any existing `auth.users` row that has none.

**Why.** Sign-up with email confirmation returns a user but no session, so the old
browser-side `upsert` ran as `anon`. Either it failed — leaving an auth account with
no profile row, which nothing can repair because `username` is `NOT NULL` — or it
succeeded, which would have meant anonymous writes to `profiles` were allowed.

**User-visible change.** A username collision now shows as a normal error before the
account exists, and nobody can get stuck with an account and no profile. The
"check your email to confirm" copy is unchanged.

**Verify**

```sql
-- expect two rows
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;

-- expect 0
SELECT count(*) FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

Then register a throwaway account and confirm a `profiles` row appears with the
username you typed.

**Roll back**

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
```

Backfilled rows can stay; they are the rows those accounts should always have had.

---

## 3. `20260926092000_friendship_and_log_privacy.sql`

**This is the riskiest file. It replaces every policy on `movie_logs`, the core
table.** Nothing is deleted, but if the new policy set were wrong, users would see an
empty Library. It has been tested on a rebuilt copy of this schema; read the verify
step before you move on.

**What it does**

- Adds `users_are_friends(uuid, uuid)`.
- Adds `get_friend_movie_logs(uuid)`, which checks the friendship itself and returns
  `tmdb_id, title, poster_path, rating, genres, watch_status` as JSON.
- Replaces the `friendships` policies: read and delete for either party, insert only
  as the sender, **update only by the receiver**.
- Replaces the `movie_logs` policies with owner-only for all four commands.

**Why.** `acceptRequest` updated by id alone, so with the usual
`sender_id OR receiver_id` update policy the sender could accept their own request
and then read the target's entire library through the widened `movie_logs` read
policy. Both halves are closed: the sender cannot accept, and friends no longer read
`movie_logs` directly at all.

**What friends can and cannot see.** The Compatibility Report keeps working and still
shows shared films, shared watchlist, genre overlap and rating disagreements, because
`rating` is one of the six fields the reader returns. `review` — the private notes
field — is **not** returned, so it is now unreachable by anyone but its owner. That is
a deliberate tightening: previously a friend could read it.

**User-visible changes**

- Opening `/matchmaker/<id>` for someone who is not an accepted friend now says so
  instead of quietly rendering a report.
- Accepting a request you sent yourself no longer appears to work.

**Verify**

```sql
-- expect exactly four movie_logs policies, all authenticated
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'movie_logs' ORDER BY cmd;

-- expect exactly four friendships policies, UPDATE limited to the receiver
SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'friendships' ORDER BY cmd;
```

In the app, **immediately**: open Library and confirm your films are still listed, log
a film, edit it, delete it. Then open a friend's Compatibility Report.

**Roll back**

```sql
DROP POLICY IF EXISTS "movie_logs_select_own" ON public.movie_logs;
CREATE POLICY "movie_logs_select_own" ON public.movie_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

If Library is empty after this step, that statement is the fix; if it is still empty,
re-create the policies you saved in the "Before you start" output.

---

## 4. `20260926093000_shared_lists_policy_backport.sql`

**What it does**

- Re-creates `list_owned_by_user`, `user_is_member_of_list` and
  `user_can_edit_shared_list` as `SECURITY DEFINER` helpers.
- Replaces every policy on `lists`, `list_members` and `list_items` to call them.
- Adds the **`list_members` UPDATE policy that never existed**, scoped to the owner.

**Why.** `supabase/migrations/20260414120000_phase_6_17_shared_lists.sql` still
contains the recursive policies that made every list request return HTTP 500
(`42P17`). Production was fixed by hand and the repo never was, so `supabase db push`
or any fresh, staging or restored database reinstalls the fault. This file is that fix,
written down. If your live database already has the helpers, this replaces them with
identical behaviour.

Separately, no UPDATE policy meant a collaborator role change matched zero rows and
always failed, and `inviteListMember`'s upsert errored for an existing member instead
of being a no-op.

**If this file errors** with "cannot drop function … because other objects depend on
it", something outside `lists` / `list_members` / `list_items` uses a helper. The whole
file has rolled back; find the dependency with the query below, then decide.

```sql
SELECT tablename, policyname, qual FROM pg_policies
WHERE qual LIKE '%list_owned_by_user%'
   OR qual LIKE '%user_is_member_of_list%'
   OR qual LIKE '%user_can_edit_shared_list%';
```

**User-visible changes**

- Changing a collaborator between editor and viewer works.
- Re-inviting an existing collaborator is silent instead of an error.
- Removing the last owner is refused ("A list needs at least one owner").

**Verify**

```sql
-- expect four policies per table, twelve rows
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('lists', 'list_members', 'list_items')
ORDER BY tablename, cmd;
```

In the app: open Library (no 500), create a list, invite a collaborator, change their
role, re-invite them, remove them.

**Roll back.** Re-run the policy statements you saved in "Before you start". Do not
re-apply the original Phase 6.17 migration — that is the file with the recursion.

---

## 5. `20260926094000_upc_cache_rls.sql`

**Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel before you run this.**

**What it does**

- Enables RLS on `upc_cache`, keeps reads open to `anon` and `authenticated`, and
  revokes `INSERT`/`UPDATE`/`DELETE` from both.

**Why.** The table was created with RLS off, and Supabase grants `anon` full DML on
public tables by default. The anon key ships in the browser bundle, so anyone could
overwrite `payload_json` for any barcode; `api/upc-lookup.js` serves a cache hit
straight back, so a scanned disc would resolve to a film of the attacker's choosing
and be logged as owned.

**The catch, read this.** `api/upc-lookup.js` reads `SUPABASE_SERVICE_ROLE_KEY` but
falls back to the anon key, and it wraps cache writes in a `catch` that swallows
failures. After this migration, anon writes are refused. If `SUPABASE_SERVICE_ROLE_KEY`
is not set in Vercel, the cache silently stops filling: every scan goes to the
upcitemdb trial endpoint, which is rate limited to about 100 lookups a day, and
scanning gets slower and starts failing once that is spent. Nothing will appear in the
logs.

So:

1. Add `SUPABASE_SERVICE_ROLE_KEY` in Vercel → Project → Settings → Environment
   Variables (Production and Preview), then redeploy.
2. Then run this migration.

`api/upc-lookup.js` is outside the scope of this change set, so it still degrades
quietly. Two edits there would fix that, and are worth making separately:

- Use `process.env.SUPABASE_SERVICE_ROLE_KEY` alone for the **write** path instead of
  falling back to the anon key, and log a warning once at module load when it is
  missing. Reads can keep the fallback; the read policy is public.
- In `writeCachedUpc`, check `response.ok` and `console.warn` the status. Today a
  rejected write is indistinguishable from a successful one.

**Verify**

```sql
-- expect rowsecurity = true and one SELECT policy
SELECT relrowsecurity FROM pg_class WHERE oid = 'public.upc_cache'::regclass;
SELECT policyname, cmd, roles FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'upc_cache';
```

Then scan a barcode you have not scanned before, and check a row appeared:

```sql
SELECT upc, updated_at FROM public.upc_cache ORDER BY updated_at DESC LIMIT 5;
```

If `updated_at` never advances, the service-role key is missing.

**Roll back**

```sql
ALTER TABLE public.upc_cache DISABLE ROW LEVEL SECURITY;
GRANT INSERT, UPDATE, DELETE ON public.upc_cache TO anon, authenticated;
```

---

## 6. `20260926095000_ai_cache.sql`

**What it does**

- Creates `ai_cache` if it is missing, and makes sure `cache_key` exists and is
  `NOT NULL` with a `''` default.
- **Deletes duplicate rows**, keeping the newest per `(user_id, cache_type)`.
- Creates the unique index on `(user_id, cache_type)` that the app's upsert has always
  named as its conflict target.
- Enables RLS with `auth.uid() = user_id` for all four commands.

**Why the delete.** No migration ever created this table, so the unique index the code
depends on may not exist. If it does not, the upsert has been failing with `42P10` and
the error was never checked, which is exactly the situation that leaves duplicates
behind — and a unique index cannot be built over duplicates, so the file would abort
without it. The rows discarded are expired AI suggestions and nothing else. To see what
would be removed before you run it:

```sql
SELECT user_id, cache_type, count(*)
FROM public.ai_cache
GROUP BY 1, 2 HAVING count(*) > 1;
```

**User-visible change.** Changing your mood and re-running the Oracle now returns films
for the new mood. Previously the lookup ignored `cache_key`, so the first result of the
day was re-served for 24 hours no matter what you asked for.

**Verify**

```sql
-- expect the index to exist
SELECT indexdef FROM pg_indexes
WHERE tablename = 'ai_cache' AND indexname = 'ai_cache_user_id_cache_type_uidx';

-- expect four policies
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'ai_cache' ORDER BY cmd;
```

In the app: run the Oracle, change your moods, run it again, confirm the films change.
The browser console logs `Recommendations not cached: …` if the write fails — it used
to claim success unconditionally.

**Roll back**

```sql
DROP INDEX IF EXISTS public.ai_cache_user_id_cache_type_uidx;
ALTER TABLE public.ai_cache DISABLE ROW LEVEL SECURITY;
```

---

## Whole-set check

After all six, this should return the policy inventory below:

```sql
SELECT tablename, cmd, count(*)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'friendships', 'movie_logs',
    'lists', 'list_members', 'list_items',
    'upc_cache', 'ai_cache'
  )
GROUP BY 1, 2 ORDER BY 1, 2;
```

| table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `ai_cache` | 1 | 1 | 1 | 1 |
| `friendships` | 1 | 1 | 1 | 1 |
| `list_items` | 1 | 1 | 1 | 1 |
| `list_members` | 1 | 1 | 1 | 1 |
| `lists` | 1 | 1 | 1 | 1 |
| `movie_logs` | 1 | 1 | 1 | 1 |
| `profiles` | 1 | 1 | 1 | — |
| `upc_cache` | 1 | — | — | — |

And all eight of these functions should exist, every one `security_definer = t`:

```sql
SELECT proname, prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'lookup_profile_identity', 'users_are_friends', 'get_friend_movie_logs',
    'list_owned_by_user', 'user_is_member_of_list', 'user_can_edit_shared_list',
    'handle_new_user', 'sync_profile_email'
  )
ORDER BY proname;
```

## What a user could notice

- Invite by email works for addresses registered with capitals, and invite by username
  works whatever case you type (steps 1–2).
- Comparing libraries with someone who is not an accepted friend is refused (step 3).
- A friend can no longer read your `review` notes (step 3).
- Collaborator role changes work; re-inviting is silent; you cannot remove the last
  owner (step 4).
- The bug triage list shows every report instead of only the admin's own (app code, no
  SQL needed).
- Changing your mood changes the Oracle's films (step 6).
- Sent friend requests are visible and cancellable again (app code, no SQL needed).
