// Cloudflare Turnstile server-side verification.
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048;
const VERIFY_TIMEOUT_MS = 5000;

const isTurnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

// Resolves to { success, unavailable }. Fails closed: a network error or
// unexpected response counts as a failed verification.
const verifyTurnstileToken = async (token, remoteIp) => {
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) {
    return { success: false, unavailable: false };
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
  });

  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    const data = await response.json();

    return { success: data?.success === true, unavailable: false };
  } catch (error) {
    console.error('Turnstile verification request failed:', error.message);
    return { success: false, unavailable: true };
  }
};

module.exports = {
  SITEVERIFY_URL,
  isTurnstileEnabled,
  verifyTurnstileToken,
};