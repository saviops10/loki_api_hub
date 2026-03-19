import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, FileText, Scale, ShieldAlert, Cpu, Globe, UserCheck } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-loki-primary/30">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-loki-primary rounded-xl flex items-center justify-center shadow-lg shadow-loki-primary/20">
              <FileText className="text-black w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase italic">Loki <span className="text-loki-primary">Terms</span></span>
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
                Terms & <span className="text-loki-primary text-stroke-white">Conditions</span>
              </h1>
              <p className="text-zinc-500 font-mono text-sm">Version: 1.0 | Last Updated: March 15, 2026</p>
              <div className="h-1 w-20 bg-loki-primary" />
            </header>

            <section className="prose prose-invert max-w-none space-y-8">
              <div className="grid gap-8">
                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Globe className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">1. Object and Scope of Operation</h2>
                  </div>
                  <p className="text-zinc-400">
                    The Platform consists of a Request Intermediation tool (Proxy/Gateway), whose objective is to centralize inventory, authentication, and monitoring of external APIs.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-4">
                    <li><strong className="text-white">Intermediation:</strong> The application acts as a secure tunnel. The User acknowledges that the Platform does not generate the content of third-party APIs.</li>
                    <li><strong className="text-white">Limitation of Liability:</strong> The Platform is not responsible for the availability, accuracy, or integrity of data provided by final providers (external APIs).</li>
                  </ul>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <ShieldAlert className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">2. Credential Management and Security</h2>
                  </div>
                  <p className="text-zinc-400">Given the Authentication Management functionality (OAuth2, Bearer, API Keys), the following rules apply:</p>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-4">
                    <li><strong className="text-white">User Responsibility:</strong> The User is solely responsible for obtaining and maintaining active access keys with original providers.</li>
                    <li><strong className="text-white">Token Storage:</strong> By using the auto-refresh function, the User authorizes the Platform to cryptographically store necessary credentials.</li>
                    <li><strong className="text-white">Internal Credentials:</strong> Hub-generated keys for internal authentication are for personal and non-transferable use.</li>
                  </ul>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Cpu className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">3. Sandbox Environment Use</h2>
                  </div>
                  <p className="text-zinc-400">
                    The Sandbox functionality allows real-time calls for validation. The User is advised not to use sensitive personal data in the test environment unless strictly necessary and under their full responsibility for compliance.
                  </p>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Scale className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">4. Audit, Logs, and Monitoring</h2>
                  </div>
                  <p className="text-zinc-400">For security and transparency purposes, the Platform performs Transaction Logging:</p>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-4">
                    <li><strong className="text-white">Collected Data:</strong> Status code, latency, HTTP methods, and response content.</li>
                    <li><strong className="text-white">Purpose:</strong> Security audit, troubleshooting, and performance analysis.</li>
                  </ul>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <UserCheck className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">5. Access Control (RBAC)</h2>
                  </div>
                  <p className="text-zinc-400">The application uses a Role-Based Access Control (RBAC) model:</p>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-4">
                    <li><strong className="text-white">Administrators:</strong> Full visibility over infrastructure and system management.</li>
                    <li><strong className="text-white">Common Users:</strong> Restricted access to APIs and keys they have registered.</li>
                  </ul>
                </div>

                <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <ShieldAlert className="w-6 h-6 text-loki-primary" />
                    <h2 className="text-xl font-black uppercase italic tracking-tight">6. Intellectual Property and Restrictions</h2>
                  </div>
                  <p className="text-zinc-400">The User does not acquire any ownership rights over the Platform's source code. It is expressly forbidden to:</p>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-4">
                    <li>Reverse engineer the Gateway.</li>
                    <li>Use the tool for illegal activities, such as DDoS attacks.</li>
                  </ul>
                </div>
              </div>
            </section>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
