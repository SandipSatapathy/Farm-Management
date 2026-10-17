import { Capacitor } from '@capacitor/core';
import { isSupabaseConfigured, supabase } from './supabaseClient';

// Unified Database Sync Client
// Development on PC: Connects to local PostgreSQL (/api/db) to keep test data isolated.
// Native Mobile (Android APK) and Production: Connects directly to Supabase Cloud Server.

export interface LocalDbHealth {
  ok: boolean;
  connected: boolean;
  database?: string;
  tables?: number;
  version?: string;
  error?: string;
  hint?: string;
}

// Local PostgreSQL is enabled ONLY when:
// 1. Not running on a native mobile device (Capacitor native platform is false)
// 2. Running in Vite local development mode ('npm run dev' on PC)
// 3. VITE_USE_LOCAL_DB is explicitly true (from .env.development)
export const isLocalDbEnabled = Boolean(
  !Capacitor.isNativePlatform() &&
  import.meta.env.DEV &&
  (import.meta.env.VITE_USE_LOCAL_DB === 'true' || import.meta.env.VITE_USE_LOCAL_DB === true)
);

export const isDbSyncActive = isLocalDbEnabled || isSupabaseConfigured;

export async function checkLocalDbHealth(): Promise<LocalDbHealth> {
  if (isLocalDbEnabled) {
    try {
      const res = await fetch('/api/db/health');
      const json = await res.json();
      return json;
    } catch (err: any) {
      return {
        ok: false,
        connected: false,
        error: err.message || 'Local PostgreSQL server unavailable',
        hint: 'Check if PostgreSQL is running locally on port 5432 and farmlog_dev exists'
      };
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('farms').select('id, name').limit(1);
      if (error) throw error;
      return {
        ok: true,
        connected: true,
        database: 'supabase-cloud',
        tables: 12,
        version: 'Supabase Cloud (PostgreSQL)'
      };
    } catch (err: any) {
      return {
        ok: false,
        connected: false,
        error: err.message || 'Supabase connection failed'
      };
    }
  }
  return { ok: false, connected: false, error: 'Database is not configured' };
}

// Format date to YYYY-MM-DD
function formatDate(d: any): string {
  if (!d) return '';
  if (typeof d === 'string') {
    return d.split('T')[0];
  }
  if (d instanceof Date) {
    return d.toISOString().split('T')[0];
  }
  return String(d).split('T')[0];
}

// Normalizes PostgreSQL / Supabase records (converts numeric strings to JS numbers and dates to strings)
export function normalizeDbData(data: any) {
  if (!data) return data;

  const labourers = (data.labourers || []).map((l: any) => ({
    ...l,
    pay_frequency: l.pay_frequency || 'monthly',
    base_rate: Number(l.base_rate || 0),
    start_date: formatDate(l.start_date),
    end_date: l.end_date ? formatDate(l.end_date) : undefined
  }));

  const labourerMap = new Map<string, any>(labourers.map((l: any) => [l.id, l]));

  const attendance = (data.attendance || []).map((a: any) => ({
    ...a,
    payable_units: Number(a.payable_units || 0),
    hours_worked: a.hours_worked != null ? Number(a.hours_worked) : undefined,
    piece_quantity: a.piece_quantity != null ? Number(a.piece_quantity) : undefined,
    work_date: formatDate(a.work_date)
  }));

  const advances = (data.advances || []).map((adv: any) => {
    const lab = labourerMap.get(adv.labourer_id);
    return {
      ...adv,
      amount: Number(adv.amount || 0),
      labourer_name: adv.labourer_name || lab?.full_name || 'Worker',
      labour_code: adv.labour_code || lab?.labour_code || ''
    };
  });

  const tractorRentals = (data.tractorRentals || []).map((tr: any) => ({
    ...tr,
    hours_worked: Number(tr.hours_worked || 0),
    hourly_rate: Number(tr.hourly_rate || 0),
    gross_amount: Number(tr.gross_amount || 0),
    advance_amount: Number(tr.advance_amount || 0),
    rest_amount: Number(tr.rest_amount || 0),
    fuel_provided_litres: tr.fuel_provided_litres != null ? Number(tr.fuel_provided_litres) : undefined,
    work_date: formatDate(tr.work_date)
  }));

  const payrollPeriods = (data.payrollPeriods || []).map((p: any) => ({
    ...p,
    start_date: formatDate(p.start_date),
    end_date: formatDate(p.end_date)
  }));

  const payrollLines = (data.payrollLines || []).map((pl: any) => {
    const lab = labourerMap.get(pl.labourer_id);
    return {
      ...pl,
      labourer_name: pl.labourer_name || lab?.full_name || 'Worker',
      labour_code: pl.labour_code || lab?.labour_code || '',
      rate_snapshot: Number(pl.rate_snapshot || 0),
      units: Number(pl.units || 0),
      gross_amount: Number(pl.gross_amount || 0),
      additions: Number(pl.additions || 0),
      other_deductions: Number(pl.other_deductions || 0),
      advance_recovery: Number(pl.advance_recovery || 0),
      net_payable: Number(pl.net_payable || 0),
      paid_amount: Number(pl.paid_amount || 0),
      attendance_snapshot: typeof pl.attendance_snapshot === 'string'
        ? JSON.parse(pl.attendance_snapshot)
        : pl.attendance_snapshot || {},
      calculation_details: typeof pl.calculation_details === 'string'
        ? JSON.parse(pl.calculation_details)
        : pl.calculation_details || {}
    };
  });

  const appUsers = (data.appUsers || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    aliases: [u.username],
    password: u.password_hash || u.password,
    name: u.full_name,
    email: u.email || `${u.username}@farm.local`,
    role: u.role,
    viewAccess: u.view_access || 'simple',
    roleTitle: u.view_access === 'advanced' ? 'Farm Administrator' : 'Field Operations'
  }));

  const payrollPayments = (data.payrollPayments || []).map((p: any) => ({
    ...p,
    amount: Number(p.amount || 0),
    paid_at: p.paid_at || new Date().toISOString()
  }));

  const salarySettlements = (data.salarySettlements || []).map((s: any) => ({
    ...s,
    days_worked: Number(s.days_worked || 0),
    daily_rate: Number(s.daily_rate || 0),
    gross_wage: Number(s.gross_wage || 0),
    advance_deducted: Number(s.advance_deducted || 0),
    net_payable: Number(s.net_payable || 0),
    paid_amount: Number(s.paid_amount || 0),
    year: Number(s.year || 0),
    month: Number(s.month || 0),
    start_date: formatDate(s.start_date),
    end_date: formatDate(s.end_date),
    payment_date: formatDate(s.payment_date)
  }));

  return {
    ...data,
    labourers,
    attendance,
    advances,
    tractorRentals,
    payrollPeriods,
    payrollLines,
    payrollPayments,
    salarySettlements,
    appUsers
  };
}

