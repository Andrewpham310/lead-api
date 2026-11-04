import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AccountSecurityPanel from '../components/AccountSecurityPanel';
import BusinessProfileForm from '../components/BusinessProfileForm';
import GoogleBusinessPanel from '../components/GoogleBusinessPanel';
import {
  createBusiness,
  getMyBusiness,
  regenerateApiKey,
  updateMyBusiness,
} from '../api/business';
import { useAuth } from '../context/AuthContext';
import {
  emptyBusinessProfile,
  profileFromBusiness,
  toBusinessPayload,
  validateBusinessProfile,
} from '../utils/businessProfile';
import { getLeadFormUrl } from '../utils/leadFormUrl';

const GOOGLE_BUSINESS_ERRORS = {
  not_configured: 'Google Business Profile is not configured',
  expired: 'Google connection link expired. Try again.',
  start_failed: 'Could not start Google connection',
  cancelled: 'Google Business Profile connection was cancelled',
  failed: 'Could not connect Google Business Profile',
  state_expired: 'Google connection expired. Try again.',
  invalid: 'Invalid Google connection request',
  unverified: 'Google connection could not be verified. Start again from this browser.',
  no_refresh:
    'Google did not return access to reconnect. Remove app access in your Google Account and try again.',
};

export default function Business() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [business, setBusiness] = useState(null);
  const [googleNotice, setGoogleNotice] = useState(null);
  const [profile, setProfile] = useState(emptyBusinessProfile);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const google = searchParams.get('google');
    if (!google) return;

    const reason = searchParams.get('reason');
    const notices = {
      connected: { type: 'success', message: 'Google Business Profile connected.' },
      choose: { type: 'success', message: 'Choose which location to use.' },
      none: {
        type: 'error',
        message: 'No Google Business Profile locations were found for this account.',
      },
      error: {
        type: 'error',
        message: GOOGLE_BUSINESS_ERRORS[reason] || 'Could not connect Google Business Profile',
      },
    };

    if (notices[google]) {
      setGoogleNotice(notices[google]);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('google');
    next.delete('reason');
    next.delete('message');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    getMyBusiness(token)
      .then((data) => {
        setBusiness(data);
        setProfile(profileFromBusiness(data));
      })
      .catch(() => setBusiness(null))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateBusinessProfile(profile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = toBusinessPayload(profile);
      const data = business
        ? await updateMyBusiness(token, payload)
        : await createBusiness(token, payload);
      setBusiness(data);
      setProfile(profileFromBusiness(data));
      setSuccess(business ? 'Business profile updated.' : 'Business profile created.');
    } catch (err) {
      setError(err.message || 'Failed to save business');
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

  const handleCaptchaToggle = async (e) => {
    const requireCaptcha = e.target.checked;

    if (
      !requireCaptcha &&
      !window.confirm(
        'Turn off captcha? Your form link (and its key) is public, so anyone could then submit leads without a captcha.'
      )
    ) {
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = await updateMyBusiness(token, { requireCaptcha });
      setBusiness(data);
      setSuccess(requireCaptcha ? 'Captcha is now required.' : 'Captcha turned off.');
    } catch (err) {
      setError(err.message || 'Failed to update captcha setting');
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
          <p className="muted">Your details, hours, services, and the link customers use to contact you.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel">
        <h2>{business ? 'Business profile' : 'Create business profile'}</h2>

        <BusinessProfileForm
          profile={profile}
          onChange={setProfile}
          onSubmit={handleSave}
          submitting={submitting}
          isEditing={Boolean(business)}
        />
      </div>

      <GoogleBusinessPanel
        token={token}
        business={business}
        onBusinessUpdated={setBusiness}
        notice={googleNotice}
      />

      {business && (
        <div className="panel">
          <h2>Customer contact link</h2>
          <p className="muted">
            Share this link on your website, Instagram, or Google profile. Messages show up
            on your Leads page.
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

      {business && (
        <div className="panel">
          <h2>API key</h2>
          <p className="muted">
            Only needed if a developer connects your own website form. They send it as the{' '}
            <code>x-api-key</code> header.
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

          {business.captchaEnabled && (
            <>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={business.requireCaptcha}
                  onChange={handleCaptchaToggle}
                  disabled={submitting}
                />
                Require captcha on lead submissions
              </label>
              <p className="field-hint">
                Keep this on for your shared form link. Turn it off only if you send leads from
                your own server with the <code>x-api-key</code> header.
              </p>
            </>
          )}

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

      <AccountSecurityPanel />
    </div>
  );
}
