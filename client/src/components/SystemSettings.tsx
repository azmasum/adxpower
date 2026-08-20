import React, { useState, useEffect } from 'react';
import {
  Settings, FolderOpen, Cpu, Layers, Lock, Save, RefreshCw, HelpCircle, Globe, Server
} from 'lucide-react';
import { setServerUrl, getServerUrlExport } from '../config';

export const SystemSettings: React.FC = () => {
  const [binaryPath, setBinaryPath] = useState<string>('C:\\Program Files\\AdxPower\\Chromium\\chrome.exe');
  const [browserVersion, setBrowserVersion] = useState<string>('Chrome 120.0-patched-v1');
  const [cdpPortStart, setCdpPortStart] = useState<number>(9222);
  const [rpaDelay, setRpaDelay] = useState<number>(300);
  const [enableConsoleLogs, setEnableConsoleLogs] = useState<boolean>(true);
  const [licenseKey, setLicenseKey] = useState<string>('LIC-XXXX-XXXX-XXXX-XXXX');
  const [hardwareId, setHardwareId] = useState<string>('Loading device fingerprint...');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [serverUrl, setServerUrlState] = useState<string>(getServerUrlExport());
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const savedPath = localStorage.getItem('ml_binary_path');
    const savedDelay = localStorage.getItem('ml_rpa_delay');
    const savedLicense = localStorage.getItem('ml_license_key');
    if (savedPath) setBinaryPath(savedPath);
    if (savedDelay) setRpaDelay(Number(savedDelay));
    if (savedLicense) setLicenseKey(savedLicense);
    if (window.electronAPI && window.electronAPI.verifyLicense) {
      window.electronAPI.verifyLicense('').then((res: any) => {
        setHardwareId(res.reason?.includes('bound') || res.verified ? 'ADX-ACTIVE-PC01' : 'ADX-PC-HWID-001');
      }).catch(() => setHardwareId('ADX-PC-HWID-001'));
    } else {
      setHardwareId('ADX-STANDALONE-MODE');
    }
    checkServer();
  }, []);

  const checkServer = async () => {
    try {
      const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(5000) });
      setServerStatus(res.ok ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }
  };

  const handleBrowse = async () => {
    if ((window as any).electronAPI?.selectBinary) {
      const selectedPath = await (window as any).electronAPI.selectBinary();
      if (selectedPath) setBinaryPath(selectedPath);
    } else {
      alert('Run in Electron: npm run electron:dev');
    }
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    localStorage.setItem('ml_binary_path', binaryPath);
    localStorage.setItem('ml_rpa_delay', rpaDelay.toString());
    localStorage.setItem('ml_license_key', licenseKey);
    setServerUrl(serverUrl);
    setTimeout(() => {
      setIsSaving(false);
      checkServer();
      alert('Settings saved! Server URL updated.');
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-raised/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
            <Settings size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-white">System Settings</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Configure browser engine, automation and license</p>
          </div>
        </div>
        <button onClick={handleSaveSettings} disabled={isSaving}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:from-gray-700 disabled:to-gray-700 text-white text-[12px] font-semibold px-4 py-2.5 rounded-lg shadow-glow-sm transition-all btn-premium">
          {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="p-6 space-y-5 max-w-4xl w-full">
        {/* Server Connection */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center">
              <Server size={14} className="text-accent-emerald" />
            </div>
            Server Connection
            <span className={`ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
              serverStatus === 'online'
                ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20'
                : serverStatus === 'offline'
                ? 'bg-accent-rose/10 text-accent-rose border-accent-rose/20'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                serverStatus === 'online' ? 'bg-accent-emerald status-online' : serverStatus === 'offline' ? 'bg-accent-rose' : 'bg-gray-500 animate-pulse'
              }`} />
              {serverStatus === 'online' ? 'Connected' : serverStatus === 'offline' ? 'Offline' : 'Checking...'}
            </span>
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">
                Backend Server URL
              </label>
              <input type="text" value={serverUrl} onChange={(e) => setServerUrlState(e.target.value)}
                placeholder="https://your-app.onrender.com"
                className="w-full bg-surface-card text-[12px] border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none font-mono text-gray-300 input-glow transition-all" />
              <p className="text-[10px] text-gray-500 mt-1.5">
                Enter your live server URL or leave as <code className="text-brand-400">http://localhost:3000</code> for local mode.
              </p>
            </div>
          </div>
        </div>

        {/* Browser Core */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Cpu size={14} className="text-brand-400" />
            </div>
            Browser Core
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">
                Chromium Binary Path
              </label>
              <div className="flex gap-2">
                <input type="text" value={binaryPath} onChange={(e) => setBinaryPath(e.target.value)}
                  className="flex-1 bg-surface-card text-[12px] border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none font-mono text-gray-300 input-glow transition-all" />
                <button onClick={handleBrowse}
                  className="flex items-center gap-1.5 bg-surface-overlay hover:bg-surface-overlay border border-surface-border text-[12px] px-3 py-2.5 rounded-lg transition-all text-gray-300 hover:text-white">
                  <FolderOpen size={13} />
                  <span>Browse</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">Browser Version</label>
                <select value={browserVersion} onChange={(e) => setBrowserVersion(e.target.value)}
                  className="w-full bg-surface-card text-[12px] border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none text-gray-300 cursor-pointer">
                  <option value="Chrome 120.0-patched-v1">Chrome 120.0.3202 (Patched v1)</option>
                  <option value="Chrome 124.0-patched-v2">Chrome 124.0.6167 (Patched v2)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">CDP Port Start</label>
                <input type="number" value={cdpPortStart} onChange={(e) => setCdpPortStart(Number(e.target.value))}
                  className="w-full bg-surface-card text-[12px] border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none text-gray-300 font-mono input-glow transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* RPA Settings */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
              <Layers size={14} className="text-accent-cyan" />
            </div>
            RPA & Automation
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">Action Delay (ms)</label>
              <input type="number" value={rpaDelay} onChange={(e) => setRpaDelay(Number(e.target.value))}
                className="w-full bg-surface-card text-[12px] border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none text-gray-300 font-mono input-glow transition-all" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={enableConsoleLogs} onChange={(e) => setEnableConsoleLogs(e.target.checked)}
                  className="rounded border-surface-border-light bg-surface-card text-brand-500 focus:ring-0 w-4 h-4 cursor-pointer" />
                <span className="text-[12px] text-gray-300">Enable execution logging</span>
              </label>
            </div>
          </div>
        </div>

        {/* License */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center">
              <Lock size={14} className="text-accent-amber" />
            </div>
            License & HWID Binding
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">License Key</label>
              <input type="text" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)}
                className="w-full bg-surface-card text-[12px] border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none text-gray-300 font-mono input-glow transition-all" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">Hardware ID</label>
              <input type="text" value={hardwareId} disabled
                className="w-full bg-surface-base text-[12px] border border-surface-border rounded-lg px-3 py-2.5 text-gray-500 font-mono cursor-not-allowed" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
            License is hardware-locked. Transferring licenses will update this PC configuration automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
