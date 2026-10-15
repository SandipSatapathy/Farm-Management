import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { Machinery, MachineryUsage } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayModal } from '../components/common/ClayModal';
import {
  Clock,
  PlusCircle,
  Tractor,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Fuel,
  MapPin
} from 'lucide-react';

export const MachineryUsagePage: React.FC = () => {
  const { isReadOnlyPartner } = useAuth();
  const [machinery, setMachinery] = useState<Machinery[]>([]);
  const [usageLogs, setUsageLogs] = useState<MachineryUsage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [workDate, setWorkDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [operatorName, setOperatorName] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [taskName, setTaskName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('11:30');
  const [startMeter, setStartMeter] = useState<number>(0);
  const [endMeter, setEndMeter] = useState<number>(0);
  const [fuelQuantity, setFuelQuantity] = useState<number>(10);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = () => {
    const macs = dataService.getMachinery();
    setMachinery(macs);
    setUsageLogs(dataService.getMachineryUsage());

    if (macs.length > 0 && !selectedMachineId) {
      setSelectedMachineId(macs[0].id);
      setStartMeter(macs[0].current_meter || macs[0].initial_meter);
      setEndMeter((macs[0].current_meter || macs[0].initial_meter) + 3.5);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMachineChange = (machineId: string) => {
    setSelectedMachineId(machineId);
    const m = machinery.find((x) => x.id === machineId);
    if (m) {
      const cur = m.current_meter || m.initial_meter;
      setStartMeter(cur);
      setEndMeter(cur + 2.0);
    }
  };

  // Live calculations
  const meterDelta = round2(Math.max(0, endMeter - startMeter));
  const isMeterRegression = endMeter < startMeter;

  const handleSaveUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMeterRegression) {
      setErrorMsg(`End meter (${endMeter}) cannot be less than start meter (${startMeter})!`);
      return;
    }

    try {
      dataService.recordMachineryUsage({
        machinery_id: selectedMachineId,
        work_date: workDate,
        operator_name: operatorName,
        field_name: fieldName,
        task_name: taskName,
        start_time: `${workDate}T${startTime}:00Z`,
        end_time: `${workDate}T${endTime}:00Z`,
        start_meter: Number(startMeter),
        end_meter: Number(endMeter),
        duration_minutes: 210, // ~3.5 hrs
        fuel_quantity: Number(fuelQuantity),
        notes,
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording usage');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Tractor & Machinery Usage Logs</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Fast mobile-friendly logging of operating hours, tasks, meter readings, and diesel consumption.
          </p>
        </div>

        {!isReadOnlyPartner && (
          <ClayButton
            variant="primary"
            icon={<PlusCircle size={18} />}
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
          >
            Log Machinery Usage
          </ClayButton>
        )}
      </div>

      {/* Usage Logs Table */}
      <div className="clay-table-container">
        <table className="clay-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Machinery</th>
              <th>Operator</th>
              <th>Field & Task</th>
              <th>Meter Reading</th>
              <th>Delta (Run)</th>
              <th>Diesel Used</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {usageLogs.map((log) => {
              const runHrs = log.start_meter !== undefined && log.end_meter !== undefined
                ? round2(log.end_meter - log.start_meter)
                : (log.duration_minutes ? round2(log.duration_minutes / 60) : 0);

              return (
                <tr key={log.id}>
                  <td>{log.work_date}</td>
                  <td>
                    <strong>{log.machinery_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.asset_code}</div>
                  </td>
                  <td>{log.operator_name || 'Assigned Driver'}</td>
                  <td>
                    <strong>{log.task_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} />
                      <span>{log.field_name}</span>
                    </div>
                  </td>
                  <td>
                    {log.start_meter} → {log.end_meter}
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#15803d' }}>
                      +{runHrs} hrs
                    </span>
                  </td>
                  <td>
                    {log.fuel_quantity ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', fontWeight: 600 }}>
                        <Fuel size={14} />
                        <span>{log.fuel_quantity} L</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{log.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Fast Entry Modal */}
      <ClayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Tractor & Machinery Usage"
      >
        <form onSubmit={handleSaveUsage}>
          {errorMsg && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 16 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="clay-label">Select Machinery / Tractor</label>
            <select
              value={selectedMachineId}
              onChange={(e) => handleMachineChange(e.target.value)}
              className="clay-input"
            >
              {machinery.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.asset_code}) — Current: {m.current_meter || m.initial_meter} hrs
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Work Date</label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="clay-input"
                required
              />
            </div>
            <div>
              <label className="clay-label">Operator / Driver</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="clay-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Plot / Field Location</label>
              <input
                type="text"
                placeholder="e.g. Plot A (Sugarcane block)"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="clay-input"
              />
            </div>
            <div>
              <label className="clay-label">Task / Operation</label>
              <input
                type="text"
                placeholder="e.g. Plowing, Sowing, Spraying"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="clay-input"
                required
              />
            </div>
          </div>

          {/* Meter Readings with Real-time Delta & Regression Warning */}
          <div style={{ background: '#f8faf8', padding: 14, borderRadius: 16, marginBottom: 14, border: '1px solid #d1fae5' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
              <div>
                <label className="clay-label">Start Meter Reading</label>
                <input
                  type="number"
                  step="0.1"
                  value={startMeter}
                  onChange={(e) => setStartMeter(Number(e.target.value))}
                  className="clay-input"
                  required
                />
              </div>
              <div>
                <label className="clay-label">End Meter Reading</label>
                <input
                  type="number"
                  step="0.1"
                  value={endMeter}
                  onChange={(e) => setEndMeter(Number(e.target.value))}
                  className="clay-input"
                  required
                />
              </div>
            </div>

            {isMeterRegression ? (
              <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} />
                <span>Error: End meter ({endMeter}) cannot be less than start meter ({startMeter})!</span>
              </div>
            ) : (
              <div style={{ color: '#15803d', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} />
                <span>Calculated Run Time: +{meterDelta} hours</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Fuel Added / Consumed (Litres)</label>
              <input
                type="number"
                step="0.5"
                value={fuelQuantity}
                onChange={(e) => setFuelQuantity(Number(e.target.value))}
                className="clay-input"
              />
            </div>
            <div>
              <label className="clay-label">Notes (Optional)</label>
              <input
                type="text"
                placeholder="Weather, soil hardness, implements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="clay-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <ClayButton variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </ClayButton>
            <ClayButton variant="primary" type="submit" disabled={isMeterRegression}>
              Save Usage Log
            </ClayButton>
          </div>
        </form>
      </ClayModal>
    </div>
  );
};
