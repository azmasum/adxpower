import { useState } from 'react';
import { useRpaStore } from '../store/useRpaStore';
import {
  Play, Square, Trash2, Plus, MousePointer, Type, Clock, Globe,
  Loader2, RotateCcw, ArrowDownUp, Eye, List, Camera, Keyboard,
  TextCursor, ArrowRight, Pointer
} from 'lucide-react';

const STEP_ICONS: Record<string, typeof Play> = {
  CLICK: MousePointer,
  DOUBLE_CLICK: MousePointer,
  RIGHT_CLICK: Pointer,
  TYPE: Type,
  WAIT: Clock,
  NAVIGATE: Globe,
  SCROLL: ArrowDownUp,
  HOVER: Eye,
  SELECT: List,
  SCREENSHOT: Camera,
  PRESS_KEY: Keyboard,
  EXTRACT_TEXT: TextCursor,
};

const STEP_COLORS: Record<string, string> = {
  NAVIGATE: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  CLICK: 'from-accent-amber/20 to-accent-amber/5 border-accent-amber/20 text-accent-amber',
  DOUBLE_CLICK: 'from-accent-amber/20 to-accent-amber/5 border-accent-amber/20 text-accent-amber',
  RIGHT_CLICK: 'from-accent-amber/20 to-accent-amber/5 border-accent-amber/20 text-accent-amber',
  TYPE: 'from-accent-blue/20 to-accent-blue/5 border-accent-blue/20 text-accent-blue',
  WAIT: 'from-gray-500/20 to-gray-500/5 border-gray-500/20 text-gray-400',
  SCROLL: 'from-accent-cyan/20 to-accent-cyan/5 border-accent-cyan/20 text-accent-cyan',
  HOVER: 'from-brand-400/20 to-brand-400/5 border-brand-400/20 text-brand-400',
  SELECT: 'from-accent-emerald/20 to-accent-emerald/5 border-accent-emerald/20 text-accent-emerald',
  SCREENSHOT: 'from-accent-rose/20 to-accent-rose/5 border-accent-rose/20 text-accent-rose',
  PRESS_KEY: 'from-purple-400/20 to-purple-400/5 border-purple-400/20 text-purple-400',
  EXTRACT_TEXT: 'from-accent-blue/20 to-accent-blue/5 border-accent-blue/20 text-accent-blue',
};

