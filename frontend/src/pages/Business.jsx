import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createBusiness,
  getMyBusiness,
  regenerateApiKey,
  updateMyBusiness,
} from '../api/business';
import { useAuth } from '../context/AuthContext';
import { getLeadFormUrl } from '../utils/leadFormUrl';

export default function Business() {
  const { token } = useAuth();
  const [business, setBusiness] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    getMyBusiness(token)
      .then((data) => {
        setBusiness(data);
        setBusinessName(data.businessName || '');
        setIndustry(data.industry || '');
      })
      .catch(() => setBusiness(null))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = await createBusiness(token, { businessName, industry });
      setBusiness(data);
      setSuccess('Business profile created.');
    } catch (err) {
      setError(err.message || 'Failed to create business');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = await updateMyBusiness(token, { businessName, industry });
      setBusiness(data);
      setSuccess('Business profile updated.');
    } catch (err) {
      setError(err.message || 'Failed to update business');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerate API key? Your old key will stop working.')) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = await regenerateApiKey(token);
      setBusiness(data);
      setSuccess('API key regenerated.');
    } catch (err) {
      setError(err.message || 'Failed to regenerate API key');
    } finally {
      setSubmitting(false);
    }
  };

  const copyApiKey = async () => {
    if (!business?.apiKey) return;
    await navigator.clipboard.writeText(business.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFormLink = async () => {
    if (!business?.apiKey) return;
    await navigator.clipboard.writeText(getLeadFormUrl(business.apiKey));
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const formUrl = business?.apiKey ? getLeadFormUrl(business.apiKey) : '';

  if (loading) {
    return <p className="muted">Loading business profile...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Business</h1>
          <p className="muted">Manage your profile and API key</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel">
        <h2>{business ? 'Business profile' : 'Create business profile'}</h2>

        <form onSubmit={business ? handleUpdate : handleCreate} className="form">
          <label>
            Business name
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Anna Nails"
              required
            />
          </label>

          <label>
            Industry
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="nail salon"
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? 'Saving...'
              : business
                ? 'Save changes'
                : 'Create business'}
          </button>
        </form>
      </div>

      {business && (
        <div className="panel">
          <h2>API key</h2>
          <p className="muted">
            Add this key to your website form as the <code>x-api-key</code> header when
            submitting leads.
          </p>

          <div className="api-key-box">
            <code>{business.apiKey}</code>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyApiKey}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="api-key-meta">
            <span>Plan: <strong>{business.plan}</strong></span>
            <span>
              Usage: <strong>{business.usageThisMonth}</strong> / {business.monthlyLimit}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleRegenerateKey}
            disabled={submitting}
          >
            Regenerate API key
          </button>
        </div>
      )}

      {business && (
        <div className="panel">
          <h2>Lead capture form</h2>
          <p className="muted">
            Share this link on your website or social media so customers can send you
            inquiries. Submissions appear on your Leads page.
          </p>

          <div className="api-key-box">
            <code>{formUrl}</code>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyFormLink}>
              {linkCopied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          <div className="form-link-actions">
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Open form preview
            </a>
            <Link to="/leads" className="btn btn-secondary">
              View leads
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
