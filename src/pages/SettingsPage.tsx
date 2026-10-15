import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../lib/dataService';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { UserSettingsPage } from './UserSettingsPage';
import { Sliders, Save, CheckCircle2, ShieldCheck, UserCog, Building2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { farm, canManageUsers, isReadOnlyPartner, refreshData } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'farm'>('user');
  const [name, setName] = useState(farm.name);
  const [address, setAddress] = useState(farm.address || '');
  const [currency, setCurrency] = useState(farm.currency_code);
  const [timezone, setTimezone] = useState(farm.timezone);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyPartner || !canManageUsers) return;

    dataService.updateFarm({
      name,
      address,
      currency_code: currency,
      timezone,
    });
    refreshData();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="page-wrapper">
      {/* Top Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-primary-dark)' }}>
          Settings & Preferences
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
          Manage your personal account credentials, security password, and farm enterprise configurations.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 24,
          borderBottom: '2px solid rgba(220, 235, 224, 0.8)',
          paddingBottom: 12
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('user')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 14,
            border: activeTab === 'user' ? '2px solid #86efac' : '1.5px solid transparent',
            background: activeTab === 'user' ? '#dcfce7' : '#f8fafc',
            color: activeTab === 'user' ? '#14532d' : '#64748b',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <UserCog size={18} color={activeTab === 'user' ? '#15803d' : '#64748b'} />
          <span>My Account & Password</span>
        </button>

        {canManageUsers && (
          <button
            type="button"
            onClick={() => setActiveTab('farm')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 14,
              border: activeTab === 'farm' ? '2px solid #86efac' : '1.5px solid transparent',
              background: activeTab === 'farm' ? '#dcfce7' : '#f8fafc',
              color: activeTab === 'farm' ? '#14532d' : '#64748b',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Building2 size={18} color={activeTab === 'farm' ? '#15803d' : '#64748b'} />
            <span>Farm Enterprise Profile</span>
          </button>
        )}
      </div>

      {/* Tab 1: User Settings & Password */}
      {activeTab === 'user' && (
        <UserSettingsPage />
      )}

      {/* Tab 2: Farm Enterprise Profile */}
      {activeTab === 'farm' && canManageUsers && (
        <div>
          {savedSuccess && (
            <div style={{ background: '#dcfce7', border: '2px solid #86efac', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#14532d', fontWeight: 700 }}>
              <CheckCircle2 size={18} color="#15803d" />
              <span>Farm settings saved successfully!</span>
            </div>
          )}

          <ClayCard style={{ maxWidth: 700, padding: 28 }}>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 16 }}>
                <label className="clay-label">Farm Enterprise Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="clay-input"
                  disabled={isReadOnlyPartner || !canManageUsers}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="clay-label">Farm Address / Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="clay-input"
                  disabled={isReadOnlyPartner || !canManageUsers}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="clay-label">Currency Code</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="clay-input"
                    disabled
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Indian Rupee (₹ INR)</span>
                </div>

                <div>
                  <label className="clay-label">Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="clay-input"
                    disabled
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Default: Asia/Kolkata (IST)</span>
                </div>
              </div>

              <div style={{ padding: 14, background: '#f8faf8', borderRadius: 14, border: '1px solid #d1fae5', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#14532d', marginBottom: 4 }}>
                  Statutory Financial Year Boundary
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Fixed Indian Financial Year: <strong>1 April through 31 March</strong>. Half-open date ranges are strictly applied across all reporting modules.
                </div>
              </div>

              {canManageUsers && !isReadOnlyPartner && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ClayButton variant="primary" icon={<Save size={18} />} type="submit">
                    Save Farm Settings
                  </ClayButton>
                </div>
              )}
            </form>
          </ClayCard>
        </div>
      )}
    </div>
  );
};
