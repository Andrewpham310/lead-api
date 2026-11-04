import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';

const GOOGLE_SIGN_IN_ERRORS = {
  cancelled: 'Google sign-in was cancelled',
  failed: 'Google sign-in failed',
  expired: 'Google sign-in expired. Try again.',
  invalid: 'Invalid sign-in request',
  unverified: 'Google sign-in could not be verified. Start again from this browser.',
  not_configured: 'Google sign-in is not configured',
  no_identity: 'Google did not return an identity token',
  no_email: 'Google did not provide a verified email',
  conflict: 'This email is already linked to a different Google account',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const code = searchParams.get('error');
    if (!code) return;
    setError(GOOGLE_SIGN_IN_ERRORS[code] || 'Google sign-in failed');
    const next = new URLSearchParams(searchParams);
    next.delete('error');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(
        err.status === 401
          ? 'Invalid email or password. If you signed up with Google, use Continue with Google.'
          : err.message || 'Login failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="brand-mark">NW</span>
          <p className="brand-name">Next Waves</p>
          <h1>Welcome back</h1>
          <p>Sign in to see who wants to book with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider">or</div>
        <GoogleSignInButton />

        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
