import './Footer.css';

// TMDB Logo from your assets folder
// Official TMDB attribution logo: https://www.themoviedb.org/about/logos-attribution
import tmdbLogo from '../assets/tmdb-logo.svg';

/**
 * Ignes Footer Component
 * 7th Anniversary Dedication for Rachel Banks (Racheepi)
 */
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-dedication">
          Developed by Josh Jenkins. Dedicated to{' '}
          <span className="footer-highlight-name">Rachel Banks</span>.
        </p>
        <div className="footer-attribution-row">
          <img
            src={tmdbLogo}
            alt="TMDB Logo"
            className="footer-tmdb-logo"
            loading="lazy"
          />
          <p className="footer-attribution">
            This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB. Movie ratings provided by OMDb.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
