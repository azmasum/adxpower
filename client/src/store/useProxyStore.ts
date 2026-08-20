import { create } from 'zustand';
import { API_BASE_URL, getHardwareId } from '../config';

export interface Proxy {
  id: string;
  host: string;
  port: number;
  type: 'HTTP' | 'HTTPS' | 'SOCKS5' | 'SOCKS4';
  username?: string;
  password?: string;
  status: 'active' | 'dead' | 'untested';
  latency?: number;
  ip?: string;
  country?: string;
  countryName?: string;
}

const PROXIES_URL = `${API_BASE_URL}/proxies`;
const HEADERS = () => ({ 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() });

interface ProxyState {
  proxies: Proxy[];
  isLoading: boolean;
  fetchProxies: () => Promise<void>;
  addProxy: (data: { host: string; port: number; type: string; username?: string; password?: string }) => Promise<void>;
  updateProxy: (id: string, data: { host?: string; port?: number; type?: string; username?: string; password?: string }) => Promise<void>;
  deleteProxy: (id: string) => Promise<void>;
  checkProxy: (id: string) => Promise<void>;
  checkAllProxies: () => Promise<void>;
  scrapeFreeProxies: (countries?: string[]) => Promise<void>;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxies: [],
  isLoading: false,

  fetchProxies: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(PROXIES_URL, { headers: HEADERS() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          set({ proxies: data, isLoading: false });
          return;
        }
      }
      set({ proxies: [], isLoading: false });
    } catch {
      console.error('Failed to fetch proxies');
      set({ proxies: [], isLoading: false });
    }
  },

  addProxy: async (data) => {
    try {
      const res = await fetch(PROXIES_URL, {
        method: 'POST',
        headers: HEADERS(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        get().fetchProxies();
      }
    } catch (e) {
      console.error('Failed to add proxy:', e);
    }
  },

  updateProxy: async (id, data) => {
    set((state) => ({
      proxies: state.proxies.map(p => p.id === id ? { ...p, ...data } as Proxy : p)
    }));
    try {
      const res = await fetch(`${PROXIES_URL}/${id}`, {
        method: 'PATCH',
        headers: HEADERS(),
        body: JSON.stringify(data),
      });
      if (res.ok) get().fetchProxies();
    } catch (e) {
      console.error('Failed to update proxy:', e);
    }
  },

  deleteProxy: async (id) => {
    set((state) => ({
      proxies: state.proxies.filter(p => p.id !== id)
    }));
    try {
      await fetch(`${PROXIES_URL}/${id}`, {
        method: 'DELETE',
        headers: HEADERS(),
      });
    } catch {}
  },

  checkProxy: async (id) => {
    set((state) => ({
      proxies: state.proxies.map(p => p.id === id ? { ...p, status: 'untested' as const } : p)
    }));
    try {
      const res = await fetch(`${PROXIES_URL}/${id}/check`, {
        method: 'POST',
        headers: HEADERS(),
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          proxies: state.proxies.map(p => p.id === id ? {
            ...p,
            status: updated.status || 'active',
            latency: updated.latency,
            ip: updated.ip,
            country: updated.country,
            countryName: updated.countryName,
          } : p)
        }));
        return;
      }
    } catch {}
    set((state) => ({
      proxies: state.proxies.map(p => p.id === id ? { ...p, status: 'dead' as const } : p)
    }));
  },

  checkAllProxies: async () => {
    const { proxies, checkProxy } = get();
    for (const p of proxies) {
      await checkProxy(p.id);
    }
  },

  scrapeFreeProxies: async (countries?: string[]) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${PROXIES_URL}/scrape`, {
        method: 'POST',
        headers: HEADERS(),
        body: JSON.stringify({ countries }),
      });
      if (res.ok) {
        get().fetchProxies();
        return;
      }
    } catch (e) {
      console.error('Scrape failed:', e);
    }
    set({ isLoading: false });
  },
}));
