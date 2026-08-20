import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
const runningBrowsers = new Map<string, ChildProcess>();
const profileDebugPorts = new Map<string, number>();

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

function getKeyCode(key: string): number {
  const map: Record<string, number> = {
    Enter: 13, Backspace: 8, Tab: 9, Escape: 27, Space: 32,
    ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
    Delete: 46, Home: 36, End: 35, PageUp: 33, PageDown: 34,
    Control: 17, Alt: 18, Shift: 16, Meta: 91,
  };
  return map[key] || key.charCodeAt(0);
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

  ipcMain.handle('browser:launch', async (_event, profileId: string, options: { hwid?: string }) => {
    if (runningBrowsers.has(profileId)) {
      return { success: true, message: 'Already running' };
    }

    const chromePath = findChromePath();
    if (!chromePath) {
      return { success: false, error: 'Google Chrome not found. Please install Chrome.' };
    }

    let launchData: any = {};
    try {
      const hwId = options?.hwid || getSystemHardwareId();
      const res = await axios.post(`${getApiUrl()}/profiles/${profileId}/start`, {}, {
        headers: { 'x-hardware-id': hwId }
      });
      launchData = res.data;
    } catch (err: any) {
      return { success: false, error: `Server error: ${err.response?.data?.message || err.message}` };
    }

    const profileDir = path.join(app.getPath('userData'), 'profiles-data', profileId);
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    const debugPort = 9222 + Math.floor(Math.random() * 100);
    const args = [
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--disable-blink-features=AutomationControlled',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      `--remote-debugging-port=${debugPort}`,
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
      profileDebugPorts.set(profileId, debugPort);

      child.on('exit', () => {
        runningBrowsers.delete(profileId);
        profileDebugPorts.delete(profileId);
      });

      child.on('error', () => {
        runningBrowsers.delete(profileId);
        profileDebugPorts.delete(profileId);
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

  ipcMain.handle('rpa:execute', async (_event, profileId: string, steps: any[]) => {
    const port = profileDebugPorts.get(profileId);
    if (!port) {
      return { success: false, error: 'Browser not running for this profile. Start it first.' };
    }

    const http = require('http');
    const WebSocket = require('ws');

    const getTargets = (): Promise<any[]> => new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json`, (res: any) => {
        let data = '';
        res.on('data', (c: any) => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error('Failed to parse targets')); }
        });
      }).on('error', reject);
    });

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    try {
      const targets = await getTargets();
      const page = targets.find((t: any) => t.type === 'page');
      if (!page) return { success: false, error: 'No browser page found', logs };

      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', (e: any) => reject(new Error(`WebSocket error: ${e.message}`)));
      });

      let msgId = 0;
      const send = (method: string, params: any = {}): Promise<any> => new Promise((resolve, reject) => {
        const id = ++msgId;
        const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 30000);
        const handler = (data: any) => {
          const msg = JSON.parse(data);
          if (msg.id === id) {
            clearTimeout(timeout);
            ws.off('message', handler);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });

      addLog(`Browser connected (profile ${profileId})`);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const type = (step.type || step.action || '').toString().toUpperCase();
        const target = step.url || step.value || step.selector || '';
        addLog(`[${i + 1}/${steps.length}] ${type}: ${target}`);

        try {
          if (type === 'NAVIGATE' && step.url) {
            await send('Page.navigate', { url: step.url });
            await sleep(2000);
          } else if (type === 'WAIT') {
            const sec = parseInt((step.value || '10').toString()) || 10;
            await sleep(sec * 1000);
          } else if (type === 'CLICK' && step.selector) {
            const { result } = await send('Runtime.evaluate', {
              expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}')`,
            });
            if (result?.objectId) {
              await send('DOM.focus', { objectId: result.objectId });
              await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 0, y: 0, button: 'left', clickCount: 1 });
              await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 0, y: 0, button: 'left', clickCount: 1 });
            } else {
              await send('Runtime.evaluate', {
                expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}').click()`,
              });
            }
          } else if (type === 'DOUBLE_CLICK' && step.selector) {
            await send('Runtime.evaluate', {
              expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}').click()`,
            });
            await sleep(50);
            await send('Runtime.evaluate', {
              expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}').click()`,
            });
          } else if (type === 'RIGHT_CLICK' && step.selector) {
            await send('Runtime.evaluate', {
              expression: `
                const el = document.querySelector('${step.selector.replace(/'/g, "\\'")}');
                const rect = el.getBoundingClientRect();
                const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: rect.x, clientY: rect.y });
                el.dispatchEvent(e);
              `,
            });
          } else if (type === 'HOVER' && step.selector) {
            await send('Runtime.evaluate', {
              expression: `
                const el = document.querySelector('${step.selector.replace(/'/g, "\\'")}');
                el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              `,
            });
          } else if (type === 'TYPE' && step.selector) {
            const text = step.value || step.text || '';
            await send('Runtime.evaluate', {
              expression: `
                const el = document.querySelector('${step.selector.replace(/'/g, "\\'")}');
                el.focus();
                el.value = '';
              `,
            });
            for (const char of text) {
              await send('Input.dispatchKeyEvent', { type: 'keyDown', text: char });
              await send('Input.dispatchKeyEvent', { type: 'keyUp', text: char });
              await sleep(50);
            }
          } else if (type === 'PRESS_KEY') {
            const key = step.value || 'Enter';
            await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: getKeyCode(key), key });
            await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: getKeyCode(key), key });
          } else if (type === 'SELECT' && step.selector) {
            await send('Runtime.evaluate', {
              expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}').value = '${(step.value || '').replace(/'/g, "\\'")}'`,
            });
          } else if (type === 'SCROLL') {
            const px = parseInt(step.value || '500') || 500;
            const dir = step.direction || 'down';
            const y = dir === 'down' ? px : dir === 'up' ? -px : 0;
            const x = dir === 'left' ? -px : dir === 'right' ? px : 0;
            await send('Runtime.evaluate', { expression: `window.scrollBy(${x}, ${y})` });
          } else if (type === 'SCREENSHOT') {
            const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
            addLog(`  Screenshot captured`);
          } else if (type === 'EXTRACT_TEXT' && step.selector) {
            const { result } = await send('Runtime.evaluate', {
              expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}')?.textContent?.trim() || ''`,
              returnByValue: true,
            });
            addLog(`  Extracted: "${(result?.value || '').substring(0, 80)}"`);
          } else {
            addLog(`  Skipped: unknown type "${type}"`);
          }
        } catch (e: any) {
          addLog(`  ERROR at step ${i + 1}: ${e.message}`);
          ws.close();
          return { success: false, total: steps.length, completed: i, error: e.message, logs };
        }
      }

      ws.close();
      addLog(`Flow completed - ${steps.length} steps`);
      return { success: true, total: steps.length, logs };
    } catch (err: any) {
      return { success: false, error: err.message, logs };
    }
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
