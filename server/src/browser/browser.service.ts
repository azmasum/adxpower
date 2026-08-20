import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

@Injectable()
export class BrowserService {
  private readonly logger = new Logger(BrowserService.name);
  private userDataRoot = path.join(process.cwd(), 'profiles-data');
  private browsers = new Map<string, any>();

  constructor() {
    if (!fs.existsSync(this.userDataRoot)) {
      fs.mkdirSync(this.userDataRoot, { recursive: true });
    }
  }

  private loadAntiDetectEngine(): Function | null {
    const p = path.join(process.cwd(), 'src', 'profiles', 'anti-detect-core.js');
    if (fs.existsSync(p)) {
      try {
        delete require.cache[require.resolve(p)];
        const mod = require(p);
        return mod.default || mod;
      } catch (e: any) {
        this.logger.error(`Failed to load engine: ${e.message}`);
      }
    }
    return null;
  }

  async launchProfile(profileId: string, fingerprint: any, proxyUrl?: string, extensionPaths?: string[]): Promise<{ wsEndpoint: string }> {
    if (this.browsers.has(profileId)) {
      const browser = this.browsers.get(profileId);
      return { wsEndpoint: browser.wsEndpoint() };
    }

    const profileDir = path.join(this.userDataRoot, profileId);
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--start-maximized',
    ];

    if (extensionPaths && extensionPaths.length > 0) {
      const validPaths = extensionPaths.filter((p) => fs.existsSync(p));
      if (validPaths.length > 0) {
        args.push(`--load-extension=${validPaths.join(',')}`);
        args.push(`--disable-extensions-except=${validPaths.join(',')}`);
      }
    }

    let proxyAuth: { username?: string; password?: string } | undefined;
    if (proxyUrl && proxyUrl!== 'Direct (No Proxy)') {
      try {
        const parsedUrl = new URL(proxyUrl);
        if (parsedUrl.username) {
          proxyAuth = {
            username: decodeURIComponent(parsedUrl.username),
            password: decodeURIComponent(parsedUrl.password)
          };
          args.push(`--proxy-server=${parsedUrl.protocol}//${parsedUrl.host}`);
        } else {
          args.push(`--proxy-server=${proxyUrl}`);
        }
      } catch { args.push(`--proxy-server=${proxyUrl}`); }
    }

    const browser = await puppeteer.launch({
      headless: false,
      userDataDir: profileDir, // ✅ Arg এর বদলে এখানে দাও
      args,
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
    });

    this.browsers.set(profileId, browser);

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    if (proxyAuth) await page.authenticate(proxyAuth);

    const antiDetectFn = this.loadAntiDetectEngine();
    if (antiDetectFn) {
      await page.evaluateOnNewDocument(antiDetectFn as any, profileId, fingerprint || {});
    }
    if (fingerprint?.userAgent) await page.setUserAgent(fingerprint.userAgent);

    // ✅ প্রথমবার Google এ নিয়ে যাও - about:blank Fix
    try {
      await page.goto('https://google.com', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    } catch {}

    browser.on('disconnected', () => {
      this.browsers.delete(profileId);
      this.logger.log(`Browser for profile ${profileId} closed`);
    });

    return { wsEndpoint: browser.wsEndpoint() };
  }

  async stopProfile(profileId: string): Promise<void> {
    const browser = this.browsers.get(profileId);
    if (browser) {
      await browser.close().catch(() => {});
      this.browsers.delete(profileId);
    }
  }

  isRunning(profileId: string): boolean {
    return this.browsers.has(profileId);
  }

  // ✅ RPA এর জন্য - এটা খুব জরুরি
  getBrowser(profileId: string) {
    return this.browsers.get(profileId);
  }

  async getPage(profileId: string) {
    const browser = this.browsers.get(profileId);
    if (!browser) throw new Error(`Profile ${profileId} not running`);
    const pages = await browser.pages();
    return pages[0] || await browser.newPage();
  }
}