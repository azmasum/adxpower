import React, { useEffect, useState } from 'react';
import { usePaymentStore } from '../store/usePaymentStore';
import { API_BASE_URL } from '../config';
import {
  Shield, Check, Zap, Globe,
  ArrowRight, Loader2, Lock, AlertCircle, ChevronRight
} from 'lucide-react';

const API = `${API_BASE_URL}/payment`;

const PLAN_ICONS: Record<string, any> = {
  starter: Zap, professional: StarIcon, agency: Globe, onetime: Shield,
};
const PLAN_COLORS: Record<string, string> = {
  starter: 'from-accent-blue/20 to-accent-blue/5 border-accent-blue/20',
  professional: 'from-brand-500/20 to-brand-500/5 border-brand-500/20',
  agency: 'from-accent-amber/20 to-accent-amber/5 border-accent-amber/20',
  onetime: 'from-accent-emerald/20 to-accent-emerald/5 border-accent-emerald/20',
};

function StarIcon(props: any) { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>; }

function VisaIcon() {
  return (
    <svg viewBox="0 0 48 32" width="36" height="24" className="rounded">
      <rect width="48" height="32" rx="4" fill="#1A1F71"/>
      <text x="24" y="20" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial, sans-serif">VISA</text>
    </svg>
  );
}

function MastercardIcon() {
  return (
    <svg viewBox="0 0 48 32" width="36" height="24" className="rounded">
      <rect width="48" height="32" rx="4" fill="#2D2D2D"/>
      <circle cx="19" cy="16" r="9" fill="#EB001B" opacity="0.9"/>
      <circle cx="29" cy="16" r="9" fill="#F79E1B" opacity="0.9"/>
    </svg>
  );
}

function AmexIcon() {
  return (
    <svg viewBox="0 0 48 32" width="36" height="24" className="rounded">
      <rect width="48" height="32" rx="4" fill="#006FCF"/>
      <text x="24" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial, sans-serif">AMEX</text>
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg viewBox="0 0 48 32" width="36" height="24" className="rounded">
      <rect width="48" height="32" rx="4" fill="#FF6000"/>
      <text x="24" y="20" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">DISC</text>
    </svg>
  );
}

