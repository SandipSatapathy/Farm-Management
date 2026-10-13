import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sprout, LogOut, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { farm, currentUser, logout } = useAuth();

  return (
    <header
      className="app-navbar"
      style={{
        background: '#ffffff',
        borderBottom: '2px solid rgba(220, 235, 224, 0.8)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 12px rgba(166, 184, 170, 0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1320,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Brand & Farm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '3px 3px 8px rgba(21, 128, 61, 0.3)',
              flexShrink: 0,
            }}
          >
            <Sprout size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: 'var(--color-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                KisanOps
              </span>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 9999,
                  border: '1px solid rgba(21, 128, 61, 0.15)',
                }}
              >
                FY 2026-27
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, lineHeight: 1.1 }}>
              {farm.name}
            </div>
          </div>
        </div>

        {/* User Identity & Logout Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Active User Chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: currentUser.viewAccess === 'advanced' ? '#f0fdf4' : '#eff6ff',
              border: `1.5px solid ${currentUser.viewAccess === 'advanced' ? '#86efac' : '#93c5fd'}`,
              padding: '5px 12px',
              borderRadius: 14,
              fontSize: '0.8rem',
              fontWeight: 700,
              color: currentUser.viewAccess === 'advanced' ? '#14532d' : '#1e40af',
              boxShadow: '2px 2px 6px rgba(166, 184, 170, 0.2), inset 1px 1px 2px #ffffff',
            }}
            title={currentUser.roleTitle}
          >
            <ShieldCheck size={15} color={currentUser.viewAccess === 'advanced' ? '#16a34a' : '#2563eb'} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 800 }}>{currentUser.name}</span>
              <span style={{ fontSize: '0.68rem', color: currentUser.viewAccess === 'advanced' ? '#166534' : '#1d4ed8', fontWeight: 600 }}>
                {currentUser.viewAccess === 'simple' ? 'Simpler View' : 'Advanced View'}
              </span>
            </div>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: currentUser.viewAccess === 'advanced' ? '#22c55e' : '#3b82f6',
                boxShadow: `0 0 6px ${currentUser.viewAccess === 'advanced' ? '#22c55e' : '#3b82f6'}`,
              }}
            />
          </div>

          {/* Secure Sign Out Button */}
          <button
            type="button"
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '2px solid #fed7aa',
              borderRadius: 12,
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 800,
              fontSize: '0.8rem',
              color: '#c2410c',
              boxShadow: '2px 2px 6px rgba(194, 65, 12, 0.1)',
              minHeight: 36,
              transition: 'all 0.15s ease',
            }}
            title="Sign out from farm session"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

