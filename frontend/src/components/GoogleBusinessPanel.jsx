import { useCallback, useEffect, useState } from 'react';
import {
  disconnectGoogleBusiness,
  getGoogleBusinessLocations,
  getGoogleBusinessStatus,
  importGoogleBusiness,
  selectGoogleBusinessLocation,
  startGoogleBusinessConnect,
} from '../api/googleBusiness';

const formatDay = (day) => {
  if (!day) return '';
  return day.charAt(0) + day.slice(1).toLowerCase();
};

// Posts the one-time ticket to the API. A normal link would put the ticket in the
// address bar, where it can be copied and used from another browser.
const submitGoogleStart = ({ url, ticket }) => {
  const startUrl = new URL(url, window.location.origin);

  if (
    startUrl.pathname !== '/api/google/business/start' ||
    startUrl.search ||
    startUrl.username ||
    startUrl.password ||
    typeof ticket !== 'string' ||
    !ticket
  ) {
    throw new Error('Could not start Google connection');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${startUrl.origin}${startUrl.pathname}`;

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'ticket';
  input.value = ticket;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
};

export default function GoogleBusinessPanel({ token, business, onBusinessUpdated, notice }) {
  const [status, setStatus] = useState(null);
  const [locations, setLocations] = useState([]);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const loadStatus = useCallback(async () => {
    const data = await getGoogleBusinessStatus(token);
    setStatus(data);
    return data;
  }, [token]);

  const loadLocations = useCallback(async () => {
    const data = await getGoogleBusinessLocations(token);
    setLocations(data.locations || []);
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    loadStatus()
      .then(async (data) => {
        if (cancelled || !data.connected || data.locationId) return;
        await loadLocations();
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load Google Business Profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadLocations, loadStatus]);

  useEffect(() => {
    if (!notice) return;
    if (notice.type === 'error') {
      setError(notice.message);
      setSuccess('');
    } else {
      setSuccess(notice.message);
      setError('');
    }
  }, [notice]);

  const handleConnect = async () => {
    setError('');
    setSuccess('');
    setWorking(true);

    try {
      const data = await startGoogleBusinessConnect(token);
      submitGoogleStart(data);
    } catch (err) {
      setError(err.message || 'Could not start Google connection');
      setWorking(false);
    }
  };

  const handleSelect = async (location) => {
    setError('');
    setSuccess('');
    setWorking(true);

    try {
      const data = await selectGoogleBusinessLocation(token, location);
      setStatus(data);
      setLocations([]);
      setPicking(false);
      setSuccess(`Using ${data.locationTitle}.`);
    } catch (err) {
      setError(err.message || 'Could not select that location');
    } finally {
      setWorking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Business Profile?')) return;

    setError('');
    setSuccess('');
    setWorking(true);

    try {
      await disconnectGoogleBusiness(token);
      setStatus({ connected: false });
      setLocations([]);
      setPicking(false);
      setSuccess('Google Business Profile disconnected.');
    } catch (err) {
      setError(err.message || 'Could not disconnect');
    } finally {
      setWorking(false);
    }
  };

  const handleImport = async () => {
    setError('');
    setSuccess('');
    setWorking(true);

    try {
      const data = await importGoogleBusiness(token);
      onBusinessUpdated(data);
      setSuccess('Google business data synced.');
    } catch (err) {
      setError(err.message || 'Could not import Google business data');
    } finally {
      setWorking(false);
    }
  };

  const handleChangeLocation = async () => {
    setError('');
    setSuccess('');
    setWorking(true);

    try {
      await loadLocations();
      setPicking(true);
    } catch (err) {
      setError(err.message || 'Could not load locations');
    } finally {
      setWorking(false);
    }
  };

  const profile = business?.googleProfile;
  const showLocations = status?.connected && (!status.locationId || picking);

  if (loading) {
    return (
      <div className="panel">
        <h2>Google Business Profile</h2>
        <p className="muted">Loading connection...</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Google Business Profile</h2>
      <p className="muted panel-intro">
        Connect a listing, then sync its public details. The profile you save above stays
        as you entered it.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!status?.connected && (
        <button type="button" className="btn btn-primary" onClick={handleConnect} disabled={working}>
          {working ? 'Redirecting...' : 'Connect Google Business Profile'}
        </button>
      )}

      {showLocations && (
        <div>
          <p className="muted">Choose the location to import.</p>
          {locations.length === 0 ? (
            <p className="muted">No locations were found on this Google account.</p>
          ) : (
            <div className="location-list">
              {locations.map((location) => (
                <button
                  key={location.locationId}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSelect(location)}
                  disabled={working}
                >
                  {location.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {status?.connected && status.locationId && (
        <p>
          Connected location: <strong>{status.locationTitle || 'Selected location'}</strong>
        </p>
      )}

      {status?.connected && (
        <div className="panel-actions">
          {status.locationId && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={working || !business}
            >
              {working ? 'Working...' : 'Sync from Google'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleChangeLocation}
            disabled={working}
          >
            Change location
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDisconnect}
            disabled={working}
          >
            Disconnect
          </button>
        </div>
      )}

      {status?.connected && status.locationId && !business && (
        <p className="muted">Create your business profile above before syncing.</p>
      )}

      {profile && (
        <dl className="profile-list">
          <div>
            <dt>Name</dt>
            <dd>{profile.name || 'Not listed'}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{profile.category || 'Not listed'}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{profile.address || 'Not listed'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{profile.phone || 'Not listed'}</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>
              {profile.website ? (
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  {profile.website}
                </a>
              ) : (
                'Not listed'
              )}
            </dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>
              {profile.hours?.length ? (
                <ul className="hours-list">
                  {profile.hours.map((period) => (
                    <li key={`${period.day}-${period.open}-${period.close}`}>
                      {formatDay(period.day)}: {period.open}
                      {period.close ? ` – ${period.close}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                'Not listed'
              )}
            </dd>
          </div>
          {profile.mapsUri && (
            <div>
              <dt>Maps</dt>
              <dd>
                <a href={profile.mapsUri} target="_blank" rel="noopener noreferrer">
                  View on Google Maps
                </a>
              </dd>
            </div>
          )}
          {profile.lastSyncedAt && (
            <div>
              <dt>Last synced</dt>
              <dd>{new Date(profile.lastSyncedAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
