import { create } from 'zustand';
import { API_BASE_URL, getHardwareId } from '../config';

export interface Profile {
  id: string;
  name: string;
  group: string;
  proxy: string;
  proxyId?: string;
  proxyStatus: 'active' | 'dead' | 'checking' | 'none';
  os: 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS';
  browser: string;
  tags: string[];
  status: 'Running' | 'Stopped';
  lastUsed: string;
}

interface ProfileState {
  profiles: Profile[];
  searchQuery: string;
  selectedGroup: string;
  selectedProfiles: string[];
  isLoading: boolean;
  setSearchQuery: (query: string) => void;
  setSelectedGroup: (group: string) => void;
  toggleSelectProfile: (id: string) => void;
  toggleSelectAll: () => void;
  fetchProfiles: () => Promise<void>;
  addProfile: (data: { name: string; group: string; os: string; browser: string; tags: string[]; proxyId?: string }) => Promise<void>;
  updateProfile: (id: string, data: { name?: string; group?: string; os?: string; browser?: string; tags?: string[]; proxyId?: string }) => Promise<void>;
  startProfile: (id: string) => Promise<void>;
  stopProfile: (id: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
}

const PROFILES_URL = `${API_BASE_URL}/profiles`;

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  searchQuery: '',
  selectedGroup: 'All',
  selectedProfiles: [],
  isLoading: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  
  toggleSelectProfile: (id) => set((state) => {
    const isSelected = state.selectedProfiles.includes(id);
    return {
      selectedProfiles: isSelected
        ? state.selectedProfiles.filter(pId => pId !== id)
        : [...state.selectedProfiles, id]
    };
  }),

  toggleSelectAll: () => set((state) => {
    const activeProfiles = state.profiles.map(p => p.id);
    const allSelected = state.selectedProfiles.length === activeProfiles.length;
    return { selectedProfiles: allSelected ? [] : activeProfiles };
  }),

  fetchProfiles: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(PROFILES_URL, {
        headers: { 'x-hardware-id': getHardwareId() },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            group: p.group,
            proxy: p.proxy,
            proxyId: p.proxyId,
            proxyStatus: (p.proxyStatus === 'none' ? 'none' : 'active') as Profile['proxyStatus'],
            os: p.os,
            browser: p.browser,
            tags: p.tags,
            status: p.status,
            lastUsed: p.lastUsed ? new Date(p.lastUsed).toLocaleString() : 'Never',
          }));
          set({ profiles: mapped, isLoading: false });
          return;
        }
      }
      set({ profiles: [], isLoading: false });
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
      set({ profiles: [], isLoading: false });
    }
  },

  startProfile: async (id) => {
    set((state) => ({
      profiles: state.profiles.map(p => p.id === id ? { ...p, status: 'Running' as const } : p)
    }));
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.launchBrowser) {
        const result = await electronAPI.launchBrowser(id);
        if (!result.success) {
          alert(`Failed to open browser: ${result.error || 'Unknown error'}`);
          set((state) => ({
            profiles: state.profiles.map(p => p.id === id ? { ...p, status: 'Stopped' as const } : p)
          }));
          return;
        }
      } else {
        const res = await fetch(`${PROFILES_URL}/${id}/start`, {
          method: 'POST',
          headers: { 'x-hardware-id': getHardwareId() },
        });
        const data = await res.json();
        if (!res.ok) {
          alert(`Failed to open browser: ${data.message || 'Server error'}`);
          set((state) => ({
            profiles: state.profiles.map(p => p.id === id ? { ...p, status: 'Stopped' as const } : p)
          }));
          return;
        }
      }
      get().fetchProfiles();
    } catch (e: any) {
      alert(`Failed to open browser: ${e.message || 'Network error'}`);
      set((state) => ({
        profiles: state.profiles.map(p => p.id === id ? { ...p, status: 'Stopped' as const } : p)
      }));
    }
  },

  addProfile: async (data) => {
    try {
      const res = await fetch(PROFILES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        get().fetchProfiles();
        return;
      }
      throw new Error('create failed');
    } catch (e: any) {
      console.error('Failed to create profile:', e);
    }
  },

  updateProfile: async (id, data) => {
    set((state) => ({
      profiles: state.profiles.map(p => p.id === id ? { ...p, ...data } as Profile : p)
    }));
    try {
      const res = await fetch(`${PROFILES_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-hardware-id': getHardwareId() },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        get().fetchProfiles();
      }
    } catch (e) {
      console.error('Failed to update profile:', e);
    }
  },

  stopProfile: async (id) => {
    set((state) => ({
      profiles: state.profiles.map(p => p.id === id ? { ...p, status: 'Stopped' as const } : p)
    }));
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.closeBrowser) {
        await electronAPI.closeBrowser(id);
      }
      await fetch(`${PROFILES_URL}/${id}/stop`, {
        method: 'POST',
        headers: { 'x-hardware-id': getHardwareId() },
      });
      get().fetchProfiles();
    } catch (e) {
      console.error('Stop failed', e);
    }
  },

  deleteProfile: async (id) => {
    try {
      await fetch(`${PROFILES_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'x-hardware-id': getHardwareId() },
      });
    } catch {}
    set((state) => ({
      profiles: state.profiles.filter(p => p.id !== id),
      selectedProfiles: state.selectedProfiles.filter(pId => pId !== id)
    }));
  }
}));
