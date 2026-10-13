import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../lib/dataService';
import { Machinery, MachineryOwnership, MeterType } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import { ClayModal } from '../components/common/ClayModal';
import {
  Tractor,
  PlusCircle,
  Gauge,
  Edit2,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export const MachineryPage: React.FC = () => {
  const { isReadOnlyPartner, canMutateOperations } = useAuth();
  const [machinery, setMachinery] = useState<Machinery[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machinery | null>(null);

  const [formData, setFormData] = useState({
    asset_code: '',
    name: '',
    asset_type: 'tractor',
    ownership_type: 'owned' as MachineryOwnership,
    registration_reference: '',
    make: '',
    model: '',
    meter_type: 'hour_meter' as MeterType,
    initial_meter: 0,
    notes: '',
  });

  const loadData = () => {
    setMachinery(dataService.getMachinery());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingMachine(null);
    setFormData({
      asset_code: `TRC-${String(machinery.length + 1).padStart(2, '0')}`,
      name: '',
      asset_type: 'tractor',
      ownership_type: 'owned',
      registration_reference: '',
      make: '',
      model: '',
      meter_type: 'hour_meter',
      initial_meter: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      dataService.saveMachinery({
        id: editingMachine ? editingMachine.id : undefined,
        asset_code: formData.asset_code.trim().toUpperCase(),
        name: formData.name.trim(),
        asset_type: formData.asset_type,
        ownership_type: formData.ownership_type,
        registration_reference: formData.registration_reference.trim(),
        make: formData.make.trim(),
        model: formData.model.trim(),
        meter_type: formData.meter_type,
        initial_meter: Number(formData.initial_meter),
        notes: formData.notes.trim(),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving machinery');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Machinery & Tractor Register</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Maintain farm assets, track hour meters, and distinguish owned vs hired equipment.
          </p>
        </div>

        {!isReadOnlyPartner && (
          <ClayButton
            variant="primary"
            icon={<PlusCircle size={18} />}
            onClick={handleOpenAdd}
          >
            Add Machinery
          </ClayButton>
        )}
      </div>

      {/* Machinery Cards Grid */}
      <div className="grid-cols-3" style={{ marginBottom: 28 }}>
        {machinery.map((mac) => (
          <ClayCard key={mac.id} interactive>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>
                  {mac.asset_code}
                </span>
                <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.15rem' }}>{mac.name}</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  {mac.make} {mac.model}
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  background: mac.ownership_type === 'owned' ? '#dcfce7' : '#fef3c7',
                  color: mac.ownership_type === 'owned' ? '#15803d' : '#b45309',
                  border: '1px solid rgba(0,0,0,0.05)',
                  textTransform: 'uppercase',
                }}
              >
                {mac.ownership_type}
              </span>
            </div>

            {/* Meter Reading Highlight */}
            <div
              style={{
                background: '#f8faf8',
                padding: '12px 14px',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                border: '1px solid rgba(220, 235, 224, 0.7)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gauge size={20} color="#15803d" />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Current Meter
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#14532d' }}>
                    {mac.current_meter || mac.initial_meter} {mac.meter_type === 'hour_meter' ? 'hrs' : 'km'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                <div>Initial: {mac.initial_meter}</div>
                {mac.registration_reference && <div>Reg: {mac.registration_reference}</div>}
              </div>
            </div>

            {mac.notes && (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
                {mac.notes}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eef3ee', paddingTop: 10 }}>
              <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
                ● Active Operational Asset
              </span>
            </div>
          </ClayCard>
        ))}
      </div>

      {/* Add / Edit Machinery Modal */}
      <ClayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMachine ? 'Edit Machinery' : 'Add Machinery / Tractor'}
      >
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Asset Code</label>
              <input
                type="text"
                value={formData.asset_code}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                className="clay-input"
                required
              />
            </div>
            <div>
              <label className="clay-label">Name / Description</label>
              <input
                type="text"
                placeholder="e.g. Mahindra 575 DI (Red)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="clay-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Ownership</label>
              <select
                value={formData.ownership_type}
                onChange={(e) => setFormData({ ...formData, ownership_type: e.target.value as MachineryOwnership })}
                className="clay-input"
              >
                <option value="owned">Farm Owned</option>
                <option value="hired">Hired / Rented</option>
              </select>
            </div>
            <div>
              <label className="clay-label">Registration / Number Plate</label>
              <input
                type="text"
                placeholder="e.g. MH-15-AB-4021"
                value={formData.registration_reference}
                onChange={(e) => setFormData({ ...formData, registration_reference: e.target.value })}
                className="clay-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Meter Type</label>
              <select
                value={formData.meter_type}
                onChange={(e) => setFormData({ ...formData, meter_type: e.target.value as MeterType })}
                className="clay-input"
              >
                <option value="hour_meter">Hour Meter (Hours & Minutes)</option>
                <option value="odometer">Odometer (Kilometers)</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className="clay-label">Initial Meter Reading</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.initial_meter}
                onChange={(e) => setFormData({ ...formData, initial_meter: Number(e.target.value) })}
                className="clay-input"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="clay-label">Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="clay-input"
              placeholder="Make, horsepower, implements attached..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <ClayButton variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </ClayButton>
            <ClayButton variant="primary" type="submit">
              Save Machinery
            </ClayButton>
          </div>
        </form>
      </ClayModal>
    </div>
  );
};
