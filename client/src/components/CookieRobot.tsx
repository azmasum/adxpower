import React, { useState, useRef } from 'react';
import { Cookie, Upload, Download, Play, Square, Check, Trash2, Copy, FileText, Loader2, Globe, Shield, Zap, Shuffle } from 'lucide-react';

import { API_BASE_URL, getHardwareId } from '../config';

const API_URL = API_BASE_URL;

const WARMUP_SITES = [
  { key: 'google', label: 'Google', icon: '🔍', desc: 'Search history' },
  { key: 'youtube', label: 'YouTube', icon: '▶️', desc: 'Video watch history' },
  { key: 'facebook', label: 'Facebook', icon: '👤', desc: 'Social profile' },
  { key: 'amazon', label: 'Amazon', icon: '🛒', desc: 'Shopping behavior' },
  { key: 'twitter', label: 'X / Twitter', icon: '🐦', desc: 'Social activity' },
];

export const CookieRobot = () => {
  const [cookies, setCookies] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isWarming, setIsWarming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [warmLog, setWarmLog] = useState<string[]>([]);
  const [sites, setSites] = useState<Record<string, boolean>>({ google: true, youtube: true, facebook: true, amazon: false, twitter: false });
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const addLog = (msg: string) => setWarmLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleImport = async () => {
    if (!cookies.trim()) { alert('Paste cookies first'); return; }
    setIsImporting(true);
    try {
      let parsed: any[] = [];
      if (cookies.trim().startsWith('[') || cookies.trim().startsWith('{')) {
        const p = JSON.parse(cookies);
        parsed = Array.isArray(p) ? p : [p];
      } else {
        parsed = cookies.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).map(l => {
          const parts = l.split('\t');
          return { domain: parts[0], name: parts[2], value: parts[3], path: parts[5], secure: parts[3] === 'TRUE', httpOnly: false };
        });
      }

      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.importCookies && selectedProfileId) {
        const result = await electronAPI.importCookies(selectedProfileId, parsed);
        if (result.success) {
          setImportedCount(result.imported);
        } else {
          alert(`Import failed: ${result.error}`);
        }
      } else {
        setImportedCount(parsed.length);
        try { localStorage.setItem('imported_cookies', cookies); } catch {}
      }
    } catch { alert('Invalid cookie format. Use JSON or Netscape format'); }
    setIsImporting(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (ev) => setCookies(ev.target?.result as string); reader.readAsText(file);
  };

  const handleExport = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.exportCookies && selectedProfileId) {
      const result = await electronAPI.exportCookies(selectedProfileId);
      if (result.success) {
        const data = JSON.stringify(result.cookies, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `cookies_${selectedProfileId}_${Date.now()}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } else {
      try {
        const data = cookies || localStorage.getItem('imported_cookies') || '[]';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `cookies_export_${Date.now()}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      } catch { alert('Export failed'); }
    }
  };

  const handleCopy = () => { try { navigator.clipboard.writeText(cookies); } catch {} };

  const handleGenerate = () => {
    const DOMAINS = [
      { domain: '.google.com', names: ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PSID', 'NID'] },
      { domain: '.facebook.com', names: ['c_user', 'xs', 'datr', 'fr', 'sb', 'pl', 'wd', 'dpr'] },
      { domain: '.youtube.com', names: ['VISITOR_INFO1_LIVE', 'PREF', 'SID', 'HSID', 'SSID', 'LOGIN_INFO'] },
      { domain: '.twitter.com', names: ['auth_token', 'ct0', 'twid', 'guest_id', 'personalization_id'] },
      { domain: '.amazon.com', names: ['session-id', 'session-token', 'csm-hit', 'ubid-main', 'x-main'] },
      { domain: '.github.com', names: ['_gh_sess', 'logged_in', 'user_session', 'preferred_color_mode'] },
      { domain: '.reddit.com', names: ['session', 'token_v2', '_options', '__cfduid'] },
      { domain: '.linkedin.com', names: ['li_at', 'li_sugap', 'bcookie', 'lidc', 'UserMatchHistory'] },
    ];
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randHex = (len: number) => Array.from({ length: len }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
    const pickDomains = [pick(DOMAINS), pick(DOMAINS), pick(DOMAINS)];
    const result: any[] = [];
    for (const d of pickDomains) {
      const count = 2 + Math.floor(Math.random() * d.names.length);
      const picked = d.names.sort(() => Math.random() - 0.5).slice(0, count);
      for (const name of picked) {
        result.push({
          domain: d.domain,
          hostOnly: false,
          path: '/',
          secure: name.startsWith('__Secure') || name.startsWith('__Host'),
          expires: new Date(Date.now() + (30 + Math.random() * 365) * 86400000).toISOString(),
          name,
          value: randHex(20 + Math.floor(Math.random() * 60)),
          sameSite: pick(['no_restriction', 'lax', 'strict']),
          storeId: '0',
          httpOnly: Math.random() > 0.5,
        });
      }
    }
    setCookies(JSON.stringify(result, null, 2));
    setImportedCount(null);
  };

  const handleStartWarmup = async () => {
    if (isWarming) return;
    if (!selectedProfileId) { alert('Select a profile first'); return; }

    setIsWarming(true); setProgress(0); setWarmLog([]);
    abortRef.current = new AbortController();

    const siteList = Object.entries(sites).filter(([, v]) => v).map(([k]) => k);
    if (siteList.length === 0) { addLog('ERROR: Select at least one site'); setIsWarming(false); return; }

    addLog(`Starting warm-up for profile ${selectedProfileId}...`);
    addLog(`Sites: ${siteList.join(', ')}`);

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.runWarmup) {
        addLog('Running locally via Electron...');
        const result = await electronAPI.runWarmup(selectedProfileId, siteList);
        if (result.logs) result.logs.forEach((l: string) => addLog(l));
        if (!result.success) addLog(`ERROR: ${result.error}`);
        else addLog(`Warm-up completed - ${siteList.length} sites visited`);
        setProgress(100);
      } else {
        addLog(`Launching browser for profile ${selectedProfileId}...`);
        const startRes = await fetch(`${API_URL}/profiles/${selectedProfileId}/start`, { method: 'POST', headers: { 'x-hardware-id': getHardwareId() } });
        if (!startRes.ok) { const errData = await startRes.json().catch(() => ({})); addLog(`ERROR: Failed to start - ${errData.message || startRes.status}`); setIsWarming(false); return; }
        addLog('Browser launched. Warming up...');

        for (let i = 0; i < siteList.length; i++) {
          if (!abortRef.current || abortRef.current.signal.aborted) { addLog('Stopped by user'); break; }
          const site = siteList[i]; const pct = Math.round(((i + 1) / siteList.length) * 100); setProgress(pct);
          addLog(`Visiting ${site}.com...`); await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
          addLog(`  Scrolling ${site}.com...`); await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
          addLog(`  Done (${pct}%)`);
        }

        try { await fetch(`${API_URL}/profiles/${selectedProfileId}/stop`, { method: 'POST', headers: { 'x-hardware-id': getHardwareId() } }); addLog('Browser closed'); } catch {}
        addLog(`Warm-up completed - ${siteList.length} sites visited`); setProgress(100);
      }
    } catch (e: any) { addLog(`ERROR: ${e.message}`); }
    setIsWarming(false);
  };

  const handleStopWarmup = () => { if (abortRef.current) abortRef.current.abort(); setIsWarming(false); setProgress(0); addLog('Stopping...'); };

  return (
    <div className="h-full bg-surface-base p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
          <Cookie size={18} className="text-brand-400" />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-white">Cookie Robot</h2>
          <p className="text-[11px] text-gray-500">Import cookies & auto-warm profiles</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Import Panel */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
              <FileText size={14} className="text-brand-400" /> Import Cookies
            </h3>
            <button onClick={() => fileRef.current?.click()}
              className="text-[11px] bg-surface-card border border-surface-border text-gray-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:text-white transition-colors">
              <FileText size={11} /> Load File
            </button>
            <button onClick={handleGenerate}
              className="text-[11px] bg-brand-500/10 border border-brand-500/20 text-brand-400 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-brand-500/20 transition-colors font-medium">
              <Shuffle size={11} /> Generate
            </button>
            <input ref={fileRef} type="file" accept=".json,.txt" onChange={handleFileImport} className="hidden" />
          </div>
          <p className="text-[10px] text-gray-500 mb-3">Supports JSON and Netscape cookie formats</p>
          <textarea value={cookies} onChange={e => setCookies(e.target.value)}
            placeholder={'[{"domain":".facebook.com","name":"c_user","value":"1000..."}]'}
            className="w-full h-32 bg-surface-card border border-surface-border rounded-lg p-3 text-[11px] text-white font-mono input-glow custom-scrollbar" />
          <div className="flex gap-2 mt-3">
            <button onClick={handleImport} disabled={isImporting}
              className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-[12px] font-semibold flex items-center gap-2 btn-premium shadow-glow-sm">
              <Upload size={13} /> {isImporting ? 'Importing...' : 'Import Cookies'}
            </button>
            <button onClick={handleCopy} className="bg-surface-card border border-surface-border text-gray-300 hover:text-white px-3 py-2.5 rounded-lg transition-colors"><Copy size={14} /></button>
            <button onClick={() => { setCookies(''); setImportedCount(null); }} className="bg-surface-card border border-surface-border text-gray-400 hover:text-accent-rose px-3 py-2.5 rounded-lg transition-colors"><Trash2 size={14} /></button>
          </div>
          {importedCount !== null && (
            <div className="mt-3 bg-accent-emerald/10 border border-accent-emerald/20 p-2.5 rounded-lg text-[11px] text-accent-emerald flex items-center gap-2">
              <Check size={12} /> Imported {importedCount} cookies successfully
            </div>
          )}
        </div>

        {/* Warm-up Bot Panel */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-white flex items-center gap-2 mb-2">
            <Zap size={14} className="text-accent-amber" /> Warm-up Bot
          </h3>
          <p className="text-[11px] text-gray-400 mb-4">Launch browser & visit sites to generate history and cookies.</p>

          <div className="mb-4">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Profile ID</label>
            <input value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)} placeholder="e.g. profile-seed-001"
              className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow" />
          </div>

          <div className="space-y-1.5 mb-4">
            {WARMUP_SITES.map(({ key, label, icon, desc }) => (
              <label key={key} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                sites[key] ? 'bg-brand-500/10 border-brand-500/20' : 'bg-surface-card border-surface-border hover:bg-surface-overlay'
              }`}>
                <input type="checkbox" checked={sites[key] || false} onChange={e => setSites({ ...sites, [key]: e.target.checked })} className="hidden" />
                <span className="text-lg">{icon}</span>
                <div className="flex-1">
                  <span className="text-[12px] font-medium text-white">{label}</span>
                  <span className="text-[10px] text-gray-500 ml-2">{desc}</span>
                </div>
                {sites[key] && <Check size={12} className="text-brand-400" />}
              </label>
            ))}
          </div>

          {isWarming && (
            <div className="mb-4">
              <div className="w-full bg-surface-card rounded-full h-2 border border-surface-border overflow-hidden">
                <div className="bg-gradient-to-r from-brand-600 to-accent-cyan h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 bg-surface-base border border-surface-border rounded-lg p-2.5 h-24 overflow-auto custom-scrollbar text-[10px] font-mono text-gray-400">
                {warmLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}

          {!isWarming ? (
            <button onClick={handleStartWarmup}
              className="bg-gradient-to-r from-accent-emerald/80 to-accent-emerald text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold w-full flex items-center justify-center gap-2 btn-premium shadow-glow-sm">
              <Play size={14} /> Start Warm-up
            </button>
          ) : (
            <button onClick={handleStopWarmup}
              className="bg-gradient-to-r from-accent-rose/80 to-accent-rose text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold w-full flex items-center justify-center gap-2">
              <Square size={14} /> Stop Warm-up ({progress}%)
            </button>
          )}

          <button onClick={handleExport}
            className="mt-2.5 bg-surface-card border border-surface-border hover:bg-surface-overlay text-gray-300 hover:text-white px-4 py-2 rounded-lg text-[12px] font-medium w-full flex items-center justify-center gap-2 transition-all">
            <Download size={13} /> Export All Cookies
          </button>
        </div>
      </div>
    </div>
  );
};
