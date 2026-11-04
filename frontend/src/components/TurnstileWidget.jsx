import { useEffect, useRef } from 'react';
import { loadTurnstile, TURNSTILE_SITE_KEY } from '../utils/turnstile';

// Renders a Cloudflare Turnstile challenge and reports its token via onToken
// ('' when the token expires or the widget is reset). Bump resetSignal to get a
// fresh token after a submission (tokens are single-use).
export default function TurnstileWidget({ onToken, onError, resetSignal = 0 }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current || !turnstile) return;

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(''),
          'error-callback': () => {
            onTokenRef.current?.('');
            onErrorRef.current?.('The captcha could not be completed. Refresh and try again.');
          },
        });
      })
      .catch((err) => {
        if (!cancelled) onErrorRef.current?.(err.message);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!resetSignal || widgetIdRef.current === null || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenRef.current?.('');
  }, [resetSignal]);

  return <div ref={containerRef} className="turnstile-box" />;
}