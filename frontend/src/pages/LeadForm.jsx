import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { submitLeadPublic } from '../api/leads';

export default function LeadForm() {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('key') || '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await submitLeadPublic(apiKey, { name, phone, email, message });
      setSubmitted(true);
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
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
            This form link is invalid or missing an API key. Ask the business owner for
            the correct link.
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
          <p className="muted">Send us a message and we&apos;ll respond as soon as we can.</p>
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

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send message'}
          </button>
        </form>

        <p className="lead-form-powered">Powered by Next Waves</p>
      </div>
    </div>
  );
}
