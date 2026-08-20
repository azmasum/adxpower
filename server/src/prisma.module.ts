import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ✅ সব Module এ import ছাড়াই PrismaService পাবে
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
