import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Plus, Shield, RefreshCw, Trash2, Database } from 'lucide-react';
import { API_URL } from '../config';

export const LicenseAdminPanel: React.FC = () => {
  const [count, setCount] = useState(1);
  const [plan, setPlan] = useState('Lifetime Agency');
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const API = `${API_URL}/license`;

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API}/list`);
      const data = await res.json();
      setAllLicenses(Array.isArray(data) ? data : data.licenses || []);
    } catch {
      setAllLicenses([]);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, plan })
      });
      const data = await res.json();
      if (data.keys) {
        setGeneratedKeys(data.keys);
        await fetchAll();
      } else {
        alert('Generate failed: ' + JSON.stringify(data));
      }
    } catch (err: any) {
      alert('Backend not running! Start server first.\n' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copy = (k: string) => {
    navigator.clipboard.writeText(k);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="h-full bg-surface-base p-6 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[17px] font-bold text-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-amber/20 to-accent-amber/5 border border-accent-amber/20 flex items-center justify-center">
            <Shield size={18} className="text-accent-amber" />
          </div>
          Admin - License Generator
        </h2>
        <button onClick={fetchAll}
          className="flex items-center gap-2 bg-surface-card border border-surface-border text-gray-300 px-3 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-overlay hover:text-white transition-all">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-6xl">
        {/* Generator card */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold text-[14px]">Generate New Keys</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Count</label>
              <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} min={1} max={100}
                className="w-full bg-surface-card border border-surface-border rounded-lg p-3 text-white text-[13px] focus:outline-none input-glow transition-all" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)}
                className="w-full bg-surface-card border border-surface-border rounded-lg p-3 text-white text-[13px] cursor-pointer">
                <option>Lifetime Agency</option>
                <option>Lifetime Pro</option>
                <option>Lifetime Base</option>
              </select>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating}
            className="w-full bg-gradient-to-r from-accent-amber to-amber-600 hover:from-amber-500 hover:to-amber-500 disabled:from-gray-700 disabled:to-gray-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-semibold text-[13px] shadow-glow-sm transition-all btn-premium">
            {isGenerating ? 'Generating...' : <><Plus size={16} /> Generate {count} Keys</>}
          </button>

          {generatedKeys.length > 0 && (
            <div className="bg-accent-emerald/5 border border-accent-emerald/20 rounded-lg p-3.5">
              <h4 className="text-accent-emerald text-[12px] font-semibold mb-2">Generated (Copy & Send to Buyer):</h4>
              <div className="space-y-2">
                {generatedKeys.map(k => (
                  <div key={k} className="flex items-center justify-between bg-surface-card border border-surface-border p-2.5 rounded-lg">
                    <span className="font-mono text-[11px] text-accent-emerald">{k}</span>
                    <button onClick={() => copy(k)}
                      className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
                      {copied === k ? <Check size={12} className="text-accent-emerald" /> : <Copy size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* License list card */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-brand-400" />
            <h3 className="text-white font-semibold text-[14px]">All Licenses ({allLicenses.length})</h3>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg max-h-[500px] overflow-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-gray-500 sticky top-0 bg-surface-card border-b border-surface-border">
                <tr>
                  <th className="p-3 font-semibold">Key</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">HWID</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {allLicenses.map((l: any, i: number) => (
                  <tr key={l.key || i} className="hover:bg-surface-overlay/40 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-white">{l.key}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        l.isUsed
                          ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20'
                          : 'bg-surface-overlay text-gray-400 border-surface-border'
                      }`}>
                        {l.isUsed ? 'USED' : 'UNUSED'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-gray-400 truncate max-w-[100px]">{l.hwid || '-'}</td>
                    <td className="p-3">
                      <button onClick={() => copy(l.key)} className="text-gray-400 hover:text-white transition-colors">
                        <Copy size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {allLicenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">
                      No licenses found. Generate first or check if server is running.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
