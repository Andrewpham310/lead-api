import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyticsSummary } from '../api/analytics';
import { getMyBusiness } from '../api/business';
import { useAuth } from '../context/AuthContext';
import StatsCards from '../components/StatsCards';

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const businessData = await getMyBusiness(token).catch(() => null);
        setBusiness(businessData);

        if (businessData) {
          const summary = await getAnalyticsSummary(token);
          setStats(summary);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  if (loading) {
    return <p className="muted">Loading dashboard...</p>;
  }

  if (!business) {
    return (
      <div className="page-header">
        <div>
          <h1>Welcome to Next Waves</h1>
          <p className="muted">Set up your business profile to start collecting leads.</p>
        </div>
        <Link to="/business" className="btn btn-primary">
          Set up business
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{business.businessName}</h1>
          <p className="muted">Overview of your lead activity</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <>
          <StatsCards stats={stats} />

          <div className="usage-card">
            <div>
              <p className="label">Monthly usage</p>
              <strong>
                {stats.usageThisMonth} / {stats.monthlyLimit} leads
              </strong>
            </div>
            <div>
              <p className="label">Plan</p>
              <strong className="plan-badge">{stats.plan}</strong>
            </div>
            <div className="usage-bar">
              <div
                className="usage-fill"
                style={{
                  width: `${Math.min((stats.usageThisMonth / stats.monthlyLimit) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {stats.leadsBySource && stats.leadsBySource.length > 0 && (
            <div className="panel">
              <h2>Leads by source</h2>
              <p className="muted" style={{ marginBottom: '1rem' }}>
                Track where your leads are coming from
              </p>
              <div className="source-breakdown">
                {stats.leadsBySource.map((item) => (
                  <div key={item.source} className="source-breakdown-item">
                    <div className="source-breakdown-header">
                      <span className="source-badge">{item.source}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="source-breakdown-bar">
                      <div
                        className="source-breakdown-fill"
                        style={{
                          width: `${(item.count / stats.totalLeads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="quick-actions">
        <Link to="/leads" className="action-card">
          <h3>View leads</h3>
          <p>See and update customer inquiries</p>
        </Link>
        <Link to="/business" className="action-card">
          <h3>Business settings</h3>
          <p>Manage profile and API key</p>
        </Link>
      </div>
    </div>
  );
}
