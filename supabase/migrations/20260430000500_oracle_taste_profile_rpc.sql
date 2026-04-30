-- Oracle taste-profile aggregation RPC
-- Moves expensive weighting/capping work into Postgres for deterministic, low-latency context hydration.

CREATE OR REPLACE FUNCTION public.get_oracle_taste_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_is_authorized BOOLEAN := auth.uid() = p_user_id;
  v_recent_window_days INT := 45;
  v_low_rating_threshold NUMERIC := 2.5;
  v_recency_weight_scale NUMERIC := 0.35;
  v_loved_limit INT := 18;
  v_avoid_limit INT := 10;
  v_top_mood_limit INT := 6;
  v_top_genre_limit INT := 6;
  v_recent_watched_limit INT := 8;
  v_recent_to_watch_limit INT := 8;
  v_curated_limit INT := 16;
  v_profile JSONB;
BEGIN
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to read Oracle taste profile for this user';
  END IF;

  WITH logs AS (
    SELECT
      title,
      watch_status,
      rating,
      moods,
      genres,
      year,
      created_at
    FROM public.movie_logs
    WHERE user_id = p_user_id
  ),
  watched AS (
    SELECT * FROM logs WHERE watch_status = 'watched'
  ),
  recent_to_watch AS (
    SELECT title, created_at
    FROM public.movie_logs
    WHERE user_id = p_user_id
      AND watch_status = 'to-watch'
    ORDER BY created_at DESC
    LIMIT v_recent_to_watch_limit
  ),
  curated AS (
    SELECT li.title
    FROM public.list_items li
    JOIN public.lists l ON l.id = li.list_id
    WHERE l.user_id = p_user_id
      AND li.title IS NOT NULL
  ),
  watched_stats AS (
    SELECT
      COUNT(*)::INT AS watched_count,
      COUNT(*) FILTER (WHERE created_at >= timezone('utc', now()) - make_interval(days => v_recent_window_days))::INT AS recent_watched_count,
      COUNT(*) FILTER (WHERE COALESCE(rating, 0) >= 4)::INT AS high_rated_count,
      COUNT(*) FILTER (WHERE COALESCE(rating, 0) > 0 AND COALESCE(rating, 0) <= v_low_rating_threshold)::INT AS low_rated_count,
      CASE
        WHEN COUNT(*) FILTER (WHERE COALESCE(rating, 0) > 0) > 0
          THEN TO_CHAR(
            (SUM(COALESCE(rating, 0)) / NULLIF(COUNT(*) FILTER (WHERE COALESCE(rating, 0) > 0), 0))::NUMERIC,
            'FM999990.00'
          )
        ELSE NULL
      END AS avg_rating
    FROM watched
  ),
  mood_scores AS (
    SELECT
      LOWER(TRIM(mood.value)) AS label,
      COUNT(*)::INT AS count,
      SUM(
        1 + (
          GREATEST(
            0,
            LEAST(
              1,
              1 - (EXTRACT(EPOCH FROM (timezone('utc', now()) - COALESCE(w.created_at, timezone('utc', now())))) / 86400.0) / v_recent_window_days
            )
          ) * v_recency_weight_scale
        )
      )::NUMERIC AS score
    FROM watched w
    CROSS JOIN LATERAL unnest(COALESCE(w.moods, ARRAY[]::text[])) AS mood(value)
    WHERE TRIM(COALESCE(mood.value, '')) <> ''
    GROUP BY LOWER(TRIM(mood.value))
  ),
  top_moods AS (
    SELECT
      label,
      ROUND(score::NUMERIC, 3) AS score,
      count
    FROM mood_scores
    ORDER BY score DESC, count DESC, label ASC
    LIMIT v_top_mood_limit
  ),
  genre_scores AS (
    SELECT
      LOWER(TRIM(genre.value)) AS label,
      COUNT(*)::INT AS count,
      SUM(
        1 + (
          GREATEST(
            0,
            LEAST(
              1,
              1 - (EXTRACT(EPOCH FROM (timezone('utc', now()) - COALESCE(w.created_at, timezone('utc', now())))) / 86400.0) / v_recent_window_days
            )
          ) * v_recency_weight_scale
        ) +
        CASE WHEN COALESCE(w.rating, 0) >= 4 THEN 0.25 ELSE 0 END
      )::NUMERIC AS score
    FROM watched w
    CROSS JOIN LATERAL unnest(COALESCE(w.genres, ARRAY[]::text[])) AS genre(value)
    WHERE TRIM(COALESCE(genre.value, '')) <> ''
    GROUP BY LOWER(TRIM(genre.value))
  ),
  top_genres AS (
    SELECT
      label,
      ROUND(score::NUMERIC, 3) AS score,
      count
    FROM genre_scores
    ORDER BY score DESC, count DESC, label ASC
    LIMIT v_top_genre_limit
  ),
  top_decades AS (
    SELECT
      CONCAT((FLOOR(year::NUMERIC / 10) * 10)::INT, 's') AS decade,
      COUNT(*)::INT AS count
    FROM logs
    WHERE year IS NOT NULL
    GROUP BY CONCAT((FLOOR(year::NUMERIC / 10) * 10)::INT, 's')
    ORDER BY count DESC, decade ASC
    LIMIT 3
  ),
  liked_titles AS (
    SELECT DISTINCT title
    FROM watched
    WHERE COALESCE(rating, 0) >= 4
      AND title IS NOT NULL
      AND TRIM(title) <> ''
    ORDER BY title ASC
    LIMIT v_loved_limit
  ),
  neutral_titles AS (
    SELECT DISTINCT title
    FROM watched
    WHERE COALESCE(rating, 0) > v_low_rating_threshold
      AND COALESCE(rating, 0) < 4
      AND title IS NOT NULL
      AND TRIM(title) <> ''
    ORDER BY title ASC
    LIMIT 8
  ),
  avoid_titles AS (
    SELECT DISTINCT title
    FROM watched
    WHERE COALESCE(rating, 0) > 0
      AND COALESCE(rating, 0) <= v_low_rating_threshold
      AND title IS NOT NULL
      AND TRIM(title) <> ''
    ORDER BY title ASC
    LIMIT v_avoid_limit
  ),
  recent_watched AS (
    SELECT DISTINCT title, created_at
    FROM watched
    WHERE title IS NOT NULL
      AND TRIM(title) <> ''
    ORDER BY created_at DESC
    LIMIT v_recent_watched_limit
  ),
  context_lines AS (
    SELECT ARRAY_REMOVE(
      ARRAY[
        CONCAT(
          'TasteStats: watched=', COALESCE((SELECT watched_count::TEXT FROM watched_stats), '0'),
          ', recent45d=', COALESCE((SELECT recent_watched_count::TEXT FROM watched_stats), '0'),
          ', avgRating=', COALESCE((SELECT avg_rating FROM watched_stats), 'N/A')
        ),
        CONCAT('TopMoods: ', COALESCE((SELECT string_agg(label, ', ') FROM top_moods), 'none')),
        CONCAT('TopGenres: ', COALESCE((SELECT string_agg(label, ', ') FROM top_genres), 'none')),
        CONCAT(
          'MoodAffinityWeighted: ',
          COALESCE((SELECT string_agg(CONCAT(label, '(', TO_CHAR(score, 'FM999990.00'), ')'), ', ') FROM top_moods), 'none')
        ),
        CONCAT(
          'GenreAffinityWeighted: ',
          COALESCE((SELECT string_agg(CONCAT(label, '(', TO_CHAR(score, 'FM999990.00'), ')'), ', ') FROM top_genres), 'none')
        ),
        CONCAT('PreferredDecades: ', COALESCE((SELECT string_agg(decade, ', ') FROM top_decades), 'none')),
        CONCAT('LovedTitles: ', COALESCE((SELECT string_agg(title, ', ') FROM liked_titles), 'none')),
        CONCAT('AvoidSimilarTo: ', COALESCE((SELECT string_agg(title, ', ') FROM avoid_titles), 'none')),
        CONCAT('NeutralTitles: ', COALESCE((SELECT string_agg(title, ', ') FROM neutral_titles), 'none')),
        CONCAT('RecentWatched: ', COALESCE((SELECT string_agg(title, ', ') FROM recent_watched), 'none')),
        CONCAT('RecentToWatch: ', COALESCE((SELECT string_agg(title, ', ') FROM recent_to_watch), 'none')),
        CONCAT(
          'CuratedLists: ',
          COALESCE(
            (
              SELECT string_agg(title, ', ')
              FROM (
                SELECT DISTINCT title
                FROM curated
                ORDER BY title ASC
                LIMIT v_curated_limit
              ) ranked_curated
            ),
            'none'
          )
        )
      ],
      NULL
    ) AS lines
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'watchedCount', COALESCE((SELECT watched_count FROM watched_stats), 0),
      'recentWatchedCount', COALESCE((SELECT recent_watched_count FROM watched_stats), 0),
      'highRatedCount', COALESCE((SELECT high_rated_count FROM watched_stats), 0),
      'lowRatedCount', COALESCE((SELECT low_rated_count FROM watched_stats), 0),
      'lowRatingThreshold', v_low_rating_threshold,
      'avgRating', COALESCE((SELECT avg_rating FROM watched_stats), NULL),
      'topMoods', COALESCE((SELECT jsonb_agg(label) FROM top_moods), '[]'::JSONB),
      'topGenres', COALESCE((SELECT jsonb_agg(label) FROM top_genres), '[]'::JSONB),
      'topDecades', COALESCE((SELECT jsonb_agg(decade) FROM top_decades), '[]'::JSONB)
    ),
    'weightedSignals', jsonb_build_object(
      'moods', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'score', score, 'count', count)) FROM top_moods), '[]'::JSONB),
      'genres', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'score', score, 'count', count)) FROM top_genres), '[]'::JSONB)
    ),
    'ratingBuckets', jsonb_build_object(
      'liked', COALESCE((SELECT jsonb_agg(title) FROM liked_titles), '[]'::JSONB),
      'neutral', COALESCE((SELECT jsonb_agg(title) FROM neutral_titles), '[]'::JSONB),
      'avoid', COALESCE((SELECT jsonb_agg(title) FROM avoid_titles), '[]'::JSONB)
    ),
    'positiveTitles', COALESCE((SELECT jsonb_agg(title) FROM liked_titles), '[]'::JSONB),
    'avoidTitles', COALESCE((SELECT jsonb_agg(title) FROM avoid_titles), '[]'::JSONB),
    'recentWatchedTitles', COALESCE((SELECT jsonb_agg(title) FROM recent_watched), '[]'::JSONB),
    'recentToWatchTitles', COALESCE((SELECT jsonb_agg(title) FROM recent_to_watch), '[]'::JSONB),
    'curatedTitles', COALESCE(
      (
        SELECT jsonb_agg(title)
        FROM (
          SELECT DISTINCT title
          FROM curated
          ORDER BY title ASC
          LIMIT v_curated_limit
        ) ranked_curated
      ),
      '[]'::JSONB
    ),
    'contextString', (
      SELECT array_to_string(lines, E'\n')
      FROM context_lines
    )
  ) INTO v_profile;

  RETURN COALESCE(v_profile, '{}'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_oracle_taste_profile(UUID) TO authenticated;
