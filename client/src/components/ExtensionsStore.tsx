import React, { useState, useEffect, useRef } from 'react';
import { Puzzle, Plus, Trash2, Power, Check, Loader2, Upload, Search, X, Package, Shield, Zap, Download } from 'lucide-react';
import { useProfileStore } from '../store/useProfileStore';
import { API_BASE_URL, getHardwareId } from '../config';

const API_URL = API_BASE_URL;

interface Extension {
  id: string;
  name: string;
  extId: string;
  description: string;
  icon: string;
  version: string;
  size: string;
  isCustom: boolean;
  filePath?: string | null;
  enabled?: boolean;
  profileExtensionId?: string;
}

const BUILTIN_EXTENSIONS: { name: string; extId: string; desc: string; icon: string; version: string; size: string; category: string }[] = [
  { name: 'MetaMask', extId: 'metamask', desc: 'Crypto Wallet for Ethereum', icon: '🦊', version: '11.7.2', size: '4.2 MB', category: 'Web3' },
  { name: 'AdBlock Plus', extId: 'adblock', desc: 'Block ads & trackers', icon: '🛡️', version: '3.22', size: '1.8 MB', category: 'Privacy' },
  { name: 'Grammarly', extId: 'grammarly', desc: 'Writing assistant', icon: '✍️', version: '14.1091', size: '2.5 MB', category: 'Productivity' },
  { name: 'Proxy SwitchyOmega', extId: 'switchy', desc: 'Proxy manager', icon: '🔀', version: '2.5.21', size: '0.9 MB', category: 'Network' },
];

