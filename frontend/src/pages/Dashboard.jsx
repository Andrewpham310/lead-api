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
          <p className="muted">Add your business once. Customer messages will show up here.</p>
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
          <p className="muted">A simple look at your customer messages</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <>
          <StatsCards stats={stats} />

          <div className="usage-card">
            <div>
              <p className="label">Messages this month</p>
              <strong>
                {stats.usageThisMonth} / {stats.monthlyLimit}
              </strong>
            </div>
            <div>
              <p className="label">Your plan</p>
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
        </>
      )}

      <div className="quick-actions">
        <Link to="/leads" className="action-card">
          <h3>See your messages</h3>
          <p>Read what customers sent and mark who you already contacted.</p>
          <span className="action-go">Open</span>
        </Link>
        <Link to="/business" className="action-card">
          <h3>Your business</h3>
          <p>Hours, services, and the link customers use to reach you.</p>
          <span className="action-go">Open</span>
        </Link>
      </div>
    </div>
  );
}
