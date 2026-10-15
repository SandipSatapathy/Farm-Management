import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../lib/dataService';
import { FarmMembership, UserRole } from '../types';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import { ClayModal } from '../components/common/ClayModal';
import {
  UserCog,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Mail,
  AlertCircle
} from 'lucide-react';

export const UsersRolesPage: React.FC = () => {
  const { farm, canManageUsers, isReadOnlyPartner } = useAuth();
  const [memberships, setMemberships] = useState<FarmMembership[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('supervisor');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = () => {
    setMemberships(dataService.getMemberships());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      dataService.addMembership({
        user_name: name.trim(),
        user_email: email.trim(),
        role,
        user_id: 'usr-' + Date.now(),
        is_active: true,
      });

      setIsModalOpen(false);
      setName('');
      setEmail('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inviting user');
    }
  };

  const handleRoleChange = (userId: string, newRole: UserRole, currentActive: boolean) => {
    try {
      dataService.updateMembershipRole(userId, newRole, currentActive);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActive = (userId: string, currentRole: UserRole, currentActive: boolean) => {
    try {
      dataService.updateMembershipRole(userId, currentRole, !currentActive);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Farm Users & Access Control</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Invite team members, assign operational roles, and enforce Row-Level Security least privilege.
          </p>
        </div>

        {canManageUsers && !isReadOnlyPartner && (
          <ClayButton
            variant="primary"
            icon={<UserPlus size={18} />}
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
          >
            Invite User
          </ClayButton>
        )}
      </div>

      {/* Last Owner Safeguard Banner */}
      <ClayCard style={{ marginBottom: 24, background: '#f8faf8', border: '2px solid #bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <ShieldAlert size={26} color="#15803d" style={{ marginTop: 2 }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#14532d' }}>
              Safety Rule: Last Active Owner Protection
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              The system prevents accidental demotion or deactivation of the last remaining active Owner of the farm. Partner/Viewer accounts have strict read-only access.
            </p>
          </div>
        </div>
      </ClayCard>

      {/* Users Table */}
      <div className="clay-table-container">
        <table className="clay-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th>Assigned Role</th>
              <th>Status</th>
              <th>Permissions Summary</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.user_name}</strong>
                </td>
                <td style={{ color: '#4b6354' }}>{m.user_email}</td>
                <td>
                  {canManageUsers && !isReadOnlyPartner ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user_id, e.target.value as UserRole, m.is_active)}
                      className="clay-input"
                      style={{ padding: '6px 10px', fontSize: '0.85rem', width: 170 }}
                    >
                      <option value="owner">Owner / Super Admin</option>
                      <option value="admin">Admin / Manager</option>
                      <option value="payroll">Payroll Accountant</option>
                      <option value="supervisor">Field Supervisor</option>
                      <option value="partner_viewer">Partner Viewer (Read-Only)</option>
                      <option value="tractor_operator">Tractor Operator</option>
                    </select>
                  ) : (
                    <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                      {m.role.replace('_', ' ')}
                    </span>
                  )}
                </td>
                <td>
                  <ClayBadge status={m.is_active ? 'active' : 'inactive'} label={m.is_active ? 'Active' : 'Deactivated'} />
                </td>
                <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {m.role === 'owner' && 'Full system, user management & FY Close'}
                  {m.role === 'admin' && 'Crew, attendance & machinery management'}
                  {m.role === 'payroll' && 'Advance issuance & payroll finalization'}
                  {m.role === 'supervisor' && 'Worker management, field attendance & usage logging'}
                  {m.role === 'partner_viewer' && 'Strictly read-only dashboards & reports'}
                  {m.role === 'tractor_operator' && 'Usage hours & fuel logs only'}
                </td>
                <td>
                  {canManageUsers && !isReadOnlyPartner && (
                    <ClayButton
                      variant={m.is_active ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleActive(m.user_id, m.role, m.is_active)}
                    >
                      {m.is_active ? 'Deactivate' : 'Reactivate'}
                    </ClayButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      <ClayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite New Farm Team Member"
      >
        <form onSubmit={handleInvite}>
          {errorMsg && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 16 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="clay-label">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Mahesh Shinde"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="clay-input"
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="clay-label">Email Address</label>
            <input
              type="email"
              placeholder="e.g. mahesh@greenfield.farm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="clay-input"
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="clay-label">Select Assigned Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="clay-input"
            >
              <option value="supervisor">Field Supervisor (Attendance & tractor logs)</option>
              <option value="payroll">Payroll Accountant (Advances & wages)</option>
              <option value="admin">Admin / Farm Manager (Full operations)</option>
              <option value="partner_viewer">Partner Viewer (Strictly read-only)</option>
              <option value="tractor_operator">Tractor Operator (Usage only)</option>
              <option value="owner">Owner / Super Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <ClayButton variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </ClayButton>
            <ClayButton variant="primary" type="submit">
              Send Invitation
            </ClayButton>
          </div>
        </form>
      </ClayModal>
    </div>
  );
};
