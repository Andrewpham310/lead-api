// Cloudflare Turnstile site key. When empty, the lead form renders no captcha.
// Cloudflare test site keys: 1x00000000000000000000AA (always passes),
// 2x00000000000000000000AB (always blocks).
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise;

export function loadTurnstile() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = undefined;
        reject(new Error('Could not load the captcha. Check your connection and refresh.'));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}