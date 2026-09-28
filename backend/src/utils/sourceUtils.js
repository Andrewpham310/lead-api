const KNOWN_SOURCES = [
  'website',
  'instagram',
  'facebook',
  'phone',
  'referral',
  'walk-in',
  'google',
  'linkedin',
  'twitter',
  'tiktok',
  'email',
  'other',
];

const MAX_SOURCE_LENGTH = 50;

const normalizeSource = (source) => {
  if (!source) return 'website';
  
  const normalized = source.toString().trim().toLowerCase();
  
  if (normalized.length > MAX_SOURCE_LENGTH) {
    return normalized.substring(0, MAX_SOURCE_LENGTH);
  }
  
  return normalized;
};

module.exports = {
  KNOWN_SOURCES,
  normalizeSource,
};
