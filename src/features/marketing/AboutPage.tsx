import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/Button';

export const AboutPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-loki-bg text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <button onClick={onBack} className="text-zinc-500 hover:text-loki-primary font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          ← Back to Home
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <h1 className="text-5xl font-black tracking-tighter">WHAT IS <span className="text-loki-primary">L.O.K.I</span>?</h1>
          
          <div className="grid gap-8">
            <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/10">
              <h2 className="text-2xl font-black mb-4 text-loki-primary">L.O.K.I Manifesto</h2>
              <p className="text-zinc-400 leading-relaxed mb-6">
                L.O.K.I stands for <strong>Logging, Operation, Key-access, and Integration</strong>. It was built to solve the "API Fragmentation" problem where developers lose time managing credentials across dozens of services.
              </p>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <span className="text-loki-primary font-black">L</span>
                  <span className="text-zinc-300"><strong>Logging</strong>: Every request is tracked, scrubbed, and stored for audit.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-loki-primary font-black">O</span>
                  <span className="text-zinc-300"><strong>Operation</strong>: Centralized control for all your endpoints.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-loki-primary font-black">K</span>
                  <span className="text-zinc-300"><strong>Key-access</strong>: Secure storage and automated rotation of API keys.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-loki-primary font-black">I</span>
                  <span className="text-zinc-300"><strong>Integration</strong>: Seamlessly connect any third-party service.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black tracking-tight">How it works</h3>
              <p className="text-zinc-500 leading-relaxed">
                L.O.K.I acts as a secure proxy layer between your application and your third-party APIs. By registering your APIs in the Hub, you delegate the complex authentication logic (like OAuth2 token refreshing) to our engine. Your application only needs to talk to L.O.K.I using a single Master API Key.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
