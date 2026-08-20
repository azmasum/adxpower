import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BrowserService {
  private readonly logger = new Logger(BrowserService.name);
  private browsers = new Map<string, any>();

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
