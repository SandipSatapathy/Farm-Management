import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { PayrollPeriod, PayrollLine, PaymentMethod } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import { ClayModal } from '../components/common/ClayModal';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  FileText,
  Lock,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

export const PayrollPage: React.FC = () => {
  const { isReadOnlyPartner, canFinalizePayroll } = useAuth();
  
  // Date period state for preview
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [periodName, setPeriodName] = useState('October 2026 Crew Payroll');
  
  const [previewData, setPreviewData] = useState<any>(null);
  const [finalizedPeriods, setFinalizedPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [periodLines, setPeriodLines] = useState<PayrollLine[]>([]);

  // Payment Recording Modal
  const [paymentLine, setPaymentLine] = useState<PayrollLine | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const loadData = () => {
    const periods = dataService.getPayrollPeriods();
    setFinalizedPeriods(periods);
    
    // Auto-preview
    const preview = dataService.previewPayroll(startDate, endDate);
    setPreviewData(preview);

    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0]);
      setPeriodLines(dataService.getPayrollLinesForPeriod(periods[0].id));
    } else if (selectedPeriod) {
      setPeriodLines(dataService.getPayrollLinesForPeriod(selectedPeriod.id));
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const handleSelectPeriod = (period: PayrollPeriod) => {
    setSelectedPeriod(period);
    setPeriodLines(dataService.getPayrollLinesForPeriod(period.id));
  };

  const handleFinalize = () => {
    if (!canFinalizePayroll || !previewData) return;
    
    try {
      const newPeriod = dataService.finalizePayroll(
        periodName,
        startDate,
        endDate,
        previewData.lines
      );

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      loadData();
      setSelectedPeriod(newPeriod);
    } catch (err: any) {
      alert(err.message || 'Error finalizing payroll');
    }
  };

  const handleOpenPayment = (line: PayrollLine) => {
    setPaymentLine(line);
    const balanceDue = round2(line.net_payable - line.paid_amount);
    setPaymentAmount(balanceDue);
    setPaymentMethod('cash');
    setPaymentRef('');
    setPaymentError('');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentLine) return;
    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    try {
      dataService.recordPayrollPayment(
        paymentLine.id,
        paymentAmount,
        paymentMethod,
        paymentRef
      );
      setPaymentLine(null);
      loadData();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed.');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Payroll & Wage Settlements</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Calculate wages from approved attendance, automate advance recovery, and record disbursements.
          </p>
        </div>
      </div>

      {/* Tabs / Switcher: Create Preview vs Finalized Periods */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedPeriod(null)}
          className={`clay-btn ${!selectedPeriod ? 'clay-btn-primary' : 'clay-btn-secondary'}`}
        >
          <span>Calculate New Payroll Preview</span>
        </button>

        {finalizedPeriods.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelectPeriod(p)}
            className={`clay-btn ${selectedPeriod?.id === p.id ? 'clay-btn-primary' : 'clay-btn-secondary'}`}
          >
            <Lock size={15} />
            <span>{p.period_name}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: PREVIEW MODE */}
      {!selectedPeriod && previewData && (
        <div>
          {/* Filter Bar */}
          <ClayCard style={{ marginBottom: 24, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <label className="clay-label">Period Name</label>
                  <input
                    type="text"
                    value={periodName}
                    onChange={(e) => setPeriodName(e.target.value)}
                    className="clay-input"
                    style={{ width: 220 }}
                  />
                </div>
                <div>
                  <label className="clay-label">Period Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="clay-input"
                    style={{ width: 160 }}
                  />
                </div>
                <div>
                  <label className="clay-label">Period End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="clay-input"
                    style={{ width: 160 }}
                  />
                </div>
              </div>

              {canFinalizePayroll && !isReadOnlyPartner && (
                <ClayButton
                  variant="primary"
                  icon={<Lock size={17} />}
                  onClick={handleFinalize}
                >
                  Approve & Finalize Period
                </ClayButton>
              )}
            </div>
          </ClayCard>

          {/* Preview Totals Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #bbf7d0', boxShadow: 'var(--clay-card-shadow)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Crew Members</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>{previewData.totals.labourerCount}</div>
            </div>

            <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #bfdbfe', boxShadow: 'var(--clay-card-shadow)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Gross Payable Wages</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1' }}>
                ₹{previewData.totals.totalGross.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #fde68a', boxShadow: 'var(--clay-card-shadow)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Advance Recoveries</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>
                ₹{previewData.totals.totalAdvanceRecovery.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #86efac', boxShadow: 'var(--clay-card-shadow)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Net Disbursable Amount</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>
                ₹{previewData.totals.totalNetPayable.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="clay-table-container">
            <table className="clay-table">
              <thead>
                <tr>
                  <th>Labourer</th>
                  <th>Attendance Units</th>
                  <th>Rate Snapshot</th>
                  <th>Gross Wage</th>
                  <th>Advance Deduction</th>
                  <th>Net Payable</th>
                  <th>Advance Balance</th>
                </tr>
              </thead>
              <tbody>
                {previewData.lines.map((line: any) => (
                  <tr key={line.labourer_id}>
                    <td>
                      <strong>{line.labourer_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{line.labour_code}</div>
                    </td>
                    <td>
                      <strong>{line.units} days</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {line.attendance_snapshot.present_days} full, {line.attendance_snapshot.half_days} half
                      </div>
                    </td>
                    <td>₹{line.rate_snapshot}/{line.wage_basis}</td>
                    <td style={{ fontWeight: 700 }}>₹{line.gross_amount.toLocaleString('en-IN')}</td>
                    <td style={{ color: line.advance_recovery > 0 ? '#b45309' : '#64748b', fontWeight: 700 }}>
                      {line.advance_recovery > 0 ? `- ₹${line.advance_recovery}` : '₹0'}
                    </td>
                    <td style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem' }}>
                      ₹{line.net_payable.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      ₹{line.calculation_details.outstandingAdvanceBefore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: FINALIZED PERIOD & PAYMENT DISBURSEMENT */}
      {selectedPeriod && (
        <div>
          <ClayCard style={{ marginBottom: 24, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Lock size={20} color="#15803d" />
                  <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{selectedPeriod.period_name}</h3>
                  <ClayBadge status="finalized" label="Finalized & Immutable" />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Dates: {selectedPeriod.start_date} to {selectedPeriod.end_date} • Finalized by {selectedPeriod.approved_by}
                </div>
              </div>
            </div>
          </ClayCard>

          {/* Finalized Lines Table with Payment Buttons */}
          <div className="clay-table-container">
            <table className="clay-table">
              <thead>
                <tr>
                  <th>Labourer</th>
                  <th>Payable Units</th>
                  <th>Gross Amount</th>
                  <th>Advance Recovered</th>
                  <th>Net Payable</th>
                  <th>Disbursed</th>
                  <th>Balance Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {periodLines.map((line) => {
                  const balanceDue = round2(line.net_payable - line.paid_amount);
                  const isFullyPaid = balanceDue <= 0;

                  return (
                    <tr key={line.id}>
                      <td>
                        <strong>{line.labourer_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{line.labour_code}</div>
                      </td>
                      <td>{line.units} units</td>
                      <td>₹{line.gross_amount.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#b45309' }}>₹{line.advance_recovery}</td>
                      <td style={{ fontWeight: 800, color: '#15803d' }}>
                        ₹{line.net_payable.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0369a1' }}>
                        ₹{line.paid_amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: isFullyPaid ? '#15803d' : '#dc2626' }}>
                        ₹{balanceDue.toLocaleString('en-IN')}
                      </td>
                      <td>
                        {!isFullyPaid && canFinalizePayroll && !isReadOnlyPartner ? (
                          <ClayButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenPayment(line)}
                          >
                            Pay Wages
                          </ClayButton>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
                            {isFullyPaid ? '✓ Settled' : 'View Only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Disbursement Modal */}
      {paymentLine && (
        <ClayModal
          isOpen={Boolean(paymentLine)}
          onClose={() => setPaymentLine(null)}
          title={`Disburse Wage Payment — ${paymentLine.labourer_name}`}
        >
          <form onSubmit={handleSavePayment}>
            {paymentError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 16 }}>
                {paymentError}
              </div>
            )}

            <div style={{ padding: 14, background: '#f8faf8', borderRadius: 14, marginBottom: 16, border: '1px solid #d1fae5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Net Payable:</span>
                <strong>₹{paymentLine.net_payable}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Already Disbursed:</span>
                <strong>₹{paymentLine.paid_amount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2ebe4', paddingTop: 6 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#14532d' }}>Balance Due:</span>
                <strong style={{ color: '#dc2626', fontSize: '1.05rem' }}>
                  ₹{round2(paymentLine.net_payable - paymentLine.paid_amount)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="clay-label">Payment Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={round2(paymentLine.net_payable - paymentLine.paid_amount)}
                  step="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="clay-input"
                  required
                />
              </div>

              <div>
                <label className="clay-label">Disbursement Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="clay-input"
                >
                  <option value="cash">Cash in Hand</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="bank_transfer">Direct Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="clay-label">Payment Reference / Note</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref / Cash voucher number"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="clay-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <ClayButton variant="secondary" type="button" onClick={() => setPaymentLine(null)}>
                Cancel
              </ClayButton>
              <ClayButton variant="primary" type="submit">
                Record Payment
              </ClayButton>
            </div>
          </form>
        </ClayModal>
      )}
    </div>
  );
};
