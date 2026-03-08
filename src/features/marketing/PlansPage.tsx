import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';

export const PlansPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'free',
      name: 'Free Tier',
      price: '$0',
      features: ['Up to 3 APIs', '100 Requests/Day', 'Basic Logging', 'Community Support'],
      buttonText: 'Current Plan'
    },
    {
      id: 'pro',
      name: 'Pro Developer',
      price: '$29',
      features: ['Unlimited APIs', '10k Requests/Day', 'Advanced Log Scrubbing', 'Priority Support', 'Loki CLI Access'],
      buttonText: 'Upgrade to Pro',
      highlight: true
    },
    {
      id: 'enterprise',
      name: 'Custom Enterprise',
      price: 'Custom',
      features: ['Unlimited Everything', 'Dedicated Infrastructure', 'SLA Guarantee', '24/7 Phone Support', 'On-premise Options'],
      buttonText: 'Contact Sales'
    }
  ];

  return (
    <div className="min-h-screen bg-loki-bg text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <button onClick={onBack} className="text-zinc-500 hover:text-loki-primary font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          ← Back to Home
        </button>

        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tighter">CHOOSE YOUR <span className="text-loki-primary">POWER</span></h1>
          <p className="text-zinc-500 max-w-xl mx-auto">Scale your API management as your business grows. No hidden fees, just precision.</p>
        </div>

        {!selectedPlan ? (
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <motion.div 
                key={plan.id}
                whileHover={{ y: -10 }}
                className={`bg-zinc-900/50 border ${plan.highlight ? 'border-loki-primary shadow-2xl shadow-loki-primary/10' : 'border-white/10'} rounded-[2.5rem] p-8 flex flex-col`}
              >
                <div className="mb-8">
                  <h3 className="text-xl font-black uppercase tracking-tight mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    {plan.id !== 'enterprise' && <span className="text-zinc-500 text-sm">/mo</span>}
                  </div>
                </div>
                
                <ul className="flex-1 space-y-4 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                      <span className="text-loki-primary">✓</span> {f}
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.highlight ? 'primary' : 'secondary'} 
                  onClick={() => plan.id !== 'free' && setSelectedPlan(plan.id)}
                >
                  {plan.buttonText}
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto"
          >
            <Card title="Payment Details" subtitle={`Upgrading to ${selectedPlan.toUpperCase()}`}>
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Payment simulation successful!'); setSelectedPlan(null); }}>
                <Input label="Cardholder Name" placeholder="John Doe" required />
                <Input label="Card Number" placeholder="0000 0000 0000 0000" required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Expiry Date" placeholder="MM/YY" required />
                  <Input label="CVC" placeholder="000" required />
                </div>
                <div className="pt-4 space-y-3">
                  <Button type="submit" className="w-full">Confirm & Pay</Button>
                  <Button variant="ghost" onClick={() => setSelectedPlan(null)} className="w-full">Cancel</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};
