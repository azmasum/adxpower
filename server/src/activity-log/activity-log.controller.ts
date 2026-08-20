import { Controller, Get, Post, Delete, Query, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { LicenseVerificationGuard } from '../guards/license-verification.guard';

@UseGuards(LicenseVerificationGuard)
@Controller('v1/activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.activityLogService.findAll(limit ? parseInt(limit) : 100);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.activityLogService.findByUser(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  clearAll() {
    return this.activityLogService.clearAll();
  }
}
