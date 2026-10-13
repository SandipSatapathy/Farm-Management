import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { Advance, Labourer, PaymentMethod } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import { ClayModal } from '../components/common/ClayModal';
import {
  Wallet,
  PlusCircle,
  ArrowDownRight,
  TrendingDown,
  Calendar,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

export const AdvancesPage: React.FC = () => {
  const { isReadOnlyPartner, canMutateOperations } = useAuth();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  
  // Issue Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [purpose, setPurpose] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Direct Repayment Modal
  const [repayAdvance, setRepayAdvance] = useState<Advance | null>(null);
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [repayError, setRepayError] = useState('');

  const loadData = () => {
    setAdvances(dataService.getAdvances());
    const labs = dataService.getLabourers(true);
    setLabourers(labs);
    if (labs.length > 0 && !selectedLabId) {
      setSelectedLabId(labs[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssueAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }

    try {
      dataService.issueAdvance({
        labourer_id: selectedLabId,
        amount: Number(amount),
        purpose,
        payment_method: method,
        payment_reference: reference,
      });
      setIsIssueModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error issuing advance.');
    }
  };

  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayAdvance) return;
    if (repayAmount <= 0) {
      setRepayError('Amount must be greater than zero.');
      return;
    }

    try {
      dataService.recordDirectAdvanceRepayment(repayAdvance.id, repayAmount, 'Voluntary Cash Repayment');
      setRepayAdvance(null);
      loadData();
    } catch (err: any) {
      setRepayError(err.message || 'Repayment failed.');
    }
  };

  // Compute Overall Totals
  let totalIssuedAll = 0;
  let totalRecoveredAll = 0;
  let totalOutstandingAll = 0;

  labourers.forEach(l => {
    const bal = dataService.getLabourerAdvanceBalance(l.id);
    totalIssuedAll += bal.totalIssued;
    totalRecoveredAll += bal.totalRecovered;
    totalOutstandingAll += bal.outstanding;
  });

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Advances & Recovery Ledger</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Record wage advances, monitor running balances, and audit payroll recoveries.
          </p>
        </div>

        {!isReadOnlyPartner && (
          <ClayButton
            variant="primary"
            icon={<PlusCircle size={18} />}
            onClick={() => {
              setErrorMsg('');
              setIsIssueModalOpen(true);
            }}
          >
            Issue New Advance
          </ClayButton>
        )}
      </div>

      {/* Totals Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: '#ffffff', padding: 18, borderRadius: 18, border: '2px solid #bfdbfe', boxShadow: 'var(--clay-card-shadow)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Total Issued Advances</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1' }}>
            ₹{round2(totalIssuedAll).toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 18, borderRadius: 18, border: '2px solid #bbf7d0', boxShadow: 'var(--clay-card-shadow)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Total Recovered</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>
            ₹{round2(totalRecoveredAll).toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 18, borderRadius: 18, border: '2px solid #fde68a', boxShadow: 'var(--clay-card-shadow)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Current Outstanding Balance</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>
            ₹{round2(totalOutstandingAll).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Labourer Advance Balances Matrix */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Crew Advance Balances</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {labourers.map((lab) => {
          const bal = dataService.getLabourerAdvanceBalance(lab.id);

          return (
            <ClayCard key={lab.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>
                    {lab.labour_code}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 4 }}>{lab.full_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Outstanding</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: bal.outstanding > 0 ? '#d97706' : '#15803d' }}>
                    ₹{bal.outstanding.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderTop: '1px solid #eef3ee', paddingTop: 8 }}>
                <span>Issued: ₹{bal.totalIssued}</span>
                <span>Recovered: ₹{bal.totalRecovered}</span>
              </div>
            </ClayCard>
          );
        })}
      </div>

      {/* Issued Advances Transaction Log */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Issued Advances Transaction Log</h3>
      <div className="clay-table-container">
        <table className="clay-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Labourer</th>
              <th>Amount (₹)</th>
              <th>Purpose</th>
              <th>Mode & Ref</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {advances.map((adv) => {
              const labBal = dataService.getLabourerAdvanceBalance(adv.labourer_id);

              return (
                <tr key={adv.id}>
                  <td>{new Date(adv.issued_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <strong>{adv.labourer_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{adv.labour_code}</div>
                  </td>
                  <td style={{ fontWeight: 800, color: '#b45309', fontSize: '1rem' }}>
                    ₹{adv.amount.toLocaleString('en-IN')}
                  </td>
                  <td>{adv.purpose || 'Personal advance'}</td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{adv.payment_method}</span>
                    {adv.payment_reference && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{adv.payment_reference}</div>
                    )}
                  </td>
                  <td>
                    <ClayBadge status="active" label="Posted" />
                  </td>
                  <td>
                    {!isReadOnlyPartner && labBal.outstanding > 0 && (
                      <ClayButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setRepayAdvance(adv);
                          setRepayAmount(Math.min(adv.amount, labBal.outstanding));
                          setRepayError('');
                        }}
                      >
                        Repay Cash
                      </ClayButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Issue Advance Modal */}
      <ClayModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Wage Advance"
      >
        <form onSubmit={handleIssueAdvance}>
          {errorMsg && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 16 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="clay-label">Select Labourer</label>
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="clay-input"
            >
              {labourers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name} ({l.labour_code}) — Rate: ₹{l.base_rate}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Advance Amount (₹)</label>
              <input
                type="number"
                min="100"
                step="50"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="clay-input"
                required
              />
            </div>
            <div>
              <label className="clay-label">Disbursement Mode</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="clay-input"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI (GPay / PhonePe)</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="clay-label">Purpose / Reason</label>
            <input
              type="text"
              placeholder="e.g. Medical emergency, School fee, Festival"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="clay-input"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="clay-label">Reference Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. UPI-12389, Cash Voucher #4"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="clay-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <ClayButton variant="secondary" type="button" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </ClayButton>
            <ClayButton variant="primary" type="submit">
              Post Advance
            </ClayButton>
          </div>
        </form>
      </ClayModal>

      {/* Direct Cash Repayment Modal */}
      {repayAdvance && (
        <ClayModal
          isOpen={Boolean(repayAdvance)}
          onClose={() => setRepayAdvance(null)}
          title={`Voluntary Cash Repayment — ${repayAdvance.labourer_name}`}
        >
          <form onSubmit={handleRecordRepayment}>
            {repayError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 16 }}>
                {repayError}
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Labourer is making a direct cash repayment towards advance of ₹{repayAdvance.amount}.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label className="clay-label">Repayment Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="50"
                value={repayAmount}
                onChange={(e) => setRepayAmount(Number(e.target.value))}
                className="clay-input"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <ClayButton variant="secondary" type="button" onClick={() => setRepayAdvance(null)}>
                Cancel
              </ClayButton>
              <ClayButton variant="primary" type="submit">
                Record Repayment
              </ClayButton>
            </div>
          </form>
        </ClayModal>
      )}
    </div>
  );
};
