import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Browser
  launchBrowser: (profileId: string, options?: any) => ipcRenderer.invoke('browser:launch', profileId, options || {}),
  closeBrowser: (profileId: string) => ipcRenderer.invoke('browser:close', profileId),
  isBrowserRunning: (profileId: string) => ipcRenderer.invoke('browser:isRunning', profileId),
  openProfile: (profileId: string) => ipcRenderer.invoke('profile:open', profileId),
  closeProfile: (profileId: string) => ipcRenderer.invoke('profile:close', profileId),

  // RPA
  executeRpa: (profileId: string, steps: any[]) => ipcRenderer.invoke('rpa:execute', profileId, steps),

  // Cookies
  exportCookies: (profileId: string) => ipcRenderer.invoke('cookies:export', profileId),
  importCookies: (profileId: string, cookies: any[]) => ipcRenderer.invoke('cookies:import', profileId, cookies),

  // Warmup
  runWarmup: (profileId: string, sites: string[]) => ipcRenderer.invoke('warmup:run', profileId, sites),

  // Synchronizer
  startSync: (masterId: string, slaveIds: string[], options: any) => ipcRenderer.invoke('sync:start', masterId, slaveIds, options),
  stopSync: (masterId: string) => ipcRenderer.invoke('sync:stop', masterId),

  // Fingerprint
  applyFingerprint: (profileId: string, fingerprint: any) => ipcRenderer.invoke('fingerprint:apply', profileId, fingerprint),

  // License
  verifyLicense: (licenseKey: string) => ipcRenderer.invoke('license:verify', licenseKey),

  // Settings
  selectBinary: () => ipcRenderer.invoke('dialog:openFile'),
  saveSettings: (data: any) => ipcRenderer.invoke('settings:save', data),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getHardwareId: () => ipcRenderer.invoke('get:hardwareId'),
});
