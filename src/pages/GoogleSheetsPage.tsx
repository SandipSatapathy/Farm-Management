import React, { useState, useEffect } from 'react';
import { dataService } from '../lib/dataService';
import { SyncJob } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import {
  Table,
  Download,
} from 'lucide-react';

export const GoogleSheetsPage: React.FC = () => {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const loadData = () => {
    setSyncJobs(dataService.getSyncJobs());
  };

  useEffect(() => {
    localStorage.removeItem('kisanops_google_sheets_webhook_url');
    loadData();
  }, []);

  // Instant CSV Exports
  const exportTableAsCSV = (tableName: string) => {
    let csvContent = '';
    const nowStr = new Date().toISOString().slice(0, 10);

    if (tableName === 'workers') {
      const labourers = dataService.getLabourers();
      csvContent = 'Worker ID,Code,Full Name,Phone,Role Category,Daily Base Rate (INR),Active Status\n' +
        labourers.map(l => `"${l.id}","${l.labour_code}","${l.full_name}","${l.phone || ''}","${l.work_category || 'General Worker'}",${l.base_rate},"${l.is_active ? 'Active' : 'Inactive'}"`).join('\n');
      downloadCSV(`Farmlog_Workers_${nowStr}.csv`, csvContent);
    } else if (tableName === 'attendance') {
      const att = dataService.getAttendanceBetween('2020-01-01', '2030-12-31');
      const lMap = new Map(dataService.getLabourers().map(l => [l.id, l.full_name]));
      csvContent = 'Date,Worker Name,Status,Payable Units,Recorded At\n' +
        att.map(a => `"${a.work_date}","${lMap.get(a.labourer_id) || a.labourer_id}","${a.status}",${a.payable_units},"${a.created_at}"`).join('\n');
      downloadCSV(`Farmlog_Attendance_${nowStr}.csv`, csvContent);
    } else if (tableName === 'advances') {
      const adv = dataService.getAdvances();
      const lMap = new Map(dataService.getLabourers().map(l => [l.id, l.full_name]));
      csvContent = 'Date,Worker Name,Amount (INR),Given By,Purpose,Status\n' +
        adv.map(a => `"${a.issued_at ? a.issued_at.slice(0, 10) : ''}","${lMap.get(a.labourer_id) || a.labourer_id}",${a.amount},"${(a as any).given_by || a.issued_by || 'Supervisor'}","${a.purpose || ''}","${a.status}"`).join('\n');
      downloadCSV(`Farmlog_Advances_${nowStr}.csv`, csvContent);
    } else if (tableName === 'tractors') {
      const rentals = dataService.getTractorRentals();
      csvContent = 'Date,Tractor Name,Vendor Name,Hourly Rate (INR),Hours Operated,Gross Amount (INR),Advance Paid (INR),Balance Due (INR),Status,Task\n' +
        rentals.map(t => `"${t.work_date}","${t.tractor_name}","${t.vendor_name}",${t.hourly_rate},${t.hours_worked},${t.gross_amount},${t.advance_amount},${t.rest_amount},"${t.status}","${t.task_name || ''}"`).join('\n');
      downloadCSV(`Farmlog_Hired_Tractors_${nowStr}.csv`, csvContent);
    }
  };

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { name: 'Workers', desc: 'Master worker directory with UUID keys & wage rates', rows: dataService.getLabourers().length, key: 'workers' },
    { name: 'Attendance', desc: 'Daily crew logs, shifts, payable units & reasons', rows: dataService.getAttendanceBetween('2020-01-01', '2030-12-31').length, key: 'attendance' },
    { name: 'Advances', desc: 'Advance issuance, Given By name, and repayment ledger', rows: dataService.getAdvances().length, key: 'advances' },
    { name: 'Hired_Tractors', desc: 'Tractor operational hours, hourly rates & vendor rent', rows: dataService.getTractorRentals().length, key: 'tractors' },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Google Sheets & Excel Sync</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Export farm data as CSV files for Excel or manual import into Google Sheets.
          </p>
        </div>

      </div>

      <ClayCard style={{ marginBottom: 24, padding: 22, border: '2px solid #bbf7d0', background: '#f8fcf9' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#14532d' }}>Private Google Sheets connection</h3>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Direct browser sync is disabled to keep the Google Sheets endpoint private.
          An authenticated server-side integration is required before remote sync can resume.
          CSV downloads remain available below.
        </p>
      </ClayCard>

      {/* Mirrored Tabs Grid */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Spreadsheet Exports</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 30 }}>
        {tabs.map((tab, idx) => (
          <ClayCard key={idx} style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Table size={18} color="#15803d" />
                <strong style={{ fontSize: '1.05rem' }}>{tab.name}</strong>
              </div>
              <ClayBadge status="active" label="CSV available" />
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 14px 0', minHeight: 34 }}>
              {tab.desc}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid #eef3ee', paddingTop: 10, color: '#64748b' }}>
              <span>Total Rows: <strong>{tab.rows}</strong></span>
              <ClayButton
                variant="secondary"
                icon={<Download size={13} />}
                onClick={() => exportTableAsCSV(tab.key)}
                style={{ fontSize: '0.74rem', padding: '4px 10px', minHeight: 28 }}
              >
                Download CSV
              </ClayButton>
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
