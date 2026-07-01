export function getLeadFormUrl(apiKey) {
  const base = window.location.origin;
  return `${base}/lead-form?key=${encodeURIComponent(apiKey)}`;
}
