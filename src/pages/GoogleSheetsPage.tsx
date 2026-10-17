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
  AlertCircle,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code2
} from 'lucide-react';

export const GoogleSheetsPage: React.FC = () => {
  const { farm, isReadOnlyPartner } = useAuth();
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const DEFAULT_WEBHOOK_URL =
    import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
    'https://script.google.com/macros/s/AKfycbwzPHk9cX19SgD04boxnAJ5AsHQF9ahZvpFP5WovBtGjmN74Pz0H1IhVXFCKUL-0Czh/exec';
  const [webhookUrl, setWebhookUrl] = useState(() => {
    try {
      return sessionStorage.getItem('kisanops_google_sheets_webhook_url') || DEFAULT_WEBHOOK_URL;
    } catch {
      return DEFAULT_WEBHOOK_URL;
    }
  });
  const [showGuide, setShowGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadData = () => {
    setSyncJobs(dataService.getSyncJobs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveWebhook = () => {
    try {
      sessionStorage.setItem('kisanops_google_sheets_webhook_url', webhookUrl.trim());
      localStorage.removeItem('kisanops_google_sheets_webhook_url');
    } catch {}
    setSyncMsg('Google Apps Script Webhook URL saved successfully!');
    setTimeout(() => setSyncMsg(''), 4000);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await dataService.triggerSync(webhookUrl.trim());
      setSyncMsg(res.message || 'All operational tables successfully mirrored!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

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

  const appsScriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    function writeTab(sheetName, headers, rows) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);
      sheet.clearContents();
      if (headers && headers.length) {
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length)
             .setFontWeight("bold")
             .setBackground("#15803d")
             .setFontColor("#ffffff");
      }
      if (rows && rows.length) {
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
    }

    if (data.labourers) {
      writeTab("Workers", 
        ["Worker ID", "Name", "Phone", "Role", "Daily Rate (₹)", "Status"],
        data.labourers.map(function(l) { return [l.id, l.full_name, l.phone || "", l.role_title || "Worker", l.default_daily_rate, l.status]; })
      );
    }

    if (data.attendance) {
      writeTab("Attendance", 
        ["Date", "Worker ID", "Status", "Payable Units", "Recorded At"],
        data.attendance.map(function(a) { return [a.work_date, a.labourer_id, a.status, a.payable_units, a.created_at]; })
      );
    }

    if (data.advances) {
      writeTab("Advances", 
        ["Date", "Worker ID", "Amount (₹)", "Given By", "Reason", "Status"],
        data.advances.map(function(adv) { return [adv.issued_at ? adv.issued_at.slice(0,10) : "", adv.labourer_id, adv.amount, adv.given_by || "Supervisor", adv.reason || "", adv.status || "active"]; })
      );
    }

    if (data.tractorRentals) {
      writeTab("Hired_Tractors", 
        ["Date", "Tractor Name", "Owner", "Rate/hr (₹)", "Hours Run", "Total Rent (₹)", "Driver", "Purpose", "Payment"],
        data.tractorRentals.map(function(t) { return [t.rental_date, t.tractor_name, t.owner_name, t.hourly_rate, t.hours_operated, t.total_cost, t.driver_name || "", t.work_description || "", t.payment_status]; })
      );
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", syncedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyAppsScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
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
            Live mirror to Google Sheets via Webhook or direct 1-click Excel CSV export.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!isReadOnlyPartner && (
            <ClayButton
              variant="primary"
              icon={<RefreshCw size={18} className={isSyncing ? 'spin' : ''} />}
              onClick={handleSyncNow}
              disabled={isSyncing}
            >
              {isSyncing ? 'Mirroring to Sheets...' : 'Sync to Google Sheets Now'}
            </ClayButton>
          )}
        </div>
      </div>

      {syncMsg && (
        <div style={{ background: '#dcfce7', border: '2px solid #86efac', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#14532d', fontWeight: 700 }}>
          <CheckCircle2 size={18} color="#15803d" />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* Webhook Connection Card */}
      <ClayCard style={{ marginBottom: 24, padding: 22, border: '2px solid #bbf7d0', background: '#f8fcf9' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: '#14532d', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={22} color="#15803d" />
              Google Apps Script Webhook Connection
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--color-text-muted)' }}>
              Paste your deployed Google Apps Script Web App URL below to sync your farm data directly into your personal Google Sheet.
            </p>
          </div>

          <ClayButton
            variant="secondary"
            onClick={() => setShowGuide(!showGuide)}
            icon={showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            style={{ fontSize: '0.85rem' }}
          >
            {showGuide ? 'Hide Setup Instructions' : 'View 2-Min Setup Guide & Code'}
          </ClayButton>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
            className="clay-input"
            style={{ flex: 1, minWidth: 280, minHeight: 44, fontSize: '0.9rem' }}
          />
          <ClayButton variant="primary" onClick={handleSaveWebhook} style={{ minHeight: 44 }}>
            Save Webhook URL
          </ClayButton>
        </div>

        {/* Step-by-Step Guide Accordion */}
        {showGuide && (
          <div style={{ marginTop: 20, background: '#ffffff', borderRadius: 14, padding: 18, border: '1px solid #d1fae5' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '1rem' }}>
              How to connect your Google Sheet in 3 steps:
            </h4>
            <ol style={{ margin: '0 0 16px 20px', padding: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.7 }}>
              <li>Open a blank Google Sheet in your Google Drive (e.g. name it <code>FarmLog Farm Ledger</code>).</li>
              <li>Click <strong>Extensions &gt; Apps Script</strong>, clear any existing code, and paste the code below.</li>
              <li>Click <strong>Deploy &gt; New deployment &gt; Web app</strong>. Set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>. Click <strong>Deploy</strong> and copy the Web App URL into the box above!</li>
            </ol>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Code2 size={16} /> Google Apps Script Code
              </span>
              <ClayButton variant="secondary" onClick={copyAppsScript} icon={<Copy size={14} />} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                {copiedCode ? '✓ Copied to Clipboard!' : 'Copy Script'}
              </ClayButton>
            </div>

            <pre style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: 14,
              borderRadius: 10,
              fontSize: '0.78rem',
              overflowX: 'auto',
              maxHeight: 220,
              margin: 0
            }}>
              <code>{appsScriptCode}</code>
            </pre>
          </div>
        )}
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
