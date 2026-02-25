import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginForm } from './features/auth/LoginForm';
import { RegisterForm } from './features/auth/RegisterForm';
import { Dashboard } from './features/dashboard/Dashboard';
import { ApiDetail } from './features/api-detail/ApiDetail';
import { AdminPanel } from './features/admin/AdminPanel';
import { ApiConfig } from './types';

const AppContent: React.FC = () => {
  const { user } = useApp();
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'api-detail' | 'admin'>('login');
  const [selectedApi, setSelectedApi] = useState<ApiConfig | null>(null);

  // Simple routing logic
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        {view === 'login' ? (
          <LoginForm onToggle={() => setView('register')} />
        ) : (
          <RegisterForm onToggle={() => setView('login')} />
        )}
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <AdminPanel onBack={() => setView('dashboard')} />
    );
  }

  if (selectedApi) {
    return (
      <ApiDetail 
        api={selectedApi} 
        onBack={() => setSelectedApi(null)} 
      />
    );
  }

  return (
    <Dashboard 
      onSelectApi={(api) => setSelectedApi(api)} 
      onOpenAdmin={() => setView('admin')}
    />
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
