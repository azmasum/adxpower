import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
const runningBrowsers = new Map<string, ChildProcess>();

function getSystemHardwareId(): string {
  try {
    const { machineIdSync } = require('node-machine-id');
    return machineIdSync();
  } catch {
    return 'FALLBACK_ID_' + process.arch + '_' + process.platform;
  }
}

function getServerUrl(): string {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.serverUrl) return settings.serverUrl;
    }
  } catch {}
  return `https://adxpower-api.onrender.com`;
}

function getApiUrl(): string {
  return `${getServerUrl()}/api/v1`;
}

function findChromePath(): string | null {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AdxPower v1.0',
    show: false,
    icon: path.join(__dirname, app.isPackaged ? '../public/adxpower-logo.ico' : '../public/adxpower-logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  } else {
    mainWindow.loadURL(process.env.VITE_DEV_URL || 'http://localhost:5173');
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load: ${validatedURL} - ${errorCode}: ${errorDescription}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createWindow();

  ipcMain.handle('browser:launch', async (_event, profileId: string, options: { proxyUrl?: string }) => {
    if (runningBrowsers.has(profileId)) {
      return { success: true, message: 'Already running' };
    }

    const chromePath = findChromePath();
    if (!chromePath) {
      return { success: false, error: 'Google Chrome not found. Please install Chrome.' };
    }

    let launchData: any = {};
    try {
      const hwId = getSystemHardwareId();
      const res = await axios.post(`${getApiUrl()}/profiles/${profileId}/launch-data`, {}, {
        headers: { 'x-hardware-id': hwId }
      });
      launchData = res.data;
    } catch (err: any) {
      return { success: false, error: `Server error: ${err.response?.data?.message || err.message}` };
    }

    const profileDir = path.join(app.getPath('userData'), 'profiles-data', profileId);
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    const args = [
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--disable-blink-features=AutomationControlled',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    ];

    if (launchData.proxyUrl) {
      try {
        const parsedUrl = new URL(launchData.proxyUrl);
        args.push(`--proxy-server=${parsedUrl.protocol}//${parsedUrl.host}`);
      } catch {
        args.push(`--proxy-server=${launchData.proxyUrl}`);
      }
    }

    if (launchData.extensionPaths && launchData.extensionPaths.length > 0) {
      const validPaths = launchData.extensionPaths.filter((p: string) => fs.existsSync(p));
      if (validPaths.length > 0) {
        args.push(`--load-extension=${validPaths.join(',')}`);
        args.push(`--disable-extensions-except=${validPaths.join(',')}`);
      }
    }

    try {
      const child = spawn(chromePath, args, { detached: true, stdio: 'ignore' });
      child.unref();

      runningBrowsers.set(profileId, child);

      child.on('exit', () => {
        runningBrowsers.delete(profileId);
      });

      child.on('error', () => {
        runningBrowsers.delete(profileId);
      });

      return { success: true, proxy: launchData.proxy || 'Direct', profileName: launchData.name };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:close', async (_event, profileId: string) => {
    const child = runningBrowsers.get(profileId);
    if (child && !child.killed) {
      child.kill('SIGTERM');
      runningBrowsers.delete(profileId);
    }
    return { success: true };
  });

  ipcMain.handle('browser:isRunning', (_event, profileId: string) => {
    return runningBrowsers.has(profileId);
  });

  ipcMain.handle('profile:open', async (event, profileId) => {
    try {
      const response = await axios.post(`${getApiUrl()}/profiles/${profileId}/start`, {}, {
        headers: { 'x-hardware-id': getSystemHardwareId() }
      });
      return { success: true, wsEndpoint: response.data.wsEndpoint };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  });

  ipcMain.handle('profile:close', async (event, profileId) => {
    try {
      await axios.post(`${getApiUrl()}/profiles/${profileId}/stop`, {}, {
        headers: { 'x-hardware-id': getSystemHardwareId() }
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('license:verify', async (event, licenseKey) => {
    try {
      const res = await axios.post(`${getServerUrl()}/api/license/verify`, {
        licenseKey,
        hardwareId: getSystemHardwareId()
      });
      return { verified: true, maxProfiles: res.data.maxProfiles };
    } catch (err: any) {
      return { verified: false, reason: err.response?.data?.message || 'Offline' };
    }
  });

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Chrome', extensions: ['exe'] }]
    });
    return result.filePaths[0] || null;
  });

  ipcMain.handle('settings:save', async (e, data) => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
    return { success: true, path: settingsPath };
  });

  ipcMain.handle('settings:get', async () => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
    return null;
  });

  ipcMain.handle('get:serverUrl', () => {
    return getServerUrl();
  });

  ipcMain.handle('get:hardwareId', () => {
    return getSystemHardwareId();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
