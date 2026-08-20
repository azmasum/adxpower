import React, { useState, useEffect } from 'react';
import { Users, Clock, Box, Mail, Eye, Edit, Trash2, Plus, Search, Download, Send, X, Save, Shield, UserPlus } from 'lucide-react';
import { useProfileStore } from '../store/useProfileStore';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Member';
  sharedProfileCount: number;
  status: string;
}

interface LogEntry {
  id: string;
  userName: string;
  action: string;
  target: string;
  ip: string | null;
  status: string;
  createdAt: string;
}

const DEV_OWNER: Member = { id: 'owner', name: 'You (Owner)', email: 'admin@company.com', role: 'Owner', sharedProfileCount: 12, status: 'Active' };

const ROLE_STYLES: Record<string, string> = {
  Owner: 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20',
  Admin: 'bg-brand-500/10 text-brand-400 border border-brand-500/20',
  Member: 'bg-surface-card text-gray-300 border border-surface-border',
};

const AVATAR_COLORS = ['bg-brand-500', 'bg-accent-blue', 'bg-accent-cyan', 'bg-accent-emerald', 'bg-accent-amber'];

export const TeamCollabManager: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { profiles } = useProfileStore() as any;
  const [team, setTeam] = useState<Member[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Member' as Member['role'] });
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState('');
  const [transferProfiles, setTransferProfiles] = useState<string[]>([]);
  const [transferDest, setTransferDest] = useState('');

  useEffect(() => { if (activeTab === 'team') fetchTeam(); if (activeTab === 'logs') fetchLogs(); }, [activeTab]);

  const fetchTeam = async () => { setLoading(true); try { const res = await fetch(`${API_URL}/team`); if (res.ok) setTeam(await res.json()); } catch {} setLoading(false); };
  const fetchLogs = async () => { setLoading(true); try { const res = await fetch(`${API_URL}/activity-logs?limit=100`); if (res.ok) setLogs(await res.json()); } catch {} setLoading(false); };

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    try { await fetch(`${API_URL}/team`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: inviteForm.name || inviteForm.email.split('@')[0], email: inviteForm.email, role: inviteForm.role }) }); await fetchTeam(); } catch {}
    setShowInvite(false); setInviteForm({ name: '', email: '', role: 'Member' });
  };

  const handleDelete = async (id: string) => { if (id === 'owner') return; if (!confirm('Delete this member?')) return; try { await fetch(`${API_URL}/team/${id}`, { method: 'DELETE' }); await fetchTeam(); } catch {} };

  const handleEditSave = async () => {
    if (!editMember) return;
    try { await fetch(`${API_URL}/team/${editMember.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editMember.name, email: editMember.email, role: editMember.role, sharedProfileCount: editMember.sharedProfileCount }) }); await fetchTeam(); } catch {}
    setEditMember(null);
  };

  const handleClearLogs = async () => { if (!confirm('Clear all activity logs?')) return; try { await fetch(`${API_URL}/activity-logs`, { method: 'DELETE' }); setLogs([]); } catch {} };

  const handleExportLogs = () => {
    const csv = ['Time,User,Action,Target,IP,Status'];
    filteredLogs.forEach(l => csv.push(`"${l.createdAt}","${l.userName}","${l.action}","${l.target}","${l.ip || ''}","${l.status}"`));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `activity_logs_${Date.now()}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleTransfer = async () => {
    if (transferProfiles.length === 0 || !transferDest) { alert('Select profiles and enter destination'); return; }
    alert(`Transfer feature coming soon. Selected: ${transferProfiles.length} profiles -> ${transferDest}`);
  };

  const filtered = team.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));
  const filteredLogs = logs.filter(l => !logFilter || l.action.toLowerCase().includes(logFilter.toLowerCase()) || l.userName.toLowerCase().includes(logFilter.toLowerCase()) || l.target.toLowerCase().includes(logFilter.toLowerCase()));
  const formatTime = (iso: string) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

  if (activeTab === 'team') {
    return (
      <div className="h-full bg-surface-base p-6 overflow-auto relative">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
              <Users size={18} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-white">Team Members</h2>
              <p className="text-[11px] text-gray-500">{team.length + 1} members total</p>
            </div>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold flex items-center gap-2 btn-premium shadow-glow-sm">
            <UserPlus size={14} /> Invite Member
          </button>
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-surface-border flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..."
                className="w-full bg-surface-card border border-surface-border rounded-lg pl-9 pr-3 py-2 text-[12px] text-white input-glow" />
            </div>
          </div>
          <table className="w-full text-left text-[12px]">
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider border-b border-surface-border">
              <tr>
                <th className="p-4">Member</th>
                <th className="p-4">Role</th>
                <th className="p-4">Shared Profiles</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              <tr className="hover:bg-surface-overlay/30 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-amber to-accent-rose flex items-center justify-center text-white text-[12px] font-bold">Y</div>
                  <div>
                    <div className="text-white font-medium">{DEV_OWNER.name}</div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1"><Mail size={9} />{DEV_OWNER.email}</div>
                  </div>
                </td>
                <td className="p-4"><span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${ROLE_STYLES.Owner}`}>Owner</span></td>
                <td className="p-4"><span className="text-[11px] text-gray-300">{profiles?.length || 0} profiles</span></td>
                <td className="p-4"><span className="text-[10px] text-accent-emerald flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-glow-pulse" /> Active</span></td>
                <td className="p-4 text-right text-[10px] text-gray-600">-</td>
              </tr>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="hover:bg-surface-overlay/30 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[team.indexOf(m) % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[12px] font-bold`}>{m.name[0]}</div>
                    <div>
                      <div className="text-white font-medium">{m.name}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1"><Mail size={9} />{m.email}</div>
                    </div>
                  </td>
                  <td className="p-4"><span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${ROLE_STYLES[m.role] || ROLE_STYLES.Member}`}>{m.role}</span></td>
                  <td className="p-4"><span className="text-[11px] text-gray-300">{m.sharedProfileCount} profiles</span></td>
                  <td className="p-4"><span className={`text-[10px] flex items-center gap-1 ${m.status === 'Active' ? 'text-accent-emerald' : 'text-accent-amber'}`}><span className={`w-1.5 h-1.5 rounded-full ${m.status === 'Active' ? 'bg-accent-emerald' : 'bg-accent-amber'}`} /> {m.status}</span></td>
                  <td className="p-4 text-right space-x-1.5">
                    <button onClick={() => setViewMember(m)} className="p-1.5 bg-surface-card border border-surface-border rounded-lg hover:bg-surface-overlay hover:text-white transition-all"><Eye size={13} /></button>
                    <button onClick={() => setEditMember({ ...m })} className="p-1.5 bg-surface-card border border-surface-border rounded-lg hover:bg-surface-overlay hover:text-white transition-all"><Edit size={13} /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 bg-surface-card border border-surface-border rounded-lg hover:bg-accent-rose/10 hover:text-accent-rose hover:border-accent-rose/20 transition-all"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-brand-500/5 border border-brand-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
          <Shield size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-gray-400 leading-relaxed">Members share profiles with Fingerprint + Cookies + Proxy. Members can open profiles from their own PC.</p>
        </div>

        {showInvite && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-surface-raised border border-surface-border rounded-2xl w-96 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[15px] font-bold text-white flex items-center gap-2"><UserPlus size={16} className="text-brand-400" /> Invite Member</h3>
                <button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Full Name</label>
                  <input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="John Doe (optional)"
                    className="w-full mt-1 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Email Address</label>
                  <input value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="member@company.com"
                    className="w-full mt-1 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Role</label>
                  <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                    className="w-full mt-1 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow">
                    <option value="Member">Member - Limited Access</option>
                    <option value="Admin">Admin - Full Access</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2.5 mt-6">
                <button onClick={() => setShowInvite(false)} className="flex-1 bg-surface-card border border-surface-border text-gray-300 py-2.5 rounded-lg text-[12px] font-medium hover:bg-surface-overlay transition-all">Cancel</button>
                <button onClick={handleInvite} className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 text-white py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-2 btn-premium shadow-glow-sm"><Send size={13} /> Send Invite</button>
              </div>
            </div>
          </div>
        )}

        {viewMember && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-surface-raised border border-surface-border rounded-2xl w-96 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5"><h3 className="text-[15px] font-bold text-white">Member Details</h3><button onClick={() => setViewMember(null)} className="text-gray-500 hover:text-white"><X size={16} /></button></div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center text-white font-bold text-lg">{viewMember.name[0]}</div>
                <div><div className="text-white font-semibold text-[14px]">{viewMember.name}</div><div className="text-[11px] text-gray-400">{viewMember.email}</div></div>
              </div>
              <div className="space-y-3 text-[12px] bg-surface-card p-4 rounded-xl border border-surface-border">
                <div className="flex justify-between"><span className="text-gray-400">Role</span><span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${ROLE_STYLES[viewMember.role]}`}>{viewMember.role}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Status</span><span className="text-accent-emerald">{viewMember.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Shared Profiles</span><span className="text-white">{viewMember.sharedProfileCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Member ID</span><span className="text-gray-500 text-[10px] font-mono">{viewMember.id}</span></div>
              </div>
              <button onClick={() => setViewMember(null)} className="w-full mt-4 bg-surface-card border border-surface-border text-white py-2.5 rounded-lg text-[12px] font-medium hover:bg-surface-overlay transition-all">Close</button>
            </div>
          </div>
        )}

        {editMember && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-surface-raised border border-surface-border rounded-2xl w-96 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5"><h3 className="text-[15px] font-bold text-white">Edit Member</h3><button onClick={() => setEditMember(null)} className="text-gray-500 hover:text-white"><X size={16} /></button></div>
              <div className="space-y-3">
                <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Name</label><input value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} className="w-full mt-1 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow" /></div>
                <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Email</label><input value={editMember.email} onChange={(e) => setEditMember({ ...editMember, email: e.target.value })} className="w-full mt-1 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow" /></div>
                <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Role</label><select value={editMember.role} onChange={(e) => setEditMember({ ...editMember, role: e.target.value as any })} className="w-full mt-1 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow"><option value="Member">Member</option><option value="Admin">Admin</option></select></div>
                <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Shared Profiles Count</label><input type="number" value={editMember.sharedProfileCount} onChange={(e) => setEditMember({ ...editMember, sharedProfileCount: parseInt(e.target.value) || 0 })} className="w-full mt-1 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow" /></div>
              </div>
              <div className="flex gap-2.5 mt-6">
                <button onClick={() => setEditMember(null)} className="flex-1 bg-surface-card border border-surface-border text-gray-300 py-2.5 rounded-lg text-[12px] font-medium hover:bg-surface-overlay transition-all">Cancel</button>
                <button onClick={handleEditSave} className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 text-white py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-2 btn-premium shadow-glow-sm"><Save size={13} /> Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'logs') {
    return (
      <div className="h-full bg-surface-base p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
              <Clock size={18} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-white">Activity Logs</h2>
              <p className="text-[11px] text-gray-500">{logs.length} entries</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
              <input value={logFilter} onChange={(e) => setLogFilter(e.target.value)} placeholder="Filter logs..."
                className="bg-surface-raised border border-surface-border rounded-lg pl-9 pr-3 py-2 text-[12px] text-white w-48 input-glow" />
            </div>
            <button onClick={handleExportLogs} className="bg-surface-raised border border-surface-border text-gray-300 hover:text-white px-3 py-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all hover:bg-surface-overlay"><Download size={12} /> Export CSV</button>
            <button onClick={handleClearLogs} className="bg-accent-rose/10 border border-accent-rose/20 text-accent-rose px-3 py-2 rounded-lg text-[11px] font-medium hover:bg-accent-rose/20 transition-all">Clear All</button>
          </div>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-[11px]">
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider border-b border-surface-border">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">User</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target</th>
                <th className="p-4">IP</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No activity logs found</td></tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-overlay/30 transition-colors">
                    <td className="p-4 font-mono text-gray-400 text-[10px]">{formatTime(l.createdAt)}</td>
                    <td className="p-4 text-white font-medium">{l.userName}</td>
                    <td className="p-4"><span className="bg-surface-card border border-surface-border px-2 py-0.5 rounded text-[10px]">{l.action}</span></td>
                    <td className="p-4 text-brand-400">{l.target}</td>
                    <td className="p-4 font-mono text-gray-400 text-[10px]">{l.ip}</td>
                    <td className="p-4"><span className="bg-accent-emerald/10 text-accent-emerald px-2 py-0.5 rounded-full text-[10px] font-medium">{l.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'transfer') {
    return (
      <div className="h-full bg-surface-base p-6 overflow-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-blue/10 border border-brand-500/20 flex items-center justify-center">
            <Box size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-white">Profile Transfer</h2>
            <p className="text-[11px] text-gray-500">Transfer profiles to team members</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 max-w-4xl">
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <h3 className="text-[13px] font-bold text-white mb-3">Select Profiles</h3>
            <div className="space-y-2 max-h-[300px] overflow-auto custom-scrollbar">
              {(profiles || []).map((p: any) => (
                <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${transferProfiles.includes(p.id) ? 'bg-brand-500/10 border-brand-500/20' : 'bg-surface-card border-surface-border hover:bg-surface-overlay'}`}>
                  <input type="checkbox" checked={transferProfiles.includes(p.id)}
                    onChange={(e) => setTransferProfiles(e.target.checked ? [...transferProfiles, p.id] : transferProfiles.filter(id => id !== p.id))} className="hidden" />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${transferProfiles.includes(p.id) ? 'border-brand-400 bg-brand-500' : 'border-gray-600'}`}>
                    {transferProfiles.includes(p.id) && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className="text-[12px] text-gray-300">{p.name}</span>
                </label>
              ))}
              {(!profiles || profiles.length === 0) && <p className="text-[11px] text-gray-500 py-6 text-center">No profiles available</p>}
            </div>
          </div>
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <h3 className="text-[13px] font-bold text-white mb-3">Destination</h3>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Email or License Key</label>
            <input value={transferDest} onChange={(e) => setTransferDest(e.target.value)} placeholder="user@example.com or LIC-XXXX"
              className="w-full mt-1.5 bg-surface-card border border-surface-border rounded-lg p-2.5 text-[12px] text-white input-glow mb-4" />
            <button onClick={handleTransfer}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 btn-premium shadow-glow-sm">
              <Send size={14} /> Transfer {transferProfiles.length} Profile{transferProfiles.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
