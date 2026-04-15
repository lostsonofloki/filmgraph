import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogMovieModal from './LogMovieModal';
import AddToListButton from './AddToListButton';
import './MovieCard.css';

function MovieCard({ movie, isLibraryCard = false, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const handleCardClick = () => {
    if (movie.tmdb_id) {
      navigate(`/movie/${movie.tmdb_id}`);
    }
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    if (action === 'edit') {
      onEdit?.(e, movie);
    } else if (action === 'delete') {
      onDelete?.(e, movie.id);
    }
  };

  // Use poster_path (raw TMDB path) and construct full URL
  // Fallback to movie.poster for legacy data, then placeholder
  const posterSrc = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : movie.poster && movie.poster !== 'N/A'
      ? movie.poster
      : 'https://via.placeholder.com/300x450/1a1a1a/444444?text=No+Poster';

  const userRating = movie.rating;

  return (
    <>
      <div
        className="group relative bg-zinc-950 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-orange-900/30"
        onClick={handleCardClick}
      >
        <div className="aspect-[2/3] relative overflow-hidden bg-zinc-900">
          <img
            src={posterSrc}
            alt={`${movie.title} poster`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

          {userRating && (
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-orange-500/40 shadow-lg">
              <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-white font-bold text-sm">{userRating.toFixed(1)}</span>
            </div>
          )}

          {/* Mobile: Always visible buttons | Desktop: Hover overlay */}
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none group-hover:pointer-events-auto md:flex">
            <div className="flex flex-col items-center gap-3 px-4 w-full">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {isLibraryCard ? (
                  <>
                    <button
                      onClick={(e) => handleActionClick(e, 'edit')}
                      className="p-3 bg-zinc-900/90 hover:bg-orange-600 rounded-xl transition-all duration-200 group/btn shadow-xl border border-zinc-800 hover:border-orange-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Edit Log"
                    >
                      <svg className="w-5 h-5 text-zinc-400 group-hover/btn:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    <AddToListButton
                      movie={{
                        tmdb_id: movie.tmdb_id,
                        title: movie.title,
                        poster_path: movie.poster_path || movie.poster?.replace('https://image.tmdb.org/t/p/w500', '')
                      }}
                      variant="icon"
                    />

                    <button
                      onClick={(e) => handleActionClick(e, 'delete')}
                      className="p-3 bg-zinc-900/90 hover:bg-red-600 rounded-xl transition-all duration-200 group/btn shadow-xl border border-zinc-800 hover:border-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Delete"
                    >
                      <svg className="w-5 h-5 text-zinc-400 group-hover/btn:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <AddToListButton
                      movie={{
                        tmdb_id: movie.tmdb_id,
                        title: movie.title,
                        poster_path: movie.poster_path || movie.poster?.replace('https://image.tmdb.org/t/p/w500', '')
                      }}
                      variant="icon"
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModal(true);
                      }}
                      className="p-3 bg-zinc-900/90 hover:bg-orange-600 rounded-xl transition-all duration-200 group/btn shadow-xl border border-zinc-800 hover:border-orange-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Log Movie"
                    >
                      <svg className="w-5 h-5 text-zinc-400 group-hover/btn:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              <p className="text-white font-semibold text-center text-xs line-clamp-2 max-w-[180px]">
                {movie.title}
              </p>
            </div>
          </div>

          {/* Mobile: compact action bar — equal thirds so icons never spill past narrow posters */}
          {isLibraryCard && (
            <div className="movie-card-mobile-actions md:hidden pointer-events-auto">
              <div className="movie-card-mobile-actions-inner">
                <div className="movie-card-mobile-action-slot">
                  <button
                    type="button"
                    onClick={(e) => handleActionClick(e, 'edit')}
                    className="movie-card-mobile-icon-btn movie-card-mobile-icon-btn--edit"
                    title="Edit Log"
                  >
                    <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
                <div className="movie-card-mobile-action-slot">
                  <AddToListButton
                    movie={{
                      tmdb_id: movie.tmdb_id,
                      title: movie.title,
                      poster_path: movie.poster_path || movie.poster?.replace('https://image.tmdb.org/t/p/w500', '')
                    }}
                    variant="icon"
                    className="movie-card-mobile-add"
                  />
                </div>
                <div className="movie-card-mobile-action-slot">
                  <button
                    type="button"
                    onClick={(e) => handleActionClick(e, 'delete')}
                    className="movie-card-mobile-icon-btn movie-card-mobile-icon-btn--delete"
                    title="Delete"
                  >
                    <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="movie-card-meta">
          <h3 className="movie-card-meta-title group-hover:text-orange-400 transition-colors">
            {movie.title}
          </h3>
          <p className="movie-card-meta-year">{movie.year}</p>
        </div>
      </div>

      {showModal && (
        <LogMovieModal
          movie={movie}
          onClose={() => setShowModal(false)}
          onLogged={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default MovieCard;
