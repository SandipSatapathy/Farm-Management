import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { Labourer, AttendanceStatus, TractorRentalLog } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { LabourAttendanceCalendarModal } from '../components/common/LabourAttendanceCalendarModal';
import confetti from 'canvas-confetti';
import {
  CalendarCheck,
  Wallet,
  CheckCircle2,
  DollarSign,
  Tractor,
  ArrowRight,
  Plus,
  Minus,
  Users,
  X,
  CreditCard,
  UserPlus,
  Trash2,
  Phone,
  AlertTriangle,
  Clock,
  Filter,
  Calendar
} from 'lucide-react';

type RoutineSection = 'attendance' | 'advance' | 'payday' | 'tractor' | 'labours';

export const SimpleFarmViewPage: React.FC = () => {
  const { farm } = useAuth();
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  const today = '2026-10-13';

  // Routine tab switcher
  const [activeSection, setActiveSection] = useState<RoutineSection>('attendance');

  // Selected labourer for monthly calendar modal view
  const [selectedLabourerForCalendar, setSelectedLabourerForCalendar] = useState<Labourer | null>(null);

  // Attendance state
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [attSaved, setAttSaved] = useState(false);

  // Advance state
  const [advLabId, setAdvLabId] = useState('');
  const [advAmount, setAdvAmount] = useState<number>(500);
  const [advSuccess, setAdvSuccess] = useState(false);

  // Settlement state
  const [settledLabId, setSettledLabId] = useState<string | null>(null);

  // Hired Tractor Rental State (Purely Hired / Rented — Zero Owned Tractors)
  const [tractorRentals, setTractorRentals] = useState<TractorRentalLog[]>([]);
  const [tractorDateFilter, setTractorDateFilter] = useState<string>('all');
  const [isNewRentalOpen, setIsNewRentalOpen] = useState(false);
  const [rentalDate, setRentalDate] = useState('2026-10-13');
  const [rentalTractorName, setRentalTractorName] = useState('Mahindra 575 DI (Hired)');
  const [rentalVendorName, setRentalVendorName] = useState('Patil Agri Rentals');
  const [rentalHours, setRentalHours] = useState<number>(4.0);
  const [rentalRate, setRentalRate] = useState<number>(900);
  const [rentalAdvance, setRentalAdvance] = useState<number>(1000);
  const [rentalTask, setRentalTask] = useState('Deep Plowing & Bed Preparation');
  const [rentalNotes, setRentalNotes] = useState('');
  const [tractorSuccessMsg, setTractorSuccessMsg] = useState('');

  // Labourer Management state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmLab, setDeleteConfirmLab] = useState<Labourer | null>(null);
  const [newLabName, setNewLabName] = useState('');
  const [newLabRate, setNewLabRate] = useState<number>(450);
  const [newLabCategory, setNewLabCategory] = useState('Harvest & Picking');
  const [newLabPhone, setNewLabPhone] = useState('');
  const [newLabNotes, setNewLabNotes] = useState('');
  const [labSuccessMsg, setLabSuccessMsg] = useState('');

  const loadData = () => {
    const labs = dataService.getLabourers(true);
    setLabourers(labs);
    if (labs.length > 0 && (!advLabId || !labs.some(l => l.id === advLabId))) {
      setAdvLabId(labs[0].id);
    }

    const todayAtt = dataService.getAttendanceForDate(today);
    const map: Record<string, AttendanceStatus> = {};
    labs.forEach((l) => {
      const rec = todayAtt.find((a) => a.labourer_id === l.id);
      map[l.id] = rec ? rec.status : 'present';
    });
    setAttendance(map);

    setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
  }, [tractorDateFilter]);

  // Attendance Handlers
  const handleToggleStatus = (labId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [labId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const map: Record<string, AttendanceStatus> = {};
    labourers.forEach((l) => {
      map[l.id] = 'present';
    });
    setAttendance(map);
  };

  const handleSaveAttendance = () => {
    const records = labourers.map((l) => {
      const st = attendance[l.id] || 'present';
      const units = st === 'present' ? 1.0 : (st === 'half_day' ? 0.5 : 0.0);
      return {
        labourer_id: l.id,
        work_date: today,
        shift_code: 'regular',
        status: st,
        payable_units: units,
        hours_worked: units * 8,
        task_name: l.work_category,
      };
    });

    dataService.recordAttendance(records, 'Farm Team');
    setAttSaved(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
    setTimeout(() => setAttSaved(false), 2500);
  };

  // Advance Handlers
  const handleGiveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (advAmount <= 0) return;

    try {
      dataService.issueAdvance({
        labourer_id: advLabId,
        amount: advAmount,
        purpose: 'Cash Advance',
        payment_method: 'cash',
      });
      setAdvSuccess(true);
      loadData();
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 }
      });
      setTimeout(() => setAdvSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Salary Settlement Handlers
  const handleSettleSalary = (lab: Labourer, netPayable: number) => {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 }
    });
    setSettledLabId(lab.id);
    setTimeout(() => setSettledLabId(null), 3000);
  };

  // Hired Tractor Rental Handlers
  const handleSaveTractorRental = (e: React.FormEvent) => {
    e.preventDefault();
    if (rentalHours <= 0 || rentalRate <= 0) return;

    try {
      const saved = dataService.saveTractorRental({
        tractor_name: rentalTractorName,
        vendor_name: rentalVendorName,
        work_date: rentalDate,
        hours_worked: rentalHours,
        hourly_rate: rentalRate,
        advance_amount: rentalAdvance,
        task_name: rentalTask,
        notes: rentalNotes,
      });

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });

      setIsNewRentalOpen(false);
      setTractorSuccessMsg(`Hired tractor logged! Total: ₹${saved.gross_amount}, Rest Due: ₹${saved.rest_amount}`);
      setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
      setTimeout(() => setTractorSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || 'Error saving tractor rental');
    }
  };

  const handleSettleRental = (id: string) => {
    try {
      dataService.settleTractorRental(id);
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 }
      });
      setTractorSuccessMsg('Hired tractor balance marked as settled / paid in full!');
      setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
      setTimeout(() => setTractorSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error settling rental');
    }
  };

  const handleDeleteRental = (id: string) => {
    if (window.confirm('Delete this hired tractor rental record?')) {
      dataService.deleteTractorRental(id);
      setTractorSuccessMsg('Tractor rental entry removed.');
      setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
      setTimeout(() => setTractorSuccessMsg(''), 3000);
    }
  };

  // Labourer Management Handlers
  const handleAddLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName.trim()) return;

    try {
      const created = dataService.saveLabourer({
        full_name: newLabName.trim(),
        base_rate: newLabRate,
        wage_basis: 'daily',
        work_category: newLabCategory.trim() || 'General Farm Labour',
        phone: newLabPhone.trim(),
        notes: newLabNotes.trim(),
      });

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });

      setNewLabName('');
      setNewLabRate(450);
      setNewLabCategory('Harvest & Picking');
      setNewLabPhone('');
      setNewLabNotes('');
      setIsAddModalOpen(false);

      loadData();
      setLabSuccessMsg(`Labourer "${created.full_name}" registered successfully!`);
      setTimeout(() => setLabSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error registering labourer');
    }
  };

  const handleConfirmRemoveLabour = (labId: string) => {
    try {
      dataService.removeLabourer(labId);
      setDeleteConfirmLab(null);
      loadData();
      setLabSuccessMsg('Labourer removed from active farm crew.');
      setTimeout(() => setLabSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error removing labourer');
    }
  };

  // Counts
  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;
  const halfDayCount = Object.values(attendance).filter((s) => s === 'half_day').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'absent' || s === 'leave').length;
  const totalPayableUnits = round2(presentCount + halfDayCount * 0.5);

  return (
    <div className="farm-dashboard-container">
      {/* Top Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 12px', borderRadius: 9999 }}>
            TODAY: 13 OCT 2026
          </span>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            {farm.name} • FY 2026-27
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0, color: '#143823', letterSpacing: '-0.02em', fontWeight: 800 }}>
              Farm Operations & Daily Khata
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
              Labour attendance, cash advance ledgers, salary slips & hired tractor accounts
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 14,
              padding: '10px 18px',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(21, 128, 61, 0.3)',
              minHeight: 44,
              flexShrink: 0,
            }}
            title="Register a new labourer to the farm crew"
          >
            <UserPlus size={18} />
            <span>+ Add New Labour</span>
          </button>
        </div>
      </div>

      {/* Routine Navigation Bar (Centered & Horizontal on Desktop, Snug on Mobile) */}
      <div className="mobile-routine-bar" style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={`mobile-routine-tab ${activeSection === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveSection('attendance')}
        >
          <CalendarCheck size={18} />
          <span>Attendance</span>
        </button>

        <button
          type="button"
          className={`mobile-routine-tab ${activeSection === 'advance' ? 'active' : ''}`}
          onClick={() => setActiveSection('advance')}
        >
          <Wallet size={18} />
          <span>Advance Khata</span>
        </button>

        <button
          type="button"
          className={`mobile-routine-tab ${activeSection === 'payday' ? 'active' : ''}`}
          onClick={() => setActiveSection('payday')}
        >
          <CreditCard size={18} />
          <span>Payday Slips</span>
        </button>

        <button
          type="button"
          className={`mobile-routine-tab ${activeSection === 'tractor' ? 'active' : ''}`}
          onClick={() => setActiveSection('tractor')}
        >
          <Tractor size={18} />
          <span>Hired Tractors</span>
        </button>

        <button
          type="button"
          className={`mobile-routine-tab ${activeSection === 'labours' ? 'active' : ''}`}
          onClick={() => setActiveSection('labours')}
        >
          <Users size={18} />
          <span>Worker Roster</span>
        </button>
      </div>

      {/* =========================================================================
          SECTION 1: ATTENDANCE
          ========================================================================= */}
      {activeSection === 'attendance' && (
        <div>
          {/* Attendance Stats Cards */}
          <div className="farm-desktop-grid-4" style={{ marginBottom: 16 }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: 18,
                padding: '12px 16px',
                boxShadow: 'var(--clay-card-shadow)',
                border: '2px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Present Crew</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d' }}>{presentCount}</div>
              </div>
              <span style={{ fontSize: '1.2rem' }}>🟢</span>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: 18,
                padding: '12px 16px',
                boxShadow: 'var(--clay-card-shadow)',
                border: '2px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Half-Day</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309' }}>{halfDayCount}</div>
              </div>
              <span style={{ fontSize: '1.2rem' }}>🟡</span>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: 18,
                padding: '12px 16px',
                boxShadow: 'var(--clay-card-shadow)',
                border: '2px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Absent / Leave</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b91c1c' }}>{absentCount}</div>
              </div>
              <span style={{ fontSize: '1.2rem' }}>🔴</span>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: 18,
                padding: '12px 16px',
                boxShadow: 'var(--clay-card-shadow)',
                border: '2px solid rgba(220, 235, 224, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Payable Units</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#143823' }}>{totalPayableUnits} Days</div>
              </div>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#15803d',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  padding: '5px 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                Mark All
              </button>
            </div>
          </div>

          {attSaved && (
            <div style={{ background: '#dcfce7', color: '#14532d', padding: '12px 16px', borderRadius: 16, marginBottom: 16, fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8, border: '2px solid #86efac' }}>
              <CheckCircle2 size={18} color="#15803d" />
              <span>Today's attendance saved & logged to permanent farm records!</span>
            </div>
          )}

          {/* Worker Cards Grid (2-Column on Desktop, 1-Column on Mobile) */}
          <div className="farm-desktop-grid-2" style={{ gap: 14 }}>
            {labourers.map((lab) => {
              const st = attendance[lab.id] || 'present';

              return (
                <div
                  key={lab.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    padding: '16px 18px',
                    boxShadow: 'var(--clay-card-shadow)',
                    border: '2px solid rgba(220, 235, 224, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div
                      onClick={() => setSelectedLabourerForCalendar(lab)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: 12,
                        transition: 'background 0.15s ease',
                      }}
                      title="Click to view monthly attendance calendar & numbers"
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: st === 'present' ? '#dcfce7' : (st === 'half_day' ? '#fef3c7' : '#fee2e2'),
                          color: st === 'present' ? '#15803d' : (st === 'half_day' ? '#b45309' : '#dc2626'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          flexShrink: 0,
                          border: '2px solid rgba(255,255,255,0.8)',
                          boxShadow: '2px 2px 5px rgba(166,184,170,0.2)'
                        }}
                      >
                        {lab.full_name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#143823' }}>
                            {lab.full_name}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              background: '#f0fdf4',
                              color: '#15803d',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 6,
                              border: '1px solid #bbf7d0'
                            }}
                          >
                            <Calendar size={11} /> Calendar
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          ₹{lab.base_rate}/day • {lab.work_category}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 9999,
                        background: st === 'present' ? '#dcfce7' : (st === 'half_day' ? '#fef3c7' : '#fee2e2'),
                        color: st === 'present' ? '#15803d' : (st === 'half_day' ? '#b45309' : '#b91c1c'),
                      }}
                    >
                      {st === 'present' ? '1.0 Day' : (st === 'half_day' ? '0.5 Day' : '0.0')}
                    </span>
                  </div>

                  {/* 3 Touch Status Buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={`mobile-status-btn ${st === 'present' ? 'selected-present' : ''}`}
                      onClick={() => handleToggleStatus(lab.id, 'present')}
                    >
                      <span>✓</span>
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      className={`mobile-status-btn ${st === 'half_day' ? 'selected-half' : ''}`}
                      onClick={() => handleToggleStatus(lab.id, 'half_day')}
                    >
                      <span>½</span>
                      <span>Half</span>
                    </button>

                    <button
                      type="button"
                      className={`mobile-status-btn ${st === 'absent' ? 'selected-absent' : ''}`}
                      onClick={() => handleToggleStatus(lab.id, 'absent')}
                    >
                      <span>✗</span>
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Action Footer */}
          <div className="mobile-sticky-bar">
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4b6354', textTransform: 'uppercase' }}>
                Crew Total
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d' }}>
                {totalPayableUnits} Days Worked Today
              </div>
            </div>

            <ClayButton variant="primary" onClick={handleSaveAttendance} style={{ minHeight: 46 }}>
              Save Attendance
            </ClayButton>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: CASH ADVANCE KHATA
          ========================================================================= */}
      {activeSection === 'advance' && (
        <div className="farm-desktop-split">
          {/* Left Column: Issue Cash Advance Form */}
          <ClayCard style={{ padding: 22 }}>
            <h2 style={{ fontSize: '1.35rem', margin: '0 0 6px 0', color: '#14532d', fontWeight: 800 }}>
              Issue Cash Advance
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
              Recorded cash advances are automatically tracked in Khata and deducted on payday.
            </p>

            {advSuccess && (
              <div style={{ background: '#dcfce7', color: '#14532d', padding: '12px 16px', borderRadius: 16, marginBottom: 16, fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8, border: '2px solid #86efac' }}>
                <CheckCircle2 size={18} color="#15803d" />
                <span>Advance recorded successfully! Added to worker's khata.</span>
              </div>
            )}

            <form onSubmit={handleGiveAdvance}>
              <div style={{ marginBottom: 16 }}>
                <label className="clay-label">Select Worker</label>
                <select
                  value={advLabId}
                  onChange={(e) => setAdvLabId(e.target.value)}
                  className="clay-input"
                  style={{ padding: '12px 14px', fontSize: '0.95rem' }}
                >
                  {labourers.map((l) => {
                    const bal = dataService.getLabourerAdvanceBalance(l.id);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.full_name} (Current Due: ₹{bal.outstanding})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="clay-label">Cash Amount (₹)</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={advAmount}
                  onChange={(e) => setAdvAmount(Number(e.target.value))}
                  className="clay-input"
                  style={{ fontSize: '1.4rem', fontWeight: 800, padding: '14px 18px', textAlign: 'center' }}
                  required
                />
              </div>

              {/* Quick Preset Chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                {[200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdvAmount(amt)}
                    style={{
                      minHeight: 44,
                      background: advAmount === amt ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#ffffff',
                      border: advAmount === amt ? '2px solid #d97706' : '1px solid #d1e5d5',
                      color: advAmount === amt ? '#92400e' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      borderRadius: 14,
                      cursor: 'pointer',
                    }}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <ClayButton variant="accent" type="submit" style={{ width: '100%', minHeight: 48, fontSize: '1.02rem' }}>
                Give Cash Advance Now
              </ClayButton>
            </form>
          </ClayCard>

          {/* Right Column: Running Advance Balances */}
          <ClayCard style={{ padding: 22 }}>
            <h3 style={{ fontSize: '1.15rem', color: '#143823', margin: '0 0 4px 0', fontWeight: 800 }}>
              Worker Advance Balances (Khata)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
              Active advances owed by workers across the farm
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {labourers.map((l) => {
                const bal = dataService.getLabourerAdvanceBalance(l.id);

                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLabourerForCalendar(l)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      padding: '12px 14px',
                      borderRadius: 16,
                      border: '1.5px solid rgba(220, 235, 224, 0.7)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                    }}
                    title="Click to view monthly attendance calendar & numbers"
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#143823' }}>
                          {l.full_name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>
                          📅 Calendar
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Total Given: ₹{bal.totalIssued} • Repaid: ₹{bal.totalRecovered}
                      </div>
                    </div>

                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        padding: '4px 10px',
                        borderRadius: 10,
                        background: bal.outstanding > 0 ? '#fef3c7' : '#f0fdf4',
                        color: bal.outstanding > 0 ? '#b45309' : '#15803d',
                        border: bal.outstanding > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                      }}
                    >
                      {bal.outstanding > 0 ? `Due: ₹${bal.outstanding}` : 'Clear'}
                    </span>
                  </div>
                );
              })}
            </div>
          </ClayCard>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: PAYDAY SLIPS
          ========================================================================= */}
      {activeSection === 'payday' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.35rem', margin: '0 0 4px 0', color: '#143823', fontWeight: 800 }}>
              Daily Payday Slips & Settlements
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Formula: <strong>Gross Wage (Days × Rate) − Advance Deducted = Take-Home Pay</strong>
            </div>
          </div>

          {/* Payslips Grid (2-Column on Desktop, 1-Column on Mobile) */}
          <div className="farm-desktop-grid-2" style={{ gap: 16 }}>
            {labourers.map((lab) => {
              const att = attendance[lab.id] || 'present';
              const daysWorked = att === 'present' ? 1.0 : (att === 'half_day' ? 0.5 : 0.0);
              const gross = round2(daysWorked * lab.base_rate);
              const bal = dataService.getLabourerAdvanceBalance(lab.id);
              const advanceDeducted = round2(Math.min(bal.outstanding, gross));
              const netPay = round2(Math.max(0, gross - advanceDeducted));
              const isSettled = settledLabId === lab.id;

              return (
                <div
                  key={lab.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    padding: '16px 18px',
                    boxShadow: 'var(--clay-card-shadow)',
                    border: isSettled ? '2px solid #22c55e' : '2px solid rgba(220, 235, 224, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div
                      onClick={() => setSelectedLabourerForCalendar(lab)}
                      style={{ cursor: 'pointer' }}
                      title="Click to audit monthly attendance calendar & numbers"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#143823' }}>
                          {lab.full_name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                          📅 Audit Month
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {lab.work_category} • ₹{lab.base_rate}/day
                      </div>
                    </div>

                    <span style={{ fontSize: '0.78rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 9999 }}>
                      {daysWorked} Days Worked Today
                    </span>
                  </div>

                  {/* Salary Math Box */}
                  <div style={{ background: '#f8faf8', padding: '10px 14px', borderRadius: 14, fontSize: '0.85rem', color: '#334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Earned: {daysWorked}d × ₹{lab.base_rate}</span>
                      <strong>₹{gross}</strong>
                    </div>
                    {advanceDeducted > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                        <span>Less advance:</span>
                        <strong>−₹{advanceDeducted}</strong>
                      </div>
                    )}
                  </div>

                  {/* Net Take-Home and Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                        Take-Home Pay
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d' }}>
                        ₹{netPay.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSettled}
                      onClick={() => handleSettleSalary(lab, netPay)}
                      style={{
                        padding: '10px 20px',
                        minHeight: 46,
                        borderRadius: 9999,
                        background: isSettled ? '#dcfce7' : 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: isSettled ? '#15803d' : '#ffffff',
                        border: isSettled ? '2px solid #86efac' : 'none',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: isSettled ? 'none' : '4px 4px 10px rgba(21, 128, 61, 0.35)',
                      }}
                    >
                      {isSettled ? '✓ Settled' : 'Pay Cash / UPI'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: HIRED TRACTOR RENTAL & OPERATIONS KHATA (ZERO OWNED TRACTORS)
          ========================================================================= */}
      {activeSection === 'tractor' && (() => {
        const totals = dataService.getTractorRentalTotals(tractorDateFilter);

        return (
          <div>
            {/* Header Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0, color: '#143823', fontWeight: 800 }}>
                  Hired Tractor & Rental Khata
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Log hired tractor runs, vendor rates, advance paid & rest balance due (Zero owned tractors)
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewRentalOpen(!isNewRentalOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isNewRentalOpen ? '#f1f5f9' : 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: isNewRentalOpen ? '#475569' : '#ffffff',
                  border: isNewRentalOpen ? '1px solid #cbd5e1' : 'none',
                  borderRadius: 14,
                  padding: '10px 16px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: isNewRentalOpen ? 'none' : '0 4px 10px rgba(21, 128, 61, 0.25)',
                  minHeight: 40,
                }}
              >
                <Plus size={16} />
                <span>{isNewRentalOpen ? 'Hide Form' : '+ Log Hired Tractor'}</span>
              </button>
            </div>

            {/* Success Alert */}
            {tractorSuccessMsg && (
              <div
                style={{
                  background: '#dcfce7',
                  border: '2px solid #86efac',
                  color: '#14532d',
                  padding: '12px 16px',
                  borderRadius: 16,
                  marginBottom: 16,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={18} color="#16a34a" />
                <span>{tractorSuccessMsg}</span>
              </div>
            )}

            {/* Date Filter Bar */}
            <ClayCard style={{ padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <Filter size={16} color="#15803d" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#143823' }}>
                  Filter Hired Tractor Sessions by Date:
                </span>
                {tractorDateFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setTractorDateFilter('all')}
                    style={{
                      marginLeft: 'auto',
                      background: 'transparent',
                      border: 'none',
                      color: '#15803d',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Clear Filter (Show All)
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {['all', '2026-10-13', '2026-10-12', '2026-10-11'].map((d) => {
                  const label = d === 'all' ? 'All Dates' : (d === '2026-10-13' ? 'Today (13 Oct)' : (d === '2026-10-12' ? '12 Oct' : '11 Oct'));
                  const isActive = tractorDateFilter === d;

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTractorDateFilter(d)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 12,
                        border: '1.5px solid',
                        borderColor: isActive ? '#16a34a' : '#cbdcd0',
                        background: isActive ? '#dcfce7' : '#ffffff',
                        color: isActive ? '#14532d' : '#475569',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}

                {/* Calendar Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <Calendar size={15} color="#64748b" />
                  <input
                    type="date"
                    value={tractorDateFilter === 'all' ? '' : tractorDateFilter}
                    onChange={(e) => setTractorDateFilter(e.target.value || 'all')}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.82rem',
                      borderRadius: 10,
                      border: '1.5px solid #cbdcd0',
                      background: '#ffffff',
                      color: '#143823',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </ClayCard>

            {/* Live Calculated Financial Summary for Filter (4 Horizontal Cards on Desktop, 2x2 on Mobile) */}
            <div className="farm-desktop-grid-4" style={{ marginBottom: 20 }}>
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 18,
                  padding: '14px 16px',
                  boxShadow: 'var(--clay-card-shadow)',
                  border: '2px solid rgba(220, 235, 224, 0.9)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Clock size={16} color="#15803d" />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                    Total Hired Hours
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>
                  {totals.totalHours} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>hrs</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {totals.count} tractor runs
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 18,
                  padding: '14px 16px',
                  boxShadow: 'var(--clay-card-shadow)',
                  border: '2px solid rgba(220, 235, 224, 0.9)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <DollarSign size={16} color="#15803d" />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                    Gross Rent Bill
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#143823' }}>
                  ₹{totals.totalGross.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Hours × Hourly Rate
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 18,
                  padding: '14px 16px',
                  boxShadow: 'var(--clay-card-shadow)',
                  border: '2px solid #93c5fd',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Wallet size={16} color="#2563eb" />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                    Advance Paid
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb' }}>
                  ₹{totals.totalAdvance.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Prepaid to owner/driver
                </div>
              </div>

              <div
                style={{
                  background: totals.totalRest > 0 ? '#fffbeb' : '#f0fdf4',
                  borderRadius: 18,
                  padding: '14px 16px',
                  boxShadow: 'var(--clay-card-shadow)',
                  border: totals.totalRest > 0 ? '2px solid #fde68a' : '2px solid #bbf7d0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <CheckCircle2 size={16} color={totals.totalRest > 0 ? '#d97706' : '#16a34a'} />
                  <span style={{ fontSize: '0.72rem', color: totals.totalRest > 0 ? '#92400e' : '#14532d', fontWeight: 800, textTransform: 'uppercase' }}>
                    Rest Due To Pay
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totals.totalRest > 0 ? '#b45309' : '#15803d' }}>
                  ₹{totals.totalRest.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: totals.totalRest > 0 ? '#b45309' : '#15803d', fontWeight: 700 }}>
                  {totals.totalRest > 0 ? 'Pending Settlement' : '✓ Fully Settled'}
                </div>
              </div>
            </div>

            {/* Desktop 2-Column Split: Form on Left, Logs Ledger on Right */}
            <div className="farm-desktop-split">
              {/* Column 1: Log Hired Tractor Run Form */}
              <ClayCard style={{ padding: 22, border: '2px solid #86efac', background: '#fbfdfb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Tractor size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#143823', fontWeight: 800 }}>
                      Log Hired Tractor Run
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      Enter rental hours, rate & advance paid
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveTractorRental}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                    <div>
                      <label className="clay-label">Work Date *</label>
                      <input
                        type="date"
                        value={rentalDate}
                        onChange={(e) => setRentalDate(e.target.value)}
                        className="clay-input"
                        style={{ minHeight: 44, fontSize: '0.88rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="clay-label">Vendor / Rental Owner *</label>
                      <input
                        type="text"
                        placeholder="e.g. Patil Agri Rentals"
                        value={rentalVendorName}
                        onChange={(e) => setRentalVendorName(e.target.value)}
                        className="clay-input"
                        style={{ minHeight: 44, fontSize: '0.88rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label className="clay-label">Hired Tractor Model *</label>
                    <input
                      type="text"
                      placeholder="e.g. Mahindra 575 DI (Hired) or John Deere"
                      value={rentalTractorName}
                      onChange={(e) => setRentalTractorName(e.target.value)}
                      className="clay-input"
                      style={{ minHeight: 44 }}
                      required
                    />
                  </div>

                  {/* Hours Stepper */}
                  <div style={{ marginBottom: 14, background: '#ffffff', padding: 12, borderRadius: 16, border: '1.5px solid #d1fae5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="clay-label" style={{ margin: 0 }}>Hours Worked</label>
                      <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                        Tap + or − to adjust
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
                      <button
                        type="button"
                        onClick={() => setRentalHours(Math.max(0.5, round2(rentalHours - 0.5)))}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#f8fafc',
                          border: '2px solid #cbd5e1',
                          fontSize: '1.3rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        −
                      </button>

                      <div style={{ textAlign: 'center', minWidth: 100 }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d', lineHeight: 1 }}>
                          {rentalHours}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                          Hours Duration
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setRentalHours(round2(rentalHours + 0.5))}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#f8fafc',
                          border: '2px solid #cbd5e1',
                          fontSize: '1.3rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                    <div>
                      <label className="clay-label">Hourly Rate (₹/hr) *</label>
                      <input
                        type="number"
                        min="100"
                        step="25"
                        placeholder="e.g. 900"
                        value={rentalRate}
                        onChange={(e) => setRentalRate(Number(e.target.value))}
                        className="clay-input"
                        style={{ minHeight: 44 }}
                        required
                      />
                    </div>

                    <div>
                      <label className="clay-label">Advance Paid (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="e.g. 1000"
                        value={rentalAdvance}
                        onChange={(e) => setRentalAdvance(Number(e.target.value))}
                        className="clay-input"
                        style={{ minHeight: 44 }}
                      />
                    </div>
                  </div>

                  {/* Quick Advance Chips */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Quick Advance:</span>
                    {[0, 500, 1000, 1500, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRentalAdvance(amt)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 10,
                          border: '1px solid #cbdcd0',
                          background: rentalAdvance === amt ? '#dcfce7' : '#ffffff',
                          color: rentalAdvance === amt ? '#15803d' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        {amt === 0 ? 'No Adv' : `₹${amt}`}
                      </button>
                    ))}
                  </div>

                  {/* Live Calculation Preview Box */}
                  {(() => {
                    const gross = round2(rentalHours * rentalRate);
                    const rest = round2(Math.max(0, gross - rentalAdvance));

                    return (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '2px solid #86efac',
                          borderRadius: 16,
                          padding: '14px 16px',
                          marginBottom: 16,
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: 6 }}>
                          Live Bill Breakdown
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#143823', marginBottom: 4 }}>
                          <span>Gross Cost ({rentalHours}h × ₹{rentalRate}/h):</span>
                          <strong>₹{gross.toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#2563eb', marginBottom: 6 }}>
                          <span>Advance Deducted:</span>
                          <strong>− ₹{rentalAdvance.toLocaleString('en-IN')}</strong>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1.5px dashed #86efac',
                            paddingTop: 8,
                            fontSize: '1rem',
                            fontWeight: 800,
                            color: rest > 0 ? '#b45309' : '#15803d',
                          }}
                        >
                          <span>👉 Rest Due to Pay:</span>
                          <span style={{ fontSize: '1.3rem' }}>₹{rest.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ marginBottom: 16 }}>
                    <label className="clay-label">Operation / Task Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Deep Plowing & Bed Preparation"
                      value={rentalTask}
                      onChange={(e) => setRentalTask(e.target.value)}
                      className="clay-input"
                      style={{ minHeight: 44 }}
                    />
                  </div>

                  <ClayButton variant="primary" type="submit" style={{ width: '100%', minHeight: 48, fontSize: '1.02rem' }}>
                    Save Hired Tractor Run
                  </ClayButton>
                </form>
              </ClayCard>

              {/* Column 2: Rental Session Logs Ledger */}
              <div>
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: '#143823' }}>
                    Rental Session Logs ({tractorRentals.length})
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {tractorDateFilter === 'all' ? 'All recorded runs' : `Date: ${tractorDateFilter}`}
                  </span>
                </div>

                {tractorRentals.length === 0 ? (
                  <ClayCard style={{ textAlign: 'center', padding: '36px 20px' }}>
                    <Tractor size={36} color="#16a34a" style={{ marginBottom: 10 }} />
                    <h4 style={{ margin: '0 0 6px 0', color: '#143823', fontSize: '1.1rem' }}>No Tractor Runs Found</h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                      {tractorDateFilter === 'all'
                        ? 'No hired tractor runs recorded yet. Use the form on the left to log your first run.'
                        : `No hired tractor runs recorded for date ${tractorDateFilter}.`}
                    </p>
                  </ClayCard>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tractorRentals.map((log) => {
                      const isSettled = log.status === 'settled';

                      return (
                        <ClayCard key={log.id} style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#143823' }}>
                                  {log.tractor_name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                  }}
                                >
                                  {log.work_date}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                Vendor: <strong>{log.vendor_name}</strong> • {log.task_name}
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                padding: '4px 12px',
                                borderRadius: 9999,
                                background: isSettled ? '#dcfce7' : '#fef3c7',
                                color: isSettled ? '#15803d' : '#b45309',
                                border: isSettled ? '1px solid #86efac' : '1px solid #fde68a',
                              }}
                            >
                              {isSettled ? '✓ Fully Settled' : `Rest Due: ₹${log.rest_amount}`}
                            </span>
                          </div>

                          {/* Mobile-Friendly Key-Value Grid */}
                          <div
                            style={{
                              background: '#f8faf8',
                              borderRadius: 14,
                              padding: '12px 14px',
                              marginBottom: 12,
                              border: '1px solid rgba(220, 235, 224, 0.7)',
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 8 }}>
                              <div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Time Worked: </span>
                                <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>{log.hours_worked} hrs</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Hourly Rate: </span>
                                <strong style={{ color: '#143823', fontSize: '0.95rem' }}>₹{log.hourly_rate}/hr</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Gross Bill: </span>
                                <strong style={{ color: '#143823', fontSize: '0.95rem' }}>₹{log.gross_amount}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Advance Paid: </span>
                                <strong style={{ color: '#2563eb', fontSize: '0.95rem' }}>₹{log.advance_amount}</strong>
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderTop: '1px dashed #cbdcd0',
                                paddingTop: 6,
                              }}
                            >
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                Remaining Balance Due:
                              </span>
                              <strong style={{ fontSize: '1.15rem', color: log.rest_amount > 0 ? '#b45309' : '#15803d' }}>
                                ₹{log.rest_amount}
                              </strong>
                            </div>
                          </div>

                          {/* Action Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              {log.notes || `Log ID: ${log.id}`}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {!isSettled && log.rest_amount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSettleRental(log.id)}
                                  style={{
                                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 12,
                                    padding: '8px 16px',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                                    minHeight: 38,
                                  }}
                                >
                                  Settle Balance (₹{log.rest_amount})
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteRental(log.id)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  borderRadius: 10,
                                  padding: '7px 10px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minHeight: 38,
                                }}
                                title="Delete this rental log"
                              >
                                <Trash2 size={15} color="#dc2626" />
                              </button>
                            </div>
                          </div>
                        </ClayCard>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          SECTION 5: WORKER ROSTER (LABOURS)
          ========================================================================= */}
      {activeSection === 'labours' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '4px 12px', borderRadius: 10, fontSize: '0.88rem' }}>
                {labourers.length} Active Farm Labourers
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#ffffff',
                border: '2px solid #bbf7d0',
                color: '#15803d',
                borderRadius: 12,
                padding: '8px 14px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={16} />
              <span>+ Add Labour</span>
            </button>
          </div>

          {labSuccessMsg && (
            <div
              style={{
                background: '#dcfce7',
                border: '2px solid #86efac',
                color: '#14532d',
                padding: '12px 16px',
                borderRadius: 16,
                marginBottom: 16,
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={18} color="#16a34a" />
              <span>{labSuccessMsg}</span>
            </div>
          )}

          {/* Labourers Cards Grid (3-Column on Desktop, 1-Column on Mobile) */}
          <div className="farm-desktop-grid-3" style={{ gap: 16 }}>
            {labourers.map((lab) => {
              const balance = dataService.getLabourerAdvanceBalance(lab.id).outstanding;

              return (
                <ClayCard
                  key={lab.id}
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    onClick={() => setSelectedLabourerForCalendar(lab)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: 12,
                      transition: 'background 0.15s ease',
                    }}
                    title="Click to view monthly attendance calendar & numbers"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: 'linear-gradient(135deg, #16a34a, #15803d)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                          boxShadow: '2px 2px 6px rgba(21, 128, 61, 0.25)',
                          flexShrink: 0,
                        }}
                      >
                        {lab.full_name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#143823' }}>
                            {lab.full_name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 6px',
                              borderRadius: 6,
                            }}
                          >
                            {lab.labour_code}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          {lab.work_category}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#15803d' }}>
                        ₹{lab.base_rate}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                        per day
                      </div>
                    </div>
                  </div>

                  {/* Monthly Attendance & Numbers button */}
                  <button
                    type="button"
                    onClick={() => setSelectedLabourerForCalendar(lab)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      width: '100%',
                      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                      border: '1.5px solid #86efac',
                      color: '#15803d',
                      borderRadius: 12,
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 5px rgba(21, 128, 61, 0.1)',
                    }}
                  >
                    <Calendar size={15} color="#15803d" />
                    <span>Monthly Attendance & Numbers</span>
                  </button>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(220, 235, 224, 0.7)',
                      paddingTop: 10,
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {balance > 0 ? (
                        <span
                          style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 8,
                            border: '1px solid #fde68a',
                          }}
                        >
                          Khata Due: ₹{balance}
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#f0fdf4',
                            color: '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 8,
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          Clear Advance
                        </span>
                      )}

                      {lab.phone && (
                        <a
                          href={`tel:${lab.phone}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#f8fafc',
                            color: '#334155',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <Phone size={12} color="#64748b" />
                          <span>{lab.phone}</span>
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmLab(lab)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#ffffff',
                        border: '1.5px solid #fecaca',
                        color: '#dc2626',
                        borderRadius: 10,
                        padding: '5px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Remove worker from farm crew"
                    >
                      <Trash2 size={13} color="#dc2626" />
                      <span>Remove</span>
                    </button>
                  </div>
                </ClayCard>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD LABOUR MODAL
          ========================================================================= */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 56, 35, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              background: '#f4f8f5',
              borderRadius: 24,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2), inset 1px 1px 2px #ffffff',
              border: '2px solid rgba(220, 235, 224, 0.9)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#143823' }}>Add New Labour</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbdcd0',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddLabour}>
              <div style={{ marginBottom: 14 }}>
                <label className="clay-label">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Patil"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="clay-input"
                  style={{ minHeight: 44 }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="clay-label">Daily Wage Rate (₹/day) *</label>
                <input
                  type="number"
                  step="10"
                  min="50"
                  placeholder="e.g. 450"
                  value={newLabRate}
                  onChange={(e) => setNewLabRate(Number(e.target.value))}
                  className="clay-input"
                  style={{ minHeight: 44 }}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="clay-label">Work Category / Specialization</label>
                <select
                  value={newLabCategory}
                  onChange={(e) => setNewLabCategory(e.target.value)}
                  className="clay-input"
                  style={{ minHeight: 44 }}
                >
                  <option value="Harvest & Picking">Harvest & Picking</option>
                  <option value="Pruning & Weeding">Pruning & Weeding</option>
                  <option value="Irrigation & Sprinkler">Irrigation & Sprinkler</option>
                  <option value="Tractor Operator">Tractor Operator</option>
                  <option value="Packing & Grading">Packing & Grading</option>
                  <option value="General Farm Labour">General Farm Labour</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="clay-label">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newLabPhone}
                  onChange={(e) => setNewLabPhone(e.target.value)}
                  className="clay-input"
                  style={{ minHeight: 44 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="clay-label">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Vineyard specialist"
                  value={newLabNotes}
                  onChange={(e) => setNewLabNotes(e.target.value)}
                  className="clay-input"
                  style={{ minHeight: 44 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    flex: 1,
                    background: '#ffffff',
                    border: '2px solid #cbdcd0',
                    borderRadius: 14,
                    padding: '10px 14px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: '#64748b',
                    cursor: 'pointer',
                    minHeight: 46,
                  }}
                >
                  Cancel
                </button>
                <ClayButton
                  variant="primary"
                  type="submit"
                  style={{ flex: 2, minHeight: 46, fontSize: '0.95rem' }}
                >
                  Save & Register
                </ClayButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          REMOVE LABOURER CONFIRMATION MODAL
          ========================================================================= */}
      {deleteConfirmLab && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 56, 35, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setDeleteConfirmLab(null)}
        >
          <div
            style={{
              maxWidth: 400,
              width: '100%',
              background: '#ffffff',
              borderRadius: 24,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '2px solid #fecaca',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#991b1b', fontWeight: 800 }}>
                Remove Labourer?
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.88rem', lineHeight: 1.4 }}>
                Are you sure you want to remove <strong>{deleteConfirmLab.full_name}</strong> ({deleteConfirmLab.labour_code}) from the active farm crew?
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmLab(null)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 14,
                  padding: '10px 14px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: '#475569',
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRemoveLabour(deleteConfirmLab.id)}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: 14,
                  padding: '10px 14px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  color: '#ffffff',
                  cursor: 'pointer',
                  minHeight: 44,
                  boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)',
                }}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Attendance Calendar & Numbers Modal */}
      <LabourAttendanceCalendarModal
        isOpen={!!selectedLabourerForCalendar}
        onClose={() => setSelectedLabourerForCalendar(null)}
        labourer={selectedLabourerForCalendar}
        onAdvanceClick={(labId) => {
          setAdvLabId(labId);
          setActiveSection('advance');
        }}
        onAttendanceUpdated={() => {
          loadData();
        }}
      />
    </div>
  );
};

export default SimpleFarmViewPage;
