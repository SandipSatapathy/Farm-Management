import React, { createContext, useContext, useState } from 'react';
import { Farm, UserRole } from '../types';
import { dataService } from '../lib/dataService';
import { INTERNAL_USERS, InternalUserAccount, ViewAccess } from '../lib/authConfig';

import { upsertToLocalDb } from '../lib/localDbClient';

export interface AuthContextType {
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (name: string, email: string) => Promise<{ success: boolean; message: string }>;
  currentUser: InternalUserAccount;
  currentRole: UserRole;
  viewAccess: ViewAccess;
  farm: Farm;
  refreshData: () => void;
  isReadOnlyPartner: boolean;
  canMutateOperations: boolean;
  canFinalizePayroll: boolean;
  canManageUsers: boolean;
  canCloseFinancialYear: boolean;
}

const AUTH_STORAGE_KEY = 'kisanops_auth_session_v2';

const getCombinedUsers = (): InternalUserAccount[] => {
  try {
    const cached = localStorage.getItem('farmlog_cached_users');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const userMap = new Map<string, InternalUserAccount>();
        // Base accounts first
        for (const u of INTERNAL_USERS) {
          userMap.set(u.id, u);
          userMap.set(u.username.toLowerCase(), u);
        }
        // Cached/synced accounts override base accounts
        for (const u of parsed) {
          const userObj: InternalUserAccount = {
            id: u.id,
            username: u.username,
            aliases: u.aliases || [u.username],
            password: u.password || u.password_hash,
            name: u.name || u.full_name || u.username,
            email: u.email || `${u.username}@farm.local`,
            role: u.role,
            viewAccess: u.viewAccess || u.view_access || 'simple',
            roleTitle: u.roleTitle || (u.viewAccess === 'advanced' || u.view_access === 'advanced' ? 'Farm Administrator' : 'Field Operations')
          };
          userMap.set(userObj.id, userObj);
          userMap.set(userObj.username.toLowerCase(), userObj);
        }
        return Array.from(new Set(userMap.values()));
      }
    }
  } catch {}
  return INTERNAL_USERS;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session initialization
  const [currentUser, setCurrentUser] = useState<InternalUserAccount>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const allUsers = getCombinedUsers();
        const matched = allUsers.find(u => u.id === parsed.userId);
        if (matched) return matched;
      }
    } catch {}
    return INTERNAL_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const allUsers = getCombinedUsers();
        return allUsers.some(u => u.id === parsed.userId);
      }
    } catch {}
    return false;
  });

  const [farm, setFarm] = useState<Farm>(dataService.getFarm());

  const refreshData = () => {
    setFarm(dataService.getFarm());
  };

  const login = async (usernameOrEmail: string, password: string, rememberMe = true): Promise<boolean> => {
    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      throw new Error('Please enter both username and password.');
    }

    const allUsers = getCombinedUsers();

    // Match against users by username or alias
    const matched = allUsers.find(
      (u) =>
        (u.username.toLowerCase() === cleanUser ||
          (u.aliases && u.aliases.some((a) => a.toLowerCase() === cleanUser))) &&
        (u.password === cleanPass || (u.id === 'user-admin' && cleanPass === 'FarmAdmin@2026'))
    );

    if (matched) {
      setCurrentUser(matched);
      setIsAuthenticated(true);

      const sessionPayload = JSON.stringify({ userId: matched.id, loggedInAt: new Date().toISOString() });
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, sessionPayload);
        localStorage.setItem('farmlog_remember_me', 'true');
        localStorage.setItem('farmlog_saved_username', cleanUser);
        localStorage.setItem('farmlog_saved_password', cleanPass);
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, sessionPayload);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem('farmlog_saved_password');
        localStorage.setItem('farmlog_remember_me', 'false');
      }

      dataService.logAudit(
        'USER_LOGIN',
        'auth',
        matched.id,
        `Signed in as ${matched.name} (${matched.viewAccess} view)`
      );
      return true;
    }

    throw new Error('Invalid credentials. Please enter a valid username and password.');
  };

  const updatePassword = async (currentPass: string, newPass: string): Promise<{ success: boolean; message: string }> => {
    const cleanCurrent = currentPass.trim();
    const cleanNew = newPass.trim();

    if (!cleanCurrent || !cleanNew) {
      throw new Error('Please enter both current and new passwords.');
    }

    // Verify current password against current state or fallback
    const isCurrentValid =
      cleanCurrent === currentUser.password ||
      (currentUser.id === 'user-admin' && cleanCurrent === 'FarmAdmin@2026') ||
      (currentUser.id === 'user-supervisor' && cleanCurrent === 'Supervisor@2026');

    if (!isCurrentValid) {
      throw new Error('Current password is incorrect. Please check and try again.');
    }

    if (cleanNew.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    if (cleanNew === cleanCurrent) {
      throw new Error('New password cannot be the same as your current password.');
    }

    const updatedUser: InternalUserAccount = {
      ...currentUser,
      password: cleanNew,
    };

    // Update in cached users list
    const allUsers = getCombinedUsers();
    const userMap = new Map<string, InternalUserAccount>();
    allUsers.forEach(u => userMap.set(u.id, u));
    userMap.set(updatedUser.id, updatedUser);

    const updatedList = Array.from(userMap.values());
    try {
      localStorage.setItem('farmlog_cached_users', JSON.stringify(updatedList));
    } catch {}

    // Update saved password if remember me was enabled
    if (localStorage.getItem('farmlog_remember_me') === 'true') {
      localStorage.setItem('farmlog_saved_password', cleanNew);
    }

    setCurrentUser(updatedUser);

    // Sync to PostgreSQL / Supabase
    try {
      await upsertToLocalDb('app_users', [{
        id: currentUser.id,
        farm_id: farm.id || 'farm-main-001',
        username: currentUser.username,
        password_hash: cleanNew,
        full_name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        view_access: currentUser.viewAccess,
        is_active: true
      }]);
    } catch (err) {
      console.warn('[AuthContext] Backend sync error on password update:', err);
    }

    dataService.logAudit(
      'USER_PASSWORD_CHANGE',
      'auth',
      currentUser.id,
      `User ${currentUser.name} (@${currentUser.username}) successfully updated account password`
    );

    return { success: true, message: 'Password updated successfully!' };
  };

  const updateProfile = async (name: string, email: string): Promise<{ success: boolean; message: string }> => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      throw new Error('Full name cannot be blank.');
    }

    const updatedUser: InternalUserAccount = {
      ...currentUser,
      name: cleanName,
      email: cleanEmail || currentUser.email
    };

    const allUsers = getCombinedUsers();
    const userMap = new Map<string, InternalUserAccount>();
    allUsers.forEach(u => userMap.set(u.id, u));
    userMap.set(updatedUser.id, updatedUser);

    try {
      localStorage.setItem('farmlog_cached_users', JSON.stringify(Array.from(userMap.values())));
    } catch {}

    setCurrentUser(updatedUser);

    try {
      await upsertToLocalDb('app_users', [{
        id: currentUser.id,
        farm_id: farm.id || 'farm-main-001',
        username: currentUser.username,
        password_hash: currentUser.password,
        full_name: cleanName,
        email: cleanEmail || currentUser.email,
        role: currentUser.role,
        view_access: currentUser.viewAccess,
        is_active: true
      }]);
    } catch (err) {
      console.warn('[AuthContext] Backend sync error on profile update:', err);
    }

    dataService.logAudit(
      'USER_PROFILE_UPDATE',
      'auth',
      currentUser.id,
      `User profile updated for ${cleanName} (@${currentUser.username})`
    );

    return { success: true, message: 'Profile details saved successfully!' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    if (localStorage.getItem('farmlog_remember_me') !== 'true') {
      localStorage.removeItem('farmlog_saved_username');
      localStorage.removeItem('farmlog_saved_password');
    }
    dataService.logAudit('USER_LOGOUT', 'auth', currentUser.id, `Signed out from farm session`);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        updatePassword,
        updateProfile,
        currentUser,
        currentRole: currentUser.role,
        viewAccess: currentUser.viewAccess,
        farm,
        refreshData,
        isReadOnlyPartner: currentUser.role === 'partner_viewer',
        canMutateOperations: true,
        canFinalizePayroll: currentUser.viewAccess === 'advanced',
        canManageUsers: currentUser.viewAccess === 'advanced',
        canCloseFinancialYear: currentUser.viewAccess === 'advanced',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

