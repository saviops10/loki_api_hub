import React, { useState } from 'react';

const ICON_URL = "https://pub-bc0d075e4ee24efcaa48a8fee3ff5518.r2.dev/assets/icon_loki";
const LOGO_URL = "https://pub-bc0d075e4ee24efcaa48a8fee3ff5518.r2.dev/assets/logo_loki";

interface BrandingProps {
  className?: string;
}

export const LokiIcon: React.FC<BrandingProps> = ({ className = "w-10 h-10" }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`${className} bg-gradient-to-br from-loki-primary to-loki-accent rounded-2xl flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-loki-primary/20`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2/3 h-2/3">
          <path d="M12 3c-1.1 0-2.1.4-2.8 1.2L4.5 9.5c-.8.8-1.2 1.8-1.2 2.8 0 1.1.4 2.1 1.2 2.8l4.7 5.3c.7.8 1.7 1.2 2.8 1.2s2.1-.4 2.8-1.2l4.7-5.3c.8-.8 1.2-1.8 1.2-2.8 0-1.1-.4-2.1-1.2-2.8L14.8 4.2c-.7-.8-1.7-1.2-2.8-1.2z" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      </div>
    );
  }

  return (
    <img 
      src={ICON_URL} 
      alt="Loki Icon" 
      className={className} 
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
    />
  );
};

export const LokiLogo: React.FC<BrandingProps> = ({ className = "w-full max-w-lg" }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`${className} aspect-video bg-zinc-900/50 rounded-[3rem] border-2 border-loki-primary/30 flex flex-col items-center justify-center gap-4 relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-gradient-to-br from-loki-primary/10 to-transparent opacity-50" />
        <LokiIcon className="w-24 h-24 relative z-10" />
        <h1 className="text-5xl font-black tracking-tighter relative z-10">
          LOKI <span className="text-loki-accent">HUB</span>
        </h1>
      </div>
    );
  }

  return (
    <img 
      src={LOGO_URL} 
      alt="Loki Logo" 
      className={className} 
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
    />
  );
};
