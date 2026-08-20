import { Module } from '@nestjs/common';
import { ProxiesController } from './proxies.controller';
import { ProxiesService } from './proxies.service';
import { PrismaService } from '../prisma.service';

@Module({
  // প্রক্সি CRUD এবং কানেকশন চেকিং রাউটগুলো হ্যান্ডেল করার কন্ট্রোলার
  controllers: [ProxiesController],
  
  // প্রক্সির বিজনেস লজিক এবং ডাটাবেজ সার্ভিস প্রোভাইডার হিসেবে রেজিস্টার করা হলো
  providers: [
    ProxiesService, // প্রক্সি ভেরিফিকেশন এবং স্পিড টেস্টিং লজিক
    PrismaService,  // ডাটাবেজ কানেকশন সার্ভিস
  ],
  
  // প্রোফাইল মডিউলে যেন অটো-প্রক্সি অ্যাসাইন লজিক কাজ করতে পারে, সেজন্য এটি এক্সপোর্ট করা হলো
  exports: [ProxiesService],
})
export class ProxiesModule {}