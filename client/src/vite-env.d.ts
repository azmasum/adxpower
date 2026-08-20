/// <reference types="vite/client" />

interface ElectronAPI {
  openProfile: (profileId: string) => Promise<any>;
  closeProfile: (profileId: string) => Promise<any>;
  verifyLicense: (licenseKey: string) => Promise<any>;
  openFile: () => Promise<string | null>;
  saveSettings: (data: any) => Promise<any>;
  getSettings: () => Promise<any>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};