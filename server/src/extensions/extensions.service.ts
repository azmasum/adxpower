import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ExtensionsService {
  private readonly logger = new Logger(ExtensionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.extension.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByProfile(profileId: string) {
    const pex = await this.prisma.profileExtension.findMany({
      where: { profileId },
      include: { extension: true },
    });
    return pex.map((pe) => ({
      ...pe.extension,
      enabled: pe.enabled,
      profileExtensionId: pe.id,
    }));
  }

  async installExtension(data: { name: string; extId: string; description?: string; icon?: string; version?: string; size?: string; isCustom?: boolean; filePath?: string }) {
    let ext = await this.prisma.extension.findUnique({ where: { extId: data.extId } });
    if (!ext) {
      ext = await this.prisma.extension.create({
        data: {
          name: data.name,
          extId: data.extId,
          description: data.description || '',
          icon: data.icon || '📦',
          version: data.version || '1.0.0',
          size: data.size || '0 MB',
          isCustom: data.isCustom || false,
          filePath: data.filePath || null,
        },
      });
      this.logger.log(`Created extension: ${ext.name} (${ext.extId})`);
    }
    return ext;
  }

  async assignToProfile(profileId: string, extensionId: string) {
    const existing = await this.prisma.profileExtension.findUnique({
      where: { profileId_extensionId: { profileId, extensionId } },
    });
    if (existing) return existing;
    return this.prisma.profileExtension.create({
      data: { profileId, extensionId, enabled: true },
    });
  }

  async unassignFromProfile(profileId: string, extensionId: string) {
    await this.prisma.profileExtension.deleteMany({
      where: { profileId, extensionId },
    });
    return { success: true };
  }

  async toggleEnabled(profileId: string, extensionId: string, enabled: boolean) {
    return this.prisma.profileExtension.upsert({
      where: { profileId_extensionId: { profileId, extensionId } },
      update: { enabled },
      create: { profileId, extensionId, enabled },
    });
  }

  async deleteExtension(extId: string) {
    const ext = await this.prisma.extension.findUnique({ where: { extId } });
    if (!ext) return { success: false };
    await this.prisma.profileExtension.deleteMany({ where: { extensionId: ext.id } });
    await this.prisma.extension.delete({ where: { id: ext.id } });
    return { success: true };
  }

  async getInstalledExtensionsForProfiles(profileIds: string[]) {
    const pex = await this.prisma.profileExtension.findMany({
      where: { profileId: { in: profileIds }, enabled: true },
      include: { extension: true },
    });
    const map = new Map<string, { name: string; extId: string; filePath: string | null }[]>();
    for (const pe of pex) {
      if (!map.has(pe.profileId)) map.set(pe.profileId, []);
      map.get(pe.profileId)!.push({
        name: pe.extension.name,
        extId: pe.extension.extId,
        filePath: pe.extension.filePath,
      });
    }
    return map;
  }
}
