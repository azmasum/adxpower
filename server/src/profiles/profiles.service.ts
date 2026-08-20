import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProxiesService } from '../proxies/proxies.service';
import { BrowserService } from '../browser/browser.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(forwardRef(() => ProxiesService))
    private readonly proxiesService: ProxiesService,
    private readonly browserService: BrowserService,
    private readonly prisma: PrismaService,
  ) {}

  private async logActivity(data: { userId?: string; userName?: string; action: string; target?: string; ip?: string }) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: data.userId || 'anonymous',
          userName: data.userName || 'User',
          action: data.action,
          target: data.target || '',
          ip: data.ip || '127.0.0.1',
          status: 'Success',
        },
      });
    } catch {}
  }

  private formatProfile(p: any, proxyDoc?: any) {
    const proxyDisplay = proxyDoc
      ? `${proxyDoc.protocol}://${proxyDoc.host}:${proxyDoc.port}`
      : 'Direct (No Proxy)';
    const proxyStatus = proxyDoc ? proxyDoc.status : 'none';

    return {
      id: p.id,
      name: p.name,
      group: p.group || 'Default',
      proxy: proxyDisplay,
      proxyId: p.proxyId || undefined,
      proxyStatus,
      os: p.os || 'Windows',
      browser: p.browser || 'Chrome 120.0',
      tags: p.tags || [],
      status: this.browserService.isRunning(p.id) ? 'Running' : 'Stopped',
      fingerprint: p.fingerprint || {},
      userId: p.userId,
      lastUsed: p.updatedAt?.toISOString?.() || new Date().toISOString(),
      createdAt: p.createdAt,
    };
  }

  async create(createProfileDto: CreateProfileDto, userId: string) {
    let proxyId = (createProfileDto as any).proxyId || null;

    if (!proxyId && (!createProfileDto.proxy || createProfileDto.proxy === 'Direct (No Proxy)')) {
      const availableProxy = await this.proxiesService.findAvailableProxyForAutoAssign(userId);
      if (availableProxy) {
        proxyId = availableProxy.id;
      }
    }

    const newProfile = await this.prisma.profile.create({
      data: {
        name: createProfileDto.name,
        group: createProfileDto.group || 'Default',
        os: createProfileDto.os || 'Windows',
        browser: createProfileDto.browser || 'Chrome 120.0',
        tags: createProfileDto.tags || [],
        fingerprint: createProfileDto.fingerprint || {},
        userId,
        proxyId,
        status: 'Stopped',
      },
      include: { proxy: true },
    });

    if (proxyId) {
      await this.proxiesService.assignToProfile(proxyId, newProfile.id).catch(() => {});
    }

    await this.logActivity({ action: 'Created Profile', target: createProfileDto.name });

    return this.formatProfile(newProfile, newProfile.proxy);
  }

  async findAll(userId: string) {
    const profiles = await this.prisma.profile.findMany({
      where: { userId },
      include: { proxy: true },
      orderBy: { createdAt: 'desc' },
    });

    return profiles.map(p => this.formatProfile(p, p.proxy));
  }

  async findOne(id: string) {
    const p = await this.prisma.profile.findUnique({
      where: { id },
      include: { proxy: true },
    });
    if (!p) throw new NotFoundException(`Profile ${id} not found`);
    return this.formatProfile(p, p.proxy);
  }

  async update(id: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.profile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Profile ${id} not found`);

    const oldProxyId = existing.proxyId;
    const newProxyId = (dto as any).proxyId;

    if (oldProxyId && newProxyId && oldProxyId !== newProxyId) {
      await this.proxiesService.unassignFromProfile(oldProxyId).catch(() => {});
      await this.proxiesService.assignToProfile(newProxyId, id).catch(() => {});
    } else if (newProxyId === null && oldProxyId) {
      await this.proxiesService.unassignFromProfile(oldProxyId).catch(() => {});
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if ((dto as any).group !== undefined) updateData.group = (dto as any).group;
    if (dto.os !== undefined) updateData.os = dto.os;
    if (dto.browser !== undefined) updateData.browser = dto.browser;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.fingerprint !== undefined) updateData.fingerprint = dto.fingerprint;
    if (newProxyId !== undefined) updateData.proxyId = newProxyId;

    const updated = await this.prisma.profile.update({
      where: { id },
      data: updateData,
      include: { proxy: true },
    });

    return this.formatProfile(updated, updated.proxy);
  }

  async remove(id: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);

    if (profile.proxyId) {
      await this.proxiesService.unassignFromProfile(profile.proxyId).catch(() => {});
    }
    await this.stopProfile(id);
    await this.prisma.profile.delete({ where: { id } });

    await this.logActivity({ action: 'Deleted Profile', target: profile.name });

    return { deleted: true };
  }

  async startProfile(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: { proxy: true },
    });
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);

    if (profile.status === 'Running') {
      return { id, status: 'Running', debuggerPort: 9222 };
    }

    let proxyUrl: string | undefined = undefined;
    if (profile.proxy) {
      const proxyDoc = profile.proxy;
      if (proxyDoc.username && proxyDoc.password) {
        proxyUrl = `${proxyDoc.protocol}://${encodeURIComponent(proxyDoc.username)}:${encodeURIComponent(proxyDoc.password)}@${proxyDoc.host}:${proxyDoc.port}`;
      } else {
        proxyUrl = `${proxyDoc.protocol}://${proxyDoc.host}:${proxyDoc.port}`;
      }
    }

    const pex = await this.prisma.profileExtension.findMany({
      where: { profileId: id, enabled: true },
      include: { extension: true },
    });
    const extensionPaths = pex
      .map((pe) => pe.extension.filePath)
      .filter((p): p is string => !!p);

    await this.prisma.profile.update({
      where: { id },
      data: { status: 'Running' },
    });

    await this.logActivity({ action: 'Started Profile', target: profile.name });

    const proxyDisplay = profile.proxy
      ? `${profile.proxy.protocol}://${profile.proxy.host}:${profile.proxy.port}`
      : 'Direct (No Proxy)';

    return {
      id: profile.id,
      name: profile.name,
      status: 'Running',
      proxy: proxyDisplay,
      proxyUrl,
      fingerprint: profile.fingerprint || {},
      extensionPaths,
      os: profile.os,
      browser: profile.browser,
    };
  }

  async stopProfile(id: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id } }).catch(() => null);
    await this.browserService.stopProfile(id);

    try {
      await this.prisma.profile.update({
        where: { id },
        data: { status: 'Stopped' },
      });
    } catch {}

    await this.logActivity({ action: 'Stopped Profile', target: profile?.name || id });

    return { id, status: 'Stopped' };
  }
}
