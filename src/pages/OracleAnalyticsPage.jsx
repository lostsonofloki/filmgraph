import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { fetchOracleProviderEvents } from '../api/oracleAnalytics';
import { isOracleAnalyticsAdmin } from '../utils/oracleAnalytics';
import './OracleAnalyticsPage.css';

const DAY_OPTIONS = [7, 14, 30];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const percentile = (numbers, p) => {
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(idx, 0)];
};

function OracleAnalyticsPage() {
  const { user } = useUser();
  const [days, setDays] = useState(14);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = isOracleAnalyticsAdmin(user);

  const loadEvents = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setError('');

    const result = await fetchOracleProviderEvents(days);
    if (!result.success) {
      setError(result.error || 'Failed to load analytics');
      setEvents([]);
    } else {
      setEvents(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, isAdmin]);

  const metrics = useMemo(() => {
    const totalRequests = events.length;
    const successfulRequests = events.filter((e) => e.success).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const providerMap = new Map();
    const fallbackMap = new Map();
    const timelineMap = new Map();

    events.forEach((event) => {
      const provider = event.provider || 'unknown';
      const providerEntry = providerMap.get(provider) || {
        provider,
        requests: 0,
        successes: 0,
        latencySamples: [],
      };

      providerEntry.requests += 1;
      if (event.success) providerEntry.successes += 1;

      const latencyMs = toNumber(event.latency_ms);
      if (latencyMs !== null) providerEntry.latencySamples.push(latencyMs);
      providerMap.set(provider, providerEntry);

      if (event.fallback_reason) {
        fallbackMap.set(event.fallback_reason, (fallbackMap.get(event.fallback_reason) || 0) + 1);
      }

      const day = String(event.created_at || '').slice(0, 10);
      const timelineKey = `${day}:${provider}`;
      timelineMap.set(timelineKey, (timelineMap.get(timelineKey) || 0) + 1);
    });

    const providerStats = Array.from(providerMap.values())
      .map((item) => {
        const avgLatency = item.latencySamples.length
          ? Math.round(item.latencySamples.reduce((sum, n) => sum + n, 0) / item.latencySamples.length)
          : null;

        return {
          provider: item.provider,
          requests: item.requests,
          successRate: item.requests ? (item.successes / item.requests) * 100 : 0,
          avgLatency,
          p95Latency: percentile(item.latencySamples, 95),
        };
      })
      .sort((a, b) => b.requests - a.requests);

    const timeline = Array.from(timelineMap.entries())
      .map(([key, count]) => {
        const [date, provider] = key.split(':');
        return { date, provider, count };
      })
      .sort((a, b) => {
        if (a.date === b.date) return a.provider.localeCompare(b.provider);
        return a.date.localeCompare(b.date);
      });

    const fallbackCounts = Array.from(fallbackMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const maxTimelineCount = timeline.reduce((max, item) => Math.max(max, item.count), 1);

    return {
      totalRequests,
      successRate,
      providerStats,
      timeline,
      fallbackCounts,
      maxTimelineCount,
    };
  }, [events]);

  if (!isAdmin) {
    return (
      <div className="oracle-analytics-page">
        <div className="oracle-analytics-card">
          <h2>Admin Access Required</h2>
          <p>Only administrators can view provider analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="oracle-analytics-page">
      <div className="oracle-analytics-header">
        <div>
          <h1>Oracle Provider Analytics</h1>
          <p>Provider health, fallback pressure, and latency trends.</p>
        </div>
        <div className="oracle-analytics-controls">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Last {option} days
              </option>
            ))}
          </select>
          <button onClick={loadEvents} type="button">Refresh</button>
        </div>
      </div>

      {error && <div className="oracle-analytics-error">{error}</div>}
      {isLoading && <div className="oracle-analytics-card">Loading provider analytics...</div>}

      {!isLoading && (
        <>
          <div className="oracle-kpi-grid">
            <div className="oracle-analytics-card">
              <h3>Total Requests</h3>
              <p className="oracle-kpi">{metrics.totalRequests}</p>
            </div>
            <div className="oracle-analytics-card">
              <h3>Success Rate</h3>
              <p className="oracle-kpi">{metrics.successRate.toFixed(1)}%</p>
            </div>
            <div className="oracle-analytics-card">
              <h3>Providers Active</h3>
              <p className="oracle-kpi">{metrics.providerStats.length}</p>
            </div>
          </div>

          <div className="oracle-analytics-card">
            <h2>Provider Performance</h2>
            <table className="oracle-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Requests</th>
                  <th>Success Rate</th>
                  <th>Avg Latency</th>
                  <th>P95 Latency</th>
                </tr>
              </thead>
              <tbody>
                {metrics.providerStats.map((row) => (
                  <tr key={row.provider}>
                    <td>{row.provider}</td>
                    <td>{row.requests}</td>
                    <td>{row.successRate.toFixed(1)}%</td>
                    <td>{row.avgLatency !== null ? `${row.avgLatency}ms` : 'n/a'}</td>
                    <td>{row.p95Latency !== null ? `${row.p95Latency}ms` : 'n/a'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="oracle-analytics-card">
            <h2>Fallback Reasons</h2>
            {metrics.fallbackCounts.length === 0 ? (
              <p>No fallbacks recorded in this window.</p>
            ) : (
              <div className="oracle-fallback-list">
                {metrics.fallbackCounts.map((item) => (
                  <div key={item.reason} className="oracle-fallback-item">
                    <span>{item.reason}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="oracle-analytics-card">
            <h2>Requests Over Time (by provider)</h2>
            {metrics.timeline.length === 0 ? (
              <p>No request data for this period.</p>
            ) : (
              <div className="oracle-timeline-chart">
                {metrics.timeline.map((point) => (
                  <div key={`${point.date}-${point.provider}`} className="oracle-timeline-row">
                    <div className="oracle-timeline-label">{point.date} - {point.provider}</div>
                    <div className="oracle-timeline-bar-wrap">
                      <div
                        className="oracle-timeline-bar"
                        style={{ width: `${(point.count / metrics.maxTimelineCount) * 100}%` }}
                      />
                      <span>{point.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default OracleAnalyticsPage;
