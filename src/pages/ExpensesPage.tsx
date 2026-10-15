import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { Machinery, MachineryExpense, ExpenseCategory, PaymentMethod } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayModal } from '../components/common/ClayModal';
import {
  Receipt,
  PlusCircle,
  Fuel,
  Wrench,
  Tractor,
  DollarSign,
  Calendar,
  Filter
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { isReadOnlyPartner } = useAuth();
  const [expenses, setExpenses] = useState<MachineryExpense[]>([]);
  const [machinery, setMachinery] = useState<Machinery[]>([]);
  const [filterCat, setFilterCat] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState<number>(1000);
  const [quantity, setQuantity] = useState<number>(10);
  const [unit, setUnit] = useState('Litres');
  const [vendor, setVendor] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setExpenses(dataService.getExpenses());
    const macs = dataService.getMachinery();
    setMachinery(macs);
    if (macs.length > 0 && !selectedMachineId) {
      setSelectedMachineId(macs[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    try {
      dataService.recordExpense({
        machinery_id: selectedMachineId || undefined,
        expense_date: expenseDate,
        category,
        amount: Number(amount),
        quantity: quantity ? Number(quantity) : undefined,
        unit,
        vendor,
        payment_method: method,
        payment_reference: ref,
        notes,
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error recording expense');
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    return filterCat === 'all' || e.category === filterCat;
  });

  const totalFuel = round2(expenses.filter(e => e.category === 'fuel').reduce((s, e) => s + e.amount, 0));
  const totalService = round2(expenses.filter(e => e.category === 'servicing' || e.category === 'maintenance' || e.category === 'repair').reduce((s, e) => s + e.amount, 0));
  const totalHired = round2(expenses.filter(e => e.category === 'hired_service').reduce((s, e) => s + e.amount, 0));
  const totalAll = round2(expenses.reduce((s, e) => s + e.amount, 0));

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Machinery Operating Expenses</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Ledger for fuel, maintenance, parts, repairs, and hired machinery rentals.
          </p>
        </div>

        {!isReadOnlyPartner && (
          <ClayButton
            variant="primary"
            icon={<PlusCircle size={18} />}
            onClick={() => setIsModalOpen(true)}
          >
            Record Expense
          </ClayButton>
        )}
      </div>

      {/* Expense KPI Summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #bbf7d0', boxShadow: 'var(--clay-card-shadow)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Total Operating Expenses</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>
            ₹{totalAll.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #fde68a', boxShadow: 'var(--clay-card-shadow)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Diesel & Fuel</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>
            ₹{totalFuel.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #bfdbfe', boxShadow: 'var(--clay-card-shadow)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Repairs & Maintenance</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1' }}>
            ₹{totalService.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #e9d5ff', boxShadow: 'var(--clay-card-shadow)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b6354', textTransform: 'uppercase' }}>Hired Equipment Rent</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7e22ce' }}>
            ₹{totalHired.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <ClayCard style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Filter size={18} color="#15803d" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Filter Category:</span>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="clay-input"
            style={{ width: 200 }}
          >
            <option value="all">All Categories</option>
            <option value="fuel">Diesel / Fuel</option>
            <option value="servicing">Servicing</option>
            <option value="repair">Repair</option>
            <option value="maintenance">Maintenance</option>
            <option value="hired_service">Hired Rentals</option>
            <option value="other">Other</option>
          </select>
        </div>
      </ClayCard>

      {/* Expenses Table */}
      <div className="clay-table-container">
        <table className="clay-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Machinery</th>
              <th>Amount (₹)</th>
              <th>Quantity / Unit</th>
              <th>Vendor / Payee</th>
              <th>Payment Mode</th>
              <th>Notes / Voucher</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((exp) => (
              <tr key={exp.id}>
                <td>{exp.expense_date}</td>
                <td>
                  <span
                    style={{
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: exp.category === 'fuel' ? '#fef3c7' : '#dcfce7',
                      color: exp.category === 'fuel' ? '#92400e' : '#14532d',
                    }}
                  >
                    {exp.category}
                  </span>
                </td>
                <td>
                  <strong>{exp.machinery_name || 'General Farm'}</strong>
                </td>
                <td style={{ fontWeight: 800, color: '#14532d', fontSize: '1rem' }}>
                  ₹{exp.amount.toLocaleString('en-IN')}
                </td>
                <td>{exp.quantity ? `${exp.quantity} ${exp.unit || ''}` : '—'}</td>
                <td>{exp.vendor || 'Local Vendor'}</td>
                <td>
                  <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{exp.payment_method}</span>
                </td>
                <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{exp.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <ClayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Machinery Expense"
      >
        <form onSubmit={handleSaveExpense}>
          <div style={{ marginBottom: 14 }}>
            <label className="clay-label">Select Machinery / Asset</label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="clay-input"
            >
              {machinery.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.asset_code})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="clay-input"
                required
              />
            </div>
            <div>
              <label className="clay-label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="clay-input"
              >
                <option value="fuel">Diesel / Fuel</option>
                <option value="repair">Repair</option>
                <option value="servicing">Servicing</option>
                <option value="maintenance">Maintenance</option>
                <option value="parts">Spare Parts</option>
                <option value="lubricant">Engine Oil & Lubricant</option>
                <option value="hired_service">Hired Machinery Charges</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="clay-input"
                required
              />
            </div>
            <div>
              <label className="clay-label">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="clay-input"
              >
                <option value="upi">UPI / Online</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Quantity (Optional, e.g. 40)</label>
              <input
                type="number"
                step="0.5"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="clay-input"
              />
            </div>
            <div>
              <label className="clay-label">Unit (e.g. Litres, Hours)</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="clay-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="clay-label">Vendor / Station</label>
              <input
                type="text"
                placeholder="e.g. Bharat Petroleum / Tractor Garage"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="clay-input"
              />
            </div>
            <div>
              <label className="clay-label">Bill / Voucher Ref</label>
              <input
                type="text"
                placeholder="e.g. INV-98124"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="clay-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="clay-label">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="clay-input"
              placeholder="Additional expense details..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <ClayButton variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </ClayButton>
            <ClayButton variant="primary" type="submit">
              Save Expense
            </ClayButton>
          </div>
        </form>
      </ClayModal>
    </div>
  );
};