export const ExtensionsStore = () => {
  const { profiles, fetchProfiles } = useProfileStore() as any;
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [profileExtensions, setProfileExtensions] = useState<Extension[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [search, setSearch] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchExtensions(); fetchProfiles(); }, [fetchProfiles]);
  useEffect(() => { if (selectedProfileId) fetchProfileExtensions(selectedProfileId); }, [selectedProfileId]);

  const fetchExtensions = async () => {
    try {
      const res = await fetch(`${API_URL}/extensions`, { headers: { 'x-hardware-id': getHardwareId() } });
      if (res.ok) { const data = await res.json(); setExtensions(data); setLoading(false); return; }
    } catch {}
    setExtensions(BUILTIN_EXTENSIONS.map(e => ({ id: e.extId, name: e.name, extId: e.extId, description: e.desc, icon: e.icon, version: e.version, size: e.size, isCustom: false })));
    setLoading(false);
  };

  const fetchProfileExtensions = async (pid: string) => {
    try { const res = await fetch(`${API_URL}/extensions/profile/${pid}`, { headers: { 'x-hardware-id': getHardwareId() } }); if (res.ok) { setProfileExtensions(await res.json()); return; } } catch {}
    setProfileExtensions([]);
  };

  const handleInstallBuiltin = async (ext: typeof BUILTIN_EXTENSIONS[0]) => {
    setInstalling(ext.extId);
    try {
      const res = await fetch(`${API_URL}/extensions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() }, body: JSON.stringify({ name: ext.name, extId: ext.extId, description: ext.desc, icon: ext.icon, version: ext.version, size: ext.size }) });
      if (res.ok) await fetchExtensions();
    } catch {}
    setInstalling(null);
  };

  const handleAssign = async (extensionId: string) => {
    if (!selectedProfileId) { alert('Select a profile first'); return; }
    try { await fetch(`${API_URL}/extensions/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() }, body: JSON.stringify({ profileId: selectedProfileId, extensionId }) }); await fetchProfileExtensions(selectedProfileId); } catch {}
  };

  const handleUnassign = async (extensionId: string) => {
    if (!selectedProfileId) return;
    try { await fetch(`${API_URL}/extensions/assign`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() }, body: JSON.stringify({ profileId: selectedProfileId, extensionId }) }); await fetchProfileExtensions(selectedProfileId); } catch {}
  };

  const handleToggle = async (extensionId: string, enabled: boolean) => {
    if (!selectedProfileId) return;
    try { await fetch(`${API_URL}/extensions/toggle`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() }, body: JSON.stringify({ profileId: selectedProfileId, extensionId, enabled }) }); await fetchProfileExtensions(selectedProfileId); } catch {}
  };

  const handleDelete = async (extId: string) => {
    if (!confirm('Delete this extension?')) return;
    try { await fetch(`${API_URL}/extensions/${extId}`, { method: 'DELETE', headers: { 'x-hardware-id': getHardwareId() } }); await fetchExtensions(); } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setInstalling('upload');
    try {
      const res = await fetch(`${API_URL}/extensions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() }, body: JSON.stringify({ name: file.name.replace('.crx', '').replace('.zip', ''), extId: 'custom_' + Date.now(), description: 'Custom uploaded extension', icon: '📦', version: '1.0.0', size: (file.size / 1024 / 1024).toFixed(2) + ' MB', isCustom: true }) });
      if (res.ok) await fetchExtensions();
    } catch {}
    setInstalling(null);
  };

  const isAssigned = (extId: string) => profileExtensions.some((pe) => pe.extId === extId);
  const isExtensionEnabled = (extId: string) => profileExtensions.find((p) => p.extId === extId)?.enabled ?? false;
  const filtered = extensions.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.extId.includes(search.toLowerCase()));

  return (
    <div className="h-full bg-surface-base p-6 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
            <Puzzle size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-white">Extensions Store</h2>
            <p className="text-[11px] text-gray-500">{extensions.length} extensions available</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search extensions..."
              className="bg-surface-raised border border-surface-border rounded-lg pl-9 pr-3 py-2 text-[12px] text-white w-48 input-glow" />
          </div>
          <input ref={fileRef} type="file" accept=".crx,.zip" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="bg-surface-raised border border-surface-border text-gray-300 hover:text-white px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-2 transition-all hover:bg-surface-overlay">
            <Upload size={13} /> Upload .crx
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {/* Extensions Grid */}
        <div className="col-span-3">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-semibold mb-3">All Extensions</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 py-12 justify-center"><Loader2 size={16} className="animate-spin" /> Loading...</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((ext) => {
                const assigned = isAssigned(ext.extId);
                const extEnabled = isExtensionEnabled(ext.extId);
                const isInstalling = installing === ext.extId;
                return (
                  <div key={ext.id}
                    className={`bg-surface-raised border rounded-xl p-4 card-hover transition-all ${assigned ? 'border-accent-emerald/30' : 'border-surface-border'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{ext.icon}</span>
                      <div className="flex items-center gap-1">
                        {assigned && (
                          <>
                            <button onClick={() => handleToggle(ext.extId, !extEnabled)}
                              className={`p-1.5 rounded-lg transition-colors ${extEnabled ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'bg-surface-card border border-surface-border text-gray-500'}`}
                              title={extEnabled ? 'Disable' : 'Enable'}>
                              <Power size={12} />
                            </button>
                            <button onClick={() => handleUnassign(ext.extId)} className="p-1.5 rounded-lg text-gray-500 hover:text-accent-rose hover:bg-accent-rose/10 border border-transparent hover:border-accent-rose/20 transition-all" title="Uninstall">
                              <X size={12} />
                            </button>
                          </>
                        )}
                        {ext.isCustom && (
                          <button onClick={() => handleDelete(ext.extId)} className="p-1.5 rounded-lg text-gray-500 hover:text-accent-rose hover:bg-accent-rose/10 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                        <button onClick={() => assigned ? handleUnassign(ext.extId) : handleAssign(ext.id)} disabled={isInstalling}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 transition-all ${
                            isInstalling ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20' :
                            assigned ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' :
                            'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow-sm'
                          }`}>
                          {isInstalling ? <Loader2 size={10} className="animate-spin" /> : assigned ? <Check size={10} /> : <Plus size={10} />}
                          {isInstalling ? 'Adding' : assigned ? 'Installed' : 'Add'}
                        </button>
                      </div>
                    </div>
                    <div className="text-[13px] font-semibold text-white">{ext.name}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{ext.description}</div>
                    <div className="flex gap-1.5 mt-2">
                      <span className="text-[9px] bg-surface-card border border-surface-border px-2 py-0.5 rounded-full text-gray-400">v{ext.version}</span>
                      <span className="text-[9px] bg-surface-card border border-surface-border px-2 py-0.5 rounded-full text-gray-400">{ext.size}</span>
                      {ext.isCustom && <span className="text-[9px] bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full text-brand-400 font-medium">CUSTOM</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile Assignment Sidebar */}
        <div className="col-span-1">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-semibold mb-3">Assign to Profile</h3>
          <select value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full bg-surface-raised border border-surface-border text-white text-[12px] p-2.5 rounded-lg mb-4 input-glow">
            <option value="">Select profile...</option>
            {(profiles || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {selectedProfileId && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2">Installed ({profileExtensions.length})</h4>
              {profileExtensions.length === 0 && (
                <p className="text-[11px] text-gray-500 py-6 text-center bg-surface-raised border border-surface-border rounded-lg">No extensions installed</p>
              )}
              {profileExtensions.map((pe) => (
                <div key={pe.id} className="flex items-center justify-between bg-surface-raised border border-surface-border p-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{pe.icon}</span>
                    <span className="text-[11px] text-white font-medium">{pe.name}</span>
                  </div>
                  <button onClick={() => handleToggle(pe.extId, !pe.enabled)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${pe.enabled ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'bg-surface-card border border-surface-border text-gray-500'}`}>
                    {pe.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 bg-brand-500/5 border border-brand-500/10 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap size={12} className="text-brand-400" />
              <span className="text-[11px] text-brand-300 font-semibold">Auto-load</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">Extensions load automatically when a profile browser starts. Install to a profile, then start it.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
