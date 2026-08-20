import React, { useEffect, useMemo, useState } from 'react';
import { useProfileStore } from '../store/useProfileStore';
import { useProxyStore } from '../store/useProxyStore';
import { getFlagEmoji } from '../utils/flags';
import {
  Play, Square, Edit, Trash2, Search, Plus,
  RefreshCw, Globe, Shield, Tag, ChevronDown, Activity, X, Save,
  Monitor, Cpu, Copy, ArrowUpDown
} from 'lucide-react';

const OS_OPTIONS = ['Windows 10', 'Windows 11', 'Windows Server 2022', 'macOS Sonoma', 'macOS Ventura', 'macOS Monterey', 'Ubuntu 22.04', 'Ubuntu 24.04', 'Debian 12', 'Fedora 39', 'Linux Mint 21', 'Arch Linux', 'ChromeOS', 'Android 14', 'iOS 17'];
const BROWSER_OPTIONS = ['Chrome 122.0.6261', 'Chrome 121.0.6167', 'Chrome 120.0.6099', 'Chrome 119.0.0', 'Chrome 118.0.5993', 'Chrome 117.0.5938', 'Chrome 116.0.5845', 'Firefox 123.0', 'Firefox 122.0', 'Firefox 121.0', 'Firefox 120.0', 'Firefox 119.0', 'Safari 17.3', 'Safari 17.2', 'Safari 17.1', 'Safari 16.6', 'Edge 122.0.6261', 'Edge 121.0.6167', 'Edge 120.0.6099', 'Brave 1.63.165', 'Brave 1.62.160', 'Opera 108.0.5067', 'Opera 107.0.5041', 'Vivaldi 6.6.3271.57', 'Waterfox G6.0.5'];

