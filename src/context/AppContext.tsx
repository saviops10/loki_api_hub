import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { ToastType, ToastContainer, useToast } from '../components/Toast';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  showToast: (message: string, type?: ToastType) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { toasts, showToast } = useToast();

  return (
    <AppContext.Provider value={{ user, setUser, showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
