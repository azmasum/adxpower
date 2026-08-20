import React from 'react';
import { HelpCircle, Mail, MessageCircle, Book, ExternalLink, Youtube, Headphones, Globe, ShieldCheck } from 'lucide-react';

export const HelpSupport: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-surface-base text-gray-100 font-sans antialiased overflow-y-auto">
      <div className="px-6 py-5 border-b border-surface-border bg-surface-raised/50">
        <h2 className="text-[17px] font-bold text-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-cyan/10 border border-brand-500/20 flex items-center justify-center">
            <HelpCircle size={18} className="text-brand-400" />
          </div>
          Help & Support
        </h2>
        <p className="text-[12px] text-gray-500 mt-1 ml-[46px]">Documentation, tutorials and contact information</p>
      </div>

      <div className="max-w-4xl w-full mx-auto p-6 space-y-6">
        {/* Help cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5 card-hover cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-3 group-hover:bg-brand-500/20 transition-colors">
              <Book size={18} className="text-brand-400" />
            </div>
            <h3 className="text-[13px] font-semibold text-white">Documentation</h3>
            <p className="text-[12px] text-gray-400 mt-1.5 leading-relaxed">Learn how to use fingerprint, proxy, cookie robot and RPA features</p>
            <span className="text-[11px] text-brand-400 mt-3 flex items-center gap-1 font-medium">Open Docs <ExternalLink size={11} /></span>
          </div>

          <div className="bg-surface-raised border border-surface-border rounded-xl p-5 card-hover cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center mb-3 group-hover:bg-accent-rose/20 transition-colors">
              <Youtube size={18} className="text-accent-rose" />
            </div>
            <h3 className="text-[13px] font-semibold text-white">Video Tutorials</h3>
            <p className="text-[12px] text-gray-400 mt-1.5 leading-relaxed">Watch setup and automation tutorials on YouTube</p>
            <span className="text-[11px] text-brand-400 mt-3 flex items-center gap-1 font-medium">Watch <ExternalLink size={11} /></span>
          </div>

          <div className="bg-surface-raised border border-surface-border rounded-xl p-5 card-hover cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center mb-3 group-hover:bg-accent-emerald/20 transition-colors">
              <Headphones size={18} className="text-accent-emerald" />
            </div>
            <h3 className="text-[13px] font-semibold text-white">Live Chat Support</h3>
            <p className="text-[12px] text-gray-400 mt-1.5 leading-relaxed">Chat with our team for license and technical issues</p>
            <span className="text-[11px] text-brand-400 mt-3 flex items-center gap-1 font-medium">Start Chat <ExternalLink size={11} /></span>
          </div>

          <div className="bg-surface-raised border border-surface-border rounded-xl p-5 card-hover cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center mb-3 group-hover:bg-accent-amber/20 transition-colors">
              <Mail size={18} className="text-accent-amber" />
            </div>
            <h3 className="text-[13px] font-semibold text-white">Email Support</h3>
            <p className="text-[12px] text-gray-400 mt-1.5 leading-relaxed">support@adxpower.local</p>
            <span className="text-[11px] text-brand-400 mt-3 flex items-center gap-1 font-medium">Send Email <ExternalLink size={11} /></span>
          </div>
        </div>

        {/* System info card */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <ShieldCheck size={16} className="text-brand-400" />
            <h3 className="text-[13px] font-semibold text-white">System Information</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-card border border-surface-border rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Version</div>
              <div className="text-[13px] text-white font-medium mt-1">v1.0</div>
            </div>
            <div className="bg-surface-card border border-surface-border rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Status</div>
              <div className="text-[13px] text-accent-emerald font-medium mt-1">Premium</div>
            </div>
            <div className="bg-surface-card border border-surface-border rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">License</div>
              <div className="text-[13px] text-accent-emerald font-medium mt-1">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
