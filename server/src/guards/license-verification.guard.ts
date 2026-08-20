import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LicenseVerificationGuard implements CanActivate {
  private readonly logger = new Logger(LicenseVerificationGuard.name);
  
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const hardwareId = request.headers['x-hardware-id'] as string;

    if (!hardwareId) {
      throw new UnauthorizedException('x-hardware-id header is required');
    }

    let user;
    try {
      user = await this.prisma.user.upsert({
        where: { id: hardwareId },
        update: {},
        create: { id: hardwareId, email: `${hardwareId}@device.local`, password: 'device-auth' },
      });
    } catch (e: any) {
      this.logger.error(`User upsert failed: ${e.message}`);
      throw new UnauthorizedException('Authentication failed');
    }

    let license = null;
    try {
      license = await this.prisma.license.findFirst({ where: { hardwareId } });
    } catch (e: any) {
      this.logger.error(`License query failed: ${e.message}`);
      throw new UnauthorizedException('License verification failed');
    }

    if (!license) {
      throw new UnauthorizedException('No license found. Please activate a license.');
    }

    if (license.status !== 'active') {
      throw new UnauthorizedException('License is not active.');
    }

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      await this.prisma.license.update({ where: { id: license.id }, data: { status: 'expired' } }).catch(() => {});
      throw new UnauthorizedException('License has expired.');
    }

    request.license = license;
    request.user = { id: user.id };
    return true;
  }
}
