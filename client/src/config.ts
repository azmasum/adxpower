const STORAGE_KEY = 'adxpower_server_url';
const DEFAULT_API = 'http://localhost:3000';

function getServerUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {}
  return DEFAULT_API;
}

export function setServerUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ''));
}

export function getServerUrlExport(): string {
  return getServerUrl();
}

export const API_BASE_URL = `${getServerUrl()}/api/v1`;
export const API_URL = `${getServerUrl()}/api`;

export const DEV_HARDWARE_ID = import.meta.env.VITE_HARDWARE_ID || '';

export function getHardwareId(): string {
  if (DEV_HARDWARE_ID) return DEV_HARDWARE_ID;
  const stored = localStorage.getItem('hardware_id');
  if (stored) return stored;
  const id = `PC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  localStorage.setItem('hardware_id', id);
  return id;
}
