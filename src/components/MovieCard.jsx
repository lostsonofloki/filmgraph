import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRottenTomatoesScore, getMovieDetails } from '../api/omdb';
import LogMovieModal from './LogMovieModal';
import './MovieCard.css';

/**
 * MovieCard component displaying movie information
 * @param {Object} movie - Movie data from OMDb search results
 * @param {Function} onLogMovie - Callback when movie is logged
 */
function MovieCard({ movie, onLogMovie }) {
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rtScore, setRtScore] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (movie.imdbID) {
        const movieDetails = await getMovieDetails(movie.imdbID);
        if (movieDetails) {
          setDetails(movieDetails);
          const rt = getRottenTomatoesScore(movieDetails.Ratings);
          setRtScore(rt);
        }
        setLoading(false);
      }
    };

    fetchDetails();
  }, [movie.imdbID]);

  const handleCardClick = () => {
    // Navigate to movie detail page if TMDB ID exists
    if (movie.tmdb_id) {
      navigate(`/movie/${movie.tmdb_id}`);
    }
  };

  const handleLogClick = (e) => {
    e.stopPropagation(); // Prevent card click
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleMovieLogged = () => {
    setShowModal(false);
    if (onLogMovie) {
      onLogMovie({ ...movie, details, rtScore });
    }
  };

  const posterSrc = movie.Poster && movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'https://via.placeholder.com/300x450/1a1a1a/444444?text=No+Poster';

  return (
    <>
      <div className="movie-card" onClick={handleCardClick}>
        <div className="movie-card-poster">
          <img
            src={posterSrc}
            alt={`${movie.Title} poster`}
            loading="lazy"
          />
          {rtScore && (
            <div className="rt-score-badge">{rtScore}</div>
          )}
        </div>

        <div className="movie-card-content">
          <h3 className="movie-card-title">{movie.Title}</h3>
          <p className="movie-card-year">{movie.Year}</p>

          {!loading && details && details.Genre && (
            <p className="movie-card-genre">{details.Genre}</p>
          )}

          <button
            className="log-movie-button"
            onClick={handleLogClick}
          >
            Log Movie
          </button>
        </div>
      </div>

      {showModal && (
        <LogMovieModal
          movie={movie}
          onClose={handleModalClose}
          onLogged={handleMovieLogged}
        />
      )}
    </>
  );
}

export default MovieCard;
