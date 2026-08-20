import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openProfile: (profileId: string) => ipcRenderer.invoke('profile:open', profileId),
  closeProfile: (profileId: string) => ipcRenderer.invoke('profile:close', profileId),
  launchBrowser: (profileId: string, options?: any) => ipcRenderer.invoke('browser:launch', profileId, options || {}),
  closeBrowser: (profileId: string) => ipcRenderer.invoke('browser:close', profileId),
  isBrowserRunning: (profileId: string) => ipcRenderer.invoke('browser:isRunning', profileId),
  executeRpa: (profileId: string, steps: any[]) => ipcRenderer.invoke('rpa:execute', profileId, steps),
  verifyLicense: (licenseKey: string) => ipcRenderer.invoke('license:verify', licenseKey),
  selectBinary: () => ipcRenderer.invoke('dialog:openFile'),
  saveSettings: (data: any) => ipcRenderer.invoke('settings:save', data),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getHardwareId: () => ipcRenderer.invoke('get:hardwareId'),
});
