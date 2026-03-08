import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label?: string;
  error?: string;
  as?: 'input' | 'select';
}

export const Input: React.FC<InputProps> = ({ label, error, as = 'input', className = '', ...props }) => {
  const Component = as as any;
  
  return (
    <div className="space-y-2 w-full">
      {label && <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.15em] ml-1">{label}</label>}
      <Component
        className={`w-full bg-zinc-900/50 border-2 ${error ? 'border-red-500' : 'border-zinc-800/50'} focus:border-loki-primary/30 focus:bg-zinc-900 rounded-2xl px-5 py-3.5 text-zinc-100 outline-none transition-all placeholder:text-zinc-700 text-sm font-medium ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 ml-1 mt-1 flex items-center gap-1"><span>⚠️</span> {error}</p>}
    </div>
  );
};
