import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  // অ্যাপ্লিকেশনের মডিউল শুরু হওয়ার সাথে সাথে এই মেথডটি রান হবে
  async onModuleInit() {
    // ডাটাবেজের সাথে সচল সংযোগ স্থাপন করবে
    await this.$connect();
  }

  // অ্যাপ্লিকেশনটি যখন বন্ধ হবে (যেমন: সার্ভার রিস্টার্ট বা স্টপ হলে) তখন এটি রান হবে
  async onModuleDestroy() {
    // ডাটাবেজ সংযোগটি কোনো মেমরি লিক ছাড়াই নিরাপদে বিচ্ছিন্ন (Disconnect) করবে
    await this.$disconnect();
  }
}