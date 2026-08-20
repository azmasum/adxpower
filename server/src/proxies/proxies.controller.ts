import { Controller, Get, Post, Body, Param, Delete, Patch, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { CreateProxyDto } from './dto/proxy.dto';
import { LicenseVerificationGuard } from '../guards/license-verification.guard';
import { Request } from 'express';

@UseGuards(LicenseVerificationGuard)
@Controller('v1/proxies')
export class ProxiesController {
  constructor(private readonly proxiesService: ProxiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProxyDto: CreateProxyDto, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.proxiesService.create(createProxyDto, userId);
  }

  @Post('scrape')
  @HttpCode(HttpStatus.OK)
  scrape(@Body() body: { countries?: string[] }, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.proxiesService.scrapeFreeProxies(userId, body?.countries);
  }

  @Get()
  findAll(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.proxiesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proxiesService.findOne(id);
  }

  @Post(':id/check')
  @HttpCode(HttpStatus.OK)
  check(@Param('id') id: string) {
    return this.proxiesService.checkProxy(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.proxiesService.remove(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProxyDto>, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.proxiesService.update(id, dto, userId);
  }

  // NEW: কোন প্রোফাইলে Proxy assign হয়েছে সেটা দেখার জন্য
  @Post(':id/assign/:profileId')
  @HttpCode(HttpStatus.OK)
  assign(@Param('id') id: string, @Param('profileId') profileId: string) {
    return this.proxiesService.assignToProfile(id, profileId);
  }

  @Post(':id/unassign')
  @HttpCode(HttpStatus.OK)
  unassign(@Param('id') id: string) {
    return this.proxiesService.unassignFromProfile(id);
  }
}
