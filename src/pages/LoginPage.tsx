import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import {
  Sprout,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  KeyRound
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, farm } = useAuth();
  const [username, setUsername] = useState('admin@greenfield.farm');
  const [password, setPassword] = useState('farmpassword');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin@greenfield.farm');
    setPassword('farmpassword');
    setErrorMsg('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        {/* Brand Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 20px rgba(21, 128, 61, 0.35)',
              marginBottom: 12,
            }}
          >
            <Sprout size={32} />
          </div>

          <h1 style={{ fontSize: '1.9rem', margin: '0 0 6px 0', color: '#143823' }}>
            KisanOps Farm Portal
          </h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
            {farm.name} • Authorized Farm Access
          </p>
        </div>

        {/* Claymorphism Login Card */}
        <ClayCard style={{ padding: '28px 24px' }}>
          {errorMsg && (
            <div
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                border: '2px solid #fecaca',
                padding: '10px 14px',
                borderRadius: 14,
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={18} color="#dc2626" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username / Email Field */}
            <div style={{ marginBottom: 16 }}>
              <label className="clay-label">Username or Farm Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. admin or admin@greenfield.farm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="clay-input"
                  style={{ paddingLeft: 42, minHeight: 48, fontSize: '0.95rem' }}
                  required
                />
                <User
                  size={18}
                  color="#64748b"
                  style={{ position: 'absolute', left: 14, top: 15 }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 20 }}>
              <label className="clay-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="clay-input"
                  style={{ paddingLeft: 42, paddingRight: 42, minHeight: 48, fontSize: '0.95rem' }}
                  required
                />
                <Lock
                  size={18}
                  color="#64748b"
                  style={{ position: 'absolute', left: 14, top: 15 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 13,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 4,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <ClayButton
              variant="primary"
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                minHeight: 50,
                fontSize: '1.05rem',
                justifyContent: 'center',
                boxShadow: 'var(--clay-btn-shadow)',
              }}
            >
              <ShieldCheck size={20} />
              <span>{isLoading ? 'Authorizing...' : 'Authorize & Sign In'}</span>
            </ClayButton>
          </form>

          {/* Helper Credentials Box */}
          <div
            style={{
              marginTop: 24,
              padding: '12px 14px',
              background: '#f8faf8',
              borderRadius: 14,
              border: '1px solid rgba(220, 235, 224, 0.8)',
              fontSize: '0.82rem',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: 700, color: '#143823', marginBottom: 4 }}>
              Authorized Farm Credentials
            </div>
            <div>
              Username: <code style={{ fontWeight: 700, color: '#15803d' }}>admin</code> • Password: <code style={{ fontWeight: 700, color: '#15803d' }}>farmpassword</code>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              style={{
                background: 'none',
                border: 'none',
                color: '#15803d',
                fontWeight: 700,
                textDecoration: 'underline',
                cursor: 'pointer',
                marginTop: 6,
                fontSize: '0.8rem',
              }}
            >
              Fill Credentials Automatically
            </button>
          </div>
        </ClayCard>

        {/* Security Notice */}
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.75rem', color: '#64748b' }}>
          🔒 Protected Farm Portal • Shared Team Access with Complete Operation Rights
        </div>
      </div>
    </div>
  );
};
