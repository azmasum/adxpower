import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  constructor(private readonly prisma: PrismaService) {}

  async log(data: { userId?: string; userName?: string; action: string; target?: string; details?: any; ip?: string; status?: string }) {
    return this.prisma.activityLog.create({
      data: {
        userId: data.userId || null,
        userName: data.userName || 'System',
        action: data.action,
        target: data.target || '',
        details: data.details || undefined,
        ip: data.ip || null,
        status: data.status || 'Success',
      },
    });
  }

  async findAll(limit = 100) {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByUser(userId: string, limit = 50) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByAction(action: string, limit = 50) {
    return this.prisma.activityLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async clearAll() {
    await this.prisma.activityLog.deleteMany();
    return { success: true };
  }
}