export async function syncAllFromLocalDb() {
  if (isLocalDbEnabled) {
    try {
      const res = await fetch('/api/db/sync-all');
      const json = await res.json();
      if (json.ok && json.data) {
        return normalizeDbData(json.data);
      }
    } catch (err) {
      console.warn('[LocalDb] Failed to sync data from local PostgreSQL:', err);
    }
    return null;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      let atts = await supabase.from('attendance').select('*').order('work_date', { ascending: false });
      if (atts.error) {
        atts = await supabase.from('attendance_records').select('*').order('work_date', { ascending: false });
      }

      let settlementsRes: any = { data: [] };
      try {
        settlementsRes = await supabase.from('salary_settlements').select('*').order('created_at', { ascending: false });
        if (settlementsRes.error) {
          settlementsRes = { data: [] };
        }
      } catch {
        settlementsRes = { data: [] };
      }

      const [labs, advs, allocs, trcs, pps, pls, pyms, usrs, fms] = await Promise.all([
        supabase.from('labourers').select('*').order('full_name', { ascending: true }),
        supabase.from('advances').select('*').order('issued_at', { ascending: false }),
        supabase.from('advance_allocations').select('*').order('allocation_date', { ascending: false }),
        supabase.from('tractor_rentals').select('*').order('work_date', { ascending: false }),
        supabase.from('payroll_periods').select('*').order('start_date', { ascending: false }),
        supabase.from('payroll_lines').select('*'),
        supabase.from('payroll_payments').select('*').order('paid_at', { ascending: false }),
        supabase.from('app_users').select('*').order('created_at', { ascending: true }),
        supabase.from('farms').select('*').limit(1)
      ]);

      if (labs.error) console.warn('[Supabase] Labourers query warning:', labs.error.message);
      if (atts.error) console.warn('[Supabase] Attendance query warning:', atts.error.message);
      if (advs.error) console.warn('[Supabase] Advances query warning:', advs.error.message);
      if (allocs.error) console.warn('[Supabase] Advance allocations query warning:', allocs.error.message);
      if (trcs.error) console.warn('[Supabase] Tractor rentals query warning:', trcs.error.message);
      if (pps.error) console.warn('[Supabase] Payroll periods query warning:', pps.error.message);
      if (pls.error) console.warn('[Supabase] Payroll lines query warning:', pls.error.message);
      if (pyms.error) console.warn('[Supabase] Payroll payments query warning:', pyms.error.message);
      if (usrs.error) console.warn('[Supabase] App users query warning:', usrs.error.message);

      let finalSettlements = settlementsRes.data || [];
      // Fallback: If salary_settlements table doesn't exist or is empty, load from farm.settings.salary_settlements
      if (finalSettlements.length === 0 && fms.data && fms.data[0]?.settings?.salary_settlements) {
        finalSettlements = fms.data[0].settings.salary_settlements;
      }

      return normalizeDbData({
        labourers: labs.data || [],
        attendance: atts.data || [],
        advances: advs.data || [],
        advanceAllocations: allocs.data || [],
        tractorRentals: trcs.data || [],
        payrollPeriods: pps.data || [],
        payrollLines: pls.data || [],
        payrollPayments: pyms.data || [],
        salarySettlements: finalSettlements,
        appUsers: usrs.data || []
      });
    } catch (err) {
      console.warn('[Supabase] Failed to sync all data:', err);
    }
  }

  return null;
}

