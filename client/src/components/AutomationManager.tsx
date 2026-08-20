import React, { useState, useEffect } from 'react';
import { useProfileStore } from '../store/useProfileStore';
import { useProxyStore } from '../store/useProxyStore';
import { API_BASE_URL, getHardwareId } from '../config';
import RpaRobot from './RpaRobot';
import {
  Zap, Layers, Play, Square, Copy, Key, Code, Monitor, Check,
  RefreshCw, AlertCircle, CheckCircle
} from 'lucide-react';

const API_URL = API_BASE_URL;

export const AutomationManager: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { profiles, fetchProfiles } = useProfileStore() as any;
  const { fetchProxies } = useProxyStore() as any;
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncMasterId, setSyncMasterId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSlaves, setSyncSlaves] = useState<string[]>([]);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncOptions, setSyncOptions] = useState({
    clicks: true,
    typing: true,
    scroll: true,
    nav: false,
    formFill: false,
    dropdowns: false,
    mouseMove: false,
    rightClick: false,
    fileUpload: false,
    dragDrop: false,
    hotkeys: false,
    zoom: false,
  });
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    fetchProfiles();
    fetchProxies();
    const stored = localStorage.getItem('mls_api_key');
    if (stored) {
      setApiKey(stored);
    } else {
      const newKey = 'mls_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('mls_api_key', newKey);
      setApiKey(newKey);
    }
    fetch(`${API_URL}/profiles`, { headers: { 'x-hardware-id': getHardwareId() } })
      .then(r => { setApiStatus(r.ok ? 'online' : 'offline'); })
      .catch(() => setApiStatus('offline'));
  }, [fetchProfiles, fetchProxies]);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    const newKey = 'mls_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('mls_api_key', newKey);
    setApiKey(newKey);
  };

  const handleStartSync = async () => {
    if (!syncMasterId) { alert('Select a master profile'); return; }
    const allStopped = (profiles || []).filter((p: any) => p.status === 'Stopped' && p.id !== syncMasterId);
    if (allStopped.length === 0 && !(profiles || []).find((p: any) => p.id === syncMasterId && p.status === 'Stopped')) {
      alert('No stopped profiles available'); return;
    }

    setIsSyncing(true);
    setSyncSlaves(allStopped.map((p: any) => p.id));
    setSyncLog([]);

    const addLog = (msg: string, type: 'info' | 'ok' | 'err' = 'info') => {
      setSyncLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${type === 'err' ? '❌' : type === 'ok' ? '✅' : '▸'} ${msg}`]);
    };

    addLog(`Master: ${syncMasterId} | Slaves: ${allStopped.length}`);

    const electronAPI = (window as any).electronAPI;

    if (electronAPI?.startSync) {
      addLog('Starting all profiles locally...');
      const slaveIds = allStopped.map((p: any) => p.id);

      const startRes = await electronAPI.launchBrowser(syncMasterId);
      if (!startRes.success) { addLog(`Master failed: ${startRes.error}`, 'err'); setIsSyncing(false); return; }
      addLog('Master started', 'ok');

      let started = 0;
      for (const sid of slaveIds) {
        const res = await electronAPI.launchBrowser(sid);
        if (res.success) { started++; addLog(`  Slave started: ${sid}`, 'ok'); }
        else addLog(`  Slave failed: ${sid}`, 'err');
      }

      addLog(`Connecting CDP sync...`);
      const syncRes = await electronAPI.startSync(syncMasterId, slaveIds, syncOptions);
      if (syncRes.success) {
        addLog(`Sync active - ${syncRes.connected} windows`, 'ok');
        addLog(`Options: clicks=${syncOptions.clicks} typing=${syncOptions.typing} scroll=${syncOptions.scroll}`);
      } else {
        addLog(`Sync connect failed: ${syncRes.error}`, 'err');
      }
    } else {
      addLog('Starting master profile...');
      try {
        const res = await fetch(`${API_URL}/profiles/${syncMasterId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() },
        });
        const data = await res.json();
        if (res.ok) addLog(`Master browser launched`, 'ok');
        else addLog(`Master launch failed: ${data.message || 'Unknown error'}`, 'err');
      } catch (e: any) { addLog(`Master error: ${e.message}`, 'err'); }

      addLog(`Starting ${allStopped.length} slave profiles...`);
      let started = 0;
      for (const sp of allStopped) {
        try {
          const res = await fetch(`${API_URL}/profiles/${sp.id}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() },
          });
          if (res.ok) { started++; addLog(`  Slave started: ${sp.name}`, 'ok'); }
          else addLog(`  Slave failed: ${sp.name}`, 'err');
        } catch { addLog(`  Slave error: ${sp.name}`, 'err'); }
      }
      addLog(`Sync active — ${started + 1} windows running`);
    }
    fetchProfiles();
  };

  const handleStopSync = async () => {
    setIsSyncing(false);
    setSyncLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ▸ Stopping sync...`]);

    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.stopSync && syncMasterId) {
      await electronAPI.stopSync(syncMasterId);
    }

    for (const sid of syncSlaves) {
      try {
        if (electronAPI?.closeBrowser) await electronAPI.closeBrowser(sid);
        else await fetch(`${API_URL}/profiles/${sid}/stop`, { method: 'POST', headers: { 'x-hardware-id': getHardwareId() } });
      } catch {}
    }
    if (syncMasterId) {
      try {
        if (electronAPI?.closeBrowser) await electronAPI.closeBrowser(syncMasterId);
        else await fetch(`${API_URL}/profiles/${syncMasterId}/stop`, { method: 'POST', headers: { 'x-hardware-id': getHardwareId() } });
      } catch {}
    }

    fetchProfiles();
    setSyncLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Sync stopped — all profiles stopped`]);
  };

  // ========== API & Automation Tab ==========
  if (activeTab === 'automation') {
    return (
      <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-amber/20 to-accent-amber/5 border border-accent-amber/20 flex items-center justify-center">
              <Zap size={20} className="text-accent-amber" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white">API & Automation</h2>
              <p className="text-[12px] text-gray-500">Control profiles via REST API</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
              apiStatus === 'online' ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20' :
              apiStatus === 'offline' ? 'bg-accent-rose/10 text-accent-rose border-accent-rose/20' :
              'bg-surface-card text-gray-400 border-surface-border'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${apiStatus === 'online' ? 'bg-accent-emerald status-online' : apiStatus === 'offline' ? 'bg-accent-rose' : 'bg-gray-500 animate-pulse'}`} />
              {apiStatus === 'online' ? 'API Online' : apiStatus === 'offline' ? 'API Offline' : 'Checking...'}
            </span>
            <span className="text-[11px] text-gray-500 font-mono bg-surface-card border border-surface-border px-3 py-1.5 rounded-lg">{API_URL}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface-raised border border-surface-border p-5 rounded-xl card-hover">
            <div className="text-[11px] text-gray-500 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider"><Key size={12} /> API KEY</div>
            <div className="flex gap-2">
              <code className="flex-1 bg-surface-card border border-surface-border p-2.5 rounded-lg text-[12px] text-brand-300 font-mono truncate">{apiKey || 'Loading...'}</code>
              <button onClick={handleCopy} className="bg-surface-card border border-surface-border p-2.5 rounded-lg hover:bg-surface-overlay hover:border-surface-border-light transition-all">
                {copied ? <Check size={14} className="text-accent-emerald" /> : <Copy size={14} className="text-gray-400" />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={handleRegenerate} className="text-[11px] text-brand-400 font-medium hover:text-brand-300 transition-colors">Regenerate Key</button>
              {copied && <span className="text-[11px] text-accent-emerald">Copied!</span>}
            </div>
          </div>

          <div className="bg-surface-raised border border-surface-border p-5 rounded-xl card-hover">
            <div className="text-[11px] text-gray-500 mb-3 font-semibold uppercase tracking-wider">Quick Stats</div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-400">Total Profiles</span>
                <span className="text-white font-semibold">{profiles?.length || 0}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-400">Running</span>
                <span className="text-accent-emerald font-semibold">{profiles?.filter((p: any) => p.status === 'Running').length || 0}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-400">Stopped</span>
                <span className="text-gray-300 font-semibold">{profiles?.filter((p: any) => p.status === 'Stopped').length || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-raised border border-surface-border p-5 rounded-xl card-hover">
            <div className="text-[11px] text-gray-500 mb-2 font-semibold uppercase tracking-wider">Quick Start</div>
            <pre className="bg-surface-card border border-surface-border p-3 rounded-lg text-[11px] text-gray-300 overflow-auto font-mono"><code>{`curl -X POST \\
  ${API_URL}/profiles/:id/start \\
  -H "x-hardware-id: ..."`}</code></pre>
          </div>
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-surface-border text-white text-[13px] font-semibold flex items-center gap-2 bg-surface-card/50"><Code size={14} className="text-brand-400" /> API Endpoints</div>
          {[
            { m: 'GET', p: '/v1/profiles', d: 'List all profiles' },
            { m: 'POST', p: '/v1/profiles', d: 'Create profile' },
            { m: 'POST', p: '/v1/profiles/:id/start', d: 'Start profile browser' },
            { m: 'POST', p: '/v1/profiles/:id/stop', d: 'Stop profile browser' },
            { m: 'DELETE', p: '/v1/profiles/:id', d: 'Delete profile' },
            { m: 'GET', p: '/v1/proxies', d: 'List proxies' },
            { m: 'POST', p: '/v1/proxies', d: 'Add proxy' },
            { m: 'POST', p: '/v1/proxies/:id/check', d: 'Check proxy status' },
            { m: 'POST', p: '/v1/rpa/run', d: 'Execute RPA flow' },
          ].map((e, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-surface-border/30 hover:bg-surface-overlay/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold ${
                  e.m === 'GET' ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/20' :
                  e.m === 'DELETE' ? 'bg-accent-rose/15 text-accent-rose border border-accent-rose/20' :
                  'bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/20'
                }`}>{e.m}</span>
                <span className="font-mono text-[12px] text-gray-300">{e.p}</span>
              </div>
              <span className="text-[11px] text-gray-500">{e.d}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== Synchronizer Tab ==========
  if (activeTab === 'sync') {
    const runningProfiles = (profiles || []).filter((p: any) => p.status === 'Running');
    const stoppedProfiles = (profiles || []).filter((p: any) => p.status === 'Stopped');

    return (
      <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center">
            <Layers size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-white">Synchronizer</h2>
            <p className="text-[12px] text-gray-500">Control multiple browser windows simultaneously</p>
          </div>
          {isSyncing && <span className="ml-3 flex items-center gap-1.5 text-[11px] text-accent-emerald font-semibold bg-accent-emerald/10 border border-accent-emerald/20 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-accent-emerald status-online" /> LIVE SYNCING</span>}
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 bg-surface-raised border border-surface-border rounded-xl p-5 card-hover">
            <h3 className="text-[13px] text-white font-semibold mb-3">Master Profile</h3>
            <select value={syncMasterId} onChange={e => setSyncMasterId(e.target.value)}
              className="w-full bg-surface-card border border-surface-border text-white text-[12px] p-3 rounded-lg cursor-pointer input-glow">
              <option value="">Select master...</option>
              {stoppedProfiles.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              {runningProfiles.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Running)</option>)}
            </select>

            <div className="mt-5 space-y-2">
              <h4 className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Sync Options</h4>
              {[
                ['clicks', 'Sync Clicks', 'Mirror clicks across windows'],
                ['typing', 'Sync Typing', 'Type sync across windows'],
                ['scroll', 'Sync Scroll', 'Scroll position sync'],
                ['nav', 'Sync Navigation', 'URL navigation sync'],
                ['formFill', 'Sync Form Fill', 'Auto-fill forms together'],
                ['dropdowns', 'Sync Dropdowns', 'Select option sync'],
                ['mouseMove', 'Sync Mouse Move', 'Cursor position sync'],
                ['rightClick', 'Sync Right Click', 'Context menu sync'],
                ['fileUpload', 'Sync File Upload', 'File dialog sync'],
                ['dragDrop', 'Sync Drag & Drop', 'Drag and drop sync'],
                ['hotkeys', 'Sync Hotkeys', 'Keyboard shortcuts sync'],
                ['zoom', 'Sync Zoom', 'Page zoom level sync'],
              ].map(([key, label, desc]) => (
                <label key={key} className="flex items-start gap-2.5 bg-surface-card border border-surface-border p-3 rounded-lg cursor-pointer hover:bg-surface-overlay transition-colors">
                  <input
                    type="checkbox"
                    checked={(syncOptions as any)[key]}
                    onChange={e => setSyncOptions({ ...syncOptions, [key]: e.target.checked })}
                    className="mt-0.5 rounded border-surface-border bg-surface-card text-brand-500"
                  />
                  <div>
                    <div className="text-[12px] text-white font-medium">{label}</div>
                    <div className="text-[10px] text-gray-500">{desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              {!isSyncing ? (
                <button onClick={handleStartSync}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-3 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 shadow-glow-sm hover:shadow-glow-md transition-all btn-premium">
                  <Play size={14} fill="currentColor" /> Start Sync ({stoppedProfiles.length + 1} windows)
                </button>
              ) : (
                <button onClick={handleStopSync}
                  className="w-full bg-gradient-to-r from-accent-rose to-red-600 hover:from-red-500 hover:to-red-500 text-white py-3 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-all btn-premium">
                  <Square size={14} fill="currentColor" /> Stop Sync
                </button>
              )}
              <button onClick={() => fetchProfiles()}
                className="w-full bg-surface-card border border-surface-border text-gray-400 py-2.5 rounded-lg text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-surface-overlay transition-all">
                <RefreshCw size={12} /> Refresh Profiles
              </button>
            </div>
          </div>

          <div className="col-span-2">
            <div className="grid grid-cols-2 gap-3">
              {(syncMasterId ? [syncMasterId, ...syncSlaves] : stoppedProfiles.slice(0, 4).map((p: any) => p.id)).map((pid: string) => {
                const prof = (profiles || []).find((p: any) => p.id === pid);
                const isMaster = pid === syncMasterId;
                return (
                  <div key={pid} className={`bg-surface-raised border rounded-xl p-4 card-hover ${
                    isMaster ? 'border-brand-500/30' : isSyncing ? 'border-accent-emerald/20' : 'border-surface-border'
                  }`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isMaster ? 'bg-brand-400' : isSyncing ? 'bg-accent-emerald status-online' : 'bg-gray-500'}`} />
                        <span className="text-[12px] text-gray-300 font-medium">{prof?.name || pid}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isMaster ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' :
                        isSyncing ? 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/20' :
                        'bg-surface-card text-gray-500 border-surface-border'
                      }`}>
                        {isMaster ? 'MASTER' : isSyncing ? 'SLAVE' : 'IDLE'}
                      </span>
                    </div>
                    <div className="bg-surface-base h-20 rounded-lg border border-surface-border flex items-center justify-center">
                      <Monitor size={18} className={isSyncing ? 'text-accent-emerald/50' : 'text-gray-600'} />
                      <span className="ml-2 text-[11px] text-gray-500">
                        {prof?.browser || 'N/A'} {prof?.os || ''} {isSyncing && '• LIVE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {syncLog.length > 0 && (
              <div className="mt-4 bg-surface-raised border border-surface-border rounded-xl p-4">
                <h4 className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Sync Log</h4>
                <div className="h-36 overflow-auto text-[11px] font-mono space-y-0.5">
                  {syncLog.map((l, i) => (
                    <div key={i} className={
                      l.includes('❌') ? 'text-accent-rose' :
                      l.includes('✅') ? 'text-accent-emerald' :
                      'text-gray-400'
                    }>{l}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== RPA Tab ==========
  if (activeTab === 'rpa') {
    return <RpaRobot />;
  }

  return null;
};
