import { ENRICHMENT_FLAGS } from "../config/enrichmentFlags";
import { fetchNytMovieCoverage, fetchWikipediaSummary } from "../api/editorial";
import { fetchFanartAssets } from "../api/visuals";
import { fetchTraktMatch } from "../api/trakt";

export const fetchMovieEnrichment = async ({ title, year, tmdbId }) => {
  const [wikiResult, nytResult, fanartResult, traktResult] =
    await Promise.allSettled([
      ENRICHMENT_FLAGS.editorial ? fetchWikipediaSummary(title) : null,
      ENRICHMENT_FLAGS.editorial ? fetchNytMovieCoverage(title) : null,
      ENRICHMENT_FLAGS.visuals ? fetchFanartAssets(tmdbId) : null,
      ENRICHMENT_FLAGS.trakt ? fetchTraktMatch(title, year) : null,
    ]);

  return {
    wikipedia: wikiResult.status === "fulfilled" ? wikiResult.value : null,
    nyt: nytResult.status === "fulfilled" ? nytResult.value : null,
    fanart: fanartResult.status === "fulfilled" ? fanartResult.value : null,
    trakt: traktResult.status === "fulfilled" ? traktResult.value : null,
  };
};
