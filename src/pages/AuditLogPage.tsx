import React, { useState, useEffect } from 'react';
import { dataService } from '../lib/dataService';
import { AuditLog } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayBadge } from '../components/common/ClayBadge';
import { History, ShieldCheck, Search } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLogs(dataService.getAuditLogs());
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      (l.reason && l.reason.toLowerCase().includes(search.toLowerCase())) ||
      (l.actor_name && l.actor_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>System Audit Trail</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
          Append-only, immutable activity log tracking every sensitive mutation, wage calculation, and close event.
        </p>
      </div>

      <ClayCard style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <input
            type="text"
            placeholder="Search audit action, entity, actor or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="clay-input"
            style={{ paddingLeft: 40 }}
          />
          <Search size={18} color="#64748b" style={{ position: 'absolute', left: 14, top: 14 }} />
        </div>
      </ClayCard>

      <div className="clay-table-container">
        <table className="clay-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
              <th>Reason / Audit Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                  {new Date(log.occurred_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      background: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: 6,
                      color: '#0f172a',
                    }}
                  >
                    {log.action}
                  </span>
                </td>
                <td>
                  <strong style={{ fontSize: '0.85rem' }}>{log.entity_type}</strong>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.actor_name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize' }}>
                    {log.actor_role}
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem', color: '#334155' }}>{log.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
