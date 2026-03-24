import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogMovieModal from './LogMovieModal';
import AddToListButton from './AddToListButton';

/**
 * Cinematic MovieCard - Minimalist "Bookshelf" Design
 * Clean poster-only view with hover overlay for actions
 * @param {Object} movie - Movie data from library
 * @param {boolean} isLibraryCard - If true, shows library-specific actions (Edit/Delete)
 * @param {Function} onEdit - Edit callback
 * @param {Function} onDelete - Delete callback
 */
function MovieCard({ movie, isLibraryCard = false, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  const posterSrc = movie.poster && movie.poster !== 'N/A'
    ? movie.poster
    : 'https://via.placeholder.com/300x450/1a1a1a/444444?text=No+Poster';

  const userRating = movie.rating;

  return (
    <>
      <div 
        className="group relative bg-zinc-900 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-900/20"
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Poster Container - Fixed Aspect Ratio 2:3 */}
        <div className="aspect-[2/3] relative overflow-hidden bg-zinc-800">
          <img
            src={posterSrc}
            alt={`${movie.title} poster`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

          {/* Rating Badge (Top Right) */}
          {userRating && (
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-orange-500/40 shadow-lg">
              <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-white font-bold text-sm">{userRating.toFixed(1)}</span>
            </div>
          )}

          {/* Hover Overlay - Actions (ONLY visible on hover) */}
          <div className={`absolute inset-0 bg-black/85 backdrop-blur-md transition-all duration-300 flex items-center justify-center ${isHovered ? 'opacity-100' : 'opacity-0'} pointer-events-none group-hover:pointer-events-auto`}>
            <div className="flex flex-col items-center gap-4 px-6">
              {/* Action Buttons Row */}
              <div className="flex items-center gap-3">
                {isLibraryCard ? (
                  <>
                    {/* Edit Button */}
                    <button
                      onClick={(e) => handleActionClick(e, 'edit')}
                      className="p-4 bg-zinc-800/90 hover:bg-purple-600 rounded-2xl transition-all duration-200 group/btn shadow-xl border border-zinc-700 hover:border-purple-400"
                      title="Edit Log"
                    >
                      <svg className="w-6 h-6 text-zinc-400 group-hover/btn:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    
                    {/* Add to List Button */}
                    <AddToListButton 
                      movie={{ 
                        tmdb_id: movie.tmdb_id, 
                        title: movie.title, 
                        poster_path: movie.poster?.replace('https://image.tmdb.org/t/p/w500', '') 
                      }} 
                      variant="icon"
                    />
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleActionClick(e, 'delete')}
                      className="p-4 bg-zinc-800/90 hover:bg-red-600 rounded-2xl transition-all duration-200 group/btn shadow-xl border border-zinc-700 hover:border-red-400"
                      title="Delete"
                    >
                      <svg className="w-6 h-6 text-zinc-400 group-hover/btn:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Add to List Button (Search Results) */}
                    <AddToListButton 
                      movie={{ 
                        tmdb_id: movie.tmdb_id, 
                        title: movie.title, 
                        poster_path: movie.poster?.replace('https://image.tmdb.org/t/p/w500', '') 
                      }} 
                      variant="icon"
                    />
                    
                    {/* Log Movie Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModal(true);
                      }}
                      className="p-4 bg-zinc-800/90 hover:bg-orange-600 rounded-2xl transition-all duration-200 group/btn shadow-xl border border-zinc-700 hover:border-orange-400"
                      title="Log Movie"
                    >
                      <svg className="w-6 h-6 text-zinc-400 group-hover/btn:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Title on Overlay */}
              <p className="text-white font-semibold text-center text-sm line-clamp-2 max-w-[200px]">
                {movie.title}
              </p>
            </div>
          </div>
        </div>

        {/* Title & Year (Below Poster) */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800">
          <h3 className="text-white font-semibold text-sm line-clamp-1 mb-0.5 group-hover:text-orange-400 transition-colors">
            {movie.title}
          </h3>
          <p className="text-zinc-500 text-xs">{movie.year}</p>
        </div>
      </div>

      {/* Log Movie Modal */}
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
