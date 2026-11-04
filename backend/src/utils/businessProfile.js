const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const normalizeWebsite = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(normalizeWebsite(value));
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.');
  } catch {
    return false;
  }
};

const normalizeHours = (hours) => {
  const byDay = new Map((hours || []).map((period) => [period.day, period]));

  return WEEKDAYS.map((day) => {
    const period = byDay.get(day);
    if (!period) {
      return { day, closed: false, open: '', close: '' };
    }

    const closed = Boolean(period.closed);
    return {
      day,
      closed,
      open: closed ? '' : String(period.open || '').trim(),
      close: closed ? '' : String(period.close || '').trim(),
    };
  });
};

const normalizeServiceCatalog = (catalog) =>
  (catalog || [])
    .filter((service) => String(service?.name || '').trim())
    .map((service) => ({
      name: String(service.name).trim(),
      description: String(service.description || '').trim(),
      price: String(service.price || '').trim(),
    }));

const applyProfileFields = (target, body) => {
  if (body.industry !== undefined) {
    target.industry = String(body.industry).trim();
  }

  if (body.address !== undefined) {
    target.address = String(body.address).trim();
  }

  if (body.phone !== undefined) {
    target.phone = String(body.phone).trim();
  }

  if (body.website !== undefined) {
    target.website = normalizeWebsite(body.website);
  }

  if (body.serviceCatalog !== undefined) {
    target.serviceCatalog = normalizeServiceCatalog(body.serviceCatalog);
  }

  if (body.businessHours !== undefined) {
    target.businessHours = normalizeHours(body.businessHours);
  }
};

module.exports = {
  WEEKDAYS,
  TIME_PATTERN,
  normalizeWebsite,
  isHttpUrl,
  normalizeHours,
  applyProfileFields,
};