export default function RpaRobot() {
  const { steps, logs, isRunning, selectedProfileId, addStep, updateStep, removeStep, runFlow, clearLogs } = useRpaStore();
  const [profileIdInput, setProfileIdInput] = useState(selectedProfileId || 'profile-seed-001');

  const handleRun = async () => {
    useRpaStore.getState().setSelectedProfileId(profileIdInput || 'profile-seed-001');
    await runFlow();
  };

  return (
    <div className="flex h-full bg-surface-base text-gray-100 font-sans antialiased">
      {/* LEFT - ACTIONS */}
      <div className="w-[220px] border-r border-surface-border p-4 space-y-1 bg-surface-raised/50 overflow-y-auto custom-scrollbar">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Actions</h3>
        {[
          { type: 'NAVIGATE', icon: Globe, label: 'Navigate' },
          { type: 'CLICK', icon: MousePointer, label: 'Click' },
          { type: 'DOUBLE_CLICK', icon: MousePointer, label: 'Double Click' },
          { type: 'RIGHT_CLICK', icon: Pointer, label: 'Right Click' },
          { type: 'HOVER', icon: Eye, label: 'Hover' },
          { type: 'TYPE', icon: Type, label: 'Type Text' },
          { type: 'PRESS_KEY', icon: Keyboard, label: 'Press Key' },
          { type: 'SELECT', icon: List, label: 'Select Dropdown' },
          { type: 'SCROLL', icon: ArrowDownUp, label: 'Scroll' },
          { type: 'WAIT', icon: Clock, label: 'Wait' },
          { type: 'SCREENSHOT', icon: Camera, label: 'Screenshot' },
          { type: 'EXTRACT_TEXT', icon: TextCursor, label: 'Extract Text' },
        ].map(({ type, icon: Icon, label }) => (
          <button key={type} onClick={() => addStep(type as any)}
            className="w-full text-left px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-[11px] font-medium text-gray-300 hover:bg-surface-overlay hover:text-white hover:border-surface-border-light flex items-center gap-2 transition-all">
            <Icon size={12} className="text-brand-400" /> {label}
          </button>
        ))}

        <div className="pt-5">
          <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Profile ID</label>
          <input
            value={profileIdInput}
            onChange={(e) => setProfileIdInput(e.target.value)}
            className="w-full mt-2 px-3 py-2.5 rounded-lg bg-surface-card border border-surface-border text-[12px] text-white font-mono input-glow transition-all"
            placeholder="profile-seed-001"
          />
          <p className="text-[10px] text-gray-600 mt-1.5">Auto-starts if not running</p>
        </div>
      </div>

      {/* CENTER - FLOW */}
      <div className="flex-1 p-5 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-amber/20 to-accent-amber/5 border border-accent-amber/20 flex items-center justify-center">
              <Play size={14} className="text-accent-amber" />
            </div>
            RPA Flow Builder
          </h2>
          <div className="flex gap-2">
            <button onClick={clearLogs}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-[12px] text-gray-400 hover:text-white hover:bg-surface-overlay transition-all">
              <RotateCcw size={12} /> Clear Log
            </button>
            <button onClick={handleRun} disabled={isRunning || steps.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all btn-premium ${
                isRunning
                  ? 'bg-surface-card text-gray-400 border border-surface-border cursor-not-allowed'
                  : 'bg-gradient-to-r from-accent-emerald to-emerald-600 text-white shadow-glow-sm hover:shadow-glow-md'
              }`}>
              {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
              {isRunning ? 'Running...' : 'Run Flow'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-2">
          {steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-3">
                <Play size={24} className="text-gray-600" />
              </div>
              <p className="text-[13px] font-medium text-gray-400">No steps yet</p>
              <p className="text-[11px] text-gray-600 mt-1">Click an action on the left to add steps</p>
            </div>
          ) : steps.map((step, idx) => {
            const Icon = STEP_ICONS[step.type] || Play;
            const colors = STEP_COLORS[step.type] || STEP_COLORS.WAIT;
            return (
              <div key={step.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-raised border border-surface-border card-hover">
                <span className="w-6 h-6 grid place-items-center rounded-lg bg-surface-card border border-surface-border text-[10px] font-bold text-gray-400">
                  {idx + 1}
                </span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors} border flex items-center justify-center`}>
                  <Icon size={14} />
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold bg-gradient-to-br ${colors} border`}>
                  {step.type}
                </span>
                <input
                  value={step.url || step.value || step.selector || ''}
                  onChange={(e) => {
                    if (step.type === 'NAVIGATE') updateStep(step.id, { url: e.target.value });
                    else if (step.type === 'WAIT' || step.type === 'SCROLL' || step.type === 'PRESS_KEY') updateStep(step.id, { value: e.target.value });
                    else if (step.type === 'EXTRACT_TEXT') updateStep(step.id, { selector: e.target.value });
                    else updateStep(step.id, { selector: e.target.value });
                  }}
                  className="flex-1 bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-brand-500/50 input-glow transition-all"
                  placeholder={
                    step.type === 'NAVIGATE' ? 'https://example.com' :
                    step.type === 'WAIT' ? '10' :
                    step.type === 'SCROLL' ? '500 (px)' :
                    step.type === 'PRESS_KEY' ? 'Enter' :
                    step.type === 'EXTRACT_TEXT' ? 'h1 (CSS selector)' :
                    step.type === 'SCREENSHOT' ? 'selector (optional)' :
                    step.type === 'SELECT' ? '#dropdown (CSS selector)' :
                    'CSS Selector'
                  }
                />
                {(step.type === 'SCROLL') && (
                  <select value={step.direction || 'down'} onChange={e => updateStep(step.id, { direction: e.target.value })}
                    className="bg-surface-card border border-surface-border rounded-lg px-2 py-2 text-[11px] text-white outline-none">
                    <option value="down">Down</option>
                    <option value="up">Up</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                )}
                <button onClick={() => removeStep(step.id)}
                  className="p-2 text-gray-500 hover:text-accent-rose hover:bg-accent-rose/10 rounded-lg transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          <button onClick={() => addStep('NAVIGATE')}
            className="w-full py-3 rounded-xl border-2 border-dashed border-surface-border text-[12px] text-gray-500 hover:text-brand-400 hover:border-brand-500/30 transition-all flex items-center justify-center gap-1.5">
            <Plus size={14} /> Add Step
          </button>
        </div>
      </div>

      {/* RIGHT - LOG */}
      <div className="w-[300px] border-l border-surface-border bg-surface-raised/50 p-4 flex flex-col">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Execution Log</h3>
        <div className="flex-1 overflow-auto space-y-1 text-[11px] font-mono">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <p className="text-[12px]">No logs yet</p>
              <p className="text-[10px] mt-1">Click Run Flow to start</p>
            </div>
          ) : logs.map((log, i) => (
            <div key={i} className={`py-0.5 ${
              log.includes('ERROR') || log.includes('❌') ? 'text-accent-rose' :
              log.includes('✅') ? 'text-accent-emerald' :
              log.includes('Navigated') || log.includes('Clicked') || log.includes('Typed') ? 'text-brand-400' :
              'text-gray-400'
            }`}>{log}</div>
          ))}
        </div>
        {isRunning && (
          <div className="mt-3 bg-surface-card border border-surface-border rounded-lg p-3 flex items-center gap-2">
            <Loader2 size={14} className="text-brand-400 animate-spin" />
            <span className="text-[11px] text-gray-400">Executing flow...</span>
          </div>
        )}
      </div>
    </div>
  );
}
