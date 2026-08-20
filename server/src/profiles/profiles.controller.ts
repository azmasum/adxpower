import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LicenseVerificationGuard } from '../guards/license-verification.guard';
import { Request } from 'express';

@UseGuards(LicenseVerificationGuard)
@Controller('v1/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProfileDto: CreateProfileDto & { proxyId?: string }, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.profilesService.create(createProfileDto, userId);
  }

  @Get()
  findAll(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.profilesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto & { proxyId?: string }) {
    return this.profilesService.update(id, updateProfileDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.profilesService.remove(id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  start(@Param('id') id: string) {
    return this.profilesService.startProfile(id);
  }

  @Post(':id/launch-data')
  @HttpCode(HttpStatus.OK)
  async launchData(@Param('id') id: string) {
    const data = await this.profilesService.getLaunchData(id);
    await this.profilesService.logActivity({ action: 'Started Profile', target: data.name });
    return data;
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stop(@Param('id') id: string) {
    return this.profilesService.stopProfile(id);
  }

  @Post(':id/assign-proxy/:proxyId')
  @HttpCode(HttpStatus.OK)
  assignProxy(@Param('id') id: string, @Param('proxyId') proxyId: string) {
    return this.profilesService.update(id, { proxyId } as any);
  }

  @Post(':id/unassign-proxy')
  @HttpCode(HttpStatus.OK)
  unassignProxy(@Param('id') id: string) {
    return this.profilesService.update(id, { proxyId: null, proxy: 'Direct (No Proxy)' } as any);
  }
}