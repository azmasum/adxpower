import React, { useState, useEffect } from 'react';
import { Key, Cpu, CheckCircle, XCircle, Copy, Trash2, Shield, Monitor, Calendar, AlertTriangle, Download, Clock } from 'lucide-react';
import { API_BASE_URL, API_URL, getHardwareId } from '../config';

export const LicenseManager: React.FC = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [hwid, setHwid] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [licenseData, setLicenseData] = useState<any>(() => {
    const saved = localStorage.getItem('license_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [offlineKey, setOfflineKey] = useState('');
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const id = getHardwareId();
    setHwid(id);

    fetch(`${API_BASE_URL}/license/trial/status?hardwareId=${id}`)
      .then(r => r.json())
      .then(setTrialStatus)
      .catch(() => {});
  }, []);

  const handleActivate = async () => {
    if (!licenseKey.trim()) { alert('Please enter a license key'); return; }
    setIsActivating(true);
    try {
      const res = await fetch(`${API_URL}/license/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim(), hardwareId: hwid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Activation failed');
      localStorage.setItem('license_data', JSON.stringify(data));
      setLicenseData(data);
      alert('License Activated Successfully!');
    } catch (err: any) {
      alert('Activation Failed: ' + err.message);
    } finally {
      setIsActivating(false);
    }
  };

  const handleStartTrial = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/license/trial/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hardwareId: hwid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Trial failed');
      localStorage.setItem('license_data', JSON.stringify({ ...data, valid: true, isTrial: true }));
      setLicenseData({ ...data, valid: true, isTrial: true });
      alert(`Trial started! Expires in ${data.durationHours}h. License: ${data.licenseKey}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Remove license from this PC?')) return;
    try {
      await fetch(`${API_URL}/license/unbind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseData?.licenseKey || '', hardwareId: hwid }),
      });
    } catch {}
    localStorage.removeItem('license_data');
    setLicenseData(null);
    setLicenseKey('');
  };

  const handleOfflineActivate = async () => {
    if (!licenseKey.trim()) { alert('Enter license key first'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/license/offline/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim(), hardwareId: hwid }),
      });
      const data = await res.json();
      if (res.ok) setOfflineKey(data.activationKey);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const copyHWID = () => {
    navigator.clipboard.writeText(hwid);
  };

  // === ACTIVATED VIEW ===
  if (licenseData?.valid) {
    return (
      <div className="h-full bg-surface-base p-6 overflow-auto">
        <div className="px-0 py-0 border-0">
          <h2 className="text-[17px] font-bold text-white flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-emerald/20 to-accent-emerald/5 border border-accent-emerald/20 flex items-center justify-center">
              <Shield size={18} className="text-accent-emerald" />
            </div>
            License Activated
          </h2>
        </div>

        <div className="max-w-2xl space-y-4">
          <div className="bg-surface-raised border border-accent-emerald/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-emerald/20 to-accent-emerald/5 border border-accent-emerald/30 flex items-center justify-center">
                <CheckCircle size={24} className="text-accent-emerald" />
              </div>
              <div>
                <div className="text-[15px] font-bold text-white">License Valid</div>
                <div className="text-[12px] text-accent-emerald font-medium">
                  {licenseData.isTrial ? 'Trial Period' : licenseData.plan || 'Lifetime Agency'} Plan
                  {licenseData.expiresAt && ` · Expires ${new Date(licenseData.expiresAt).toLocaleDateString()}`}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-surface-card border border-surface-border p-3.5 rounded-lg">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">LICENSE KEY</div>
                <div className="text-[13px] text-white font-mono mt-1.5">{licenseData.licenseKey}</div>
              </div>
              <div className="bg-surface-card border border-surface-border p-3.5 rounded-lg">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">BOUND HWID</div>
                <div className="text-[13px] text-white font-mono mt-1.5">{licenseData.hwid}</div>
              </div>
              <div className="bg-surface-card border border-surface-border p-3.5 rounded-lg">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">MAX PROFILES</div>
                <div className="text-[13px] text-white mt-1.5">{licenseData.maxProfiles}</div>
              </div>
              <div className="bg-surface-card border border-surface-border p-3.5 rounded-lg">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">STATUS</div>
                <div className="text-[13px] text-accent-emerald mt-1.5 font-medium">Active</div>
              </div>
            </div>
            <button onClick={handleDeactivate}
              className="mt-5 bg-accent-rose/10 hover:bg-accent-rose/20 border border-accent-rose/20 text-accent-rose px-4 py-2.5 rounded-lg text-[12px] font-medium flex items-center gap-2 transition-all">
              <Trash2 size={13} /> Deactivate & Transfer
            </button>
          </div>

          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Monitor size={14} className="text-brand-400" />
              <h4 className="text-[13px] font-semibold text-white">This PC Info</h4>
            </div>
            <div className="flex justify-between items-center bg-surface-card border border-surface-border p-3.5 rounded-lg">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">HWID</div>
                <div className="text-[13px] text-white font-mono mt-1">{hwid}</div>
              </div>
              <button onClick={copyHWID}
                className="bg-surface-overlay border border-surface-border text-gray-300 px-3 py-2 rounded-lg text-[12px] font-medium flex items-center gap-1.5 hover:bg-surface-overlay hover:text-white transition-all">
                <Copy size={12} /> Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === NOT ACTIVATED VIEW ===
  return (
    <div className="h-full bg-surface-base p-6 overflow-auto flex items-center justify-center">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center mx-auto mb-4 shadow-glow-md">
            <Key size={32} className="text-white" />
          </div>
          <h2 className="text-[22px] font-bold text-white">Activate Your License</h2>
          <p className="text-[13px] text-gray-400 mt-2">Enter the license key purchased from the store</p>
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-2xl p-6 space-y-4 shadow-card">
          <div>
            <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1 mb-1.5">
              <Key size={11} /> License Key
            </label>
            <input value={licenseKey} onChange={e => setLicenseKey(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full bg-surface-card border border-surface-border rounded-lg p-3 text-white font-mono text-[14px] tracking-widest focus:outline-none input-glow transition-all" />
          </div>

          <div>
            <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1 mb-1.5">
              <Cpu size={11} /> Hardware ID (Auto Detected)
            </label>
            <div className="flex gap-2">
              <input value={hwid} readOnly className="flex-1 bg-surface-base border border-surface-border rounded-lg p-3 text-gray-400 font-mono text-[12px]" />
              <button onClick={copyHWID}
                className="bg-surface-overlay border border-surface-border text-gray-300 px-3 rounded-lg hover:text-white transition-all">
                <Copy size={14} />
              </button>
            </div>
          </div>

          <button onClick={handleActivate} disabled={isActivating}
            className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all btn-premium shadow-glow-sm">
            {isActivating ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Activating...</>
            ) : (
              <><Shield size={16} /> Activate License</>
            )}
          </button>

          <div className="relative flex items-center gap-3 my-4">
            <div className="flex-1 border-t border-surface-border" />
            <span className="text-[11px] text-gray-500 font-medium">OR</span>
            <div className="flex-1 border-t border-surface-border" />
          </div>

          {/* Trial Button */}
          {trialStatus && !trialStatus.hasTrial && (
            <button onClick={handleStartTrial}
              className="w-full bg-accent-amber/15 hover:bg-accent-amber/25 border border-accent-amber/30 text-accent-amber font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
              <Clock size={16} /> Start 1-Day Free Trial
            </button>
          )}
          {trialStatus && trialStatus.hasTrial && trialStatus.status === 'active' && (
            <div className="text-center text-[12px] text-accent-amber">
              Trial active — {trialStatus.remainingHours}h {trialStatus.remainingMins}m remaining
            </div>
          )}
          {trialStatus && trialStatus.hasTrial && trialStatus.status === 'expired' && (
            <div className="text-center text-[12px] text-gray-500">
              Trial already used on this machine
            </div>
          )}

          {/* Offline Activation */}
          <button onClick={() => setShowOffline(!showOffline)}
            className="w-full bg-surface-card border border-surface-border text-gray-400 py-2.5 rounded-lg text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-surface-overlay transition-all">
            <Download size={14} /> Offline Activation
          </button>

          {showOffline && (
            <div className="bg-surface-card border border-surface-border rounded-lg p-4 space-y-3">
              <p className="text-[11px] text-gray-500">Generate an offline activation key for machines without internet.</p>
              <button onClick={handleOfflineActivate}
                className="w-full bg-brand-500/15 border border-brand-500/30 text-brand-400 py-2 rounded-lg text-[12px] font-medium hover:bg-brand-500/25 transition-all">
                Generate Activation Key
              </button>
              {offlineKey && (
                <div className="bg-surface-base border border-surface-border rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Activation Key</div>
                  <code className="text-[14px] font-mono text-white">{offlineKey}</code>
                  <button onClick={() => navigator.clipboard.writeText(offlineKey)}
                    className="ml-2 text-[11px] text-brand-400 hover:text-brand-300">Copy</button>
                </div>
              )}
            </div>
          )}

          <div className="bg-accent-amber/5 border border-accent-amber/15 p-3 rounded-lg flex gap-2">
            <AlertTriangle size={14} className="text-accent-amber mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-accent-amber/80 leading-relaxed">One license = One PC. To use on another PC, deactivate from current PC first.</p>
          </div>
        </div>

        <div className="text-center mt-6 text-[12px] text-gray-500">
          Don't have a license? <a href="#checkout" className="text-brand-400 cursor-pointer font-medium hover:text-brand-300 transition-colors">Buy from store</a>
        </div>
      </div>
    </div>
  );
};
