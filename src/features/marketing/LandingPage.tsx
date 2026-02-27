import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/Button';

const ICON_URL = "https://pub-bc0d075e4ee24efcaa48a8fee3ff5518.r2.dev/meu-bucket-imagens/assets/icon_loki";
const LOGO_URL = "https://pub-bc0d075e4ee24efcaa48a8fee3ff5518.r2.dev/meu-bucket-imagens/assets/logo_loki";

export const LandingPage: React.FC<{ onGetStarted: () => void, onAbout: () => void, onPlans: () => void }> = ({ onGetStarted, onAbout, onPlans }) => {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={ICON_URL} alt="Loki Icon" className="w-10 h-10" referrerPolicy="no-referrer" />
          <span className="text-2xl font-black tracking-tighter">LOKI <span className="text-emerald-500">HUB</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-zinc-400">
          <button onClick={onAbout} className="hover:text-emerald-500 transition-colors">About</button>
          <button onClick={onPlans} className="hover:text-emerald-500 transition-colors">Plans</button>
          <Button variant="secondary" onClick={onGetStarted}>Sign In</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">
            Precision API Management
          </div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter">
            CONTROL YOUR <br />
            <span className="text-emerald-500">API UNIVERSE</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-lg leading-relaxed">
            L.O.K.I API HUB is the ultimate platform to centralize, automate, and scale your integrations. Stop managing tokens manually and start building with precision.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" onClick={onGetStarted} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-12">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={onAbout}>
              Learn More
            </Button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-emerald-500/20 blur-[120px] rounded-full" />
          <img 
            src={LOGO_URL} 
            alt="Loki Logo Large" 
            className="relative z-10 w-full max-w-lg mx-auto drop-shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </main>

      {/* Features Grid */}
      <section className="bg-zinc-900/30 border-y border-zinc-800 py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="text-3xl">⚡</div>
            <h3 className="text-xl font-black uppercase tracking-tight">Automated Auth</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              OAuth2, Bearer, and API Key refresh handled automatically. Never worry about expired tokens again.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-3xl">🛠️</div>
            <h3 className="text-xl font-black uppercase tracking-tight">Loki CLI</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Manage your entire API stack from your terminal. Seamless integration with your development workflow.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-3xl">🛡️</div>
            <h3 className="text-xl font-black uppercase tracking-tight">Enterprise Security</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Military-grade encryption for your credentials and secure log scrubbing to protect sensitive data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
