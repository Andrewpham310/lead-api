export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const emptyHours = () =>
  WEEKDAYS.map((day) => ({
    day,
    closed: false,
    open: '',
    close: '',
  }));

export const emptyBusinessProfile = () => ({
  businessName: '',
  industry: '',
  address: '',
  phone: '',
  website: '',
  serviceCatalog: [],
  businessHours: emptyHours(),
});

export function profileFromBusiness(business) {
  if (!business) return emptyBusinessProfile();

  const hoursByDay = new Map(
    (business.businessHours || []).map((period) => [period.day, period])
  );

  return {
    businessName: business.businessName || '',
    industry: business.industry || '',
    address: business.address || '',
    phone: business.phone || '',
    website: business.website || '',
    serviceCatalog: (business.serviceCatalog || []).map((service) => ({
      clientKey: service.id || crypto.randomUUID(),
      name: service.name || '',
      description: service.description || '',
      price: service.price || '',
    })),
    businessHours: WEEKDAYS.map((day) => {
      const period = hoursByDay.get(day);
      return {
        day,
        closed: Boolean(period?.closed),
        open: period?.open || '',
        close: period?.close || '',
      };
    }),
  };
}

export function toBusinessPayload(profile) {
  return {
    businessName: profile.businessName.trim(),
    industry: profile.industry.trim(),
    address: profile.address.trim(),
    phone: profile.phone.trim(),
    website: profile.website.trim(),
    serviceCatalog: profile.serviceCatalog
      .map((service) => ({
        name: service.name.trim(),
        description: service.description.trim(),
        price: service.price.trim(),
      }))
      .filter((service) => service.name || service.description || service.price),
    businessHours: profile.businessHours.map((period) => ({
      day: period.day,
      closed: Boolean(period.closed),
      open: period.closed ? '' : period.open,
      close: period.closed ? '' : period.close,
    })),
  };
}

export function validateBusinessProfile(profile) {
  if (!profile.businessName.trim()) {
    return 'Business name is required';
  }

  for (const service of profile.serviceCatalog) {
    const name = service.name.trim();
    const description = service.description.trim();
    const price = service.price.trim();

    if ((description || price) && !name) {
      return 'Each service needs a name';
    }
  }

  for (const period of profile.businessHours) {
    if (period.closed) continue;

    const open = period.open.trim();
    const close = period.close.trim();

    if (!open && !close) continue;

    if (!open || !close) {
      return `Enter an open and close time for ${period.day}, or mark it closed`;
    }

    if (open >= close) {
      return `${period.day} closing time must be after the opening time`;
    }
  }

  return '';
}
