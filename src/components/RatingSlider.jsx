import { useState } from 'react';
import './RatingSlider.css';

/**
 * RatingSlider Component
 * StoryGraph-style precision rating slider (0.0 - 5.0)
 * @param {Object} props
 * @param {number} props.value - Current rating value (0-5)
 * @param {Function} props.onChange - Callback when rating changes
 * @param {boolean} props.disabled - Disabled state
 */
function RatingSlider({ value = 0, onChange, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    onChange?.(newValue);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate percentage for gradient
  const percentage = (value / 5) * 100;

  return (
    <div className={`rating-slider-container ${isDragging ? 'dragging' : ''}`}>
      {/* Rating Display */}
      <div className="rating-display">
        <span className="rating-value">{value.toFixed(1)}</span>
        <span className="rating-max">/ 5.0</span>
      </div>

      {/* Slider Container */}
      <div className="slider-wrapper">
        <span className="slider-label">0</span>
        
        <div className="slider-track-container">
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={value}
            onChange={handleChange}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            disabled={disabled}
            className="rating-slider"
            style={{
              background: `linear-gradient(to right, #a855f7 0%, #06b6d4 ${percentage}%, #2a2a2a ${percentage}%, #2a2a2a 100%)`
            }}
          />
        </div>

        <span className="slider-label">5</span>
      </div>
    </div>
  );
}

export default RatingSlider;
