import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { createUserService } from '../../../services/api/userService';
import { createAuthService } from '../../../services/auth/authService';

const userService = createUserService();
const authService = createAuthService();

export function ClientSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setIsSavingProfile(true);
    try {
      await userService.updateProfile(profile.id, { fullName });
      await refreshProfile();
      showSuccess('Profile updated.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }
    setIsSavingPassword(true);
    try {
      await authService.updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password updated.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Settings</h2>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">Profile</h3>
          <form onSubmit={handleProfileSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input id="email" type="email" className="form-control" value={profile?.email ?? ''} disabled readOnly />
            </div>
            <div className="mb-3">
              <label htmlFor="fullName" className="form-label">
                Full name
              </label>
              <input id="fullName" type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="mb-3">
              <span className="form-label d-block">Account Status</span>
              <span className="badge text-bg-secondary text-capitalize">{profile?.accountStatus.replace('_', ' ')}</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">Change Password</h3>
          <form onSubmit={handlePasswordSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                className="form-control"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSavingPassword || !newPassword}>
              {isSavingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
