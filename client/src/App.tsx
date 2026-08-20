import React, { useState } from 'react';
import { ProfilesTable } from './components/ProfilesTable';
import { LicenseManager } from './components/LicenseManager';
import { LicenseAdminPanel } from './components/LicenseAdminPanel';
import { ProxyManager } from './components/ProxyManager';
import { FingerprintManager } from './components/FingerprintManager';
import { CookieRobot } from './components/CookieRobot';
import { ExtensionsStore } from './components/ExtensionsStore';
import { AutomationManager } from './components/AutomationManager';
import { TeamCollabManager } from './components/TeamCollabManager';
import { SystemSettings } from './components/SystemSettings';
import { HelpSupport } from './components/HelpSupport';
import { CheckoutPage } from './components/CheckoutPage';
import { TrialBanner } from './components/TrialBanner';
import {
  LayoutDashboard, Globe, Users, Settings,
  Fingerprint, Cookie, Puzzle, Zap, Layers, Bot,
  Clock, HelpCircle, ChevronDown, Box, Key,
  Shield, Sparkles, ExternalLink, ShoppingCart
} from 'lucide-react';

type Tab = string;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasPaymentReturn = params.get('session_id') || params.get('provider') === 'paypal';
    if (hasPaymentReturn) return 'store';
    const saved = localStorage.getItem('license_data');
    return saved ? 'profiles' : 'license';
  });
  const [open, setOpen] = useState({ profiles: true, proxy: false, license: true, system: true });
  const toggle = (k: keyof typeof open) => setOpen(s => ({...s, [k]:!s[k]}));

  const licenseData = localStorage.getItem('license_data') ? JSON.parse(localStorage.getItem('license_data')!) : null;

  const NavItem = ({ id, icon, label }: any) => (
    <button onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
        activeTab === id
          ? 'bg-gradient-to-r from-brand-500/20 to-accent-blue/10 text-white shadow-glow-sm border border-brand-500/20'
          : 'text-gray-400 hover:bg-surface-overlay/60 hover:text-gray-200 border border-transparent'
      }`}>
      <span className={`transition-colors ${activeTab === id ? 'text-brand-400' : 'text-gray-500'}`}>{icon}</span>
      <span>{label}</span>
      {activeTab === id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 animate-glow-pulse" />}
    </button>
  );

  const SubItem = ({ id, label, count }: any) => (
    <button onClick={() => setActiveTab(id)}
      className={`w-full text-left ml-9 pl-3 py-1.5 text-[12px] flex justify-between pr-3 rounded-r-md transition-all duration-150 ${
        activeTab === id
          ? 'text-white bg-surface-overlay/80 border-l border-brand-400'
          : 'text-gray-500 hover:text-gray-300 hover:bg-surface-overlay/40 border-l border-surface-border/50'
      }`}>
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-overlay text-gray-400 font-medium">{count}</span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen w-screen bg-surface-base overflow-hidden select-none">
      {/* Sidebar */}
      <div className="w-64 bg-surface-raised border-r border-surface-border flex flex-col relative">
        {/* Ambient glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-glow pointer-events-none" />

        {/* Logo area */}
        <div className="relative px-5 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="/adxpower-logo.svg" alt="AdxPower" className="w-9 h-9" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-emerald rounded-full border-2 border-surface-raised status-online" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-gradient tracking-tight">AdxPower</h1>
              <span className="text-[10px] text-accent-emerald font-semibold tracking-wider">v1.0 PREMIUM</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 relative">
          {/* BROWSER Section */}
          <div>
            <div className="text-[10px] text-gray-500 px-3 mb-2 tracking-[0.15em] font-semibold uppercase">Browser</div>
            <div className="space-y-0.5">
              <button onClick={() => { toggle('profiles'); setActiveTab('profiles'); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  activeTab.startsWith('profiles')
                    ? 'bg-gradient-to-r from-brand-500/20 to-accent-blue/10 text-white border border-brand-500/20'
                    : 'text-gray-400 hover:bg-surface-overlay/60 hover:text-gray-200 border border-transparent'
                }`}>
                <span className="flex items-center gap-3">
                  <LayoutDashboard size={16} className={activeTab.startsWith('profiles') ? 'text-brand-400' : 'text-gray-500'} />
                  Profiles Dashboard
                </span>
                <ChevronDown size={14} className={`${open.profiles ? 'rotate-180' : ''} transition-transform duration-200`} />
              </button>
              {open.profiles && (
                <div className="space-y-0.5 mt-0.5">
                  <SubItem id="profiles" label="All Profiles" />
                  <SubItem id="profiles-running" label="Running" count={1} />
                  <SubItem id="profiles-stopped" label="Stopped" count={2} />
                  <SubItem id="profiles-trash" label="Trash" />
                </div>
              )}

              <button onClick={() => { toggle('proxy'); setActiveTab('proxies'); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  activeTab.startsWith('proxies')
                    ? 'bg-gradient-to-r from-brand-500/20 to-accent-blue/10 text-white border border-brand-500/20'
                    : 'text-gray-400 hover:bg-surface-overlay/60 hover:text-gray-200 border border-transparent'
                }`}>
                <span className="flex items-center gap-3">
                  <Globe size={16} className={activeTab.startsWith('proxies') ? 'text-brand-400' : 'text-gray-500'} />
                  Proxy Manager
                </span>
                <ChevronDown size={14} className={`${open.proxy ? 'rotate-180' : ''} transition-transform duration-200`} />
              </button>
              {open.proxy && (
                <div className="space-y-0.5 mt-0.5">
                  <SubItem id="proxies" label="My Proxies" />
                  <SubItem id="proxies-checker" label="Proxy Checker" />
                  <SubItem id="proxies-groups" label="Proxy Groups" />
                  <SubItem id="proxies-lookup" label="IP Lookup" />
                </div>
              )}

              <NavItem id="fingerprint" icon={<Fingerprint size={16} />} label="Fingerprint" />
              <NavItem id="cookies" icon={<Cookie size={16} />} label="Cookie Robot" />
              <NavItem id="extensions" icon={<Puzzle size={16} />} label="Extensions" />
            </div>
          </div>

          <div className="sidebar-divider" />

          {/* AUTOMATION Section */}
          <div>
            <div className="text-[10px] text-gray-500 px-3 mb-2 tracking-[0.15em] font-semibold uppercase flex items-center gap-1.5">
              <Sparkles size={10} className="text-accent-amber" />
              Automation
            </div>
            <div className="space-y-0.5">
              <NavItem id="automation" icon={<Zap size={16} />} label="API & Automation" />
              <NavItem id="sync" icon={<Layers size={16} />} label="Synchronizer" />
              <NavItem id="rpa" icon={<Bot size={16} />} label="RPA Robot" />
            </div>
          </div>

          <div className="sidebar-divider" />

          {/* TEAM Section */}
          <div>
            <div className="text-[10px] text-gray-500 px-3 mb-2 tracking-[0.15em] font-semibold uppercase flex items-center gap-1.5">
              <Users size={10} className="text-accent-cyan" />
              Team & Collab
            </div>
            <div className="space-y-0.5">
              <NavItem id="team" icon={<Users size={16} />} label="Team Members" />
              <NavItem id="logs" icon={<Clock size={16} />} label="Activity Logs" />
              <NavItem id="transfer" icon={<Box size={16} />} label="Profile Transfer" />
            </div>
          </div>

          <div className="sidebar-divider" />

          {/* SYSTEM Section */}
          <div>
            <div className="text-[10px] text-gray-500 px-3 mb-2 tracking-[0.15em] font-semibold uppercase">System</div>
            <div className="space-y-0.5">
              <button onClick={() => { toggle('license'); setActiveTab('license'); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  activeTab === 'license' || activeTab === 'admin-licenses'
                    ? 'bg-gradient-to-r from-brand-500/20 to-accent-blue/10 text-white border border-brand-500/20'
                    : 'text-gray-400 hover:bg-surface-overlay/60 hover:text-gray-200 border border-transparent'
                }`}>
                <span className="flex items-center gap-3">
                  <Key size={16} className={activeTab === 'license' || activeTab === 'admin-licenses' ? 'text-brand-400' : 'text-gray-500'} />
                  License
                </span>
                <ChevronDown size={14} className={`${open.license ? 'rotate-180' : ''} transition-transform duration-200`} />
              </button>
              {open.license && (
                <div className="space-y-0.5 mt-0.5">
                  <SubItem id="license" label="License Manager" />
                  <SubItem id="admin-licenses" label="Admin Generator" />
                </div>
              )}

              <button onClick={() => { toggle('system'); setActiveTab('settings'); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-brand-500/20 to-accent-blue/10 text-white border border-brand-500/20'
                    : 'text-gray-400 hover:bg-surface-overlay/60 hover:text-gray-200 border border-transparent'
                }`}>
                <span className="flex items-center gap-3">
                  <Settings size={16} className={activeTab === 'settings' ? 'text-brand-400' : 'text-gray-500'} />
                  Settings
                </span>
                <ChevronDown size={14} className={`${open.system ? 'rotate-180' : ''} transition-transform duration-200`} />
              </button>
              {open.system && (
                <div className="space-y-0.5 mt-0.5">
                  <SubItem id="settings" label="General" />
                </div>
              )}
              <NavItem id="store" icon={<ShoppingCart size={16} />} label="Store" />
              <NavItem id="help" icon={<HelpCircle size={16} />} label="Help & Support" />
            </div>
          </div>
        </div>

        {/* License status footer */}
        <div className="px-4 py-3 border-t border-surface-border bg-surface-base/50">
          {licenseData?.valid ? (
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Shield size={14} className="text-accent-emerald" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent-emerald status-online" />
              </div>
              <div>
                <div className="text-[11px] text-accent-emerald font-medium">License Active</div>
                <div className="text-[10px] text-gray-500 font-mono truncate max-w-[160px]">{licenseData.hwid}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Shield size={14} className="text-accent-rose" />
              <div>
                <div className="text-[11px] text-accent-rose font-medium">No License</div>
                <div className="text-[10px] text-gray-500">Activate to continue</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden bg-surface-base flex flex-col">
        <TrialBanner />
        <div className="flex-1 overflow-hidden">
          {(activeTab === 'profiles' || activeTab.startsWith('profiles-')) && <ProfilesTable filter={activeTab} />}
          {activeTab.startsWith('proxies') && <ProxyManager activeTab={activeTab} />}
          {activeTab === 'fingerprint' && <FingerprintManager />}
          {activeTab === 'cookies' && <CookieRobot />}
          {activeTab === 'extensions' && <ExtensionsStore />}
          {(activeTab === 'automation' || activeTab === 'sync' || activeTab === 'rpa') && <AutomationManager activeTab={activeTab} />}
          {(activeTab === 'team' || activeTab === 'logs' || activeTab === 'transfer') && <TeamCollabManager activeTab={activeTab} />}
          {activeTab === 'license' && <LicenseManager />}
          {activeTab === 'admin-licenses' && <LicenseAdminPanel />}
          {activeTab === 'store' && <CheckoutPage />}
          {activeTab.startsWith('settings') && <SystemSettings />}
          {activeTab === 'help' && <HelpSupport />}
        </div>
      </div>
    </div>
  );
};

export default App;
