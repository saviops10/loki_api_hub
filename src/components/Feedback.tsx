import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg', label?: string }> = ({ size = 'md', label }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div className={`${sizes[size]} border-zinc-800 border-t-emerald-500 rounded-full animate-spin`} />
      {label && <p className="text-sm text-zinc-500 font-medium animate-pulse">{label}</p>}
    </div>
  );
};

export const EmptyState: React.FC<{ icon?: string, title: string, description: string, action?: React.ReactNode }> = ({ 
  icon = '📂', 
  title, 
  description, 
  action 
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl space-y-4">
      <span className="text-4xl">{icon}</span>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