// Allowed columns per table in Supabase schema (strips computed / frontend-only properties)
const ATTENDANCE_COLS = ['id', 'farm_id', 'labourer_id', 'work_date', 'shift_code', 'status', 'payable_units', 'hours_worked', 'piece_quantity', 'task_name', 'field_name', 'supervisor_user_id', 'approval_status', 'correction_reason', 'created_by', 'updated_by', 'created_at', 'updated_at'];

const TABLE_COLUMNS: Record<string, string[]> = {
  farms: ['id', 'name', 'address', 'currency_code', 'timezone', 'financial_year_start_month', 'financial_year_start_day', 'settings', 'created_at', 'updated_at'],
  app_users: ['id', 'farm_id', 'username', 'password_hash', 'full_name', 'email', 'role', 'view_access', 'is_active', 'created_at', 'last_login_at'],
  farm_memberships: ['id', 'farm_id', 'user_id', 'user_email', 'user_name', 'role', 'is_active', 'created_at'],
  labourers: ['id', 'farm_id', 'labour_code', 'full_name', 'phone', 'work_category', 'start_date', 'end_date', 'wage_basis', 'base_rate', 'pay_frequency', 'is_active', 'notes', 'created_at', 'updated_at'],
  attendance: ATTENDANCE_COLS,
  attendance_records: ATTENDANCE_COLS,
  advances: ['id', 'farm_id', 'labourer_id', 'issued_at', 'amount', 'purpose', 'payment_method', 'payment_reference', 'status', 'issued_by', 'notes', 'created_at', 'updated_at'],
  advance_allocations: ['id', 'farm_id', 'advance_id', 'payroll_line_id', 'allocation_date', 'amount', 'allocation_type', 'recorded_by', 'notes', 'created_at'],
  tractor_rentals: ['id', 'farm_id', 'machinery_id', 'tractor_name', 'vendor_name', 'work_date', 'hours_worked', 'hourly_rate', 'gross_amount', 'advance_amount', 'rest_amount', 'status', 'fuel_provided_litres', 'task_name', 'notes', 'created_at', 'updated_at'],
  payroll_periods: ['id', 'farm_id', 'period_name', 'start_date', 'end_date', 'status', 'approved_by', 'approved_at', 'finalized_at', 'calculation_version', 'notes', 'created_at', 'updated_at'],
  payroll_lines: ['id', 'farm_id', 'payroll_period_id', 'labourer_id', 'attendance_snapshot', 'wage_basis', 'rate_snapshot', 'units', 'gross_amount', 'additions', 'other_deductions', 'advance_recovery', 'net_payable', 'paid_amount', 'calculation_details', 'created_at', 'updated_at'],
  payroll_payments: ['id', 'farm_id', 'payroll_line_id', 'paid_at', 'amount', 'method', 'reference', 'recorded_by', 'notes', 'created_at'],
  salary_settlements: ['id', 'farm_id', 'labourer_id', 'labourer_name', 'labour_code', 'period_type', 'start_date', 'end_date', 'year', 'month', 'week_number', 'days_worked', 'daily_rate', 'gross_wage', 'advance_deducted', 'net_payable', 'paid_amount', 'given_by', 'payment_method', 'payment_date', 'payment_reference', 'notes', 'status', 'created_at', 'updated_at'],
  machinery: ['id', 'farm_id', 'asset_code', 'name', 'asset_type', 'ownership_type', 'registration_reference', 'make', 'model', 'meter_type', 'initial_meter', 'is_active', 'notes', 'created_at', 'updated_at'],
  machinery_usage: ['id', 'farm_id', 'machinery_id', 'work_date', 'operator_name', 'operator_user_id', 'field_name', 'task_name', 'start_time', 'end_time', 'start_meter', 'end_meter', 'duration_minutes', 'work_quantity', 'fuel_quantity', 'notes', 'created_by', 'created_at', 'updated_at'],
  machinery_expenses: ['id', 'farm_id', 'machinery_id', 'usage_id', 'expense_date', 'category', 'amount', 'quantity', 'unit', 'vendor', 'payment_method', 'payment_reference', 'receipt_path', 'notes', 'created_by', 'created_at', 'updated_at'],
  audit_logs: ['id', 'farm_id', 'actor_user_id', 'actor_name', 'actor_role', 'action', 'entity_type', 'entity_id', 'occurred_at', 'reason', 'request_id', 'changes']
};

