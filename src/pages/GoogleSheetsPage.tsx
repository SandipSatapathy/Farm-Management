import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../lib/dataService';
import { SyncJob } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  Table,
  FileSpreadsheet,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const GoogleSheetsPage: React.FC = () => {
  const { farm, isReadOnlyPartner } = useAuth();
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const loadData = () => {
    setSyncJobs(dataService.getSyncJobs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await dataService.triggerSync();
      setSyncMsg('All operational tables successfully mirrored to Google Sheets!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  const tabs = [
    { name: 'Labourers', desc: 'Master worker directory with UUID keys & wage rates', rows: dataService.getLabourers().length, lastSync: 'Just now' },
    { name: 'Attendance', desc: 'Daily crew logs, shifts, payable units & reasons', rows: dataService.getAttendanceBetween('2026-04-01', '2027-03-31').length, lastSync: 'Just now' },
    { name: 'Payroll_Lines', desc: 'Frozen wage lines, net payable & payment allocations', rows: 6, lastSync: 'Just now' },
    { name: 'Advances', desc: 'Advance issuance, repayments, and outstanding ledger', rows: dataService.getAdvances().length, lastSync: 'Just now' },
    { name: 'Machinery', desc: 'Assets register, meter readings & ownership', rows: dataService.getMachinery().length, lastSync: 'Just now' },
    { name: 'Usage_Logs', desc: 'Tractor operational hours, meter deltas & diesel logs', rows: dataService.getMachineryUsage().length, lastSync: 'Just now' },
    { name: 'Machinery_Expenses', desc: 'Fuel purchases, repairs & servicing bills', rows: dataService.getExpenses().length, lastSync: 'Just now' },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Google Sheets Reporting Mirror</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Asynchronous reporting mirror for stakeholders. Supabase remains the authoritative source of truth.
          </p>
        </div>

        {!isReadOnlyPartner && (
          <ClayButton
            variant="primary"
            icon={<RefreshCw size={18} className={isSyncing ? 'spin' : ''} />}
            onClick={handleSyncNow}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing Tables...' : 'Sync Mirror Now'}
          </ClayButton>
        )}
      </div>

      {syncMsg && (
        <div style={{ background: '#dcfce7', border: '2px solid #86efac', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#14532d', fontWeight: 700 }}>
          <CheckCircle2 size={18} color="#15803d" />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* Architecture Guardrail Banner */}
      <ClayCard style={{ marginBottom: 24, background: '#f8faf8', border: '2px solid #bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <ShieldCheck size={26} color="#15803d" style={{ marginTop: 2 }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#14532d' }}>
              Architecture Rule: One-Way Projection Mirror
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Supabase Postgres is the primary database enforcing Row-Level Security, foreign keys, and audit logs. Google Sheets receives deterministic UUID-based row upserts for stakeholder convenience. Manual edits made directly in Google Sheets do not write back to Supabase.
            </p>
          </div>
        </div>
      </ClayCard>

      {/* Mirrored Tabs Grid */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Mirrored Spreadsheet Tabs</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 30 }}>
        {tabs.map((tab, idx) => (
          <ClayCard key={idx} style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Table size={18} color="#15803d" />
                <strong style={{ fontSize: '1.05rem' }}>{tab.name}</strong>
              </div>
              <ClayBadge status="active" label="Synced" />
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 14px 0', minHeight: 34 }}>
              {tab.desc}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid #eef3ee', paddingTop: 8, color: '#64748b' }}>
              <span>Total Rows: <strong>{tab.rows}</strong></span>
              <span>Updated: {tab.lastSync}</span>
            </div>
          </ClayCard>
        ))}
      </div>

      {/* Outbox Sync Jobs Log */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Outbox Sync Jobs Log (`sync_jobs`)</h3>
      <div className="clay-table-container">
        <table className="clay-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Entity</th>
              <th>Operation</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Last Execution</th>
            </tr>
          </thead>
          <tbody>
            {syncJobs.map((job) => (
              <tr key={job.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{job.id}</td>
                <td><strong>{job.entity_type}</strong></td>
                <td><span style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>{job.operation}</span></td>
                <td>
                  <ClayBadge status="active" label={job.status.toUpperCase()} />
                </td>
                <td>{job.attempt_count}</td>
                <td>{job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
