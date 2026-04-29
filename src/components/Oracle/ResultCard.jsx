import { useState } from "react";
import { Link } from "react-router-dom";

function ProviderLogos({ logos }) {
  if (!Array.isArray(logos) || logos.length === 0) return null;
  return (
    <div className="oracle-provider-logos" aria-label="Available on your streaming services">
      <span className="oracle-provider-logos-label">Watch now:</span>
      <div className="oracle-provider-logos-row">
        {logos.map((provider) => (
          <span
            key={provider.provider_id}
            className="oracle-provider-logo-chip"
            title={provider.provider_name}
            aria-label={provider.provider_name}
          >
            <img
              src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
              alt={provider.provider_name}
              loading="lazy"
              className="oracle-provider-logo"
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function ResultCard({
  rec,
  movieTmdb,
  index,
  isDiscovering,
  lists,
  canEditList,
  isMovieInList,
  addMovieToList,
  toast,
  onOpenWatchedModal,
  onAddToWatchlist,
  onRerollOne,
  onRerollAll,
}) {
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);

  return (
    <div
      className="recommendation-card animate-in fade-in"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="rec-poster-container">
        {movieTmdb?.id ? (
          <Link to={`/movie/${movieTmdb.id}`} className="rec-poster-link">
            {movieTmdb?.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${movieTmdb.poster_path}`}
                alt={rec.title}
                loading="lazy"
                className="rec-poster"
              />
            ) : (
              <div className="rec-poster-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
          </Link>
        ) : movieTmdb?.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w500${movieTmdb.poster_path}`}
            alt={rec.title}
            loading="lazy"
            className="rec-poster"
          />
        ) : (
          <div className="rec-poster-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className="rec-content">
        <div className="rec-header">
          {movieTmdb?.id ? (
            <Link to={`/movie/${movieTmdb.id}`} className="rec-title-link">
              {movieTmdb?.title || rec.title}
            </Link>
          ) : (
            <h2 className="rec-title">{movieTmdb?.title || rec.title}</h2>
          )}
          <span className="rec-year">{movieTmdb?.release_date?.split("-")[0] || rec.year}</span>
        </div>

        <ProviderLogos logos={movieTmdb?.provider_logos || []} />

        <div className="rec-vibe-check">
          <span className="vibe-label">Vibe Check:</span>
          <span className="vibe-text">{rec.vibeCheck}</span>
        </div>

        <div className="rec-rationale">
          <h3 className="rationale-title">Why Filmgraph Picked This</h3>
          <p className="rationale-text">{rec.rationale}</p>
        </div>

        <div className="rec-actions">
          {movieTmdb?.id && (
            <a
              href={`https://www.themoviedb.org/movie/${movieTmdb.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tmdb-link"
            >
              View on TMDB
            </a>
          )}

          <button onClick={() => movieTmdb && onOpenWatchedModal(movieTmdb)} className="lib-action-btn">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Watched
          </button>

          <button onClick={() => onAddToWatchlist(movieTmdb)} className="lib-action-btn">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Watchlist
          </button>

          <div className="relative" style={{ zIndex: 100 }}>
            <button
              onClick={() => setIsListDropdownOpen((open) => !open)}
              className="lib-action-btn"
              disabled={lists.length === 0}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Add to List
            </button>
            {isListDropdownOpen && lists.length > 0 && (
              <div className="list-dropdown" style={{ right: 0, overflow: "visible", zIndex: 9999 }}>
                {lists.map((list) => {
                  const isInList = isMovieInList(list.id, movieTmdb?.id);
                  const isReadOnly = !canEditList(list.id);
                  return (
                    <button
                      key={list.id}
                      onClick={async () => {
                        if (!movieTmdb?.id || isInList || isReadOnly) return;
                        try {
                          await addMovieToList(list.id, {
                            tmdb_id: movieTmdb.id,
                            title: movieTmdb.title,
                            poster_path: movieTmdb.poster_path,
                          });
                          toast.success(`Added to ${list.name}`);
                          setIsListDropdownOpen(false);
                        } catch (err) {
                          console.error("Add to list error:", err);
                          toast.error(
                            err.message?.includes("duplicate") ? "Already in this list" : "Failed to add to list"
                          );
                        }
                      }}
                      className="list-dropdown-item"
                      disabled={isInList || isReadOnly}
                    >
                      {list.name}
                      {isInList ? " • Added" : isReadOnly ? " • Viewer" : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            className="reject-reroll-btn"
            onClick={() => onRerollOne(movieTmdb?.id, rec.title, rec.year)}
            disabled={isDiscovering}
            title="Replace only this recommendation"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M20.49 15a9 9 0 0 1-2.82-3.36M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              <path d="M1 4v6h6M3.51 9a9 9 0 0 1 2.82-3.36" />
            </svg>
            Reroll One
          </button>

          <button
            className="reject-reroll-btn reject-reroll-btn--all"
            onClick={onRerollAll}
            disabled={isDiscovering}
            title="Reject all and reroll the full set"
          >
            Reroll All
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultCard;
