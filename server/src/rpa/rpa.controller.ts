import { Controller, Post, Body, Logger, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { RpaService } from './rpa.service';
import { LicenseVerificationGuard } from '../guards/license-verification.guard';

@UseGuards(LicenseVerificationGuard)
@Controller('v1/rpa')
export class RpaController {
  private readonly logger = new Logger(RpaController.name);
  constructor(private readonly rpaService: RpaService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Body() body: any) {
    this.logger.log(`RPA Request: ${JSON.stringify(body)}`);
    const profileId = body.profileId;
    const steps = body.steps || body.flow || [];
    if (!profileId) {
      return { success: false, error: 'profileId is required', logs: [] };
    }
    if (!steps || steps.length === 0) {
      return { success: false, error: 'No steps provided', logs: [] };
    }
    return this.rpaService.executeFlow(String(profileId), steps);
  }
}