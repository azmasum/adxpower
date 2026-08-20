import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.teamMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException(`Member ${id} not found`);
    return member;
  }

  async invite(data: { userId: string; name: string; email: string; role?: string }) {
    return this.prisma.teamMember.create({
      data: {
        userId: data.userId,
        name: data.name,
        email: data.email,
        role: data.role || 'Member',
        status: 'Invited',
        sharedProfileCount: 0,
      },
    });
  }

  async update(id: string, data: { name?: string; email?: string; role?: string; sharedProfileCount?: number; status?: string }) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException(`Member ${id} not found`);
    return this.prisma.teamMember.update({ where: { id }, data });
  }

  async remove(id: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException(`Member ${id} not found`);
    await this.prisma.teamMember.delete({ where: { id } });
    return { deleted: true };
  }

  async getMemberCount(userId: string) {
    return this.prisma.teamMember.count({ where: { userId } });
  }
}
