import { useState } from "react";
import { useUser } from "../context/UserContext";
import AddToListButton from "./AddToListButton";
import LogMovieModal from "./LogMovieModal";
import "./QuickMovieActions.css";

function normalizePosterPath(movie) {
  if (movie?.poster_path) return movie.poster_path;
  if (typeof movie?.Poster === "string") {
    return movie.Poster.replace("https://image.tmdb.org/t/p/w500", "");
  }
  return null;
}

function QuickMovieActions({ movie, className = "" }) {
  const { isAuthenticated } = useUser();
  const [showModal, setShowModal] = useState(false);

  if (!isAuthenticated) return null;

  const normalizedMovie = {
    tmdb_id: movie?.tmdb_id || movie?.id,
    title: movie?.title || movie?.Title,
    poster_path: normalizePosterPath(movie),
    year: movie?.year || movie?.Year,
  };

  if (!normalizedMovie.tmdb_id || !normalizedMovie.title) return null;

  return (
    <>
      <div className={`quick-movie-actions ${className}`}>
        <AddToListButton movie={normalizedMovie} variant="icon" />
        <button
          type="button"
          className="quick-log-btn"
          onClick={(event) => {
            event.stopPropagation();
            setShowModal(true);
          }}
          title="Log Movie"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {showModal && (
        <LogMovieModal
          movie={normalizedMovie}
          onClose={() => setShowModal(false)}
          onLogged={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default QuickMovieActions;
