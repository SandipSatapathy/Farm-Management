import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  UserCog,
  Smartphone,
  Database,
  Sprout,
  LogOut,
  Save,
  Lock,
  Mail,
  User,
  Sparkles,
  X
} from 'lucide-react';

interface UserSettingsPageProps {
  onClose?: () => void;
  compact?: boolean;
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({ onClose, compact = false }) => {
  const { currentUser, farm, updatePassword, updateProfile, logout } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Profile Edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: '#94a3b8' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass) || (/[a-z]/.test(pass) && /[A-Z]/.test(pass))) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: '#ef4444' };
      case 2:
        return { score: 2, label: 'Fair', color: '#f59e0b' };
      case 3:
        return { score: 3, label: 'Good', color: '#0284c7' };
      case 4:
        return { score: 4, label: 'Strong', color: '#16a34a' };
      default:
        return { score: 1, label: 'Weak', color: '#ef4444' };
    }
  };

  const strength = getPasswordStrength(newPassword);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPassError('New password cannot be the same as your current password.');
      return;
    }

    setIsUpdatingPass(true);
    try {
      const res = await updatePassword(currentPassword, newPassword);
      setPassSuccess(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!fullName.trim()) {
      setProfileMsg({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await updateProfile(fullName, email);
      setProfileMsg({ type: 'success', text: res.message });
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const initials = currentUser.name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const isRemembered = typeof window !== 'undefined' && localStorage.getItem('farmlog_remember_me') === 'true';

  return (
    <div className={compact ? 'user-settings-compact' : 'page-wrapper'} style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Page Title & Close Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)',
              }}
            >
              <UserCog size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: compact ? '1.4rem' : '1.75rem', margin: 0, color: 'var(--color-primary-dark)' }}>
                User Account & Password
              </h1>
              <p style={{ color: 'var(--color-text-muted)', margin: '2px 0 0 0', fontSize: '0.86rem' }}>
                Manage your credentials, profile details, and device security
              </p>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="clay-btn clay-btn-secondary clay-btn-sm clay-btn-icon"
            style={{ width: 36, height: 36, borderRadius: '50%' }}
            title="Close Settings"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Column 1: Profile Summary Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* User Profile Card */}
          <ClayCard style={{ padding: 22, background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #22c55e, #15803d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  fontFamily: 'Outfit, sans-serif',
                  boxShadow: '0 6px 16px rgba(21, 128, 61, 0.3)',
                  flexShrink: 0,
                  border: '2px solid #ffffff'
                }}
              >
                {initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                    {currentUser.name}
                  </h3>
                  <span
                    style={{
                      background: currentUser.viewAccess === 'advanced' ? '#dcfce7' : '#e0f2fe',
                      color: currentUser.viewAccess === 'advanced' ? '#15803d' : '#0369a1',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      border: `1px solid ${currentUser.viewAccess === 'advanced' ? '#86efac' : '#7dd3fc'}`,
                    }}
                  >
                    {currentUser.viewAccess === 'simple' ? 'Simple View' : 'Full Suite'}
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>@{currentUser.username}</span>
                  <span>•</span>
                  <span style={{ textTransform: 'capitalize' }}>{currentUser.role.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {profileMsg && (
              <div
                style={{
                  background: profileMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                  border: `1.5px solid ${profileMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
                  color: profileMsg.type === 'success' ? '#14532d' : '#991b1b',
                  borderRadius: 12,
                  padding: '8px 12px',
                  marginBottom: 14,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            {!isEditingProfile ? (
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} /> Full Name
                    </span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{currentUser.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={14} /> Contact Email
                    </span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{currentUser.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sprout size={14} /> Active Farm
                    </span>
                    <span style={{ fontWeight: 700, color: '#15803d' }}>{farm.name}</span>
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFullName(currentUser.name);
                      setEmail(currentUser.email);
                      setIsEditingProfile(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#15803d',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Edit Display Name / Email
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} style={{ background: '#f8fafc', borderRadius: 14, padding: 14, border: '1px solid #cbd5e1', marginBottom: 14 }}>
                <div style={{ marginBottom: 10 }}>
                  <label className="clay-label" style={{ fontSize: '0.78rem' }}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="clay-input"
                    required
                    style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="clay-label" style={{ fontSize: '0.78rem' }}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="clay-input"
                    required
                    style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <ClayButton variant="primary" size="sm" type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
                  </ClayButton>
                </div>
              </form>
            )}

            {/* Device & Session Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: isRemembered ? '#f0fdf4' : '#f8fafc', padding: 10, borderRadius: 12, border: `1px solid ${isRemembered ? '#bbf7d0' : '#e2e8f0'}` }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Smartphone size={12} /> AUTO-LOGIN
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: isRemembered ? '#15803d' : '#64748b', marginTop: 2 }}>
                  {isRemembered ? 'Saved On Device' : 'Session Only'}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: 10, borderRadius: 12, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Database size={12} /> STORAGE
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#166534', marginTop: 2 }}>
                  Cloud + Offline
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  color: '#e11d48',
                  padding: '7px 16px',
                  borderRadius: 12,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <LogOut size={15} />
                <span>Sign Out from Device</span>
              </button>
            </div>
          </ClayCard>
        </div>

        {/* Column 2: Password Update Card */}
        <div>
          <ClayCard style={{ padding: 24, background: '#ffffff', border: '2px solid rgba(220, 235, 224, 0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#15803d'
                }}
              >
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                  Update Password
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Protect your farm operations with a secure password
                </span>
              </div>
            </div>

            {passSuccess && (
              <div
                style={{
                  background: '#dcfce7',
                  border: '2px solid #86efac',
                  color: '#14532d',
                  borderRadius: 14,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 12px rgba(21, 128, 61, 0.15)'
                }}
              >
                <CheckCircle2 size={20} color="#15803d" style={{ flexShrink: 0 }} />
                <span>{passSuccess}</span>
              </div>
            )}

            {passError && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '2px solid #fca5a5',
                  color: '#991b1b',
                  borderRadius: 14,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontWeight: 700,
                  fontSize: '0.86rem'
                }}
              >
                <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              {/* Current Password */}
              <div style={{ marginBottom: 16 }}>
                <label className="clay-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Current Password</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Required for verification</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    placeholder="Enter existing password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="clay-input"
                    required
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4
                    }}
                    tabIndex={-1}
                    aria-label={showCurrentPass ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ marginBottom: 14 }}>
                <label className="clay-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="clay-input"
                    required
                    minLength={6}
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4
                    }}
                    tabIndex={-1}
                    aria-label={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Password Strength:</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, height: 5 }}>
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          style={{
                            flex: 1,
                            borderRadius: 4,
                            background: step <= strength.score ? strength.color : '#e2e8f0',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 20 }}>
                <label className="clay-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="clay-input"
                    required
                    minLength={6}
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4
                    }}
                    tabIndex={-1}
                    aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {confirmPassword && (
                  <div style={{ marginTop: 6, fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {newPassword === confirmPassword ? (
                      <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} /> Passwords match
                      </span>
                    ) : (
                      <span style={{ color: '#e11d48', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={13} /> Passwords do not match yet
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <ClayButton
                  variant="primary"
                  icon={<ShieldCheck size={18} />}
                  type="submit"
                  disabled={isUpdatingPass || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: '0.95rem' }}
                >
                  {isUpdatingPass ? 'Updating Password...' : 'Save New Password'}
                </ClayButton>
              </div>
            </form>
          </ClayCard>
        </div>
      </div>
    </div>
  );
};
