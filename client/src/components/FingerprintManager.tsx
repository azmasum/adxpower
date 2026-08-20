import React, { useState, useCallback } from 'react';
import { Fingerprint, Shuffle, Plus, Trash2, Copy, Check, Download, RefreshCw, Monitor, Globe, Shield, Eye, Layers } from 'lucide-react';

interface BrowserFingerprint {
  id: string;
  name: string;
  os: string;
  browser: string;
  platform: string;
  canvas: string;
  webgl: string;
  webglVendor: string;
  audio: string;
  timezone: string;
  language: string;
  resolution: string;
  hardwareConcurrency: string;
  deviceMemory: string;
  userAgent: string;
}

const OS_OPTIONS = ['Windows 10', 'Windows 11', 'Windows Server 2022', 'macOS Sonoma', 'macOS Ventura', 'macOS Monterey', 'Ubuntu 22.04', 'Ubuntu 24.04', 'Debian 12', 'Fedora 39', 'Linux Mint 21', 'Arch Linux', 'ChromeOS', 'Android 14', 'iOS 17'];
const BROWSER_OPTIONS = ['Chrome 122.0.6261', 'Chrome 121.0.6167', 'Chrome 120.0.6099', 'Chrome 119.0.0', 'Chrome 118.0.5993', 'Chrome 117.0.5938', 'Chrome 116.0.5845', 'Firefox 123.0', 'Firefox 122.0', 'Firefox 121.0', 'Firefox 120.0', 'Firefox 119.0', 'Safari 17.3', 'Safari 17.2', 'Safari 17.1', 'Safari 16.6', 'Edge 122.0.6261', 'Edge 121.0.6167', 'Edge 120.0.6099', 'Brave 1.63.165', 'Brave 1.62.160', 'Opera 108.0.5067', 'Opera 107.0.5041', 'Vivaldi 6.6.3271.57', 'Waterfox G6.0.5'];
const CANVAS_MODES = ['Noise', 'Off', 'Block', 'Real'];
const WEBGL_MODES = ['Noise', 'Off', 'Block', 'Real'];
const AUDIO_MODES = ['Noise', 'Off', 'Real'];
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Dhaka', 'Australia/Sydney', 'Pacific/Auckland'];
const LANGUAGES = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'zh-CN', 'pt-BR', 'es-ES', 'it-IT', 'ko-KR'];
const RESOLUTIONS = ['1920x1080', '2560x1440', '1366x768', '1536x864', '1440x900', '1280x720', '3840x2160'];
const HW_CONCURRENCY = ['2', '4', '6', '8', '12', '16'];
const DEVICE_MEMORY = ['2', '4', '8', '16', '32'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getOsCategory = (os: string): string => {
  if (os.toLowerCase().includes('windows')) return 'windows';
  if (os.toLowerCase().includes('macos') || os.toLowerCase().includes('mac os')) return 'macos';
  if (os.toLowerCase().includes('android')) return 'android';
  if (os.toLowerCase().includes('ios')) return 'ios';
  if (os.toLowerCase().includes('chromeos')) return 'chromeos';
  return 'linux';
};

const generateFingerprint = (os?: string, browser?: string): BrowserFingerprint => {
  const selectedOs = os || pick(OS_OPTIONS);
  const selectedBrowser = browser || pick(BROWSER_OPTIONS);
  const cat = getOsCategory(selectedOs);
  const platform = cat === 'windows' ? 'Win32' : cat === 'macos' ? 'MacIntel' : cat === 'android' ? 'Linux armv8l' : cat === 'ios' ? 'iPhone' : cat === 'chromeos' ? 'Linux x86_64' : 'Linux x86_64';

  const uaMap: Record<string, string> = {
    windows: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ${selectedBrowser} Safari/537.36`,
    macos: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${selectedBrowser} Safari/537.36`,
    linux: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ${selectedBrowser} Safari/537.36`,
    android: `Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) ${selectedBrowser} Mobile Safari/537.36`,
    ios: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1`,
    chromeos: `Mozilla/5.0 (X11; CrOS x86_64 15474.64.0) AppleWebKit/537.36 (KHTML, like Gecko) ${selectedBrowser} Safari/537.36`,
  };

  return {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
    name: `${selectedOs} - ${selectedBrowser.split(' ')[0]} ${selectedBrowser.split(' ')[1] || ''}`.trim(),
    os: selectedOs,
    browser: selectedBrowser,
    platform,
    canvas: pick(CANVAS_MODES),
    webgl: pick(WEBGL_MODES),
    webglVendor: pick(['Google Inc. (NVIDIA)', 'Google Inc. (AMD)', 'Google Inc. (Intel)', 'Apple Inc.', 'Mesa']),
    audio: pick(AUDIO_MODES),
    timezone: pick(TIMEZONES),
    language: pick(LANGUAGES),
    resolution: pick(RESOLUTIONS),
    hardwareConcurrency: pick(HW_CONCURRENCY),
    deviceMemory: pick(DEVICE_MEMORY),
    userAgent: uaMap[cat] || uaMap.linux,
  };
};

