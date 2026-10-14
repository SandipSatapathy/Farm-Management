import { isSupabaseConfigured, supabase } from './supabaseClient';

// Unified Database Sync Client
// Connects to local PostgreSQL in development (/api/db) and Supabase in production

export interface LocalDbHealth {
  ok: boolean;
  connected: boolean;
  database?: string;
  tables?: number;
  version?: string;
  error?: string;
  hint?: string;
}

export const isLocalDbEnabled = Boolean(
  import.meta.env.DEV && 
  (import.meta.env.VITE_USE_LOCAL_DB === 'true' || import.meta.env.VITE_USE_LOCAL_DB === true)
);

export const isDbSyncActive = isLocalDbEnabled || isSupabaseConfigured;

export async function checkLocalDbHealth(): Promise<LocalDbHealth> {
  if (isLocalDbEnabled) {
    try {
      const res = await fetch('/api/db/health');
      if (!res.ok) {
        return { ok: false, connected: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      return await res.json();
    } catch (err: any) {
      return {
        ok: false,
        connected: false,
        error: err.message || 'Cannot reach local DB bridge endpoint',
        hint: 'Ensure Vite dev server is running and PG_PASSWORD is set in .env'
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

  return {
    ok: false,
    connected: false,
    error: 'No database configured. Using offline browser storage.'
  };
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
    base_rate: Number(l.base_rate || 0),
    start_date: formatDate(l.start_date),
    end_date: l.end_date ? formatDate(l.end_date) : undefined
  }));

  const attendance = (data.attendance || []).map((a: any) => ({
    ...a,
    payable_units: Number(a.payable_units || 0),
    hours_worked: a.hours_worked != null ? Number(a.hours_worked) : undefined,
    piece_quantity: a.piece_quantity != null ? Number(a.piece_quantity) : undefined,
    work_date: formatDate(a.work_date)
  }));

  const advances = (data.advances || []).map((adv: any) => ({
    ...adv,
    amount: Number(adv.amount || 0)
  }));

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

  const payrollLines = (data.payrollLines || []).map((pl: any) => ({
    ...pl,
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
  }));

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

  return {
    ...data,
    labourers,
    attendance,
    advances,
    tractorRentals,
    payrollPeriods,
    payrollLines,
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
      const [labs, atts, advs, allocs, trcs, pps, pls, usrs] = await Promise.all([
        supabase.from('labourers').select('*').order('full_name', { ascending: true }),
        supabase.from('attendance').select('*').order('work_date', { ascending: false }),
        supabase.from('advances').select('*').order('issued_at', { ascending: false }),
        supabase.from('advance_allocations').select('*').order('allocation_date', { ascending: false }),
        supabase.from('tractor_rentals').select('*').order('work_date', { ascending: false }),
        supabase.from('payroll_periods').select('*').order('start_date', { ascending: false }),
        supabase.from('payroll_lines').select('*'),
        supabase.from('app_users').select('*').order('created_at', { ascending: true })
      ]);

      return normalizeDbData({
        labourers: labs.data || [],
        attendance: atts.data || [],
        advances: advs.data || [],
        advanceAllocations: allocs.data || [],
        tractorRentals: trcs.data || [],
        payrollPeriods: pps.data || [],
        payrollLines: pls.data || [],
        appUsers: usrs.data || []
      });
    } catch (err) {
      console.warn('[Supabase] Failed to sync all data:', err);
    }
  }

  return null;
}

export async function upsertToLocalDb(table: string, records: any[]) {
  if (records.length === 0) return false;

  if (isLocalDbEnabled) {
    try {
      const res = await fetch('/api/db/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, records })
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
      const { error } = await supabase.from(table).upsert(records);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn(`[Supabase] Failed to upsert to ${table}:`, err);
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
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn(`[Supabase] Failed to delete from ${table}:`, err);
      return false;
    }
  }

  return false;
}
