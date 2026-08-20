import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createLicense(data: {
    userId: string;
    licenseKey: string;
    maxProfiles: number;
    expiresAt: Date | null;
    plan?: string;
    isTrial?: boolean;
  }) {
    return this.prisma.license.upsert({
      where: { userId: data.userId },
      update: {
        licenseKey: data.licenseKey,
        maxProfiles: data.maxProfiles,
        expiresAt: data.expiresAt,
        isTrial: data.isTrial || false,
        status: 'active',
        hardwareId: null,
      },
      create: {
        userId: data.userId,
        licenseKey: data.licenseKey,
        maxProfiles: data.maxProfiles,
        expiresAt: data.expiresAt,
        isTrial: data.isTrial || false,
        status: 'active',
      },
    });
  }

  async verifyLicense(licenseKey: string, hardwareId: string) {
    const license = await this.prisma.license.findUnique({ where: { licenseKey } });
    if (!license) throw new ForbiddenException('Invalid license key.');
    if (license.status !== 'active') throw new ForbiddenException('This license has been suspended.');

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: 'expired' },
      });
      throw new ForbiddenException('This license has expired.');
    }

    if (!license.hardwareId) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { hardwareId },
      });
    } else if (license.hardwareId !== hardwareId) {
      throw new ForbiddenException('This license is already bound to another machine.');
    }

    return {
      valid: true,
      licenseKey: license.licenseKey,
      hwid: hardwareId,
      plan: license.isTrial ? 'Trial' : 'Lifetime Agency',
      maxProfiles: license.maxProfiles,
      expiresAt: license.expiresAt,
      isTrial: license.isTrial,
      activatedAt: license.createdAt,
      status: 'ACTIVE',
    };
  }

  async unbindLicense(licenseKey: string, hardwareId: string) {
    const license = await this.prisma.license.findUnique({ where: { licenseKey } });
    if (!license) throw new ForbiddenException('Invalid license key.');
    if (license.hardwareId !== hardwareId) throw new ForbiddenException('Hardware ID mismatch.');
    await this.prisma.license.update({
      where: { id: license.id },
      data: { hardwareId: null },
    });
    return { status: 'unbound' };
  }

  generateOfflineActivationKey(licenseKey: string, hardwareId: string): string {
    const secret = process.env.OFFLINE_SECRET;
    if (!secret) throw new BadRequestException('OFFLINE_SECRET not configured');
    return crypto
      .createHmac('sha256', secret)
      .update(`${licenseKey}:${hardwareId}`)
      .digest('hex')
      .substring(0, 32)
      .toUpperCase();
  }

  verifyOfflineActivation(licenseKey: string, hardwareId: string, activationKey: string): boolean {
    const expected = this.generateOfflineActivationKey(licenseKey, hardwareId);
    return expected === activationKey.toUpperCase();
  }

  async checkAndExpire() {
    const now = new Date();
    const expired = await this.prisma.license.updateMany({
      where: {
        status: 'active',
        expiresAt: { not: null, lt: now },
      },
      data: { status: 'expired' },
    });
    if (expired.count > 0) {
      this.logger.log(`Auto-expired ${expired.count} licenses`);
    }
    return expired.count;
  }
}