export function sanitizeRecordsForTable(table: string, records: any[]): any[] {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) return records;
  return records.map(r => {
    const clean: Record<string, any> = {};
    for (const key of allowed) {
      if (r[key] !== undefined) {
        clean[key] = r[key];
      }
    }
    return clean;
  });
}

export async function upsertToLocalDb(table: string, records: any[]) {
  if (!records || records.length === 0) return false;
  const sanitized = sanitizeRecordsForTable(table, records);

  if (isLocalDbEnabled) {
    try {
      const res = await fetch('/api/db/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, records: sanitized })
      });
      const json = await res.json();
      return json.ok === true;
    } catch (err) {
      console.warn(`[LocalDb] Failed to upsert to ${table}:`, err);
      return false;
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      let res = await supabase.from(table).upsert(sanitized);
      if (res.error && table === 'labourers' && String(res.error.message || '').includes('pay_frequency')) {
        // Fallback: Supabase table doesn't have pay_frequency column yet, strip it and upsert standard columns
        const fallback = sanitized.map(({ pay_frequency, ...rest }) => rest);
        res = await supabase.from(table).upsert(fallback);
      }
      if (res.error && table === 'attendance') {
        res = await supabase.from('attendance_records').upsert(sanitized);
      }
      if (res.error && table === 'salary_settlements') {
        // Fallback: If salary_settlements table does not exist yet in Supabase,
        // persist to farms.settings.salary_settlements as immediate reliable cloud mirror
        try {
          const { data: fData } = await supabase.from('farms').select('id, settings').limit(1);
          if (fData && fData[0]) {
            const currentFarm = fData[0];
            const curSettings = currentFarm.settings || {};
            const existingList = Array.isArray(curSettings.salary_settlements) ? curSettings.salary_settlements : [];
            const updatedList = [...existingList];
            for (const rec of sanitized) {
              const idx = updatedList.findIndex((item: any) => item.id === rec.id);
              if (idx >= 0) updatedList[idx] = rec;
              else updatedList.push(rec);
            }
            await supabase.from('farms').update({
              settings: { ...curSettings, salary_settlements: updatedList }
            }).eq('id', currentFarm.id);
            return true;
          }
        } catch (fallbackErr) {
          console.warn('[Supabase] Failed fallback saving to farm settings:', fallbackErr);
        }
      }
      if (res.error) {
        console.error(`[Supabase] Upsert error on ${table}:`, res.error);
        throw res.error;
      }
      return true;
    } catch (err: any) {
      console.warn(`[Supabase] Failed to upsert to ${table}:`, err.message || err);
      return false;
    }
  }

  return false;
}

export async function deleteFromLocalDb(table: string, id: string) {
  if (!id) return false;

  if (isLocalDbEnabled) {
    try {
      const res = await fetch('/api/db/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id })
      });
      const json = await res.json();
      return json.ok === true;
    } catch (err) {
      console.warn(`[LocalDb] Failed to delete from ${table}:`, err);
      return false;
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      let res = await supabase.from(table).delete().eq('id', id);
      if (res.error && table === 'attendance') {
        res = await supabase.from('attendance_records').delete().eq('id', id);
      }
      if (res.error && table === 'salary_settlements') {
        // Fallback: Delete from farms.settings.salary_settlements
        try {
          const { data: fData } = await supabase.from('farms').select('id, settings').limit(1);
          if (fData && fData[0]) {
            const currentFarm = fData[0];
            const curSettings = currentFarm.settings || {};
            const existingList = Array.isArray(curSettings.salary_settlements) ? curSettings.salary_settlements : [];
            const updatedList = existingList.filter((item: any) => item.id !== id);
            await supabase.from('farms').update({
              settings: { ...curSettings, salary_settlements: updatedList }
            }).eq('id', currentFarm.id);
            return true;
          }
        } catch {}
      }
      if (res.error) {
        console.error(`[Supabase] Delete error on ${table} (${id}):`, res.error);
        throw res.error;
      }
      return true;
    } catch (err: any) {
      console.warn(`[Supabase] Failed to delete from ${table}:`, err.message || err);
      return false;
    }
  }

  return false;
}

export function subscribeToRealtimeSync(
  onTableChange: (table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void
) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel('farmlog-realtime-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload) => {
        onTableChange(payload.table, payload.eventType as any, payload);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase Realtime] Connected to live database updates');
      }
    });

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}

