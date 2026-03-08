import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-sm tracking-tight';
  
  const variants = {
    primary: 'bg-loki-primary hover:bg-loki-accent text-zinc-950 shadow-xl shadow-loki-primary/10 border border-loki-primary/20',
    secondary: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 shadow-lg',
    danger: 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all duration-300',
    ghost: 'bg-transparent hover:bg-zinc-900 text-zinc-500 hover:text-white',
    gold: 'bg-loki-accent hover:bg-loki-primary text-zinc-950 shadow-xl shadow-loki-accent/10 border border-loki-accent/20',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
};
