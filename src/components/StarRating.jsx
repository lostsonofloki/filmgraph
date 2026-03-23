import { useState } from 'react';
import './StarRating.css';

/**
 * StarRating Component
 * Interactive 5-star rating component with optional half-star support
 * @param {Object} props
 * @param {number} props.rating - Current rating value (0-5)
 * @param {Function} props.onRatingChange - Callback when rating changes
 * @param {boolean} props.readonly - If true, stars are not clickable
 * @param {string} props.size - 'small' | 'medium' | 'large'
 * @param {boolean} props.allowHalfStars - Enable half-star increments
 * @param {string} props.className - Additional CSS classes
 */
function StarRating({ 
  rating = 0, 
  onRatingChange, 
  readonly = false, 
  size = 'medium',
  allowHalfStars = false,
  className = ''
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (value, isHalf = false) => {
    if (!readonly && onRatingChange) {
      const newRating = isHalf ? value - 0.5 : value;
      // Toggle off if clicking the same rating
      onRatingChange(newRating === rating ? 0 : newRating);
    }
  };

  const handleMouseEnter = (value) => {
    if (!readonly) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div 
      className={`star-rating star-rating-${size} ${className}`}
      role={readonly ? 'img' : 'slider'}
      aria-label={readonly ? `Rating: ${rating} out of 5 stars` : 'Rate this movie'}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={rating}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          className="star-wrapper"
          onMouseEnter={() => handleMouseEnter(star)}
          onMouseLeave={handleMouseLeave}
        >
          {/* Half star (left side) */}
          {allowHalfStars && (
            <button
              type="button"
              className={`star-button star-button-half ${star <= displayRating ? 'filled' : ''}`}
              onClick={() => handleClick(star, true)}
              disabled={readonly}
              aria-label={`${star - 0.5} stars`}
            >
              <svg 
                className="star-icon star-icon-half" 
                viewBox="0 0 24 24" 
                fill={star <= displayRating ? 'currentColor' : 'none'}
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          )}
          
          {/* Full star (right side) */}
          <button
            type="button"
            className={`star-button star-button-full ${star <= displayRating ? 'filled' : ''}`}
            onClick={() => handleClick(star)}
            disabled={readonly}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <svg 
              className="star-icon star-icon-full" 
              viewBox="0 0 24 24" 
              fill={star <= displayRating ? 'currentColor' : 'none'}
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export default StarRating;
