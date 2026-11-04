const ACCOUNT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';

const LOCATION_READ_MASK = [
  'name',
  'title',
  'storefrontAddress',
  'phoneNumbers',
  'websiteUri',
  'categories',
  'regularHours',
  'metadata',
].join(',');

const googleFetch = async (url, accessToken) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message || 'Google Business Profile request failed');
    error.statusCode = response.status === 401 || response.status === 403 ? 401 : 502;
    throw error;
  }

  return data;
};

const listAccounts = async (accessToken) => {
  const accounts = [];
  let pageToken;

  do {
    const params = new URLSearchParams({ pageSize: '20' });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const data = await googleFetch(`${ACCOUNT_API}/accounts?${params}`, accessToken);
    accounts.push(...(data.accounts || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return accounts;
};

const listAccountLocations = async (accessToken, accountName) => {
  const locations = [];
  let pageToken;

  do {
    const params = new URLSearchParams({
      readMask: LOCATION_READ_MASK,
      pageSize: '100',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const data = await googleFetch(
      `${INFO_API}/${accountName}/locations?${params}`,
      accessToken
    );
    locations.push(...(data.locations || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return locations;
};

const listAllLocations = async (accessToken) => {
  const accounts = await listAccounts(accessToken);
  const locations = [];

  for (const account of accounts) {
    const accountLocations = await listAccountLocations(accessToken, account.name);

    for (const location of accountLocations) {
      locations.push({
        accountId: account.name,
        locationId: location.name,
        title: location.title || 'Untitled location',
        location,
      });
    }
  }

  return locations;
};

const getLocation = async (accessToken, locationName) => {
  const params = new URLSearchParams({ readMask: LOCATION_READ_MASK });
  return googleFetch(`${INFO_API}/${locationName}?${params}`, accessToken);
};

const formatTime = (time) => {
  if (!time || time.hours == null) {
    return '';
  }

  const hours = Number(time.hours);
  const minutes = Number(time.minutes || 0);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};

const formatAddress = (address) => {
  if (!address) {
    return '';
  }

  const street = (address.addressLines || []).join(', ');
  const cityLine = [address.locality, address.administrativeArea, address.postalCode]
    .filter(Boolean)
    .join(', ');

  return [street, cityLine].filter(Boolean).join(', ');
};

const formatHours = (regularHours) => {
  return (regularHours?.periods || []).map((period) => ({
    day: period.openDay || '',
    open: formatTime(period.openTime),
    close: formatTime(period.closeTime),
  }));
};

const toProfileSnapshot = (location) => ({
  name: location.title || '',
  category: location.categories?.primaryCategory?.displayName || '',
  address: formatAddress(location.storefrontAddress),
  phone: location.phoneNumbers?.primaryPhone || '',
  website: location.websiteUri || '',
  hours: formatHours(location.regularHours),
  mapsUri: location.metadata?.mapsUri || '',
  lastSyncedAt: new Date(),
});

module.exports = {
  listAllLocations,
  getLocation,
  toProfileSnapshot,
};
