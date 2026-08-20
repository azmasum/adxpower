import { Module, forwardRef } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { ProxiesModule } from '../proxies/proxies.module';
import { PrismaService } from '../prisma.service';
import { BrowserService } from '../browser/browser.service';
import { BrowserModule } from '../browser/browser.module';

@Module({
  imports: [BrowserModule, forwardRef(() => ProxiesModule)],
  controllers: [ProfilesController],
  providers: [ProfilesService, PrismaService, BrowserService],
  exports: [ProfilesService, BrowserService],
})
export class ProfilesModule {}