export const ProfilesTable: React.FC<{ filter?: string }> = ({ filter = 'profiles' }) => {
  const {
    profiles,
    searchQuery,
    selectedGroup,
    selectedProfiles,
    isLoading: profilesLoading,
    setSearchQuery,
    setSelectedGroup,
    toggleSelectProfile,
    toggleSelectAll,
    fetchProfiles,
    startProfile,
    stopProfile,
    deleteProfile,
    addProfile,
    updateProfile,
  } = useProfileStore() as any;

  const { proxies, fetchProxies, checkProxy } = useProxyStore() as any;

  const [showNewModal, setShowNewModal] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [form, setForm] = useState({ name:'', group:'E-commerce', os:'Windows 11', browser:'Chrome 122.0.6261', tags:'', proxyId:'' });
  const [localProfiles, setLocalProfiles] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchProfiles();
    fetchProxies();
  }, [fetchProfiles, fetchProxies]);

  useEffect(() => {
    if (profiles) setLocalProfiles(profiles);
  }, [profiles]);

  const allProfiles = localProfiles.length ? localProfiles : profiles || [];

  const filteredByMenu = useMemo(() => {
    let base = allProfiles;
    if (selectedGroup !== 'All' && selectedGroup) {
      base = base.filter((p: any) => p.group === selectedGroup);
    }
    if (searchQuery) {
      base = base.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filter === 'profiles-running') return base.filter((p: any) => p.status === 'Running');
    if (filter === 'profiles-stopped') return base.filter((p: any) => p.status === 'Stopped');
    if (filter === 'profiles-trash') return [];

    base.sort((a: any, b: any) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

    return base;
  }, [allProfiles, selectedGroup, searchQuery, filter, sortField, sortDir]);

  const handleNewProfile = () => {
    const newP = {
      name: form.name || `New Profile - ${allProfiles.length + 1}`,
      group: form.group,
      os: form.os,
      browser: form.browser,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : ['New'],
      proxyId: form.proxyId || undefined,
    };
    addProfile(newP);
    setShowNewModal(false);
    setForm({ name:'', group:'E-commerce', os:'Windows 11', browser:'Chrome 122.0.6261', tags:'', proxyId:'' });
  };

  const handleEditSave = () => {
    if (!editProfile) return;
    const updated = {
      name: form.name,
      group: form.group,
      os: form.os,
      browser: form.browser,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : editProfile.tags,
      proxyId: form.proxyId || null,
    };
    updateProfile(editProfile.id, updated);
    setEditProfile(null);
  };

  const openEdit = (profile: any) => {
    setEditProfile(profile);
    setForm({ name: profile.name, group: profile.group || 'E-commerce', os: profile.os, browser: profile.browser, tags: (profile.tags || []).join(', '), proxyId: profile.proxyId || '' });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this profile? This will move to Trash.')) return;
    if (typeof deleteProfile === 'function') deleteProfile(id);
    setLocalProfiles(allProfiles.filter((p: any) => p.id !== id));
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const emptyMessage = filter === 'profiles-trash' ? 'Trash is empty' :
    filter === 'profiles-running' ? 'No Running Profiles' :
    filter === 'profiles-stopped' ? 'No Stopped Profiles' : 'No profiles found';

  return (
    <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased relative">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-raised/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
              className="appearance-none bg-surface-card text-[13px] border border-surface-border rounded-lg pl-3 pr-8 py-2.5 focus:outline-none text-gray-200 cursor-pointer hover:border-surface-border-light transition-colors">
              <option value="All">All Groups</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Social Media">Social Media</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
            <input type="text" placeholder="Search profiles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-surface-card text-[13px] border border-surface-border rounded-lg pl-9 pr-4 py-2.5 focus:outline-none placeholder-gray-500 text-gray-200 input-glow transition-all" />
            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
          </div>
          <span className="text-[12px] text-gray-500 font-medium">{filteredByMenu.length} profiles</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchProfiles(); fetchProxies(); }}
            className="p-2.5 bg-surface-card border border-surface-border rounded-lg hover:bg-surface-overlay hover:border-surface-border-light transition-all btn-premium">
            <RefreshCw size={16} className={profilesLoading ? 'animate-spin text-brand-400' : 'text-gray-400'} />
          </button>
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shadow-glow-sm hover:shadow-glow-md transition-all btn-premium">
            <Plus size={16} />
            <span>New Profile</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-grow overflow-auto">
        {filteredByMenu.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-12">
            <div className="w-20 h-20 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-4">
              <Monitor size={32} className="text-gray-600" />
            </div>
            <p className="text-[15px] font-medium text-gray-400">{emptyMessage}</p>
            <p className="text-[12px] text-gray-500 mt-1">Create a new profile to get started</p>
            <button onClick={() => setShowNewModal(true)}
              className="mt-5 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold shadow-glow-sm hover:shadow-glow-md transition-all btn-premium">
              Create First Profile
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-raised text-gray-400 text-[11px] font-semibold uppercase tracking-wider border-b border-surface-border">
                <th className="px-5 py-3.5 w-12 text-center">
                  <input type="checkbox" onChange={toggleSelectAll}
                    className="rounded border-surface-border-light bg-surface-card text-brand-500 w-4 h-4 cursor-pointer" />
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-gray-200 transition-colors" onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">Profile Name <ArrowUpDown size={10} /></span>
                </th>
                <th className="px-5 py-3.5">Proxy Configuration</th>
                <th className="px-5 py-3.5">Fingerprint</th>
                <th className="px-5 py-3.5">Tags</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {filteredByMenu.map((profile: any) => {
                const assignedProxy = proxies?.find((p: any) => p.id === profile.proxyId);
                return (
                  <tr key={profile.id}
                    className={`table-row-premium ${selectedProfiles?.includes(profile.id) ? 'bg-brand-500/5 border-l-2 border-l-brand-500' : ''}`}>
                    <td className="px-5 py-4 text-center">
                      <input type="checkbox" checked={selectedProfiles?.includes(profile.id)} onChange={() => toggleSelectProfile(profile.id)}
                        className="rounded border-surface-border-light bg-surface-card text-brand-500 w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
                          <Monitor size={14} className="text-brand-400" />
                        </div>
                        <div>
                          <span className="text-[13px] font-medium text-white block">{profile.name}</span>
                          <span className="text-[11px] text-gray-500">Last opened: {profile.lastUsed || 'Never'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {assignedProxy ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${assignedProxy.status === 'active' ? 'bg-accent-emerald status-online' : assignedProxy.status === 'dead' ? 'bg-accent-rose' : 'bg-gray-500'}`} />
                            <span className="text-[12px] font-mono text-gray-300">{assignedProxy.type}://{assignedProxy.host}:{assignedProxy.port}</span>
                          </div>
                          {assignedProxy.status === 'active' && (
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 pl-4">
                              <span>{getFlagEmoji(assignedProxy.country)}</span>
                              <span>{assignedProxy.country}</span>
                              <span className="text-gray-600">·</span>
                              <span className="flex items-center text-accent-emerald"><Activity size={10} className="mr-0.5" />{assignedProxy.latency}ms</span>
                            </div>
                          )}
                          <button onClick={() => checkProxy && checkProxy(assignedProxy.id)}
                            className="text-[11px] text-brand-400 pl-4 font-medium hover:text-brand-300 transition-colors">
                            Check Connection
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[12px] text-gray-500">
                          <Globe size={13} />
                          <span>Direct (No Proxy)</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-[11px] text-gray-300 bg-surface-card px-2.5 py-1.5 rounded-lg border border-surface-border w-max">
                        <Shield size={11} className="text-brand-400" />
                        <span>{profile.os}</span>
                        <span className="text-gray-600">|</span>
                        <span>{profile.browser}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(profile.tags || []).map((tag: string) => (
                          <span key={tag} className="flex items-center gap-1 text-[10px] bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2 py-0.5 rounded-full font-medium">
                            <Tag size={8} />{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        profile.status === 'Running'
                          ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20'
                          : 'bg-surface-overlay text-gray-400 border-surface-border'
                      }`}>
                        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${profile.status === 'Running' ? 'bg-accent-emerald status-online' : 'bg-gray-500'}`} />
                        {profile.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {profile.status === 'Running' ? (
                          <button onClick={() => stopProfile(profile.id)}
                            className="flex items-center gap-1.5 bg-accent-rose/10 hover:bg-accent-rose/20 text-accent-rose border border-accent-rose/20 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all">
                            <Square size={11} fill="currentColor" /><span>Close</span>
                          </button>
                        ) : (
                          <button onClick={() => startProfile(profile.id)}
                            className="flex items-center gap-1.5 bg-accent-emerald/10 hover:bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/20 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all">
                            <Play size={11} fill="currentColor" /><span>Open</span>
                          </button>
                        )}
                        <button onClick={() => openEdit(profile)}
                          className="p-2 bg-surface-card border border-surface-border rounded-lg hover:bg-surface-overlay hover:text-white hover:border-surface-border-light transition-all">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDelete(profile.id)}
                          className="p-2 bg-surface-card border border-surface-border rounded-lg hover:text-accent-rose hover:bg-accent-rose/10 hover:border-accent-rose/20 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Profile Modal */}
      {showNewModal && (
        <div className="absolute inset-0 modal-overlay flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-surface-raised border border-surface-border rounded-2xl w-[480px] p-6 shadow-glow-lg animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-bold flex items-center gap-2 text-[15px]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
                  <Plus size={16} className="text-brand-400" />
                </div>
                New Profile
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-overlay">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Profile Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Amazon Buyer Account - 02"
                  className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white focus:border-brand-500 focus:outline-none input-glow transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Group</label>
                  <select value={form.group} onChange={e => setForm({...form, group: e.target.value})}
                    className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white cursor-pointer">
                    <option>E-commerce</option><option>Social Media</option><option>Ads</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">OS</label>
                  <select value={form.os} onChange={e => setForm({...form, os: e.target.value})}
                    className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white cursor-pointer">
                    {OS_OPTIONS.map(os => <option key={os}>{os}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Browser Fingerprint</label>
                <select value={form.browser} onChange={e => setForm({...form, browser: e.target.value})}
                  className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white cursor-pointer">
                  {BROWSER_OPTIONS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Proxy</label>
                <select value={form.proxyId} onChange={e => setForm({...form, proxyId: e.target.value})}
                  className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white cursor-pointer">
                  <option value="">Direct (No Proxy)</option>
                  {proxies?.filter((p: any) => p.status === 'active').map((p: any) =>
                    <option key={p.id} value={p.id}>{p.host}:{p.port} - {p.country}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Tags</label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="Amazon, US, Buyer"
                  className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white focus:border-brand-500 focus:outline-none input-glow transition-all" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)}
                className="flex-1 bg-surface-card border border-surface-border text-gray-300 py-2.5 rounded-lg text-[13px] font-medium hover:bg-surface-overlay transition-all">
                Cancel
              </button>
              <button onClick={handleNewProfile}
                className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 shadow-glow-sm transition-all btn-premium">
                <Save size={14} /> Create Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editProfile && (
        <div className="absolute inset-0 modal-overlay flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-surface-raised border border-surface-border rounded-2xl w-[480px] p-6 shadow-glow-lg animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-bold flex items-center gap-2 text-[15px]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-amber/20 to-accent-amber/5 border border-accent-amber/20 flex items-center justify-center">
                  <Edit size={16} className="text-accent-amber" />
                </div>
                Edit Profile
              </h3>
              <button onClick={() => setEditProfile(null)} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-overlay">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Profile Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white focus:border-brand-500 focus:outline-none input-glow transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Group</label>
                  <select value={form.group} onChange={e => setForm({...form, group: e.target.value})}
                    className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white cursor-pointer">
                    <option>E-commerce</option><option>Social Media</option><option>Ads</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">OS</label>
                  <select value={form.os} onChange={e => setForm({...form, os: e.target.value})}
                    className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white cursor-pointer">
                    {OS_OPTIONS.map(os => <option key={os}>{os}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Tags</label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}
                  className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white focus:border-brand-500 focus:outline-none input-glow transition-all" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Proxy</label>
                <select value={form.proxyId} onChange={e => setForm({...form, proxyId: e.target.value})}
                  className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-3 text-[13px] text-white cursor-pointer">
                  <option value="">Direct (No Proxy)</option>
                  {proxies?.filter((p: any) => p.status === 'active').map((p: any) =>
                    <option key={p.id} value={p.id}>{p.host}:{p.port} - {p.country}</option>
                  )}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditProfile(null)}
                className="flex-1 bg-surface-card border border-surface-border text-gray-300 py-2.5 rounded-lg text-[13px] font-medium hover:bg-surface-overlay transition-all">
                Cancel
              </button>
              <button onClick={handleEditSave}
                className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 shadow-glow-sm transition-all btn-premium">
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
