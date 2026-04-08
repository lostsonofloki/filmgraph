import { Link } from 'react-router-dom';
import ReportBugButton from '../components/ReportBugButton';
import { APP_VERSION } from '../constants';
import './AboutPage.css';

const VERSION = APP_VERSION;

/**
 * AboutPage - Ignes Hub with About, Changelog, and Roadmap
 */
function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-container">
        {/* Header */}
        <header className="about-header">
          <h1 className="about-title">
            <span className="title-icon">🔥</span> Ignes Hub
          </h1>
          <p className="about-subtitle">Your Personal Movie Logging & Visualization Platform</p>
        </header>

        {/* About Section */}
        <section className="about-section card-dark">
          <div className="section-header">
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <h2>About Ignes</h2>
          </div>
          <div className="section-content">
            <p className="about-text">
              <strong>Ignes</strong> is a premium, private movie vault designed for serious cinephiles. 
              Unlike public databases, Ignes is your personal sanctuary for tracking, rating, and 
              curating your cinematic journey.
            </p>
            <div className="about-features">
              <div className="feature-item">
                <span className="feature-icon">🎬</span>
                <span>Log movies with detailed ratings & moods</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Visualize your watching habits with analytics</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span>Private vault - your data stays yours</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🤖</span>
                <span>AI-powered recommendations</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📝</span>
                <span>Create custom lists for any occasion</span>
              </div>
            </div>
          </div>
        </section>

        {/* Changelog Section */}
        <section className="changelog-section card-dark">
          <div className="section-header">
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2>Latest Changes</h2>
            <span className="version-badge">v{VERSION}</span>
          </div>
          <div className="changelog-content">
            <div className="changelog-item">
              <div className="changelog-header">
                <h3>🤝 Shared Lists & People Search</h3>
                <span className="changelog-date">April 7, 2026</span>
              </div>
              <ul className="changelog-list">
                <li>
                  <span className="badge-new">NEW</span>
                  Collaborative shared lists with owner/editor/viewer roles
                </li>
                <li>
                  <span className="badge-new">NEW</span>
                  Invite collaborators by username or display name
                </li>
                <li>
                  <span className="badge-new">NEW</span>
                  Per-movie attribution — see who added each movie
                </li>
                <li>
                  <span className="badge-new">NEW</span>
                  Unified search for movies AND people (actors, directors)
                </li>
                <li>
                  <span className="badge-new">NEW</span>
                  Person profile pages with full filmography + genre filter
                </li>
                <li>
                  <span className="badge-fix">FIX</span>
                  Removed poster from insert/update payloads (Supabase generated column)
                </li>
                <li>
                  <span className="badge-fix">FIX</span>
                  Fixed "N/A" integer cast error on missing release dates
                </li>
              </ul>
            </div>
            <div className="changelog-item">
              <div className="changelog-header">
                <h3>🔍 Advanced Filter Engine</h3>
                <span className="changelog-date">April 7, 2026</span>
              </div>
              <ul className="changelog-list">
                <li>
                  <span className="badge-new">NEW</span>
                  Multi-criteria filtering: genres, year, mood, rating, search
                </li>
                <li>
                  <span className="badge-new">NEW</span>
                  Operator parsing — type &quot;&gt; 2000&quot; or &quot;&gt;= 4&quot; naturally
                </li>
                <li>
                  <span className="badge-new">NEW</span>
                  Save, load, and delete filter presets
                </li>
              </ul>
            </div>
          </div>
          <div className="changelog-footer">
            <Link to="/changelog" className="view-all-link">
              View Full Changelog →
            </Link>
          </div>
        </section>

        {/* Roadmap Section */}
        <section className="roadmap-section card-dark">
          <div className="section-header">
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h2>Roadmap</h2>
          </div>
          <div className="roadmap-content">
            {/* v1.10.0 - SHIPPED */}
            <div className="roadmap-item">
              <div className="roadmap-version">
                <span className="version-pill v1-10">v1.10.0</span>
                <span className="roadmap-status status-shipped">Shipped</span>
              </div>
              <h3>Shared Lists & People Discovery</h3>
              <ul className="roadmap-list">
                <li>Collaborative lists with owner/editor/viewer roles</li>
                <li>Invite collaborators by username or display name</li>
                <li>Unified search for movies AND people</li>
                <li>Person profile pages with filmography + genre filter</li>
              </ul>
            </div>

            {/* v1.9.0 - SHIPPED */}
            <div className="roadmap-item">
              <div className="roadmap-version">
                <span className="version-pill v1-9">v1.9.0</span>
                <span className="roadmap-status status-shipped">Shipped</span>
              </div>
              <h3>Advanced Filter Engine</h3>
              <ul className="roadmap-list">
                <li>Multi-criteria filtering (genre, year, mood, rating)</li>
                <li>Operator parsing for year and rating (&gt;, &gt;=, &lt;, &lt;=)</li>
                <li>Save, load, and delete filter presets</li>
                <li>Fuzzy search across title and review fields</li>
              </ul>
            </div>

            {/* v2.0.0 */}
            <div className="roadmap-item">
              <div className="roadmap-version">
                <span className="version-pill v2-0">v2.0.0</span>
                <span className="roadmap-status status-future">Next</span>
              </div>
              <h3>Social Expansion</h3>
              <ul className="roadmap-list">
                <li>Activity feeds & shared watch history</li>
                <li>Comments & discussions on movie logs</li>
                <li>Share movie cards to social media</li>
                <li>Real-time Supabase collaboration</li>
              </ul>
            </div>

            {/* v3.0.0 */}
            <div className="roadmap-item">
              <div className="roadmap-version">
                <span className="version-pill v3-0">v3.0.0</span>
                <span className="roadmap-status status-future">Vision</span>
              </div>
              <h3>Mobile App & Premium Features</h3>
              <ul className="roadmap-list">
                <li>Native iOS/Android app</li>
                <li>Offline mode for logging on the go</li>
                <li>Advanced analytics & yearly reports</li>
                <li>Custom themes & branding</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="about-footer">
          <div className="footer-content">
            <div className="footer-left">
              <ReportBugButton variant="button" />
            </div>
            <div className="footer-right">
              <span className="version-label">Ignes v{VERSION}</span>
              <Link to="/" className="back-home-link">← Back to Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default AboutPage;
