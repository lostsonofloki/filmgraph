import './Logo.css';

/**
 * Filmgraph Logo Component
 * A minimalist logo featuring a film frame with a bar chart inside
 * @param {Object} props
 * @param {number|string} props.size - Logo size in pixels (e.g., 40, '48px')
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showText - Whether to show "Filmgraph" text beside the logo
 */
function Logo({ size = 40, className = '', showText = false }) {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`logo-container ${className}`}
      style={{ '--logo-size': sizeValue }}
    >
      <svg
        className="logo-svg"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: sizeValue, height: sizeValue }}
      >
        {/* Film Frame - Rounded Rectangle */}
        <rect
          className="logo-frame"
          x="10"
          y="10"
          width="80"
          height="80"
          rx="12"
        />

        {/* Sprocket Holes - Top */}
        <rect className="logo-sprocket" x="22" y="6" width="8" height="8" rx="2" />
        <rect className="logo-sprocket" x="46" y="6" width="8" height="8" rx="2" />
        <rect className="logo-sprocket" x="70" y="6" width="8" height="8" rx="2" />

        {/* Sprocket Holes - Bottom */}
        <rect className="logo-sprocket" x="22" y="86" width="8" height="8" rx="2" />
        <rect className="logo-sprocket" x="46" y="86" width="8" height="8" rx="2" />
        <rect className="logo-sprocket" x="70" y="86" width="8" height="8" rx="2" />

        {/* Bar Chart - Three bars of different heights */}
        <rect className="logo-bar logo-bar-small" x="28" y="58" width="12" height="22" rx="2" />
        <rect className="logo-bar logo-bar-medium" x="44" y="46" width="12" height="34" rx="2" />
        <rect className="logo-bar logo-bar-large" x="60" y="32" width="12" height="48" rx="2" />
      </svg>

      {showText && (
        <span className="logo-text">Filmgraph</span>
      )}
    </div>
  );
}

export default Logo;
