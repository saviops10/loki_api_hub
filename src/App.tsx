import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginForm } from './features/auth/LoginForm';
import { RegisterForm } from './features/auth/RegisterForm';
import { Dashboard } from './features/dashboard/Dashboard';
import { ApiDetail } from './features/api-detail/ApiDetail';
import { AdminPanel } from './features/admin/AdminPanel';
import { LandingPage } from './features/marketing/LandingPage';
import { AboutPage } from './features/marketing/AboutPage';
import { PlansPage } from './features/marketing/PlansPage';
import { ApiConfig } from './types';

const AppContent: React.FC = () => {
  const { user } = useApp();
  const [view, setView] = useState<'landing' | 'about' | 'plans' | 'login' | 'register' | 'dashboard' | 'api-detail' | 'admin'>('landing');
  const [selectedApi, setSelectedApi] = useState<ApiConfig | null>(null);

  // Simple routing logic
  if (!user) {
    if (view === 'landing') return (
      <LandingPage 
        onGetStarted={() => setView('login')} 
        onRegister={() => setView('register')}
        onAbout={() => setView('about')} 
        onPlans={() => setView('plans')} 
      />
    );
    if (view === 'about') return <AboutPage onBack={() => setView('landing')} />;
    if (view === 'plans') return <PlansPage onBack={() => setView('landing')} />;

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
