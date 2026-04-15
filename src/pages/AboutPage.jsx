import { Link } from 'react-router-dom';
import ReportBugButton from '../components/ReportBugButton';
import { APP_VERSION } from '../constants';
import './AboutPage.css';

const VERSION = APP_VERSION;

/**
 * AboutPage - Filmgraph Hub with About, Changelog, and Roadmap
 */
function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-container">
        {/* Header */}
        <header className="about-header">
          <h1 className="about-title">
            <span className="title-icon">🔥</span> Filmgraph Hub
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
            <h2>About Filmgraph</h2>
          </div>
          <div className="section-content">
            <p className="about-text">
              <strong>Filmgraph</strong> is a premium, private movie vault designed for serious cinephiles.
              Unlike public databases, Filmgraph is your personal sanctuary for tracking, rating, and
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
                <h3>📦 v1.12.3 - Auth Persistence & Session Reliability</h3>
                <span className="changelog-date">April 15, 2026</span>
              </div>
              <ul className="changelog-list">
                <li>
                  <span className="badge-fix">FIX</span>
                  "Remember me" now reliably persists sessions using a deterministic Supabase storage preference.
                </li>
                <li>
                  <span className="badge-fix">FIX</span>
                  Removed unsupported sign-in persistence options and centralized auth storage handling.
                </li>
              </ul>
            </div>
            <div className="changelog-item">
              <div className="changelog-header">
                <h3>🛠️ v1.12.2-v1.12.0 - PWA + Scanner + UPC Integrity</h3>
                <span className="changelog-date">April 15, 2026</span>
              </div>
              <ul className="changelog-list">
                <li>
                  <span className="badge-new">NEW</span>
                  Library now has a primary "Scan Barcode" action beside "Magic Import" for discoverability.
                </li>
                <li>
                  <span className="badge-new">NEW</span>
                  Scanner supports native `BarcodeDetector` with `html5-qrcode` fallback on unsupported devices.
                </li>
                <li>
                  <span className="badge-new">NEW</span>
                  PWA install prompt, offline queue, and service worker caching shipped for app-like behavior.
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
            {/* Active Focus */}
            <div className="roadmap-item">
              <div className="roadmap-version">
                <span className="version-pill v1-9">Active</span>
                <span className="roadmap-status status-planned">Now</span>
              </div>
              <h3>Oracle AI Infrastructure (Phase 7.1)</h3>
              <ul className="roadmap-list">
                <li>Gemini + Groq orchestration with OpenRouter emergency fallback</li>
                <li>Daily Oracle usage guardrails with Supabase RPC-first budget checks</li>
                <li>Lower-cost inference path with graceful fallback when providers fail</li>
                <li>Production guardrail migrations now live</li>
              </ul>
            </div>

            {/* PWA / Offline */}
            <div className="roadmap-item">
              <div className="roadmap-version">
                <span className="version-pill v2-0">Active</span>
                <span className="roadmap-status status-future">Now</span>
              </div>
              <h3>PWA & Offline Foundation (Phase 7.2)</h3>
              <ul className="roadmap-list">
                <li>Install prompt UX, manifest polish, and app icons shipped</li>
                <li>Service worker app-shell + API caching enabled</li>
                <li>Offline log queue via IndexedDB with reconnect flush behavior</li>
                <li>Mobile-first behavior tuning and cache freshness hardening</li>
              </ul>
            </div>

            {/* Collection Integrity */}
            <div className="roadmap-item">
              <div className="roadmap-version">
                <span className="version-pill v3-0">Active</span>
                <span className="roadmap-status status-future">Now</span>
              </div>
              <h3>Vibe Filters + Natural Language + Anti-Double-Buy (Phase 7.3)</h3>
              <ul className="roadmap-list">
                <li>Natural-language sorting for Library now live</li>
                <li>UPC lookup + barcode scanner pipeline integrated in logging flow</li>
                <li>Duplicate protection across logs/lists/watchlist with integrity checks</li>
                <li>UPC uniqueness constraints enforced in database migration</li>
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
              <span className="version-label">Filmgraph v{VERSION}</span>
              <Link to="/" className="back-home-link">← Back to Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default AboutPage;
