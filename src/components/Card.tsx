import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, className = '', onClick, footer }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden transition-all ${onClick ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900' : ''} ${className}`}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-zinc-800/50">
          {title && <h3 className="text-lg font-bold text-white">{title}</h3>}
          {subtitle && <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-zinc-900/30 border-t border-zinc-800/50">
          {footer}
        </div>
      )}
    </div>
  );
};
