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
    checkLocalDbHealth().then(setDbHealth);
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
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    border: '1px solid #bfdbfe',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}
                >
                  <Database size={11} color="#2563eb" />
                  Local Dev DB (PostgreSQL)
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
                  Supabase Cloud (Live)
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
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: isLocalDbEnabled ? '#dbeafe' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={20} color={isLocalDbEnabled ? '#1d4ed8' : '#15803d'} />
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

              <div style={{ background: isLocalDbEnabled ? '#eff6ff' : '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 14, border: isLocalDbEnabled ? '1px solid #bfdbfe' : '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: isLocalDbEnabled ? '#1e40af' : '#64748b', marginBottom: 2, fontWeight: 700 }}>
                  {isLocalDbEnabled ? 'LOCAL DEVELOPMENT DATABASE' : 'CONNECTED BACKEND'}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: isLocalDbEnabled ? '#1d4ed8' : '#15803d' }}>
                  {isLocalDbEnabled ? '💻 Local PostgreSQL (farmlog_dev)' : '⚡ Supabase Cloud Server (PostgreSQL)'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>
                  {isLocalDbEnabled ? 'Host: localhost:5432 | DB: farmlog_dev' : `URL: ${import.meta.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, '') || 'Supabase Cloud'}`}
                </div>
              </div>

              <div style={{ background: isLocalDbEnabled ? '#f8fafc' : '#f0fdf4', padding: 14, borderRadius: 12, border: isLocalDbEnabled ? '1px solid #e2e8f0' : '1px solid #bbf7d0', marginBottom: 18 }}>
                <div style={{ fontSize: '0.75rem', color: isLocalDbEnabled ? '#475569' : '#15803d', fontWeight: 800 }}>
                  {isLocalDbEnabled ? 'DEVELOPER TESTING ISOLATION' : 'LIVE SERVER DATABASE'}
                </div>
                <div style={{ fontSize: '0.85rem', color: isLocalDbEnabled ? '#334155' : '#166534', marginTop: 4, lineHeight: 1.4 }}>
                  {isLocalDbEnabled
                    ? 'All testing records, dummy workers, attendance, and settlements are safely saved only to your local PC PostgreSQL database (farmlog_dev). Live Supabase production data is protected and never contaminated.'
                    : 'All labour shifts, advances, payouts, and tractor khata records are read and written directly to your central Supabase Cloud Server in real-time across all phones and web.'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDbModal(false)}
                style={{
                  width: '100%',
                  background: isLocalDbEnabled ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #16a34a, #15803d)',
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

