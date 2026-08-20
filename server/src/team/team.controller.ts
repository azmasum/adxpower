import { Controller, Get, Post, Patch, Delete, Param, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { LicenseVerificationGuard } from '../guards/license-verification.guard';

@UseGuards(LicenseVerificationGuard)
@Controller('v1/team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.teamService.findAll(req.user.id);
  }

  @Get('count')
  count(@Req() req: any) {
    return this.teamService.getMemberCount(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  invite(@Req() req: any, @Body() body: { name: string; email: string; role?: string }) {
    return this.teamService.invite({ userId: req.user.id, ...body });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; email?: string; role?: string; sharedProfileCount?: number; status?: string }) {
    return this.teamService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }
}
