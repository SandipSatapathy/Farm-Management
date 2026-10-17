import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { Labourer, WageBasis, PayFrequency } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import { ClayModal } from '../components/common/ClayModal';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Wallet,
  CheckCircle,
  XCircle,
  Edit2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const LabourersPage: React.FC = () => {
  const { isReadOnlyPartner, canMutateOperations } = useAuth();
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLabourer, setEditingLabourer] = useState<Labourer | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Labourer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    labour_code: '',
    full_name: '',
    phone: '',
    wage_basis: 'daily' as WageBasis,
    base_rate: 500,
    pay_frequency: 'monthly' as PayFrequency,
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const loadLabourers = () => {
    setLabourers(dataService.getLabourers());
  };

  useEffect(() => {
    loadLabourers();

    const handleDataUpdated = () => {
      loadLabourers();
    };

    window.addEventListener('farmlog-data-updated', handleDataUpdated);
    return () => {
      window.removeEventListener('farmlog-data-updated', handleDataUpdated);
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingLabourer(null);
    setFormData({
      labour_code: `LAB-${String(labourers.length + 1).padStart(3, '0')}`,
      full_name: '',
      phone: '',
      wage_basis: 'daily',
      base_rate: 500,
      pay_frequency: 'monthly',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lab: Labourer) => {
    setEditingLabourer(lab);
    setFormData({
      labour_code: lab.labour_code,
      full_name: lab.full_name,
      phone: lab.phone || '',
      wage_basis: lab.wage_basis,
      base_rate: lab.base_rate,
      pay_frequency: lab.pay_frequency || 'monthly',
      notes: lab.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFormError('Please enter full name.');
      return;
    }
    if (formData.base_rate <= 0) {
      setFormError('Base rate must be greater than zero.');
      return;
    }

    try {
      await dataService.saveLabourer({
        id: editingLabourer ? editingLabourer.id : undefined,
        labour_code: formData.labour_code.trim().toUpperCase(),
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        wage_basis: formData.wage_basis,
        base_rate: Number(formData.base_rate),
        pay_frequency: formData.pay_frequency,
        notes: formData.notes.trim(),
      });
      setIsModalOpen(false);
      loadLabourers();
    } catch (err: any) {
      setFormError(err.message || 'Error saving labourer.');
    }
  };

  const handleToggleActive = async (lab: Labourer) => {
    if (isReadOnlyPartner) return;
    await dataService.toggleLabourerActive(lab.id);
    loadLabourers();
  };

  const filteredLabourers = labourers.filter((l) => {
    const matchesSearch =
      l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      l.labour_code.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search));
    const matchesActive = !showActiveOnly || l.is_active;
    return matchesSearch && matchesActive;
  });

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Labour Directory</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Manage master labour records, wage rates, and historical transactions.
          </p>
        </div>

        {!isReadOnlyPartner && (
          <ClayButton
            variant="primary"
            icon={<UserPlus size={18} />}
            onClick={handleOpenAdd}
          >
            Add Labourer
          </ClayButton>
        )}
      </div>

      {/* Filter & Search Bar */}
      <ClayCard style={{ marginBottom: 24, padding: 18 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name, code (e.g. LAB-001) or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="clay-input"
              style={{ paddingLeft: 40 }}
            />
            <Search size={18} color="#64748b" style={{ position: 'absolute', left: 14, top: 14 }} />
          </div>



          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
            />
            Active Only
          </label>
        </div>
      </ClayCard>

      {/* Labourers Cards Grid */}
      <div className="grid-cols-3" style={{ marginBottom: 28 }}>
        {filteredLabourers.map((lab) => {
          const balance = dataService.getLabourerAdvanceBalance(lab.id);

          return (
            <ClayCard key={lab.id} interactive style={{ opacity: lab.is_active ? 1 : 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--color-primary)',
                      background: '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {lab.labour_code}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: lab.pay_frequency === 'weekly' ? '#0369a1' : '#15803d',
                      background: lab.pay_frequency === 'weekly' ? '#f0f9ff' : '#f0fdf4',
                      border: lab.pay_frequency === 'weekly' ? '1px solid #bae6fd' : '1px solid #86efac',
                      padding: '2px 7px',
                      borderRadius: 6,
                      marginLeft: 6
                    }}
                  >
                    {lab.pay_frequency === 'weekly' ? '🗓️ Weekly' : '📅 Monthly'}
                  </span>
                  <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.15rem' }}>{lab.full_name}</h3>
                </div>

                <ClayBadge
                  status={lab.is_active ? 'active' : 'inactive'}
                  label={lab.is_active ? 'Active' : 'Deactivated'}
                />
              </div>

              {/* Wage and Advance Snapshot */}
              <div
                style={{
                  background: '#f8faf8',
                  padding: '12px 14px',
                  borderRadius: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  border: '1px solid rgba(220, 235, 224, 0.7)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Wage Rate
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d' }}>
                    ₹{lab.base_rate}{' '}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
                      / {lab.wage_basis}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Outstanding Advance
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: balance.outstanding > 0 ? '#d97706' : '#64748b' }}>
                    ₹{balance.outstanding.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Phone & Date Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                {lab.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={14} color="#15803d" />
                    <span>{lab.phone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={14} color="#64748b" />
                  <span>Onboarded: {lab.start_date}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #eef3ee', paddingTop: 12 }}>
                <ClayButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDetail(lab)}
                >
                  View Ledger
                </ClayButton>

                {!isReadOnlyPartner && (
                  <>
                    <ClayButton
                      variant="secondary"
                      size="sm"
                      icon={<Edit2 size={14} />}
                      onClick={() => handleOpenEdit(lab)}
                    >
                      Edit
                    </ClayButton>
                    <ClayButton
                      variant={lab.is_active ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleActive(lab)}
                      title={lab.is_active ? 'Soft deactivate' : 'Reactivate'}
                    >
                      {lab.is_active ? 'Deactivate' : 'Activate'}
                    </ClayButton>
                  </>
                )}
              </div>
            </ClayCard>
          );
        })}

        {filteredLabourers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-muted)' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3 style={{ margin: 0 }}>No labourers found</h3>
            <p>Try adjusting your search query or add a new crew member.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <ClayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLabourer ? 'Edit Labourer' : 'Add New Labourer'}
      >
        <form onSubmit={handleSave}>
          {formError && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 16 }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Labour Code</label>
              <input
                type="text"
                value={formData.labour_code}
                onChange={(e) => setFormData({ ...formData, labour_code: e.target.value })}
                className="clay-input"
                required
              />
            </div>
            <div>
              <label className="clay-label">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Jadhav"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="clay-input"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="clay-label">Phone (Optional)</label>
            <input
              type="tel"
              placeholder="10-digit number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="clay-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Wage Basis</label>
              <select
                value={formData.wage_basis}
                onChange={(e) => setFormData({ ...formData, wage_basis: e.target.value as WageBasis })}
                className="clay-input"
              >
                <option value="daily">Daily Rate (₹/day)</option>
                <option value="hourly">Hourly Rate (₹/hr)</option>
                <option value="piece_rate">Piece Rate (₹/unit)</option>
              </select>
            </div>
            <div>
              <label className="clay-label">Base Rate (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.base_rate}
                onChange={(e) => setFormData({ ...formData, base_rate: Number(e.target.value) })}
                className="clay-input"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="clay-label">Pay Routine / Frequency</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, pay_frequency: 'monthly' })}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: formData.pay_frequency === 'monthly' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: formData.pay_frequency === 'monthly' ? '#f0fdf4' : '#ffffff',
                  color: formData.pay_frequency === 'monthly' ? '#14532d' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                📅 Monthly Payee
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, pay_frequency: 'weekly' })}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: formData.pay_frequency === 'weekly' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: formData.pay_frequency === 'weekly' ? '#f0fdf4' : '#ffffff',
                  color: formData.pay_frequency === 'weekly' ? '#14532d' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                🗓️ Weekly Payee
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="clay-label">Notes (Optional)</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="clay-input"
              placeholder="Skills, references, emergency contact..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <ClayButton variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </ClayButton>
            <ClayButton variant="primary" type="submit">
              {editingLabourer ? 'Update Labourer' : 'Save Labourer'}
            </ClayButton>
          </div>
        </form>
      </ClayModal>

      {/* Labourer Detail & Ledger Modal */}
      {selectedDetail && (
        <ClayModal
          isOpen={Boolean(selectedDetail)}
          onClose={() => setSelectedDetail(null)}
          title={`${selectedDetail.full_name} (${selectedDetail.labour_code})`}
        >
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ padding: 12, background: '#f8faf8', borderRadius: 14, border: '1px solid #d1fae5' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Wage Rate</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>
                  ₹{selectedDetail.base_rate}
                </div>
              </div>
              <div style={{ padding: 12, background: '#f8faf8', borderRadius: 14, border: '1px solid #fef3c7' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Issued Advances</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b45309' }}>
                  ₹{dataService.getLabourerAdvanceBalance(selectedDetail.id).totalIssued}
                </div>
              </div>
              <div style={{ padding: 12, background: '#f8faf8', borderRadius: 14, border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Outstanding</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>
                  ₹{dataService.getLabourerAdvanceBalance(selectedDetail.id).outstanding}
                </div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>Advance History & Repayments</h4>
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 20 }}>
              {dataService.getAdvances().filter(a => a.labourer_id === selectedDetail.id).map(adv => (
                <div key={adv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f1f5f2', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>Issued ₹{adv.amount}</span> ({adv.payment_method})
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{adv.purpose} • {new Date(adv.issued_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{ color: '#15803d', fontWeight: 700 }}>Posted</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ClayButton variant="secondary" onClick={() => setSelectedDetail(null)}>
                Close
              </ClayButton>
            </div>
          </div>
        </ClayModal>
      )}
    </div>
  );
};
