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
              gap: 6,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '5px 10px',
              borderRadius: 12,
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#14532d',
            }}
            title={`Authorized as ${currentUser.name}`}
          >
            <ShieldCheck size={14} color="#16a34a" />
            <span style={{ display: 'none', minWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="user-label">
              {currentUser.name}
            </span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px #22c55e',
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
          </button>
        </div>
      </div>
    </header>
  );
};

