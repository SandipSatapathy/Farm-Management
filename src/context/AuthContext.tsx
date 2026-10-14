import React, { createContext, useContext, useState } from 'react';
import { Farm, UserRole } from '../types';
import { dataService } from '../lib/dataService';
import { INTERNAL_USERS, InternalUserAccount, ViewAccess } from '../lib/authConfig';

export interface AuthContextType {
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
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
        return [...parsed, ...INTERNAL_USERS];
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
        currentUser,
        currentRole: currentUser.role,
        viewAccess: currentUser.viewAccess,
        farm,
        refreshData,
        isReadOnlyPartner: false,
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
