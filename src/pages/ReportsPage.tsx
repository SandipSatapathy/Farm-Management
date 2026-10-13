import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { generateReportPDF } from '../lib/pdfGenerator';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { farm, isReadOnlyPartner } = useAuth();
  const [reportType, setReportType] = useState('wage_statement');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Generate Data based on report type
  const getReportData = () => {
    if (reportType === 'attendance_register') {
      const records = dataService.getAttendanceBetween(startDate, endDate);
      const labourers = dataService.getLabourers();
      const headers = ['Labourer Code', 'Full Name', 'Work Date', 'Shift', 'Status', 'Payable Units', 'Hours'];
      const rows = records.map((r) => {
        const lab = labourers.find((l) => l.id === r.labourer_id);
        return [
          lab?.labour_code || '—',
          lab?.full_name || '—',
          r.work_date,
          r.shift_code,
          r.status.toUpperCase(),
          r.payable_units,
          r.hours_worked || 0,
        ];
      });
      const totalUnits = round2(records.reduce((s, r) => s + r.payable_units, 0));
      return {
        title: 'Labour Attendance Register',
        headers,
        rows,
        summaryTotals: [
          { label: 'Total Attendance Records', value: records.length },
          { label: 'Total Payable Units', value: `${totalUnits} days` },
        ],
      };
    } else if (reportType === 'wage_statement') {
      const preview = dataService.previewPayroll(startDate, endDate);
      const headers = ['Code', 'Labourer Name', 'Units Worked', 'Daily Rate', 'Gross Wage (₹)', 'Advance Deducted (₹)', 'Net Payable (₹)'];
      const rows = preview.lines.map((l: any) => [
        l.labour_code,
        l.labourer_name,
        l.units,
        `₹${l.rate_snapshot}`,
        `₹${l.gross_amount}`,
        `₹${l.advance_recovery}`,
        `₹${l.net_payable}`,
      ]);
      return {
        title: 'Labour-Wise Wage Statement',
        headers,
        rows,
        summaryTotals: [
          { label: 'Total Labourers Count', value: preview.totals.labourerCount },
          { label: 'Gross Payable Wages', value: `₹${preview.totals.totalGross.toLocaleString('en-IN')}` },
          { label: 'Total Advance Recoveries', value: `₹${preview.totals.totalAdvanceRecovery.toLocaleString('en-IN')}` },
          { label: 'Net Disbursable Wages', value: `₹${preview.totals.totalNetPayable.toLocaleString('en-IN')}` },
        ],
      };
    } else if (reportType === 'tractor_usage') {
      const logs = dataService.getMachineryUsage().filter((u) => u.work_date >= startDate && u.work_date <= endDate);
      const headers = ['Date', 'Machinery', 'Operator', 'Field / Task', 'Start Meter', 'End Meter', 'Hours Run', 'Fuel (L)'];
      const rows = logs.map((l) => [
        l.work_date,
        l.machinery_name || '—',
        l.operator_name || '—',
        `${l.field_name} - ${l.task_name}`,
        l.start_meter || 0,
        l.end_meter || 0,
        l.start_meter !== undefined && l.end_meter !== undefined ? round2(l.end_meter - l.start_meter) : 0,
        l.fuel_quantity || 0,
      ]);
      const totalHrs = round2(logs.reduce((s, l) => s + ((l.end_meter || 0) - (l.start_meter || 0)), 0));
      const totalFuel = round2(logs.reduce((s, l) => s + (l.fuel_quantity || 0), 0));
      return {
        title: 'Tractor & Machinery Operating Hours Log',
        headers,
        rows,
        summaryTotals: [
          { label: 'Total Operating Hours', value: `${totalHrs} hrs` },
          { label: 'Total Diesel Consumed', value: `${totalFuel} Litres` },
        ],
      };
    } else {
      // Machinery Expenses
      const expenses = dataService.getExpenses().filter((e) => e.expense_date >= startDate && e.expense_date <= endDate);
      const headers = ['Date', 'Category', 'Machinery', 'Vendor', 'Payment Mode', 'Amount (₹)', 'Notes'];
      const rows = expenses.map((e) => [
        e.expense_date,
        e.category.toUpperCase(),
        e.machinery_name || 'General Farm',
        e.vendor || '—',
        e.payment_method.toUpperCase(),
        `₹${e.amount}`,
        e.notes || '—',
      ]);
      const totalAmount = round2(expenses.reduce((s, e) => s + e.amount, 0));
      return {
        title: 'Machinery Operating Expenses Report',
        headers,
        rows,
        summaryTotals: [
          { label: 'Total Operating Expenses', value: `₹${totalAmount.toLocaleString('en-IN')}` },
        ],
      };
    }
  };

  const report = getReportData();

  const handleExportPDF = () => {
    generateReportPDF({
      title: report.title,
      dateRange: `${startDate} to ${endDate}`,
      farm,
      headers: report.headers,
      rows: report.rows,
      summaryTotals: report.summaryTotals,
    });
    setPdfSuccess(true);
    setTimeout(() => setPdfSuccess(false), 3000);
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [report.headers.join(','), ...report.rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${report.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Reports & Verified PDF Exports</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Generate auditable financial statements, attendance registers, and tamper-evident PDF manifests.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <ClayButton
            variant="secondary"
            icon={<Download size={17} />}
            onClick={handleExportCSV}
          >
            Export CSV
          </ClayButton>
          <ClayButton
            variant="primary"
            icon={<FileText size={17} />}
            onClick={handleExportPDF}
          >
            Export Verified PDF
          </ClayButton>
        </div>
      </div>

      {pdfSuccess && (
        <div style={{ background: '#dcfce7', border: '2px solid #86efac', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#14532d', fontWeight: 700 }}>
          <CheckCircle2 size={18} color="#15803d" />
          <span>Verified PDF generated and downloaded with SHA-256 manifest hash!</span>
        </div>
      )}

      {/* Filter Bar */}
      <ClayCard style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label className="clay-label">Select Report</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="clay-input"
                style={{ width: 260 }}
              >
                <option value="wage_statement">Labour-Wise Wage Statement</option>
                <option value="attendance_register">Attendance Register</option>
                <option value="tractor_usage">Tractor & Machinery Usage</option>
                <option value="expenses">Machinery Expenses Ledger</option>
              </select>
            </div>

            <div>
              <label className="clay-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="clay-input"
                style={{ width: 160 }}
              />
            </div>

            <div>
              <label className="clay-label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="clay-input"
                style={{ width: 160 }}
              />
            </div>
          </div>
        </div>
      </ClayCard>

      {/* Summary Reconciliation Pills */}
      {report.summaryTotals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          {report.summaryTotals.map((item, idx) => (
            <div key={idx} style={{ background: '#ffffff', padding: 14, borderRadius: 18, border: '2px solid #bbf7d0', boxShadow: 'var(--clay-card-shadow)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Preview Table */}
      <div className="clay-table-container">
        <table className="clay-table">
          <thead>
            <tr>
              {report.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
