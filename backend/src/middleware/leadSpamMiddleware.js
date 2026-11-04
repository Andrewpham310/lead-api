const { isTurnstileEnabled, verifyTurnstileToken } = require('../utils/turnstile');

// Hidden form field that real visitors never see or fill in.
const HONEYPOT_FIELD = 'company_url';

const LEAD_SUBMITTED_RESPONSE = Object.freeze({
  success: true,
  message: 'Lead submitted successfully',
});

// Bots that fill the honeypot get the normal success response, but nothing is
// stored and nothing counts toward the business's monthly usage.
const rejectHoneypot = (req, res, next) => {
  const value = req.body?.[HONEYPOT_FIELD];

  if (value !== undefined && value !== null && String(value).trim() !== '') {
    return res.status(201).json(LEAD_SUBMITTED_RESPONSE);
  }

  next();
};

const turnstileTokenFrom = (req) => {
  return (
    req.body?.turnstileToken ||
    req.body?.['cf-turnstile-response'] ||
    req.get('cf-turnstile-response')
  );
};

// Only enforced when TURNSTILE_SECRET_KEY is set on the server AND the business
// has not turned captcha off (owners who post leads from their own server can).
const requireTurnstile = async (req, res, next) => {
  try {
    if (!isTurnstileEnabled() || req.business?.requireCaptcha === false) {
      return next();
    }

    const result = await verifyTurnstileToken(turnstileTokenFrom(req), req.ip);

    if (!result.success) {
      return res.status(result.unavailable ? 503 : 403).json({
        success: false,
        message: result.unavailable
          ? 'Could not verify the captcha right now. Please try again.'
          : 'Captcha verification failed. Please try again.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  HONEYPOT_FIELD,
  LEAD_SUBMITTED_RESPONSE,
  rejectHoneypot,
  requireTurnstile,
};