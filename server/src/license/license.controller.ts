import { Controller, Post, Get, Body, Param, Query, BadRequestException, ForbiddenException, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { LicenseService } from './license.service';
import { TrialService } from './trial.service';
import { PrismaService } from '../prisma.service';

@Controller(['license', 'v1/license'])
export class LicenseController {
  private readonly logger = new Logger(LicenseController.name);
  private adminKey: string;
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
    private readonly trialService: TrialService,
  ) {
    this.adminKey = process.env.ADMIN_API_KEY || '';
  }

  private requireAdmin(headers: Record<string, any>) {
    const key = headers['x-admin-key'] as string;
    if (!this.adminKey || !key || key !== this.adminKey) {
      throw new ForbiddenException('Admin authentication required');
    }
  }

  @Get('list')
  async listLicenses(@Headers() headers: Record<string, any>) {
    this.requireAdmin(headers);
    const licenses = await this.prisma.license.findMany({ orderBy: { createdAt: 'desc' } });
    return licenses.map((l) => ({
      key: l.licenseKey,
      isUsed: !!l.hardwareId,
      hwid: l.hardwareId,
      status: l.status,
      plan: l.isTrial ? 'Trial' : 'Lifetime Agency',
      maxProfiles: l.maxProfiles,
      isTrial: l.isTrial,
      expiresAt: l.expiresAt,
    }));
  }

  @Post('generate')
  async generateLicenses(@Body() body: { count?: number; plan?: string }, @Headers() headers: Record<string, any>) {
    this.requireAdmin(headers);
    const count = Math.min(body.count || 1, 100);
    const plan = body.plan || 'Lifetime Agency';
    const generatedKeys: string[] = [];

    for (let i = 0; i < count; i++) {
      const key = `ADX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      try {
        const user = await this.prisma.user.create({
          data: { email: `license-${Date.now()}-${i}@adxpower.local`, password: 'admin-generated' },
        });
        await this.prisma.license.create({
          data: {
            userId: user.id,
            licenseKey: key,
            status: 'active',
            maxProfiles: plan.includes('Agency') ? 50 : plan.includes('Pro') ? 20 : 5,
            expiresAt: plan.includes('Lifetime') ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        generatedKeys.push(key);
      } catch (e: any) {
        this.logger.error(`Failed to generate license: ${e.message}`);
      }
    }

    this.logger.log(`Generated ${generatedKeys.length} licenses (${plan})`);
    return { keys: generatedKeys, count: generatedKeys.length, plan };
  }

  @Post('verify')
  async verifyLicense(@Body() body: { licenseKey: string; hardwareId: string }) {
    if (!body.licenseKey || !body.hardwareId) {
      throw new BadRequestException('License key and hardware ID are required.');
    }
    return this.licenseService.verifyLicense(body.licenseKey, body.hardwareId);
  }

  @Post('unbind')
  async unbindLicense(@Body() body: { licenseKey: string; hardwareId: string }) {
    return this.licenseService.unbindLicense(body.licenseKey, body.hardwareId);
  }

  @Post('trial/start')
  @HttpCode(HttpStatus.CREATED)
  async startTrial(@Body() body: { hardwareId: string; email?: string }) {
    if (!body.hardwareId) throw new BadRequestException('hardwareId is required');
    return this.trialService.startTrial(body.hardwareId, body.email);
  }

  @Get('trial/status')
  async getTrialStatus(@Query('hardwareId') hardwareId: string) {
    if (!hardwareId) throw new BadRequestException('hardwareId query param is required');
    return this.trialService.getTrialStatus(hardwareId);
  }

  @Post('offline/generate')
  async generateOfflineKey(@Body() body: { licenseKey: string; hardwareId: string }) {
    if (!body.licenseKey || !body.hardwareId) throw new BadRequestException('licenseKey and hardwareId required');
    const key = this.licenseService.generateOfflineActivationKey(body.licenseKey, body.hardwareId);
    return { activationKey: key, licenseKey: body.licenseKey, hardwareId: body.hardwareId };
  }

  @Post('offline/verify')
  async verifyOffline(@Body() body: { licenseKey: string; hardwareId: string; activationKey: string }) {
    const valid = this.licenseService.verifyOfflineActivation(body.licenseKey, body.hardwareId, body.activationKey);
    if (!valid) throw new ForbiddenException('Invalid activation key');
    return this.licenseService.verifyLicense(body.licenseKey, body.hardwareId);
  }

  @Post('expire-check')
  async expireCheck(@Headers() headers: Record<string, any>) {
    this.requireAdmin(headers);
    const expiredLicenses = await this.licenseService.checkAndExpire();
    const expiredTrials = await this.trialService.expireTrials();
    return { expiredLicenses, expiredTrials };
  }
}
