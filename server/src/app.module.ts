import { Module, OnModuleInit } from '@nestjs/common';
import { ProfilesModule } from './profiles/profiles.module';
import { ProxiesModule } from './proxies/proxies.module';
import { LicenseModule } from './license/license.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { LicenseVerificationGuard } from './guards/license-verification.guard';
import { RpaModule } from './rpa/rpa.module';
import { BrowserModule } from './browser/browser.module';
import { ExtensionsModule } from './extensions/extensions.module';
import { TeamModule } from './team/team.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { LicenseService } from './license/license.service';
import { TrialService } from './license/trial.service';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    BrowserModule,
    ProfilesModule,
    ProxiesModule,
    LicenseModule,
    PaymentModule,
    RpaModule,
    ExtensionsModule,
    TeamModule,
    ActivityLogModule,
  ],
  providers: [],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly licenseService: LicenseService,
    private readonly trialService: TrialService,
  ) {}

  async onModuleInit() {
    this.logger.log('Running auto-expire check...');
    const licenses = await this.licenseService.checkAndExpire();
    const trials = await this.trialService.expireTrials();
    this.logger.log(`Startup expire: ${licenses} licenses, ${trials} trials`);

    setInterval(async () => {
      try {
        await this.licenseService.checkAndExpire();
        await this.trialService.expireTrials();
      } catch {}
    }, 60 * 60 * 1000); // every hour
  }
}
