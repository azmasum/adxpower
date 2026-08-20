import { Module } from '@nestjs/common';
import { RpaService } from './rpa.service';
import { RpaController } from './rpa.controller';
import { BrowserModule } from '../browser/browser.module';

@Module({
  imports: [BrowserModule],
  controllers: [RpaController],
  providers: [RpaService],
})
export class RpaModule {}