const STORAGE_KEY = 'fingerprint_profiles';
const loadSaved = (): BrowserFingerprint[] => {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
};
const saveToStorage = (fps: BrowserFingerprint[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fps)); } catch {}
};

export const FingerprintManager = () => {
  const [fingerprints, setFingerprints] = useState<BrowserFingerprint[]>(loadSaved);
  const [genOs, setGenOs] = useState('Windows 11');
  const [genBrowser, setGenBrowser] = useState('Chrome 122.0.6261');
  const [genCanvas, setGenCanvas] = useState('Noise');
  const [genWebgl, setGenWebgl] = useState('Noise');
  const [genAudio, setGenAudio] = useState('Noise');
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applyProfileId, setApplyProfileId] = useState('');
  const [applyStatus, setApplyStatus] = useState('');

  const persist = useCallback((newFps: BrowserFingerprint[]) => {
    setFingerprints(newFps);
    saveToStorage(newFps);
  }, []);

  const handleGenerate = () => {
    const fp = generateFingerprint(genOs, genBrowser);
    fp.canvas = genCanvas;
    fp.webgl = genWebgl;
    fp.audio = genAudio;
    persist([fp, ...fingerprints]);
  };

  const handleRandomizeAll = () => {
    const newFps: BrowserFingerprint[] = [];
    for (let i = 0; i < 5; i++) newFps.push(generateFingerprint());
    persist([...newFps, ...fingerprints]);
  };

  const handleDelete = (id: string) => {
    persist(fingerprints.filter(f => f.id !== id));
    if (selected === id) setSelected(null);
  };

  const handleClear = () => { persist([]); setSelected(null); };

  const handleCopyFingerprint = () => {
    const fp = fingerprints.find(f => f.id === selected);
    if (fp) { navigator.clipboard.writeText(JSON.stringify(fp, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleApplyToFingerprint = async () => {
    if (!selected || !applyProfileId) { alert('Select a fingerprint and profile'); return; }
    const fp = fingerprints.find(f => f.id === selected);
    if (!fp) return;
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.applyFingerprint) { alert('Fingerprint apply requires Electron app'); return; }
    setApplyStatus('Applying...');
    const result = await electronAPI.applyFingerprint(applyProfileId, fp);
    if (result.success) setApplyStatus('Applied!');
    else setApplyStatus(`Error: ${result.error}`);
    setTimeout(() => setApplyStatus(''), 3000);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(fingerprints, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fingerprints_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const selectedFp = fingerprints.find(f => f.id === selected);

  const OsIcon = ({ os }: { os: string }) => {
    const cat = getOsCategory(os);
    const colors: Record<string, string> = { windows: 'text-accent-blue', macos: 'text-accent-emerald', linux: 'text-accent-amber', android: 'text-accent-cyan', ios: 'text-brand-400', chromeos: 'text-accent-rose' };
    return <Monitor size={14} className={colors[cat] || 'text-gray-400'} />;
  };

  return (
    <div className="h-full bg-surface-base p-6 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
            <Fingerprint size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-white">Fingerprint Manager</h2>
            <p className="text-[11px] text-gray-500">{fingerprints.length} fingerprints saved</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRandomizeAll}
            className="bg-surface-raised border border-surface-border text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-all hover:bg-surface-overlay">
            <Shuffle size={14} className="text-brand-400" /> Randomize 5
          </button>
          <button onClick={handleGenerate}
            className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold flex items-center gap-2 btn-premium shadow-glow-sm">
            <Plus size={14} /> Generate New
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Generator Settings */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-white mb-4 flex items-center gap-2">
            <Layers size={14} className="text-brand-400" /> Generator Settings
          </h3>
          <div className="space-y-3 text-[12px]">
            {[
              { label: 'Operating System', value: genOs, set: setGenOs, options: OS_OPTIONS },
              { label: 'Browser', value: genBrowser, set: setGenBrowser, options: BROWSER_OPTIONS },
              { label: 'Canvas', value: genCanvas, set: setGenCanvas, options: CANVAS_MODES },
              { label: 'WebGL', value: genWebgl, set: setGenWebgl, options: WEBGL_MODES },
              { label: 'Audio', value: genAudio, set: setGenAudio, options: AUDIO_MODES },
            ].map(({ label, value, set: setter, options }) => (
              <div key={label}>
                <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</label>
                <select value={value} onChange={e => setter(e.target.value)}
                  className="w-full mt-1 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow">
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <button onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-2 btn-premium mt-3">
              <Plus size={13} /> Generate Fingerprint
            </button>
          </div>
        </div>

        {/* Saved List */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
              <Layers size={14} className="text-accent-cyan" /> Saved ({fingerprints.length})
            </h3>
            <div className="flex gap-1.5">
              {fingerprints.length > 0 && (
                <>
                  <button onClick={handleExport} className="p-1.5 rounded-lg bg-surface-card border border-surface-border text-gray-400 hover:text-white transition-colors" title="Export All"><Download size={13} /></button>
                  <button onClick={handleClear} className="p-1.5 rounded-lg bg-surface-card border border-surface-border text-gray-400 hover:text-accent-rose hover:border-accent-rose/30 transition-colors" title="Clear All"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-auto custom-scrollbar">
            {fingerprints.length === 0 && (
              <div className="text-center py-12">
                <Fingerprint size={28} className="text-gray-600 mx-auto mb-2" />
                <p className="text-[12px] text-gray-500">No fingerprints yet</p>
                <p className="text-[10px] text-gray-600 mt-1">Click Generate to create one</p>
              </div>
            )}
            {fingerprints.map(f => (
              <div key={f.id}
                onClick={() => setSelected(f.id === selected ? null : f.id)}
                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all ${
                  selected === f.id
                    ? 'bg-brand-500/10 border border-brand-500/30 shadow-glow-sm'
                    : 'bg-surface-card border border-surface-border hover:bg-surface-overlay'
                }`}>
                <div className="flex items-center gap-2.5">
                  <OsIcon os={f.os} />
                  <div>
                    <div className="text-[12px] font-medium text-white">{f.name}</div>
                    <div className="text-[10px] text-gray-500">{f.canvas} · {f.webgl} · {f.timezone.split('/')[1]}</div>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                  className="p-1 rounded text-gray-500 hover:text-accent-rose transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Detail View */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
              <Eye size={14} className="text-accent-amber" /> Details
            </h3>
            {selectedFp && (
              <button onClick={handleCopyFingerprint}
                className="text-[11px] bg-surface-card border border-surface-border text-gray-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:text-white transition-colors">
                {copied ? <Check size={11} className="text-accent-emerald" /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            )}
          </div>
          {selectedFp ? (
            <div className="space-y-2.5 text-[11px]">
              {[
                ['Name', selectedFp.name],
                ['OS', selectedFp.os],
                ['Browser', selectedFp.browser],
                ['Platform', selectedFp.platform],
                ['Canvas', selectedFp.canvas],
                ['WebGL', selectedFp.webgl],
                ['WebGL Vendor', selectedFp.webglVendor],
                ['Audio', selectedFp.audio],
                ['Timezone', selectedFp.timezone],
                ['Language', selectedFp.language],
                ['Resolution', selectedFp.resolution],
                ['CPU Cores', selectedFp.hardwareConcurrency],
                ['Device Memory', selectedFp.deviceMemory + ' GB'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-2 border-b border-surface-border/50">
                  <span className="text-gray-400">{label as string}</span>
                  <span className="text-white font-mono text-[11px]">{value as string}</span>
                </div>
              ))}
              <div className="mt-3">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium">User Agent</span>
                <div className="text-[10px] text-gray-300 font-mono mt-1.5 break-all bg-surface-card p-2.5 rounded-lg border border-surface-border">{selectedFp.userAgent}</div>
              </div>
              <div className="mt-4 p-3 bg-surface-card border border-surface-border rounded-lg">
                <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Apply to Profile</label>
                <div className="flex gap-2 mt-2">
                  <input value={applyProfileId} onChange={e => setApplyProfileId(e.target.value)} placeholder="Profile ID"
                    className="flex-1 bg-surface-base border border-surface-border rounded-lg p-2 text-[12px] text-white input-glow" />
                  <button onClick={handleApplyToFingerprint}
                    className="bg-brand-500/20 border border-brand-500/30 text-brand-400 px-3 py-2 rounded-lg text-[11px] font-semibold hover:bg-brand-500/30 transition-all">
                    Apply
                  </button>
                </div>
                {applyStatus && <p className={`mt-1.5 text-[10px] ${applyStatus.startsWith('Error') ? 'text-accent-rose' : 'text-accent-emerald'}`}>{applyStatus}</p>}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Fingerprint size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-[12px] text-gray-500">Select a fingerprint to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
