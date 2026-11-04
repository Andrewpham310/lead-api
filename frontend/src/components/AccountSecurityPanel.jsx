import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

export default function AccountSecurityPanel() {
  const { token, user, saveSession, logoutAll } = useAuth();
  const navigate = useNavigate();
  // Google-only accounts have no password yet and can set one directly.
  const hasPassword = user?.hasPassword !== false;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < MIN_PASSWORD || newPassword.length > MAX_PASSWORD) {
      setError(`New password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);

    try {
      const data = await changePassword(token, {
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
      });
      // The server revoked every older token and issued a fresh one for this device.
      saveSession(data.token, data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(data.message || 'Password updated.');
    } catch (err) {
      setError(err.message || 'Could not update password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Log out of all devices, including this one?')) return;

    setError('');
    setSuccess('');
    setSigningOut(true);

    try {
      await logoutAll();
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Could not log out of all devices');
      setSigningOut(false);
    }
  };

  return (
    <div className="panel">
      <h2>Account security</h2>
      <p className="muted panel-intro">
        Signed in as <strong>{user?.email}</strong>
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handlePasswordSubmit} className="form">
        <fieldset className="form-section">
          <legend>{hasPassword ? 'Change password' : 'Set a password'}</legend>

          {!hasPassword && (
            <p className="field-hint">
              You sign in with Google. Set a password to also sign in with your email.
            </p>
          )}

          {hasPassword && (
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
          )}

          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              maxLength={MAX_PASSWORD}
              required
            />
          </label>

          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              maxLength={MAX_PASSWORD}
              required
            />
          </label>

          <p className="field-hint">
            Changing your password signs out every other device.
          </p>

          <div className="panel-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || signingOut}>
              {saving ? 'Saving...' : hasPassword ? 'Change password' : 'Set password'}
            </button>
          </div>
        </fieldset>
      </form>

      <div className="form-section security-sessions">
        <h3>Sessions</h3>
        <p className="field-hint">
          Lost a device or signed in on a shared computer? This signs out every session,
          including this one.
        </p>
        <div className="panel-actions">
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleLogoutAll}
            disabled={saving || signingOut}
          >
            {signingOut ? 'Signing out...' : 'Log out of all devices'}
          </button>
        </div>
      </div>
    </div>
  );
}