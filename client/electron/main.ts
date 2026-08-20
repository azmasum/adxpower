import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
const SERVER_PORT = 3000;

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
  return `http://localhost:${SERVER_PORT}`;
}

function getApiUrl(): string {
  return `${getServerUrl()}/api/v1`;
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
      await axios.post(`${getApiUrl()}/profiles/${profileId}/stop`);
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