export const CheckoutPage: React.FC = () => {
  const { plans, selectedPlan, paymentMethod, isLoading, error, fetchPlans, setSelectedPlan, setPaymentMethod, createOrder } = usePaymentStore();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'plans' | 'payment' | 'processing' | 'done' | 'success'>('plans');
  const [licenseKey, setLicenseKey] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetch(`${API}/demo-mode`).then(r => r.json()).then(d => setIsDemo(d.demo)).catch(() => {});
  }, [fetchPlans]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('provider');
    const orderId = params.get('orderId');
    if (provider === 'paypal' && orderId) {
      setStep('processing');
      pollOrderStatus(orderId, 'paypal');
    }
  }, []);

  const pollOrderStatus = async (id: string, provider: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await fetch(`${API}/order/${id}/status`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'completed' && data.licenseKey) {
          setLicenseKey(data.licenseKey);
          setStep('done');
          window.history.replaceState({}, '', '/payment-success');
          return;
        }
      } catch {}
    }
    setStep('payment');
    alert('Payment verification timed out. The webhook may still be processing.');
  };

  const handlePurchase = async () => {
    if (!email.trim()) { alert('Enter your email'); return; }
    setStep('processing');
    const order = await createOrder(email);

    if (!order) { setStep('payment'); return; }

    if ((order as any).approveUrl) {
      window.location.href = (order as any).approveUrl;
      return;
    }

    setStep('payment');
  };

  const fmtPrice = (amount: number, currency: string) => `$${(amount / 100).toFixed(0)}`;

  return (
    <div className="h-full bg-surface-base overflow-auto p-6">
      <div className="w-full max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center mx-auto mb-4 shadow-glow-md">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-[28px] font-bold text-white">Choose Your Plan</h1>
          <p className="text-[14px] text-gray-400 mt-2">Unlock the full power of AdxPower</p>
          {isDemo && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-amber/10 border border-accent-amber/20 rounded-full text-[11px] text-accent-amber font-medium">
              <Zap size={12} /> Demo Mode — Add PayPal keys to .env for real payments
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          {['plans', 'payment', 'done'].map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <ChevronRight size={14} className="text-gray-600" />}
              <div className={`flex items-center gap-1.5 text-[12px] font-medium ${
                step === s || (step === 'processing' && s === 'payment') ? 'text-brand-400' :
                (step === 'done' && s !== 'done') ? 'text-accent-emerald' : 'text-gray-600'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s ? 'bg-brand-500 text-white' :
                  (step === 'done' && s === 'done') ? 'bg-accent-emerald text-white' :
                  'bg-surface-card border border-surface-border text-gray-500'
                }`}>{i + 1}</div>
                {s === 'plans' ? 'Select Plan' : s === 'payment' ? 'Payment' : 'Complete'}
              </div>
            </React.Fragment>
          ))}
        </div>

        {step === 'plans' && (
          <div className="grid grid-cols-2 gap-4">
            {plans.map((plan) => {
              const Icon = PLAN_ICONS[plan.id] || Zap;
              const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.starter;
              const isSelected = selectedPlan === plan.id;
              return (
                <div key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                  className={`bg-surface-raised border rounded-xl p-5 cursor-pointer card-hover transition-all ${isSelected ? 'border-brand-500/50 shadow-glow-sm' : 'border-surface-border'}`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors} border flex items-center justify-center`}>
                      <Icon size={18} className="text-brand-400" />
                    </div>
                    {isSelected && <Check size={16} className="text-brand-400" />}
                  </div>
                  <h3 className="text-[16px] font-bold text-white mt-3">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[28px] font-bold text-white">{fmtPrice(plan.price, plan.currency)}</span>
                    {plan.durationDays ? <span className="text-[12px] text-gray-500">/mo</span> : <span className="text-[12px] text-accent-emerald font-medium">one-time</span>}
                  </div>
                  <div className="mt-4 space-y-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px] text-gray-300">
                        <Check size={12} className="text-accent-emerald flex-shrink-0" /> {f}
                      </div>
                    ))}
                  </div>
                  {isSelected && (
                    <button onClick={() => setStep('payment')}
                      className="w-full mt-5 bg-gradient-to-r from-brand-600 to-brand-500 text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 btn-premium shadow-glow-sm">
                      Continue <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 'payment' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-surface-raised border border-surface-border rounded-xl p-6">
              <h3 className="text-[15px] font-bold text-white mb-4">Payment Details</h3>

              <div className="mb-4">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white input-glow" />
              </div>

              <div className="mb-5">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-2 block">Pay with PayPal</label>
                <div className="bg-surface-card border border-surface-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield size={20} className="text-brand-400" />
                    <div>
                      <div className="text-[13px] font-medium text-white">PayPal Checkout</div>
                      <div className="text-[10px] text-gray-500">Pay with PayPal balance or any card</div>
                    </div>
                    <Check size={14} className="text-brand-400 ml-auto" />
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-surface-border">
                    <span className="text-[10px] text-gray-500 mr-1">Accepted:</span>
                    <VisaIcon />
                    <MastercardIcon />
                    <AmexIcon />
                    <DiscoverIcon />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('plans')}
                  className="flex-1 bg-surface-card border border-surface-border text-gray-300 py-2.5 rounded-lg text-[13px] font-medium hover:bg-surface-overlay transition-all">
                  Back
                </button>
                <button onClick={handlePurchase} disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 btn-premium shadow-glow-sm disabled:opacity-50">
                  <Lock size={13} /> Pay {fmtPrice(plans.find(p => p.id === selectedPlan)?.price || 0, 'usd')}
                </button>
              </div>

              <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500 justify-center">
                <Lock size={10} /> Secure payment · SSL encrypted · 30-day money back
              </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="max-w-md mx-auto text-center py-16">
            <Loader2 size={40} className="text-brand-400 animate-spin mx-auto mb-4" />
            <p className="text-[15px] text-white font-medium">Processing payment...</p>
            <p className="text-[12px] text-gray-500 mt-1">You will be redirected back after payment</p>
          </div>
        )}

        {step === 'done' && (
          <div className="max-w-md mx-auto text-center py-8">
            <div className="w-16 h-16 rounded-full bg-accent-emerald/20 border border-accent-emerald/30 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-accent-emerald" />
            </div>
            <h2 className="text-[20px] font-bold text-white">Payment Successful!</h2>
            <p className="text-[13px] text-gray-400 mt-2">Your license is ready</p>

            {licenseKey && (
              <div className="mt-6 bg-surface-raised border border-accent-emerald/20 rounded-xl p-5">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Your License Key</div>
                <div className="text-[20px] font-mono font-bold text-white tracking-widest">{licenseKey}</div>
                <button onClick={() => navigator.clipboard.writeText(licenseKey)}
                  className="mt-3 text-[12px] text-brand-400 hover:text-brand-300 font-medium">Copy to clipboard</button>
              </div>
            )}

            <p className="text-[12px] text-gray-500 mt-4">
              Go to <span className="text-brand-400 font-medium">License Manager</span> to activate
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-accent-rose/10 border border-accent-rose/20 rounded-lg p-3 flex items-center gap-2 text-[12px] text-accent-rose max-w-lg mx-auto">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>
    </div>
  );
};
