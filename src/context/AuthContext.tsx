import React, { createContext, useContext, useState, useEffect } from 'react';
import { Farm, UserRole } from '../types';
import { dataService } from '../lib/dataService';

export interface AuthContextType {
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  farm: Farm;
  refreshData: () => void;
  // Unified access permissions: everyone has full operational access
  isReadOnlyPartner: boolean;
  canMutateOperations: boolean;
  canFinalizePayroll: boolean;
  canManageUsers: boolean;
  canCloseFinancialYear: boolean;
}

const AUTH_STORAGE_KEY = 'kisanops_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });

  const [farm, setFarm] = useState<Farm>(dataService.getFarm());
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');

  const currentUser = {
    id: 'usr-admin',
    name: 'Farm Team',
    email: 'admin@greenfield.farm',
  };

  const refreshData = () => {
    setFarm(dataService.getFarm());
  };

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    // Default authorized farm credentials (supports email or simple username 'admin'/'farm')
    const validUsers = ['admin@greenfield.farm', 'admin', 'farm', 'owner', 'kisan'];
    const validPasswords = ['farmpassword', 'kisan2026', 'admin123', 'farm123'];

    if (validUsers.includes(cleanUser) && validPasswords.includes(cleanPass)) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      dataService.logAudit('USER_LOGIN', 'auth', 'user-session', `Signed in as ${usernameOrEmail}`);
      return true;
    }

    throw new Error('Invalid credentials. Please enter a valid username/email and password.');
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    dataService.logAudit('USER_LOGOUT', 'auth', 'user-session', 'Signed out from farm portal');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        currentUser,
        currentRole,
        setCurrentRole,
        farm,
        refreshData,
        // With unified access, all team members have full authorization
        isReadOnlyPartner: false,
        canMutateOperations: true,
        canFinalizePayroll: true,
        canManageUsers: true,
        canCloseFinancialYear: true,
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
