import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { Labourer, AttendanceRecord, AttendanceStatus } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import { ClayModal } from '../components/common/ClayModal';
import {
  CalendarCheck,
  Calendar,
  Users,
  Check,
  Clock,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { isReadOnlyPartner, canMutateOperations, currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [selectedShift, setSelectedShift] = useState('regular');
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  
  // Local state for the selected day's attendance
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; units: number; hours: number; reason: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [correctionLabourerId, setCorrectionLabourerId] = useState<string | null>(null);
  const [correctionReasonText, setCorrectionReasonText] = useState('');

  const loadData = () => {
    const labs = dataService.getLabourers(true);
    setLabourers(labs);

    const existingRecords = dataService.getAttendanceForDate(selectedDate, selectedShift);
    const map: Record<string, { status: AttendanceStatus; units: number; hours: number; reason: string }> = {};

    labs.forEach((l) => {
      const rec = existingRecords.find((r) => r.labourer_id === l.id);
      if (rec) {
        map[l.id] = {
          status: rec.status,
          units: rec.payable_units,
          hours: rec.hours_worked || 8,
          reason: rec.correction_reason || '',
        };
      } else {
        // Default to present for quick 1-tap confirmation
        map[l.id] = {
          status: 'present',
          units: 1.0,
          hours: 8,
          reason: '',
        };
      }
    });

    setAttendanceMap(map);
  };

  useEffect(() => {
    loadData();
    setSaveSuccess(false);
  }, [selectedDate, selectedShift]);

  const handleStatusChange = (labourerId: string, status: AttendanceStatus) => {
    if (isReadOnlyPartner) return;

    let units = 1.0;
    let hours = 8;
    if (status === 'half_day') {
      units = 0.5;
      hours = 4;
    } else if (status === 'absent' || status === 'leave') {
      units = 0.0;
      hours = 0;
    } else if (status === 'holiday') {
      units = 1.0;
      hours = 0;
    }

    setAttendanceMap((prev) => ({
      ...prev,
      [labourerId]: {
        ...prev[labourerId],
        status,
        units,
        hours,
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (isReadOnlyPartner) return;
    const units = status === 'present' ? 1.0 : (status === 'half_day' ? 0.5 : 0.0);
    const hours = status === 'present' ? 8 : (status === 'half_day' ? 4 : 0);

    const newMap = { ...attendanceMap };
    labourers.forEach((l) => {
      newMap[l.id] = {
        ...newMap[l.id],
        status,
        units,
        hours,
      };
    });
    setAttendanceMap(newMap);
  };

  const handleSaveAttendance = () => {
    if (isReadOnlyPartner) return;

    const recordsToSave = labourers.map((l) => {
      const entry = attendanceMap[l.id];
      return {
        labourer_id: l.id,
        work_date: selectedDate,
        shift_code: selectedShift,
        status: entry.status,
        payable_units: entry.units,
        hours_worked: entry.hours,
        task_name: l.work_category,
        correction_reason: entry.reason,
      };
    });

    dataService.recordAttendance(recordsToSave, currentUser.id);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Turnout calculation
  const totalCrew = labourers.length;
  const presentCount = Object.values(attendanceMap).filter((e) => e.status === 'present').length;
  const halfDayCount = Object.values(attendanceMap).filter((e) => e.status === 'half_day').length;
  const absentCount = Object.values(attendanceMap).filter((e) => e.status === 'absent' || e.status === 'leave').length;
  const totalPayableUnits = round2(Object.values(attendanceMap).reduce((s, e) => s + e.units, 0));

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Daily Attendance Board</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Fast 1-tap crew attendance marking, supervisor correction tracking, and duplicate prevention.
          </p>
        </div>

        {!isReadOnlyPartner && (
          <ClayButton
            variant="primary"
            icon={<Save size={18} />}
            onClick={handleSaveAttendance}
          >
            Save & Approve Daily Register
          </ClayButton>
        )}
      </div>

      {saveSuccess && (
        <div
          style={{
            background: '#dcfce7',
            border: '2px solid #86efac',
            borderRadius: 16,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#14532d',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={20} color="#15803d" />
          <span>Attendance records successfully saved and audited for {selectedDate}!</span>
        </div>
      )}

      {/* Control Bar: Date Selector, Shift, Quick Mark */}
      <ClayCard style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <label className="clay-label">Work Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="clay-input"
                style={{ width: 170 }}
              />
            </div>

            <div>
              <label className="clay-label">Shift</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="clay-input"
                style={{ width: 150 }}
              >
                <option value="regular">Regular Shift</option>
                <option value="morning">Morning Shift</option>
                <option value="evening">Evening Shift</option>
              </select>
            </div>
          </div>

          {/* Quick Mark Actions */}
          {!isReadOnlyPartner && (
            <div>
              <label className="clay-label">Bulk Quick Actions</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <ClayButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMarkAll('present')}
                >
                  Mark All Present
                </ClayButton>
                <ClayButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMarkAll('half_day')}
                >
                  Mark All Half-Day
                </ClayButton>
                <ClayButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMarkAll('absent')}
                >
                  Clear All
                </ClayButton>
              </div>
            </div>
          )}
        </div>
      </ClayCard>

      {/* Summary KPI Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', padding: 14, borderRadius: 18, border: '2px solid #bbf7d0', boxShadow: 'var(--clay-card-shadow)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Present (1.0)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>{presentCount}</div>
        </div>

        <div style={{ background: '#ffffff', padding: 14, borderRadius: 18, border: '2px solid #fde68a', boxShadow: 'var(--clay-card-shadow)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Half Day (0.5)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>{halfDayCount}</div>
        </div>

        <div style={{ background: '#ffffff', padding: 14, borderRadius: 18, border: '2px solid #fecaca', boxShadow: 'var(--clay-card-shadow)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Absent / Leave</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c' }}>{absentCount}</div>
        </div>

        <div style={{ background: '#ffffff', padding: 14, borderRadius: 18, border: '2px solid #bfdbfe', boxShadow: 'var(--clay-card-shadow)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Total Payable Units</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1' }}>{totalPayableUnits}</div>
        </div>
      </div>

      {/* Crew Attendance Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 30 }}>
        {labourers.map((lab) => {
          const entry = attendanceMap[lab.id] || { status: 'present', units: 1.0, hours: 8, reason: '' };
          const status = entry.status;

          return (
            <ClayCard key={lab.id} style={{ padding: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                {/* Crew Member Info */}
                <div style={{ minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>
                      {lab.labour_code}
                    </span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-text-main)' }}>
                      {lab.full_name}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {lab.work_category} • ₹{lab.base_rate}/{lab.wage_basis}
                  </div>
                  {entry.reason && (
                    <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={12} />
                      <span>Correction Note: {entry.reason}</span>
                    </div>
                  )}
                </div>

                {/* Tactile 1-Tap Status Selector Pill Group */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={isReadOnlyPartner}
                    onClick={() => handleStatusChange(lab.id, 'present')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 14,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isReadOnlyPartner ? 'default' : 'pointer',
                      border: status === 'present' ? '2px solid #16a34a' : '2px solid rgba(220, 235, 224, 0.7)',
                      background: status === 'present' ? '#dcfce7' : '#ffffff',
                      color: status === 'present' ? '#14532d' : '#475569',
                      boxShadow: status === 'present' ? 'inset 1px 1px 3px rgba(0,0,0,0.1), 2px 2px 6px rgba(22, 163, 74, 0.2)' : '2px 2px 4px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ✓ Present (1.0)
                  </button>

                  <button
                    type="button"
                    disabled={isReadOnlyPartner}
                    onClick={() => handleStatusChange(lab.id, 'half_day')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 14,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isReadOnlyPartner ? 'default' : 'pointer',
                      border: status === 'half_day' ? '2px solid #d97706' : '2px solid rgba(220, 235, 224, 0.7)',
                      background: status === 'half_day' ? '#fef3c7' : '#ffffff',
                      color: status === 'half_day' ? '#92400e' : '#475569',
                      boxShadow: status === 'half_day' ? 'inset 1px 1px 3px rgba(0,0,0,0.1), 2px 2px 6px rgba(217, 119, 6, 0.2)' : '2px 2px 4px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ½ Half Day (0.5)
                  </button>

                  <button
                    type="button"
                    disabled={isReadOnlyPartner}
                    onClick={() => handleStatusChange(lab.id, 'absent')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 14,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isReadOnlyPartner ? 'default' : 'pointer',
                      border: status === 'absent' ? '2px solid #dc2626' : '2px solid rgba(220, 235, 224, 0.7)',
                      background: status === 'absent' ? '#fee2e2' : '#ffffff',
                      color: status === 'absent' ? '#991b1b' : '#475569',
                      boxShadow: status === 'absent' ? 'inset 1px 1px 3px rgba(0,0,0,0.1), 2px 2px 6px rgba(220, 38, 38, 0.2)' : '2px 2px 4px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ✗ Absent (0.0)
                  </button>

                  <button
                    type="button"
                    disabled={isReadOnlyPartner}
                    onClick={() => handleStatusChange(lab.id, 'leave')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 14,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isReadOnlyPartner ? 'default' : 'pointer',
                      border: status === 'leave' ? '2px solid #9333ea' : '2px solid rgba(220, 235, 224, 0.7)',
                      background: status === 'leave' ? '#f3e8ff' : '#ffffff',
                      color: status === 'leave' ? '#6b21a8' : '#475569',
                      boxShadow: status === 'leave' ? 'inset 1px 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    Leave
                  </button>

                  {!isReadOnlyPartner && (
                    <ClayButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCorrectionLabourerId(lab.id);
                        setCorrectionReasonText(entry.reason || '');
                      }}
                    >
                      Reason
                    </ClayButton>
                  )}
                </div>
              </div>
            </ClayCard>
          );
        })}
      </div>

      {/* Mandatory Correction Reason Modal */}
      {correctionLabourerId && (
        <ClayModal
          isOpen={Boolean(correctionLabourerId)}
          onClose={() => setCorrectionLabourerId(null)}
          title="Supervisor Correction Reason"
        >
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Provide an auditable reason for modifying attendance or recording anomalies (e.g. late arrival, field injury, rain interruption):
            </p>
            <textarea
              rows={3}
              value={correctionReasonText}
              onChange={(e) => setCorrectionReasonText(e.target.value)}
              className="clay-input"
              placeholder="e.g. Left early at 2 PM due to rain; verified by supervisor."
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <ClayButton variant="secondary" onClick={() => setCorrectionLabourerId(null)}>
                Cancel
              </ClayButton>
              <ClayButton
                variant="primary"
                onClick={() => {
                  if (correctionLabourerId) {
                    setAttendanceMap((prev) => ({
                      ...prev,
                      [correctionLabourerId]: {
                        ...prev[correctionLabourerId],
                        reason: correctionReasonText,
                      },
                    }));
                  }
                  setCorrectionLabourerId(null);
                }}
              >
                Save Reason
              </ClayButton>
            </div>
          </div>
        </ClayModal>
      )}
    </div>
  );
};
