import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label?: string;
  error?: string;
  as?: 'input' | 'select';
}

export const Input: React.FC<InputProps> = ({ label, error, as = 'input', className = '', ...props }) => {
  const Component = as as any;
  
  return (
    <div className="space-y-1 w-full">
      {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">{label}</label>}
      <Component
        className={`w-full bg-zinc-900 border ${error ? 'border-red-500' : 'border-zinc-800'} focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-4 py-2.5 text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 ml-1 mt-1 flex items-center gap-1"><span>⚠️</span> {error}</p>}
    </div>
  );
};
