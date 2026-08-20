import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openProfile: (profileId: string) => ipcRenderer.invoke('profile:open', profileId),
  closeProfile: (profileId: string) => ipcRenderer.invoke('profile:close', profileId),
  verifyLicense: (licenseKey: string) => ipcRenderer.invoke('license:verify', licenseKey),
  selectBinary: () => ipcRenderer.invoke('dialog:openFile'),
  saveSettings: (data: any) => ipcRenderer.invoke('settings:save', data),
  getSettings: () => ipcRenderer.invoke('settings:get'),
});