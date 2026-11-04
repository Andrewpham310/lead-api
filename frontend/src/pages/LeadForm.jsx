import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { submitLeadPublic } from '../api/leads';
import TurnstileWidget from '../components/TurnstileWidget';
import { TURNSTILE_SITE_KEY } from '../utils/turnstile';

export default function LeadForm() {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('key') || '';
  const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  // Honeypot: hidden from people, often filled in by bots.
  const [companyUrl, setCompanyUrl] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (captchaEnabled && !turnstileToken) {
      setError('Please complete the captcha check.');
      return;
    }

    setSubmitting(true);

    try {
      await submitLeadPublic(apiKey, {
        name,
        phone,
        email,
        message,
        companyUrl,
        turnstileToken: captchaEnabled ? turnstileToken : undefined,
      });
      setSubmitted(true);
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
      setCompanyUrl('');
      setTurnstileToken('');
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
      // Captcha tokens are single-use: get a fresh one for the next attempt.
      if (captchaEnabled) setCaptchaReset((count) => count + 1);
    } finally {
      setSubmitting(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="lead-form-page">
        <div className="lead-form-card">
          <h1>Contact us</h1>
          <div className="alert alert-error">
            This contact link is incomplete. Ask the business for the correct link.
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="lead-form-page">
        <div className="lead-form-card lead-form-success">
          <span className="brand-mark">NW</span>
          <h1>Thank you!</h1>
          <p className="muted">Your message has been sent. We&apos;ll get back to you soon.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSubmitted(false)}
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lead-form-page">
      <div className="lead-form-card">
        <div className="lead-form-header">
          <span className="brand-mark">NW</span>
          <h1>Get in touch</h1>
          <p className="muted">Send a message. We&apos;ll reply as soon as we can.</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}

          <label>
            Name <span className="required">*</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number"
            />
          </label>

          <label>
            Message <span className="required">*</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help you?"
              rows={5}
              required
            />
          </label>

          <div className="form-honeypot" aria-hidden="true">
            <label>
              Company website (leave blank)
              <input
                type="text"
                name="company_url"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>

          {captchaEnabled && (
            <TurnstileWidget
              onToken={setTurnstileToken}
              onError={setError}
              resetSignal={captchaReset}
            />
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || (captchaEnabled && !turnstileToken)}
          >
            {submitting ? 'Sending...' : 'Send message'}
          </button>
        </form>

        <p className="lead-form-powered">Powered by Next Waves</p>
      </div>
    </div>
  );
}