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
  RotateCcw,
  Edit2,
  Trash2
} from 'lucide-react';

export const AdvancesPage: React.FC = () => {
  const { isReadOnlyPartner, canMutateOperations, currentUser } = useAuth();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  
  // Issue Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [purpose, setPurpose] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [issuedBy, setIssuedBy] = useState(currentUser?.name || '');
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Modal
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [editLabId, setEditLabId] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('cash');
  const [editReference, setEditReference] = useState('');
  const [editIssuedBy, setEditIssuedBy] = useState(currentUser?.name || '');
  const [editErrorMsg, setEditErrorMsg] = useState('');

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

    const handleDataUpdated = () => {
      loadData();
    };

    window.addEventListener('farmlog-data-updated', handleDataUpdated);
    return () => {
      window.removeEventListener('farmlog-data-updated', handleDataUpdated);
    };
  }, []);

  const handleIssueAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }

    try {
      await dataService.issueAdvance({
        labourer_id: selectedLabId,
        amount: Number(amount),
        purpose,
        payment_method: method,
        payment_reference: reference,
        issued_by: issuedBy,
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

  const handleOpenEdit = (adv: Advance) => {
    setEditingAdvance(adv);
    setEditLabId(adv.labourer_id);
    setEditAmount(adv.amount);
    setEditDate(adv.issued_at ? adv.issued_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditPurpose(adv.purpose || '');
    setEditMethod(adv.payment_method || 'cash');
    setEditReference(adv.payment_reference || '');
    setEditIssuedBy(adv.issued_by || currentUser?.name || '');
    setEditErrorMsg('');
  };

  const handleUpdateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdvance) return;
    if (editAmount <= 0) {
      setEditErrorMsg('Amount must be greater than zero.');
      return;
    }

    try {
      await dataService.updateAdvance(editingAdvance.id, {
        labourer_id: editLabId,
        amount: Number(editAmount),
        issued_at: editDate ? `${editDate}T12:00:00.000Z` : undefined,
        purpose: editPurpose,
        payment_method: editMethod,
        payment_reference: editReference,
        issued_by: editIssuedBy,
      });
      setEditingAdvance(null);
      loadData();
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Error updating advance.');
    }
  };

  const handleDeleteAdvance = async (advId: string) => {
    if (!window.confirm('Delete this advance record? This will restore the worker balance.')) return;
    try {
      await dataService.deleteAdvance(advId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting advance.');
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderTop: '1px solid #eef3ee', paddingTop: 8 }}>
                <span>Issued: ₹{bal.totalIssued} • Repaid: ₹{bal.totalRecovered}</span>
                {(() => {
                  const workerAdv = advances.find(a => a.labourer_id === lab.id);
                  if (!workerAdv || isReadOnlyPartner) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(workerAdv)}
                      style={{
                        background: '#f0f9ff',
                        border: '1.5px solid #7dd3fc',
                        color: '#0284c7',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                  );
                })()}
              </div>
            </ClayCard>
          );
        })}
      </div>

      {/* Issued Advances Transaction Log */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Issued Advances Transaction Log</h3>
      <div className="ledger-desktop-only">
        <div className="clay-table-container">
          <table className="clay-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Labourer</th>
                <th>Amount (₹)</th>
                <th>Given By</th>
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
                      <strong>{adv.labourer_name || dataService.getLabourerById(adv.labourer_id)?.full_name || 'Worker'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{adv.labour_code || dataService.getLabourerById(adv.labourer_id)?.labour_code || ''}</div>
                    </td>
                    <td style={{ fontWeight: 800, color: '#b45309', fontSize: '1rem' }}>
                      ₹{adv.amount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span style={{
                        background: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        padding: '3px 8px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        👤 {adv.issued_by || 'Owner/Manager'}
                      </span>
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
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {!isReadOnlyPartner && (
                          <ClayButton
                            variant="secondary"
                            size="sm"
                            icon={<Edit2 size={13} />}
                            onClick={() => handleOpenEdit(adv)}
                            title="Edit Advance"
                          >
                            Edit
                          </ClayButton>
                        )}
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
                            Repay
                          </ClayButton>
                        )}
                        {!isReadOnlyPartner && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAdvance(adv.id)}
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                              padding: '6px 8px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            title="Delete Advance Record"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Advance History Cards */}
      <div className="ledger-mobile-only" style={{ marginTop: 12 }}>
        {advances.map((adv) => {
          const labBal = dataService.getLabourerAdvanceBalance(adv.labourer_id);
          return (
            <div key={adv.id} className="ledger-mobile-row" style={{ padding: '12px 14px', marginBottom: 10, border: '1.5px solid rgba(220, 235, 224, 0.9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#143823' }}>
                    {adv.labourer_name || dataService.getLabourerById(adv.labourer_id)?.full_name || 'Worker'}
                  </span>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {adv.labour_code || dataService.getLabourerById(adv.labourer_id)?.labour_code || ''}
                  </div>
                </div>
                <span style={{
                  fontWeight: 900,
                  color: '#b45309',
                  fontSize: '1.05rem',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  ₹{adv.amount.toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b', marginBottom: 8, background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                <span>Given By: <strong style={{ color: '#15803d' }}>{adv.issued_by || 'Owner/Manager'}</strong></span>
                <span>{new Date(adv.issued_at).toLocaleDateString('en-IN')}</span>
                <span>Mode: <strong>{(adv.payment_method || 'cash').toUpperCase()}</strong></span>
              </div>

              {adv.purpose && (
                <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: 8, background: '#f0fdf4', padding: '4px 8px', borderRadius: 6, border: '1px solid #dcfce7' }}>
                  Note: <strong>{adv.purpose}</strong>
                </div>
              )}

              {!isReadOnlyPartner && (
                <div style={{ display: 'flex', gap: 8, borderTop: '1px dashed #dcfce7', paddingTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(adv)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1.5px solid #0284c7',
                      background: '#f0f9ff',
                      color: '#0284c7',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Edit2 size={14} />
                    <span>Edit Advance</span>
                  </button>
                  {labBal.outstanding > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRepayAdvance(adv);
                        setRepayAmount(Math.min(adv.amount, labBal.outstanding));
                        setRepayError('');
                      }}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #86efac',
                        background: '#f0fdf4',
                        color: '#15803d',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span>Repay</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteAdvance(adv.id)}
                    style={{
                      padding: '9px 14px',
                      borderRadius: 8,
                      border: '1px solid #fed7aa',
                      background: '#fff7ed',
                      color: '#c2410c',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Delete advance record"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
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

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="clay-label" style={{ margin: 0 }}>Given By (Who gave advance)</label>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Disbursed by</span>
            </div>
            <input
              type="text"
              placeholder="e.g. Supervisor name"
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              className="clay-input"
              required
            />
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

      {/* Edit Advance Modal */}
      {editingAdvance && (
        <ClayModal
          isOpen={Boolean(editingAdvance)}
          onClose={() => setEditingAdvance(null)}
          title={`Edit Advance Record — ${editingAdvance.labourer_name || 'Worker'}`}
        >
          <form onSubmit={handleUpdateAdvance}>
            {editErrorMsg && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 16 }}>
                {editErrorMsg}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label className="clay-label">Select Labourer</label>
              <select
                value={editLabId}
                onChange={(e) => setEditLabId(e.target.value)}
                className="clay-input"
              >
                {labourers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name} ({l.labour_code}) — Rate: ₹{l.base_rate}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="clay-label" style={{ margin: 0 }}>Given By (Who gave advance)</label>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Disbursed by</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Supervisor name"
                value={editIssuedBy}
                onChange={(e) => setEditIssuedBy(e.target.value)}
                className="clay-input"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="clay-label">Advance Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="clay-input"
                  required
                />
              </div>

              <div>
                <label className="clay-label">Advance Amount (₹)</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="clay-input"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="clay-label">Disbursement Mode</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                  className="clay-input"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="clay-label">Reference Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-12389, Cash Voucher #4"
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  className="clay-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="clay-label">Purpose / Reason</label>
              <input
                type="text"
                placeholder="e.g. Medical emergency, School fee, Festival"
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                className="clay-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <ClayButton variant="secondary" type="button" onClick={() => setEditingAdvance(null)}>
                Cancel
              </ClayButton>
              <ClayButton variant="primary" type="submit">
                Save Changes
              </ClayButton>
            </div>
          </form>
        </ClayModal>
      )}
    </div>
  );
};
