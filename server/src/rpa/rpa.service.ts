import { Injectable, Logger } from '@nestjs/common';
import { BrowserService } from '../browser/browser.service';

@Injectable()
export class RpaService {
  private readonly logger = new Logger(RpaService.name);
  constructor(private readonly browserService: BrowserService) {}

  private async ensureBrowser(profileId: string): Promise<any> {
    if (!this.browserService.isRunning(profileId)) {
      this.logger.warn(`[RPA] Profile ${profileId} not running — please start it from the Electron app first.`);
      throw new Error(`Profile ${profileId} is not running. Please start the browser from the app first.`);
    }
    return this.browserService.getPage(profileId);
  }

  async executeFlow(profileId: string, steps: any[]) {
    this.logger.log(`[RPA] Executing ${steps?.length || 0} steps for profile ${profileId}`);
    
    const logs: string[] = [];
    const addLog = (msg: string) => {
      const ts = new Date().toLocaleTimeString();
      logs.push(`[${ts}] ${msg}`);
    };

    let page: any;
    try {
      page = await this.ensureBrowser(profileId);
    } catch (e: any) {
      addLog(`ERROR: Cannot start browser for ${profileId}: ${e.message}`);
      return { success: false, total: steps.length, completed: 0, error: e.message, logs };
    }
    if (!page) {
      addLog(`ERROR: Profile ${profileId} browser has no pages`);
      return { success: false, total: steps.length, completed: 0, error: 'No browser page', logs };
    }

    addLog(`Browser ready for profile ${profileId}`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const type = (step.type || step.action || '').toString().toUpperCase();
      const target = step.url || step.value || step.selector || '';
      
      this.logger.log(`[RPA] [${i+1}/${steps.length}] ${type} -> ${target}`);
      addLog(`[${i+1}/${steps.length}] ${type}: ${target}`);

      try {
        if (type === 'NAVIGATE' && step.url) {
          await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          addLog(`  Navigated to ${step.url}`);
        } else if (type === 'WAIT') {
          const raw = (step.value || '10').toString();
          const match = raw.match(/(\d+)/);
          const sec = match ? parseInt(match[1], 10) : 10;
          addLog(`  Waiting ${sec}s...`);
          await new Promise(r => setTimeout(r, sec * 1000));
        } else if (type === 'CLICK' && step.selector) {
          await page.click(step.selector);
          addLog(`  Clicked ${step.selector}`);
        } else if (type === 'DOUBLE_CLICK' && step.selector) {
          await page.click(step.selector, { clickCount: 2 });
          addLog(`  Double-clicked ${step.selector}`);
        } else if (type === 'RIGHT_CLICK' && step.selector) {
          await page.click(step.selector, { button: 'right' });
          addLog(`  Right-clicked ${step.selector}`);
        } else if (type === 'HOVER' && step.selector) {
          await page.hover(step.selector);
          addLog(`  Hovered over ${step.selector}`);
        } else if (type === 'TYPE' && step.selector) {
          await page.type(step.selector, step.value || step.text || '', { delay: 50 });
          addLog(`  Typed into ${step.selector}`);
        } else if (type === 'PRESS_KEY') {
          const key = step.value || 'Enter';
          await page.keyboard.press(key);
          addLog(`  Pressed key: ${key}`);
        } else if (type === 'SELECT' && step.selector) {
          await page.select(step.selector, step.value || '');
          addLog(`  Selected "${step.value}" in ${step.selector}`);
        } else if (type === 'SCROLL') {
          const px = parseInt(step.value || '500', 10) || 500;
          const dir = step.direction || 'down';
          if (dir === 'down') await page.evaluate((n: number) => window.scrollBy(0, n), px);
          else if (dir === 'up') await page.evaluate((n: number) => window.scrollBy(0, -n), px);
          else if (dir === 'left') await page.evaluate((n: number) => window.scrollBy(-n, 0), px);
          else if (dir === 'right') await page.evaluate((n: number) => window.scrollBy(n, 0), px);
          addLog(`  Scrolled ${dir} ${px}px`);
        } else if (type === 'SCREENSHOT') {
          const buf = await page.screenshot({ encoding: 'base64', fullPage: false });
          addLog(`  Screenshot captured (${Math.round(buf.length / 1024)}KB)`);
        } else if (type === 'EXTRACT_TEXT' && step.selector) {
          const text = await page.$eval(step.selector, (el: any) => el.textContent?.trim() || '');
          addLog(`  Extracted text: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
        } else {
          addLog(`  Skipped: unknown type "${type}" or missing selector`);
        }
      } catch (e: any) {
        addLog(`  ERROR at step ${i + 1}: ${e.message}`);
        this.logger.error(`[RPA] Step ${i+1} failed: ${e.message}`);
        return { success: false, total: steps.length, completed: i, error: e.message, logs };
      }
    }

    this.logger.log(`[RPA] Flow completed - ${steps.length} steps`);
    addLog(`Flow completed - ${steps.length} steps`);
    return { success: true, total: steps.length, logs };
  }
}
