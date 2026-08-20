import React, { useState, useEffect } from 'react';
import { useProxyStore } from '../store/useProxyStore';
import {
  Globe, Plus, Activity, Trash2, Search, Edit, X, Save,
  Loader2, MapPin, RefreshCw, Download, Filter, CheckCircle
} from 'lucide-react';

const TIER1_COUNTRIES = [
  { code: 'US', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States' },
  { code: 'GB', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom' },
  { code: 'DE', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany' },
  { code: 'FR', flag: '\u{1F1EB}\u{1F1F7}', name: 'France' },
  { code: 'CA', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada' },
  { code: 'JP', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan' },
  { code: 'AU', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia' },
  { code: 'NL', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands' },
  { code: 'SG', flag: '\u{1F1F8}\u{1F1EC}', name: 'Singapore' },
  { code: 'KR', flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea' },
];

export const ProxyManager: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    proxies, isLoading, fetchProxies, addProxy, updateProxy,
    deleteProxy, checkProxy, checkAllProxies, scrapeFreeProxies,
  } = useProxyStore();

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ type: 'socks5', host: '', port: '', country: 'US', username: '', password: '' });
  const [checking, setChecking] = useState<string[]>([]);
  const [checkerInput, setCheckerInput] = useState('');
  const [checkerResults, setCheckerResults] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lookupIp, setLookupIp] = useState('');
  const [lookupRes, setLookupRes] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [groups, setGroups] = useState([
    { id: '1', name: 'USA Residential', flag: '\u{1F1FA}\u{1F1F8}', count: 0 },
    { id: '2', name: 'EU Datacenter', flag: '\u{1F1E9}\u{1F1EA}', count: 0 },
  ]);
  const [showGroup, setShowGroup] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [scraping, setScraping] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US', 'GB', 'DE', 'FR', 'CA', 'JP', 'AU']);
  const [scrapeResult, setScrapeResult] = useState<{ added: number; sources: string[] } | null>(null);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  const liveCount = proxies.filter(p => p.status === 'active').length;
  const getFlag = (country: string) => TIER1_COUNTRIES.find(c => c.code === country)?.flag || '\u{1F310}';

  const handleAdd = async () => {
    if (!form.host || !form.port) { alert('Host & Port required'); return; }
    await addProxy({
      host: form.host,
      port: parseInt(form.port),
      type: form.type,
      username: form.username || undefined,
      password: form.password || undefined,
    });
    setShowAdd(false);
    setForm({ type: 'socks5', host: '', port: '', country: 'US', username: '', password: '' });
  };

  const handleEditSave = async () => {
    if (!editing) return;
    await updateProxy(editing.id, {
      host: form.host,
      port: parseInt(form.port),
      type: form.type,
      username: form.username || undefined,
      password: form.password || undefined,
    });
    setEditing(null);
    setForm({ type: 'socks5', host: '', port: '', country: 'US', username: '', password: '' });
  };

  const handleCheck = async (id: string) => {
    setChecking(prev => [...prev, id]);
    await checkProxy(id);
    setChecking(prev => prev.filter(x => x !== id));
  };

  const handleCheckAll = async () => {
    const ids = proxies.map(p => p.id);
    setChecking(ids);
    await checkAllProxies();
    setChecking([]);
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    await scrapeFreeProxies(selectedCountries.length > 0 ? selectedCountries : undefined);
    setScraping(false);
    fetchProxies();
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleBulkCheck = async () => {
    const lines = checkerInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { alert('Paste proxies'); return; }
    setIsChecking(true);
    setCheckerResults([]);
    const results: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let host = '', port = '', type = 'socks5';
      try {
        if (line.includes('://')) {
          const u = new URL(line);
          type = u.protocol.replace(':', '');
          host = u.hostname;
          port = u.port;
        } else {
          const parts = line.split(':');
          host = parts[0];
          port = parts[1];
        }
      } catch {}

      const valid = host && port;
      if (valid) {
        await addProxy({ host, port: parseInt(port), type });
      }
      results.push({ line, host, port, type, status: valid ? 'added' : 'invalid' });
      setCheckerResults([...results]);
    }
    setIsChecking(false);
    fetchProxies();
  };

  const handleLookup = async () => {
    if (!lookupIp.trim()) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`https://ipapi.co/${lookupIp.trim()}/json/`);
      const data = await res.json();
      setLookupRes(data);
    } catch {
      setLookupRes({ ip: lookupIp, country_name: 'Unknown', country: '??', city: 'Unknown', org: 'Unknown' });
    }
    setLookupLoading(false);
  };

  // ========== My Proxies ==========
  if (activeTab === 'proxies' || activeTab === 'my-proxies') {
    return (
      <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-raised/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-cyan/10 border border-brand-500/20 flex items-center justify-center">
              <Globe size={18} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-white">My Proxies <span className="text-gray-500 font-normal">({proxies.length})</span></h2>
              <p className="text-[11px] text-gray-500">
                <span className="text-accent-emerald">{liveCount} Active</span> · ProxyScrape + GeoNode sources
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCheckAll} disabled={checking.length > 0}
              className="flex items-center gap-1.5 bg-surface-card border border-surface-border text-gray-300 px-3 py-2.5 rounded-lg text-[12px] font-medium hover:bg-surface-overlay hover:text-white transition-all">
              <Activity size={13} /> Check All
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-3 py-2.5 rounded-lg text-[12px] font-semibold shadow-glow-sm transition-all btn-premium">
              <Plus size={13} /> Add Proxy
            </button>
          </div>
        </div>

        {/* Country Filter + Scrape Section */}
        <div className="px-6 py-4 border-b border-surface-border bg-surface-raised/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-brand-400" />
              <span className="text-[12px] font-semibold text-gray-300">Target Countries</span>
              <span className="text-[10px] text-gray-500">({selectedCountries.length} selected)</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {TIER1_COUNTRIES.map(c => (
              <button key={c.code} onClick={() => toggleCountry(c.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                  selectedCountries.includes(c.code)
                    ? 'bg-brand-500/15 text-brand-300 border-brand-500/30 shadow-glow-sm'
                    : 'bg-surface-card text-gray-500 border-surface-border hover:text-gray-300 hover:border-surface-border-light'
                }`}>
                <span>{c.flag}</span>
                <span>{c.code}</span>
                {selectedCountries.includes(c.code) && <CheckCircle size={10} className="text-brand-400" />}
              </button>
            ))}
          </div>
          <button onClick={handleScrape} disabled={scraping || selectedCountries.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-accent-indigo to-accent-blue hover:from-brand-500 hover:to-accent-blue disabled:from-gray-700 disabled:to-gray-700 text-white px-4 py-2.5 rounded-lg text-[12px] font-semibold shadow-glow-sm transition-all btn-premium">
            {scraping ? (
              <><Loader2 size={13} className="animate-spin" /> Scraping & validating live proxies...</>
            ) : (
              <><Download size={13} /> Scrape Live Proxies from {selectedCountries.length} Countries</>
            )}
          </button>
        </div>

        {/* Add/Edit form */}
        {(showAdd || editing) && (
          <div className="mx-6 mt-4 bg-surface-raised border border-accent-emerald/20 rounded-xl p-4">
            <div className="flex justify-between mb-3">
              <h3 className="text-white text-[13px] font-semibold">{editing ? 'Edit Proxy' : 'Add Proxy'}</h3>
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="text-gray-500 hover:text-white"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-6 gap-3">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="bg-surface-card text-white text-[12px] p-2.5 rounded-lg border border-surface-border cursor-pointer">
                <option value="socks5">SOCKS5</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks4">SOCKS4</option>
              </select>
              <input placeholder="Host" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })}
                className="bg-surface-card text-white text-[12px] p-2.5 rounded-lg border border-surface-border input-glow" />
              <input placeholder="Port" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })}
                className="bg-surface-card text-white text-[12px] p-2.5 rounded-lg border border-surface-border input-glow" />
              <input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                className="bg-surface-card text-white text-[12px] p-2.5 rounded-lg border border-surface-border input-glow" />
              <input placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="bg-surface-card text-white text-[12px] p-2.5 rounded-lg border border-surface-border input-glow" />
              <button onClick={editing ? handleEditSave : handleAdd}
                className="bg-gradient-to-r from-accent-emerald to-emerald-600 text-white rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 btn-premium">
                <Save size={13} /> {editing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8 text-gray-400">
            <Loader2 size={20} className="animate-spin inline mr-2" /> Loading proxies...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && proxies.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-12">
            <div className="w-20 h-20 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-4">
              <Globe size={32} className="text-gray-600" />
            </div>
            <p className="text-[15px] font-medium text-gray-400">No proxies yet</p>
            <p className="text-[12px] text-gray-500 mt-1">Select countries above and click Scrape to fetch live proxies</p>
          </div>
        )}

        {/* Proxies table */}
        {proxies.length > 0 && (
          <div className="flex-grow overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-raised text-gray-400 text-[11px] font-semibold uppercase tracking-wider border-b border-surface-border">
                  <th className="px-5 py-3">Proxy</th>
                  <th className="px-5 py-3">Host:Port</th>
                  <th className="px-5 py-3">Country</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Latency</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {proxies.map((p: any) => (
                  <tr key={p.id} className="table-row-premium">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFlag(p.country)}</span>
                        <div>
                          <span className="text-white text-[12px] font-medium block">{p.host}</span>
                          <span className="text-[10px] text-gray-500">{(p.type || 'http').toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-gray-300">{p.host}:{p.port}</td>
                    <td className="px-5 py-3.5 text-[12px]">{getFlag(p.country)} {p.country || '??'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.status === 'active' ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20'
                        : p.status === 'dead' ? 'bg-accent-rose/10 text-accent-rose border-accent-rose/20'
                        : 'bg-surface-overlay text-gray-400 border-surface-border'
                      }`}>
                        <span className={`w-1.5 h-1.5 mr-1 rounded-full ${p.status === 'active' ? 'bg-accent-emerald status-online' : p.status === 'dead' ? 'bg-accent-rose' : 'bg-gray-500'}`} />
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px]">{p.latency ? `${p.latency}ms` : '-'}</td>
                    <td className="px-5 py-3.5 text-[11px] font-mono text-gray-500">{p.ip || '-'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button onClick={() => handleCheck(p.id)}
                          className="flex items-center gap-1 bg-surface-card border border-surface-border px-2.5 py-1.5 rounded-lg text-[11px] text-gray-300 hover:text-white hover:bg-surface-overlay transition-all">
                          {checking.includes(p.id) ? <Loader2 size={10} className="animate-spin" /> : <Activity size={10} />}
                          Check
                        </button>
                        <button onClick={() => { setEditing(p); setForm({ type: p.type || 'socks5', host: p.host, port: p.port.toString(), country: p.country || 'US', username: p.username || '', password: p.password || '' }); }}
                          className="p-2 bg-surface-card border border-surface-border rounded-lg text-gray-400 hover:text-white hover:bg-surface-overlay transition-all">
                          <Edit size={12} />
                        </button>
                        <button onClick={() => deleteProxy(p.id)}
                          className="p-2 bg-surface-card border border-surface-border rounded-lg text-gray-400 hover:text-accent-rose hover:bg-accent-rose/10 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ========== Proxy Checker ==========
  if (activeTab === 'proxies-checker') {
    return (
      <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-cyan/5 border border-accent-cyan/20 flex items-center justify-center">
            <Activity size={18} className="text-accent-cyan" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-white">Proxy Checker & Import</h2>
            <p className="text-[11px] text-gray-500">Paste proxies below to import and validate</p>
          </div>
        </div>
        <textarea value={checkerInput} onChange={e => setCheckerInput(e.target.value)}
          placeholder={'104.21.45.12:1080\nsocks5://user:pass@1.1.1.1:1080\nhttp://203.0.113.50:3128'}
          className="w-full h-32 bg-surface-raised border border-surface-border rounded-xl p-4 text-white text-[12px] font-mono input-glow" />
        <div className="flex gap-2 mt-3">
          <button onClick={handleBulkCheck} disabled={isChecking}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-5 py-2.5 rounded-lg text-[12px] font-semibold shadow-glow-sm transition-all btn-premium">
            {isChecking ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
            {isChecking ? 'Importing...' : 'Import & Check'}
          </button>
          <button onClick={() => { setCheckerInput(''); setCheckerResults([]); }}
            className="bg-surface-card border border-surface-border text-gray-300 px-4 py-2.5 rounded-lg text-[12px] font-medium hover:bg-surface-overlay transition-all">
            Clear
          </button>
        </div>
        {checkerResults.length > 0 && (
          <div className="mt-4 bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="text-gray-500 border-b border-surface-border bg-surface-card">
                <tr><th className="p-3 text-left font-semibold">Input</th><th className="p-3 text-left font-semibold">Host:Port</th><th className="p-3 text-left font-semibold">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {checkerResults.map((r, i) => (
                  <tr key={i} className="text-gray-300 hover:bg-surface-overlay/40">
                    <td className="p-3 font-mono truncate max-w-[200px]">{r.line}</td>
                    <td className="p-3 font-mono">{r.host}:{r.port}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        r.status === 'added' ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20'
                        : 'bg-accent-rose/10 text-accent-rose border-accent-rose/20'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ========== Proxy Groups ==========
  if (activeTab === 'proxies-groups') {
    return (
      <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-amber/20 to-accent-amber/5 border border-accent-amber/20 flex items-center justify-center">
              <Globe size={18} className="text-accent-amber" />
            </div>
            <h2 className="text-[15px] font-bold text-white">Proxy Groups</h2>
          </div>
          <button onClick={() => setShowGroup(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-3 py-2.5 rounded-lg text-[12px] font-semibold shadow-glow-sm transition-all btn-premium">
            <Plus size={13} /> New Group
          </button>
        </div>
        {showGroup && (
          <div className="bg-surface-raised border border-surface-border p-4 rounded-xl mb-4 flex gap-2">
            <input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="Group name"
              className="flex-1 bg-surface-card border border-surface-border text-white p-2.5 rounded-lg text-[12px] input-glow" />
            <button onClick={() => { if (newGroup.trim()) { setGroups([...groups, { id: Date.now().toString(), name: newGroup, flag: '\u{1F310}', count: 0 }]); setNewGroup(''); setShowGroup(false); } }}
              className="bg-gradient-to-r from-accent-emerald to-emerald-600 text-white px-4 py-2.5 rounded-lg text-[12px] font-semibold btn-premium">
              Create
            </button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {groups.map(g => (
            <div key={g.id} className="bg-surface-raised border border-surface-border p-4 rounded-xl card-hover">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-white text-[13px] font-medium">{g.flag} {g.name}</span>
                  <div className="text-[11px] text-gray-500 mt-1">{g.count} proxies</div>
                </div>
                <button onClick={() => setGroups(groups.filter(x => x.id !== g.id))}
                  className="text-gray-500 hover:text-accent-rose transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== IP Lookup ==========
  if (activeTab === 'proxies-lookup') {
    return (
      <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-emerald/20 to-accent-emerald/5 border border-accent-emerald/20 flex items-center justify-center">
            <MapPin size={18} className="text-accent-emerald" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-white">IP Lookup</h2>
            <p className="text-[11px] text-gray-500">Check any IP address location and details</p>
          </div>
        </div>
        <div className="flex gap-2 max-w-md">
          <input value={lookupIp} onChange={e => setLookupIp(e.target.value)} placeholder="8.8.8.8"
            className="flex-1 bg-surface-raised border border-surface-border rounded-lg p-3 text-white text-[12px] input-glow" />
          <button onClick={handleLookup}
            className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-4 py-3 rounded-lg shadow-glow-sm transition-all btn-premium">
            {lookupLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          </button>
        </div>
        {lookupRes && (
          <div className="mt-4 bg-surface-raised border border-surface-border p-5 rounded-xl max-w-md">
            <div className="font-mono text-[14px] text-white">{lookupRes.ip}</div>
            <div className="text-[13px] text-gray-400 mt-2">{lookupRes.city}, {lookupRes.country_name || lookupRes.country}</div>
            {lookupRes.org && <div className="text-[11px] text-gray-500 mt-2">{lookupRes.org}</div>}
            {lookupRes.timezone && <div className="text-[11px] text-gray-500">Timezone: {lookupRes.timezone}</div>}
          </div>
        )}
      </div>
    );
  }

  return <div className="h-full bg-surface-base flex items-center justify-center text-gray-500">Select a proxy tab</div>;
};
