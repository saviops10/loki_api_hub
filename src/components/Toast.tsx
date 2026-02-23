import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return { toasts, showToast };
};

export const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
  return createPortal(
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-full duration-300 ${
            toast.type === 'success' ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200' :
            toast.type === 'error' ? 'bg-red-950 border-red-500/50 text-red-200' :
            'bg-zinc-900 border-zinc-700 text-zinc-200'
          }`}
        >
          <span>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>,
    document.body
  );
};
