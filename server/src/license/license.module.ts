import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { TrialService } from './trial.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LicenseController],
  providers: [LicenseService, TrialService],
  exports: [LicenseService, TrialService],
})
export class LicenseModule {}
