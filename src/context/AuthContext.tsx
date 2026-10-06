import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole, FarmSettings } from '../types';
import { db } from '../db';
import { defaultSettings } from '../db/seedData';

interface AuthContextType {
  role: UserRole;
  userName: string;
  isManager: boolean;
  isWorker: boolean;
  switchRole: (newRole: UserRole, enteredPin?: string) => Promise<boolean>;
  farmSettings: FarmSettings;
  updateSettings: (newSettings: FarmSettings) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('manager');
  const [farmSettings, setFarmSettings] = useState<FarmSettings>(defaultSettings);

  useEffect(() => {
    // Load saved role and settings
    const savedRole = localStorage.getItem('quail_erp_role') as UserRole;
    if (savedRole) {
      setRole(savedRole);
    }

    db.settings.get('farmSettings').then((record) => {
      if (record && record.value) {
        if (record.value.currency !== 'ريال يمني') {
          const updated = { ...record.value, currency: 'ريال يمني', address: 'الجمهورية اليمنية - صنعاء' };
          db.settings.put({ key: 'farmSettings', value: updated });
          setFarmSettings(updated);
        } else {
          setFarmSettings(record.value);
        }
      }
    });
  }, []);

  const switchRole = async (newRole: UserRole, enteredPin?: string): Promise<boolean> => {
    if (newRole === 'manager') {
      // Check manager PIN
      const settings = (await db.settings.get('farmSettings'))?.value || farmSettings;
      if (enteredPin !== settings.managerPin) {
        return false;
      }
    }

    setRole(newRole);
    localStorage.setItem('quail_erp_role', newRole);
    return true;
  };

  const updateSettings = async (newSettings: FarmSettings) => {
    await db.settings.put({ key: 'farmSettings', value: newSettings });
    setFarmSettings(newSettings);
  };

  const userName = role === 'manager' ? (farmSettings.ownerName || 'مدير المزرعة') : 'عامل المزرعة';
  const isManager = role === 'manager';
  const isWorker = role === 'worker';

  return (
    <AuthContext.Provider
      value={{
        role,
        userName,
        isManager,
        isWorker,
        switchRole,
        farmSettings,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
