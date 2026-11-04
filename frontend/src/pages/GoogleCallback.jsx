import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeGoogleCode } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const FAILED_URL = '/login?error=failed';

export default function GoogleCallback() {
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // The code is single-use: exchange it once even if the effect runs twice (StrictMode).
  const exchangeRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (!exchangeRef.current) {
      const code = new URLSearchParams(window.location.search).get('code');
      // Drop the code from the address bar and history right away.
      window.history.replaceState(window.history.state, '', window.location.pathname);
      exchangeRef.current = code
        ? exchangeGoogleCode(code)
        : Promise.reject(new Error('Missing sign-in code'));
    }

    exchangeRef.current
      .then((data) => {
        if (cancelled) return;

        saveSession(data.token, {
          id: data.user.id || data.user._id,
          name: data.user.name,
          email: data.user.email,
        });
        navigate('/', { replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        setError('Google sign-in failed');
        navigate(FAILED_URL, { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, saveSession]);

  return (
    <div className="page-center">
      <p className="muted">{error || 'Signing you in...'}</p>
    </div>
  );
}