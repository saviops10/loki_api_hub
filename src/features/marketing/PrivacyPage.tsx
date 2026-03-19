import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield, Lock, Eye, Server, UserCheck, Trash2 } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-loki-primary/30">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-loki-primary rounded-xl flex items-center justify-center shadow-lg shadow-loki-primary/20">
              <Shield className="text-black w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase italic">Loki <span className="text-loki-primary">Privacy</span></span>
          </div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <header className="space-y-4">
              <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                Privacy <span className="text-loki-primary text-stroke-white">Policy</span>
              </h1>
              <p className="text-zinc-500 font-mono text-sm">Last Updated: March 15, 2026</p>
              <div className="h-1 w-20 bg-loki-primary" />
            </header>

            <section className="prose prose-invert max-w-none space-y-8">
              <p className="text-lg text-zinc-400 leading-relaxed">
                This Policy describes how we handle information collected and processed by our application, ensuring compliance with data protection standards and the Brazilian General Data Protection Law (LGPD - Law 13.709/2018).
              </p>

              <div className="grid gap-8">
                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <UserCheck className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">1. Data Collection and Purpose</h2>
                  </div>
                  <p className="text-zinc-400">We collect only what is strictly necessary for the secure operation of the system:</p>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-4">
                    <li><strong className="text-white">User Identification:</strong> Name, email, and username for authentication, account security, and audit trails.</li>
                    <li><strong className="text-white">Traffic Logs:</strong> Record of requests and responses (payloads) for technical support, debugging, and performance analysis.</li>
                  </ul>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Lock className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">2. Security and Encryption</h2>
                  </div>
                  <p className="text-zinc-400">We adopt bank-grade technical measures to protect your trade secrets and personal data:</p>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-4">
                    <li><strong className="text-white">External API Credentials:</strong> All keys and secrets are stored with encryption at rest (AES-256). Once saved, the original key cannot be viewed.</li>
                    <li><strong className="text-white">Access Passwords:</strong> We never store passwords in plain text. We use robust hashing algorithms (bcrypt).</li>
                    <li><strong className="text-white">Data Isolation (Multitenancy):</strong> Logical isolation by ID ensures your configurations are invisible to other users.</li>
                  </ul>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Eye className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">3. Masking and Minimization</h2>
                  </div>
                  <p className="text-zinc-400">
                    Our processing layer features <strong className="text-white">Data Scrubbing</strong> filters that identify and hide sensitive patterns (such as authentication tokens or passwords) in logs before they are written to our database.
                  </p>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Server className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">4. Monitoring and Abuse Prevention</h2>
                  </div>
                  <p className="text-zinc-400">
                    We monitor request volume and consumption metrics to ensure platform stability, apply plan limits, and prevent Denial of Service (DoS/DDoS) attacks.
                  </p>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Shield className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">5. Data Sharing and Transfer</h2>
                  </div>
                  <p className="text-zinc-400">
                    The platform does not share, sell, or rent your traffic data, API configurations, or identification information to third parties. Data flow occurs strictly between the Hub and the final API Provider.
                  </p>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Trash2 className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">6. Subject Rights</h2>
                  </div>
                  <p className="text-zinc-400">Users may at any time request:</p>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-4">
                    <li>Confirmation of data processing existence.</li>
                    <li>Correction of incomplete or inaccurate data.</li>
                    <li>Definitive deletion of account and logs (respecting legal retention periods).</li>
                  </ul>
                </div>
              </div>

              <div className="mt-12 p-10 bg-loki-primary/5 border border-loki-primary/20 rounded-[3rem] text-center space-y-4">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Technical Commitment Seal</h3>
                <p className="text-zinc-400 italic max-w-2xl mx-auto">
                  "Our architecture was designed under the principle of Privacy by Design. This means privacy is not an accessory, but part of the source code, from database isolation to automatic log masking."
                </p>
              </div>
            </section>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
