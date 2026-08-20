import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
const WebSocket = require('ws');

let mainWindow: BrowserWindow | null = null;
const runningBrowsers = new Map<string, ChildProcess>();
const profileDebugPorts = new Map<string, number>();
const syncConnections = new Map<string, { masterWs: any; slaveWs: any[] }>();

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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function getTargets(port: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, (res) => {
      let data = '';
      res.on('data', (c: any) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Failed to parse targets')); }
      });
    }).on('error', reject);
  });
}

function connectCdp(wsUrl: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on('open', () => resolve(ws));
    ws.on('error', (e: any) => reject(new Error(`CDP connect failed: ${e.message}`)));
  });
}

function cdpSend(ws: any, method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
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
}

async function getCdpPage(profileId: string): Promise<{ ws: any; pageTarget: any }> {
  const port = profileDebugPorts.get(profileId);
  if (!port) throw new Error('Browser not running');
  const targets = await getTargets(port);
  const pageTarget = targets.find((t: any) => t.type === 'page');
  if (!pageTarget) throw new Error('No page found');
  const ws = await connectCdp(pageTarget.webSocketDebuggerUrl);
  return { ws, pageTarget };
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

  mainWindow.once('ready-to-show', () => { mainWindow?.show(); });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  } else {
    mainWindow.loadURL(process.env.VITE_DEV_URL || 'http://localhost:5173');
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  createWindow();

  // ==================== BROWSER LAUNCH ====================
  ipcMain.handle('browser:launch', async (_event, profileId: string, options: { hwid?: string }) => {
    if (runningBrowsers.has(profileId)) return { success: true, message: 'Already running' };

    const chromePath = findChromePath();
    if (!chromePath) return { success: false, error: 'Google Chrome not found.' };

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
      } catch { args.push(`--proxy-server=${launchData.proxyUrl}`); }
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
      child.on('exit', () => { runningBrowsers.delete(profileId); profileDebugPorts.delete(profileId); });
      child.on('error', () => { runningBrowsers.delete(profileId); profileDebugPorts.delete(profileId); });
      return { success: true, proxy: launchData.proxy || 'Direct', profileName: launchData.name };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:close', async (_event, profileId: string) => {
    const child = runningBrowsers.get(profileId);
    if (child && !child.killed) { child.kill('SIGTERM'); }
    runningBrowsers.delete(profileId);
    profileDebugPorts.delete(profileId);
    return { success: true };
  });

  ipcMain.handle('browser:isRunning', (_event, profileId: string) => {
    return runningBrowsers.has(profileId);
  });

  // ==================== RPA ====================
  ipcMain.handle('rpa:execute', async (_event, profileId: string, steps: any[]) => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

    try {
      const { ws, pageTarget } = await getCdpPage(profileId);
      addLog(`Connected to browser (profile ${profileId})`);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const type = (step.type || step.action || '').toString().toUpperCase();
        const target = step.url || step.value || step.selector || '';
        addLog(`[${i + 1}/${steps.length}] ${type}: ${target}`);

        try {
          if (type === 'NAVIGATE' && step.url) {
            await cdpSend(ws, 'Page.navigate', { url: step.url });
            await sleep(2000);
          } else if (type === 'WAIT') {
            const sec = parseInt((step.value || '10').toString()) || 10;
            await sleep(sec * 1000);
          } else if (type === 'CLICK' && step.selector) {
            await cdpSend(ws, 'Runtime.evaluate', {
              expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}')?.click()`,
            });
          } else if (type === 'DOUBLE_CLICK' && step.selector) {
            await cdpSend(ws, 'Runtime.evaluate', {
              expression: `const el=document.querySelector('${step.selector.replace(/'/g, "\\'")}'); el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}))`,
            });
          } else if (type === 'RIGHT_CLICK' && step.selector) {
            await cdpSend(ws, 'Runtime.evaluate', {
              expression: `const el=document.querySelector('${step.selector.replace(/'/g, "\\'")}'); const r=el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.x,clientY:r.y}))`,
            });
          } else if (type === 'HOVER' && step.selector) {
            await cdpSend(ws, 'Runtime.evaluate', {
              expression: `const el=document.querySelector('${step.selector.replace(/'/g, "\\'")}'); el.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true})); el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`,
            });
          } else if (type === 'TYPE' && step.selector) {
            const text = step.value || step.text || '';
            await cdpSend(ws, 'Runtime.evaluate', {
              expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}').focus()`,
            });
            for (const char of text) {
              await cdpSend(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', text: char });
              await cdpSend(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', text: char });
              await sleep(50);
            }
          } else if (type === 'PRESS_KEY') {
            const key = step.value || 'Enter';
            await cdpSend(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: getKeyCode(key), key });
            await cdpSend(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: getKeyCode(key), key });
          } else if (type === 'SELECT' && step.selector) {
            await cdpSend(ws, 'Runtime.evaluate', {
              expression: `document.querySelector('${step.selector.replace(/'/g, "\\'")}').value='${(step.value || '').replace(/'/g, "\\'")}'`,
            });
          } else if (type === 'SCROLL') {
            const px = parseInt(step.value || '500') || 500;
            const dir = step.direction || 'down';
            const y = dir === 'down' ? px : dir === 'up' ? -px : 0;
            const x = dir === 'left' ? -px : dir === 'right' ? px : 0;
            await cdpSend(ws, 'Runtime.evaluate', { expression: `window.scrollBy(${x}, ${y})` });
          } else if (type === 'SCREENSHOT') {
            await cdpSend(ws, 'Page.captureScreenshot', { format: 'jpeg', quality: 80 });
            addLog(`  Screenshot captured`);
          } else if (type === 'EXTRACT_TEXT' && step.selector) {
            const { result } = await cdpSend(ws, 'Runtime.evaluate', {
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

  // ==================== COOKIES ====================
  ipcMain.handle('cookies:export', async (_event, profileId: string) => {
    try {
      const { ws } = await getCdpPage(profileId);
      const cookies = await cdpSend(ws, 'Network.getAllCookies');
      ws.close();
      return { success: true, cookies: cookies.cookies || [] };
    } catch (err: any) {
      return { success: false, error: err.message, cookies: [] };
    }
  });

  ipcMain.handle('cookies:import', async (_event, profileId: string, cookies: any[]) => {
    try {
      const { ws } = await getCdpPage(profileId);
      let count = 0;
      for (const cookie of cookies) {
        try {
          await cdpSend(ws, 'Network.setCookie', {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false,
            expires: cookie.expires ? Math.floor(new Date(cookie.expires).getTime() / 1000) : undefined,
          });
          count++;
        } catch {}
      }
      ws.close();
      return { success: true, imported: count };
    } catch (err: any) {
      return { success: false, error: err.message, imported: 0 };
    }
  });

  // ==================== WARMUP BOT ====================
  ipcMain.handle('warmup:run', async (_event, profileId: string, sites: string[]) => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

    try {
      const { ws } = await getCdpPage(profileId);
      addLog(`Connected to browser. Warming up ${sites.length} sites...`);

      for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        const pct = Math.round(((i + 1) / sites.length) * 100);
        addLog(`[${pct}%] Visiting ${site}...`);
        try {
          await cdpSend(ws, 'Page.navigate', { url: `https://www.${site}.com` });
          await sleep(3000 + Math.random() * 2000);
          await cdpSend(ws, 'Runtime.evaluate', { expression: `window.scrollBy(0, ${300 + Math.random() * 500})` });
          await sleep(1000 + Math.random() * 1000);
          addLog(`  ${site} done`);
        } catch (e: any) {
          addLog(`  ${site} error: ${e.message}`);
        }
      }

      ws.close();
      addLog(`Warm-up completed - ${sites.length} sites visited`);
      return { success: true, logs };
    } catch (err: any) {
      return { success: false, error: err.message, logs };
    }
  });

  // ==================== SYNCHRONIZER ====================
  ipcMain.handle('sync:start', async (_event, masterId: string, slaveIds: string[], options: any) => {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

    try {
      const masterPort = profileDebugPorts.get(masterId);
      if (!masterPort) throw new Error('Master browser not running');

      const masterTargets = await getTargets(masterPort);
      const masterPage = masterTargets.find((t: any) => t.type === 'page');
      if (!masterPage) throw new Error('Master has no page');
      const masterWs = await connectCdp(masterPage.webSocketDebuggerUrl);
      addLog(`Master connected (${masterId})`);

      const slaveWsList: any[] = [];
      for (const sid of slaveIds) {
        const port = profileDebugPorts.get(sid);
        if (!port) { addLog(`  Slave ${sid} not running - skipped`); continue; }
        try {
          const targets = await getTargets(port);
          const page = targets.find((t: any) => t.type === 'page');
          if (!page) continue;
          const ws = await connectCdp(page.webSocketDebuggerUrl);
          slaveWsList.push({ id: sid, ws });
          addLog(`  Slave connected (${sid})`);
        } catch { addLog(`  Slave ${sid} connection failed`); }
      }

      if (slaveWsList.length === 0) { masterWs.close(); throw new Error('No slaves connected'); }

      const forwardToSlaves = async (method: string, params: any) => {
        for (const slave of slaveWsList) {
          try { await cdpSend(slave.ws, method, params); } catch {}
        }
      };

      if (options.clicks) {
        masterWs.on('message', async (data: any) => {
          try {
            const msg = JSON.parse(data);
            if (msg.method === 'Input.dispatchMouseEvent') {
              await forwardToSlaves('Input.dispatchMouseEvent', msg.params);
            }
          } catch {}
        });
      }

      if (options.typing) {
        const origHandler = masterWs.listeners('message')[0];
        masterWs.removeAllListeners('message');
        if (origHandler) masterWs.on('message', origHandler);
        masterWs.on('message', async (data: any) => {
          try {
            const msg = JSON.parse(data);
            if (msg.method === 'Input.dispatchKeyEvent') {
              await forwardToSlaves('Input.dispatchKeyEvent', msg.params);
            }
          } catch {}
        });
      }

      if (options.nav) {
        masterWs.on('message', async (data: any) => {
          try {
            const msg = JSON.parse(data);
            if (msg.method === 'Page.navigate') {
              await forwardToSlaves('Page.navigate', msg.params);
            }
          } catch {}
        });
      }

      syncConnections.set(masterId, { masterWs, slaveWs: slaveWsList });
      addLog(`Sync active - ${slaveWsList.length + 1} windows`);
      return { success: true, logs, connected: slaveWsList.length + 1 };
    } catch (err: any) {
      return { success: false, error: err.message, logs };
    }
  });

  ipcMain.handle('sync:stop', async (_event, masterId: string) => {
    const conn = syncConnections.get(masterId);
    if (conn) {
      try { conn.masterWs.close(); } catch {}
      for (const s of conn.slaveWs) { try { s.ws.close(); } catch {} }
      syncConnections.delete(masterId);
    }
    return { success: true };
  });

  // ==================== FINGERPRINT ====================
  ipcMain.handle('fingerprint:apply', async (_event, profileId: string, fingerprint: any) => {
    try {
      const { ws } = await getCdpPage(profileId);

      if (fingerprint.userAgent) {
        await cdpSend(ws, 'Network.setUserAgentOverride', {
          userAgent: fingerprint.userAgent,
          platform: fingerprint.platform || 'Win32',
          acceptLanguage: fingerprint.language || 'en-US,en;q=0.9',
        });
      }

      if (fingerprint.timezone) {
        await cdpSend(ws, 'Emulation.setTimezoneOverride', { timezoneId: fingerprint.timezone });
      }

      if (fingerprint.resolution) {
        const [w, h] = (fingerprint.resolution || '1920x1080').split('x').map(Number);
        if (w && h) {
          await cdpSend(ws, 'Emulation.setDeviceMetricsOverride', {
            width: w, height: h, deviceScaleFactor: 1, mobile: false,
          });
        }
      }

      if (fingerprint.language) {
        await cdpSend(ws, 'Emulation.setLocaleOverride', { locale: fingerprint.language });
      }

      const injectionParts: string[] = [];

      if (fingerprint.hardwareConcurrency) {
        injectionParts.push(`Object.defineProperty(navigator, 'hardwareConcurrency', {get:()=>${fingerprint.hardwareConcurrency}})`);
      }
      if (fingerprint.deviceMemory) {
        injectionParts.push(`Object.defineProperty(navigator, 'deviceMemory', {get:()=>${fingerprint.deviceMemory}})`);
      }
      if (fingerprint.platform) {
        injectionParts.push(`Object.defineProperty(navigator, 'platform', {get:()=>'${fingerprint.platform}'})`);
      }

      if (injectionParts.length > 0) {
        await cdpSend(ws, 'Page.addScriptToEvaluateOnNewDocument', {
          source: injectionParts.join(';') + ';',
        });
        await cdpSend(ws, 'Runtime.evaluate', {
          source: injectionParts.join(';') + ';',
        });
      }

      ws.close();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ==================== LEGACY HANDLERS ====================
  ipcMain.handle('profile:open', async (_event, profileId) => {
    try {
      const response = await axios.post(`${getApiUrl()}/profiles/${profileId}/start`, {}, {
        headers: { 'x-hardware-id': getSystemHardwareId() }
      });
      return { success: true, wsEndpoint: response.data.wsEndpoint };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  });

  ipcMain.handle('profile:close', async (_event, profileId) => {
    try {
      await axios.post(`${getApiUrl()}/profiles/${profileId}/stop`, {}, {
        headers: { 'x-hardware-id': getSystemHardwareId() }
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('license:verify', async (_event, licenseKey) => {
    try {
      const res = await axios.post(`${getServerUrl()}/api/license/verify`, {
        licenseKey, hardwareId: getSystemHardwareId()
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

  ipcMain.handle('settings:save', async (_e, data) => {
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

  ipcMain.handle('get:serverUrl', () => getServerUrl());
  ipcMain.handle('get:hardwareId', () => getSystemHardwareId());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
