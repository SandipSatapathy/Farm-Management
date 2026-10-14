import { UserRole } from '../types';

export type ViewAccess = 'simple' | 'advanced';

export interface InternalUserAccount {
  id: string;
  username: string;
  aliases: string[];
  password: string;
  name: string;
  email: string;
  role: UserRole;
  viewAccess: ViewAccess;
  roleTitle: string;
}

/**
 * Internal accounts configuration for real production usage.
 * No demo/guest accounts.
 *
 * 1. Simple View User:
 *    - Username: supervisor (also accepts 'field', 'operator')
 *    - Password: Supervisor@2026
 *    - Access: ONLY the simple daily farm routine (Daily Attendance, Labour Directory, Advance Khata, Hired Tractor).
 *
 * 2. Advanced View User:
 *    - Username: admin (also accepts 'owner', 'manager')
 *    - Password: FarmAdmin@2026
 *    - Access: The entire advanced management suite (Dashboard, Ledgers, Attendance, Payroll, Tractor, Expenses, Reports, Settings)
 *              plus access to the simple farm routine.
 */
export const INTERNAL_USERS: InternalUserAccount[] = [
  {
    id: 'user-supervisor',
    username: 'supervisor',
    aliases: ['field', 'operator', 'supervisor@farm.local'],
    password: 'Supervisor@2026',
    name: 'Field Supervisor',
    email: 'supervisor@farm.local',
    role: 'supervisor',
    viewAccess: 'simple',
    roleTitle: 'Field Operations (Simple View Only)',
  },
  {
    id: 'user-admin',
    username: 'admin',
    aliases: ['owner', 'manager', 'admin@farm.local'],
    password: 'Admin@2026',
    name: 'Farm Administrator',
    email: 'admin@farm.local',
    role: 'owner',
    viewAccess: 'advanced',
    roleTitle: 'Farm Owner & Admin (Advanced Management View)',
  },
];
