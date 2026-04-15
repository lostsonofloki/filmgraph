import { Link } from 'react-router-dom';
import { APP_VERSION } from '../constants';
import './ChangelogPage.css';

/**
 * ChangelogPage - Full changelog history
 */
function ChangelogPage() {
  return (
    <div className="changelog-page">
      <div className="changelog-container">
        {/* Header */}
        <header className="changelog-header">
          <div className="header-content">
            <h1 className="changelog-title">
              <span className="title-icon">📝</span> Changelog
            </h1>
            <p className="changelog-subtitle">All notable changes to Filmgraph</p>
            <Link to="/about" className="back-to-hub-link">
              ← Back to Filmgraph Hub
            </Link>
          </div>
        </header>

        {/* Latest Version */}
        <section className="version-section latest">
          <div className="version-header">
            <h2 className="version-number">v1.3.6</h2>
            <span className="version-date">March 24, 2026</span>
          </div>
          <div className="version-content">
            <h3 className="version-highlight">🐛 Mobile Header Fixed</h3>
            <ul className="changelog-list">
              <li className="fix">
                <span className="badge-fix">FIX</span>
                Header mobile layout - complete rewrite with mobile-first design
              </li>
              <li className="fix">
                <span className="badge-fix">FIX</span>
                Desktop auth section restored (Profile/Logout or Login button)
              </li>
              <li className="fix">
                <span className="badge-fix">FIX</span>
                Single Oracle sparkle icon (no duplicates)
              </li>
              <li className="fix">
                <span className="badge-fix">FIX</span>
                DiscoveryPage useEffect crash - stable dependency arrays
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                Navigation: Discover, Trending, Library, History
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                Mobile dropdown with full-width search bar
              </li>
            </ul>
          </div>
        </section>

        {/* v1.3.5 */}
        <section className="version-section">
          <div className="version-header">
            <h2 className="version-number">v1.3.5</h2>
            <span className="version-date">March 24, 2026</span>
          </div>
          <div className="version-content">
            <h3 className="version-highlight">🎉 Reject & Reroll Feature</h3>
            <ul className="changelog-list">
              <li className="new">
                <span className="badge-new">NEW</span>
                Reject unwanted AI suggestions and get instant alternatives
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                Session tracking badge shows rejected movies count
              </li>
              <li className="fix">
                <span className="badge-fix">FIX</span>
                DiscoveryPage useEffect crash resolved
              </li>
            </ul>
          </div>
        </section>

        {/* v1.3.4 */}
        <section className="version-section">
          <div className="version-header">
            <h2 className="version-number">v1.3.4</h2>
            <span className="version-date">March 24, 2026</span>
          </div>
          <div className="version-content">
            <h3 className="version-highlight">🧠 Oracle Vibe Mapping Fixed</h3>
            <ul className="changelog-list">
              <li className="fix">
                <span className="badge-fix">FIX</span>
                Multi-word phrase parsing (Brain Mush, Mind-Bending, etc.)
              </li>
              <li className="fix">
                <span className="badge-fix">FIX</span>
                SearchPage genre URL parameter handling
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                Debug console logs for Oracle flow tracking
              </li>
            </ul>
          </div>
        </section>

        {/* v1.3.3 */}
        <section className="version-section">
          <div className="version-header">
            <h2 className="version-number">v1.3.3</h2>
            <span className="version-date">March 24, 2026</span>
          </div>
          <div className="version-content">
            <h3 className="version-highlight">🔐 Remember Me Feature</h3>
            <ul className="changelog-list">
              <li className="new">
                <span className="badge-new">NEW</span>
                Remember Me checkbox on login page
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                Toggle between localStorage/sessionStorage persistence
              </li>
              <li className="fix">
                <span className="badge-fix">FIX</span>
                Oracle vibe mapping for custom mood bubbles
              </li>
            </ul>
          </div>
        </section>

        {/* v1.3.2 */}
        <section className="version-section">
          <div className="version-header">
            <h2 className="version-number">v1.3.2</h2>
            <span className="version-date">March 24, 2026</span>
          </div>
          <div className="version-content">
            <h3 className="version-highlight">🤖 Oracle Launch</h3>
            <ul className="changelog-list">
              <li className="new">
                <span className="badge-new">NEW</span>
                Oracle AI Discovery page (/discover)
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                6 Mood Bubbles presets (Cozy, Adrenaline, Mind-Bending, etc.)
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                Natural language vibe input
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                Rationale display - "Why Filmgraph Picked This"
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                TMDB integration for posters and release years
              </li>
            </ul>
          </div>
        </section>

        {/* v1.3.1 */}
        <section className="version-section">
          <div className="version-header">
            <h2 className="version-number">v1.3.1</h2>
            <span className="version-date">March 24, 2026</span>
          </div>
          <div className="version-content">
            <h3 className="version-highlight">📋 Custom Lists + Library Grid</h3>
            <ul className="changelog-list">
              <li className="new">
                <span className="badge-new">NEW</span>
                Create and manage custom movie lists
              </li>
              <li className="new">
                <span className="badge-new">NEW</span>
                Library "My Lists" tab
              </li>
              <li className="fix">
                <span className="badge-fix">FIX</span>
                Library grid responsive layout
              </li>
              <li className="fix">
                <span className="badge-fix">FIX</span>
                tmdb_id column added to list_items table
              </li>
            </ul>
          </div>
        </section>

        {/* Older Versions */}
        <section className="version-section older">
          <div className="version-header">
            <h2 className="version-number">Older Versions</h2>
          </div>
          <div className="version-content">
            <p className="older-note">
              For older version history, view the{' '}
              <a
                href="https://github.com/lostsonofloki/filmgraph/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="github-link"
              >
                full CHANGELOG.md
              </a>{' '}
              on GitHub.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="changelog-footer">
          <div className="footer-content">
            <span className="version-label">Filmgraph v{APP_VERSION}</span>
            <Link to="/" className="back-home-link">← Back to Home</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ChangelogPage;
