/**
 * Ignes Logo Component
 * Flame symbol with geometric 'I' cutout
 * 
 * @param {number|string} props.size - Logo size in pixels (default: 40)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showText - Whether to show "IGNES" text beside the logo
 */
function IgnesLogo({ size = 40, className = '', showText = false }) {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`ignes-logo-container ${className}`}
      style={{ '--logo-size': sizeValue }}
    >
      <svg
        className="ignes-logo-svg"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: sizeValue, height: sizeValue }}
      >
        {/* Flame Shape - Deep Ember Burgundy */}
        <path
          className="ignes-flame"
          d="M50 5
             C50 5 65 25 65 45
             C65 58 58 68 50 75
             C42 68 35 58 35 45
             C35 25 50 5 50 5Z"
          fill="#991b1b"
        />
        
        {/* Inner Flame Detail - Lighter Ember */}
        <path
          className="ignes-flame-inner"
          d="M50 20
             C50 20 58 35 58 48
             C58 56 54 63 50 68
             C46 63 42 56 42 48
             C42 35 50 20 50 20Z"
          fill="#b91c1c"
        />
        
        {/* Geometric 'I' Cutout - Negative Space */}
        <rect
          className="ignes-i-cutout"
          x="46"
          y="35"
          width="8"
          height="30"
          rx="2"
          fill="#0a0a0a"
        />
        
        {/* 'I' Top Serif */}
        <rect
          className="ignes-i-serif-top"
          x="44"
          y="33"
          width="12"
          height="4"
          rx="1"
          fill="#0a0a0a"
        />
        
        {/* 'I' Bottom Serif */}
        <rect
          className="ignes-i-serif-bottom"
          x="44"
          y="63"
          width="12"
          height="4"
          rx="1"
          fill="#0a0a0a"
        />
      </svg>

      {showText && (
        <span className="ignes-logo-text">IGNES</span>
      )}
    </div>
  );
}

export default IgnesLogo;
