import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sprout, LogOut, Database } from 'lucide-react';
import { checkLocalDbHealth, LocalDbHealth, isLocalDbEnabled } from '../../lib/localDbClient';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

export const Navbar: React.FC = () => {
  const { farm, logout } = useAuth();
  const [dbHealth, setDbHealth] = useState<LocalDbHealth | null>(null);
  const [showDbModal, setShowDbModal] = useState(false);

  useEffect(() => {
    if (isLocalDbEnabled) {
      checkLocalDbHealth().then(setDbHealth);
    }
  }, []);

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
                FarmLog
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

              {isLocalDbEnabled ? (
                <button
                  type="button"
                  onClick={() => setShowDbModal(true)}
                  title={dbHealth?.connected ? `Connected to PostgreSQL (${dbHealth.database})` : dbHealth?.hint || dbHealth?.error}
                  style={{
                    background: dbHealth?.connected ? '#eff6ff' : '#fef3c7',
                    color: dbHealth?.connected ? '#1e40af' : '#92400e',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    border: `1px solid ${dbHealth?.connected ? '#bfdbfe' : '#fde68a'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}
                >
                  <Database size={11} color={dbHealth?.connected ? '#2563eb' : '#d97706'} />
                  {dbHealth?.connected ? 'Postgres 18' : 'Postgres (Setup PW)'}
                </button>
              ) : isSupabaseConfigured ? (
                <button
                  type="button"
                  onClick={() => setShowDbModal(true)}
                  style={{
                    background: '#f0fdf4',
                    color: '#15803d',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    border: '1px solid #bbf7d0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}
                >
                  <Database size={11} color="#16a34a" />
                  Supabase
                </button>
              ) : null}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, lineHeight: 1.1 }}>
              {farm.name}
            </div>
          </div>
        </div>

        {/* Database Info Modal */}
        {showDbModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16
            }}
            onClick={() => setShowDbModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 20,
                maxWidth: 420,
                width: '100%',
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '1px solid #e2e8f0'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={20} color="#15803d" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Database Diagnostics</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Active Storage Engine</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDbModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 2 }}>CONNECTED BACKEND</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>
                  {isLocalDbEnabled ? '🐘 Local PostgreSQL 18' : '⚡ Supabase Cloud (PostgreSQL)'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>
                  {isLocalDbEnabled 
                    ? `Host: localhost:5432 • Database: ${dbHealth?.database || 'farmlog_dev'}`
                    : `URL: ${import.meta.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, '') || 'Supabase Cloud'}`}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#f0fdf4', padding: 10, borderRadius: 10, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>CLOUD SYNC</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#166534' }}>Active & Live</div>
                </div>
                <div style={{ background: '#f0f9ff', padding: 10, borderRadius: 10, border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 700 }}>OFFLINE READY</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#075985' }}>Device Storage</div>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4, marginBottom: 18 }}>
                Your mobile app automatically saves all records offline to your device, and synchronizes with your <strong>Supabase Cloud Database</strong> whenever connected.
              </div>

              <button
                type="button"
                onClick={() => setShowDbModal(false)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 0',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* Secure Sign Out Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

