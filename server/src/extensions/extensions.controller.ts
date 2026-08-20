import { Controller, Get, Post, Delete, Patch, Param, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ExtensionsService } from './extensions.service';
import { LicenseVerificationGuard } from '../guards/license-verification.guard';

@UseGuards(LicenseVerificationGuard)
@Controller('v1/extensions')
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  @Get()
  findAll() {
    return this.extensionsService.findAll();
  }

  @Get('profile/:profileId')
  findByProfile(@Param('profileId') profileId: string) {
    return this.extensionsService.findByProfile(profileId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  install(@Body() body: { name: string; extId: string; description?: string; icon?: string; version?: string; size?: string; isCustom?: boolean; filePath?: string }) {
    return this.extensionsService.installExtension(body);
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  assign(@Body() body: { profileId: string; extensionId: string }) {
    return this.extensionsService.assignToProfile(body.profileId, body.extensionId);
  }

  @Delete('assign')
  unassign(@Body() body: { profileId: string; extensionId: string }) {
    return this.extensionsService.unassignFromProfile(body.profileId, body.extensionId);
  }

  @Patch('toggle')
  toggle(@Body() body: { profileId: string; extensionId: string; enabled: boolean }) {
    return this.extensionsService.toggleEnabled(body.profileId, body.extensionId, body.enabled);
  }

  @Delete(':extId')
  delete(@Param('extId') extId: string) {
    return this.extensionsService.deleteExtension(extId);
  }
}
