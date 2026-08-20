import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LicenseService } from '../license/license.service';

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);
  private readonly TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
  private readonly TRIAL_MAX_PROFILES = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
  ) {}

  async startTrial(hardwareId: string, email?: string) {
    const existing = await this.prisma.trialTracker.findUnique({ where: { hardwareId } });
    if (existing) {
      if (existing.expiresAt > new Date()) {
        const remaining = existing.expiresAt.getTime() - Date.now();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        throw new BadRequestException(`Trial already active. Expires in ${hours}h ${mins}m.`);
      }
      if (existing.status === 'expired' || existing.expiresAt <= new Date()) {
        throw new BadRequestException('Trial period has already been used on this machine.');
      }
    }

    const expiresAt = new Date(Date.now() + this.TRIAL_DURATION_MS);

    await this.prisma.trialTracker.upsert({
      where: { hardwareId },
      update: { expiresAt, status: 'active', activatedAt: new Date() },
      create: { hardwareId, expiresAt, status: 'active' },
    });

    const user = await this.prisma.user.upsert({
      where: { email: email || `trial-${hardwareId}@adxpower.local` },
      update: {},
      create: {
        email: email || `trial-${hardwareId}@adxpower.local`,
        password: 'trial-auto',
      },
    });

    const trialKey = `TRIAL-${hardwareId.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    await this.licenseService.createLicense({
      userId: user.id,
      licenseKey: trialKey,
      maxProfiles: this.TRIAL_MAX_PROFILES,
      expiresAt,
      plan: 'trial',
      isTrial: true,
    });

    this.logger.log(`Trial started for ${hardwareId}, expires ${expiresAt.toISOString()}`);

    return {
      success: true,
      licenseKey: trialKey,
      expiresAt,
      maxProfiles: this.TRIAL_MAX_PROFILES,
      durationHours: 24,
    };
  }

  async getTrialStatus(hardwareId: string) {
    const trial = await this.prisma.trialTracker.findUnique({ where: { hardwareId } });
    if (!trial) {
      return { hasTrial: false, eligible: true };
    }
    const now = new Date();
    if (trial.expiresAt > now && trial.status === 'active') {
      const remaining = trial.expiresAt.getTime() - now.getTime();
      return {
        hasTrial: true,
        status: 'active',
        expiresAt: trial.expiresAt,
        remainingMs: remaining,
        remainingHours: Math.floor(remaining / (1000 * 60 * 60)),
        remainingMins: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
      };
    }
    return { hasTrial: true, status: 'expired', eligible: false };
  }

  async expireTrials() {
    const now = new Date();
    const expired = await this.prisma.trialTracker.updateMany({
      where: { status: 'active', expiresAt: { lt: now } },
      data: { status: 'expired' },
    });
    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} trials`);
    }
    return expired.count;
  }
}
