import { create } from 'zustand';
import { API_BASE_URL, getHardwareId } from '../config';

interface RpaStep {
  id: string;
  type: 'NAVIGATE' | 'WAIT' | 'CLICK' | 'TYPE' | 'SCROLL' | 'HOVER' | 'SELECT' | 'SCREENSHOT' | 'PRESS_KEY' | 'EXTRACT_TEXT' | 'RIGHT_CLICK' | 'DOUBLE_CLICK';
  url?: string;
  value?: string;
  selector?: string;
  text?: string;
  direction?: string;
}

interface RpaStore {
  steps: RpaStep[];
  logs: string[];
  isRunning: boolean;
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  addStep: (type: RpaStep['type']) => void;
  updateStep: (id: string, data: Partial<RpaStep>) => void;
  removeStep: (id: string) => void;
  runFlow: () => Promise<void>;
  clearLogs: () => void;
}

export const useRpaStore = create<RpaStore>((set, get) => ({
  steps: [
    { id: '1', type: 'NAVIGATE', url: 'https://toolshuball.blogspot.com/' },
    { id: '2', type: 'WAIT', value: 'Wait 10s' },
  ],
  logs: [],
  isRunning: false,
  selectedProfileId: '',

  setSelectedProfileId: (id) => set({ selectedProfileId: id }),

  addStep: (type) =>
    set((state) => ({
      steps: [
        ...state.steps,
        {
          id: Date.now().toString(),
          type,
          url: type === 'NAVIGATE' ? 'https://' : undefined,
          value: type === 'WAIT' ? 'Wait 10s' : type === 'SCROLL' ? '500' : type === 'SELECT' ? 'Option 1' : type === 'PRESS_KEY' ? 'Enter' : type === 'EXTRACT_TEXT' ? 'h1' : '',
          selector: ['CLICK', 'TYPE', 'HOVER', 'SELECT', 'SCREENSHOT', 'RIGHT_CLICK', 'DOUBLE_CLICK', 'EXTRACT_TEXT'].includes(type) ? '' : undefined,
          direction: type === 'SCROLL' ? 'down' : undefined,
        },
      ],
    })),

  updateStep: (id, data) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),

  removeStep: (id) =>
    set((state) => ({
      steps: state.steps.filter((s) => s.id !== id),
    })),

  clearLogs: () => set({ logs: [] }),

  runFlow: async () => {
    const { steps, selectedProfileId } = get();
    if (!selectedProfileId) {
      set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ERROR: No profile selected`] }));
      return;
    }
    set({ isRunning: true, logs: [] });
    const addLog = (msg: string) =>
      set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] }));

    try {
      addLog(`Starting flow with ${steps.length} steps for profile ${selectedProfileId}...`);
      
      const payload = {
        profileId: selectedProfileId,
        steps: steps.map((s) => ({
          type: s.type,
          url: s.url,
          value: s.value,
          selector: s.selector,
          text: s.text,
        })),
      };

      addLog(`POST ${API_BASE_URL}/rpa/run`);
      
      const res = await fetch(`${API_BASE_URL}/rpa/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      if (data.logs) {
        data.logs.forEach((l: string) => addLog(l));
      }

      if (data.success) {
        addLog(`✅ Flow completed - ${data.total} steps`);
      } else {
        addLog(`❌ Flow failed at step ${data.completed}: ${data.error}`);
      }
    } catch (e: any) {
      addLog(`❌ ERROR: ${e.message}`);
      console.error('RPA Run Error', e);
    } finally {
      set({ isRunning: false });
    }
  },
}));
