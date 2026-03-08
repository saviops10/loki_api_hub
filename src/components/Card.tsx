import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, className = '', onClick, footer }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] overflow-hidden transition-all backdrop-blur-sm ${onClick ? 'cursor-pointer hover:border-loki-primary/30 hover:bg-zinc-900/50' : ''} ${className}`}
    >
      {(title || subtitle) && (
        <div className="px-8 py-6 border-b border-zinc-800/30">
          {title && <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-zinc-600 font-black uppercase tracking-[0.2em] mt-1 truncate">{subtitle}</p>}
        </div>
      )}
      <div className="p-8">
        {children}
      </div>
      {footer && (
        <div className="px-8 py-6 bg-zinc-900/20 border-t border-zinc-800/30">
          {footer}
        </div>
      )}
    </div>
  );
};
