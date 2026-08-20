const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEV_USER_ID = 'usr_01h678jwq0pkmz765v812';

async function main() {
  console.log('Seeding database...');

  // 1. Create dev user
  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {},
    create: {
      id: DEV_USER_ID,
      email: 'dev@multilogin.local',
      password: 'dev-password',
    },
  });
  console.log('  User created');

  // 2. Create dev license (unbound — any PC can activate)
  await prisma.license.upsert({
    where: { userId: DEV_USER_ID },
    update: { hardwareId: null },
    create: {
      userId: DEV_USER_ID,
      licenseKey: 'LIC-DEV-SEED-001',
      hardwareId: null,
      status: 'active',
      maxProfiles: 50,
      expiresAt: new Date('2030-12-31'),
    },
  });
  console.log('  License created (unbound — ready to activate on any PC)');

  // 3. Create proxies
  const proxy1 = await prisma.proxy.upsert({
    where: { id: 'proxy-seed-001' },
    update: {},
    create: {
      id: 'proxy-seed-001',
      userId: DEV_USER_ID,
      host: '185.220.101.4',
      port: 1080,
      protocol: 'socks5',
      status: 'active',
      latency: 145,
      ip: '185.220.101.4',
      country: 'GB',
      countryName: 'Great Britain',
      lastChecked: new Date(),
    },
  });

  const proxy2 = await prisma.proxy.upsert({
    where: { id: 'proxy-seed-002' },
    update: {},
    create: {
      id: 'proxy-seed-002',
      userId: DEV_USER_ID,
      host: '45.138.22.11',
      port: 8080,
      protocol: 'http',
      status: 'dead',
      country: 'DE',
      countryName: 'Germany',
    },
  });

  const proxy3 = await prisma.proxy.upsert({
    where: { id: 'proxy-seed-003' },
    update: {},
    create: {
      id: 'proxy-seed-003',
      userId: DEV_USER_ID,
      host: '103.152.112.120',
      port: 8080,
      protocol: 'http',
      status: 'active',
      latency: 89,
      ip: '103.152.112.120',
      country: 'BD',
      countryName: 'Bangladesh',
      lastChecked: new Date(),
    },
  });
  console.log('  Proxies created');

  // 4. Create profiles
  await prisma.profile.upsert({
    where: { id: 'profile-seed-001' },
    update: {},
    create: {
      id: 'profile-seed-001',
      userId: DEV_USER_ID,
      name: 'Amazon Buyer Account - 01',
      group: 'E-commerce',
      os: 'Windows',
      browser: 'Chrome 120.0.3202',
      tags: ['Amazon', 'US'],
      status: 'Stopped',
      proxyId: proxy1.id,
      fingerprint: { canvas: 'noise-21', webrtc: 'spoof', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    },
  });

  await prisma.profile.upsert({
    where: { id: 'profile-seed-002' },
    update: {},
    create: {
      id: 'profile-seed-002',
      userId: DEV_USER_ID,
      name: 'Facebook Ads - Agency Client A',
      group: 'Social Media',
      os: 'Windows',
      browser: 'Chrome 121.0.6167',
      tags: ['Facebook', 'Ads'],
      status: 'Stopped',
      proxyId: proxy3.id,
      fingerprint: {},
    },
  });

  await prisma.profile.upsert({
    where: { id: 'profile-seed-003' },
    update: {},
    create: {
      id: 'profile-seed-003',
      userId: DEV_USER_ID,
      name: 'Google Ads Master Account',
      group: 'Search Engine',
      os: 'Windows',
      browser: 'Chrome 120.0.3202',
      tags: ['Google', 'Critical'],
      status: 'Stopped',
      fingerprint: {},
    },
  });
  console.log('  Profiles created');

  // 5. Update proxy assignments
  await prisma.proxy.update({
    where: { id: proxy1.id },
    data: { assignedProfileId: 'profile-seed-001' },
  });
  await prisma.proxy.update({
    where: { id: proxy3.id },
    data: { assignedProfileId: 'profile-seed-002' },
  });
  console.log('  Proxy assignments set');

  // 6. Create extensions
  const extMetamask = await prisma.extension.upsert({
    where: { extId: 'metamask' },
    update: {},
    create: { name: 'MetaMask', extId: 'metamask', description: 'Crypto Wallet', icon: '🦊', version: '11.7.2', size: '4.2 MB' },
  });

  const extAdblock = await prisma.extension.upsert({
    where: { extId: 'adblock' },
    update: {},
    create: { name: 'AdBlock Plus', extId: 'adblock', description: 'Block ads & trackers', icon: '🚫', version: '3.22', size: '1.8 MB' },
  });

  const extGrammarly = await prisma.extension.upsert({
    where: { extId: 'grammarly' },
    update: {},
    create: { name: 'Grammarly', extId: 'grammarly', description: 'Writing assistant', icon: '📝', version: '14.1091', size: '2.5 MB' },
  });

  const extSwitchy = await prisma.extension.upsert({
    where: { extId: 'switchy' },
    update: {},
    create: { name: 'Proxy SwitchyOmega', extId: 'switchy', description: 'Proxy manager', icon: '🔀', version: '2.5.21', size: '0.9 MB' },
  });
  console.log('  Extensions created');

  // 7. Assign extensions to profiles
  const assignExt = async (profileId, extensionId, enabled) => {
    await prisma.profileExtension.upsert({
      where: { profileId_extensionId: { profileId, extensionId } },
      update: { enabled },
      create: { profileId, extensionId, enabled },
    });
  };

  await assignExt('profile-seed-001', extMetamask.id, true);
  await assignExt('profile-seed-001', extAdblock.id, true);
  await assignExt('profile-seed-002', extMetamask.id, true);
  await assignExt('profile-seed-002', extGrammarly.id, true);
  await assignExt('profile-seed-003', extSwitchy.id, true);
  console.log('  Profile-extension assignments set');

  // 8. Create team members
  await prisma.teamMember.create({ data: { userId: DEV_USER_ID, name: 'Rahim Khan', email: 'rahim@company.com', role: 'Admin', sharedProfileCount: 5, status: 'Active' } });
  await prisma.teamMember.create({ data: { userId: DEV_USER_ID, name: 'Sarah Lee', email: 'sarah@company.com', role: 'Member', sharedProfileCount: 3, status: 'Invited' } });
  await prisma.teamMember.create({ data: { userId: DEV_USER_ID, name: 'Mike Chen', email: 'mike@company.com', role: 'Member', sharedProfileCount: 2, status: 'Active' } });
  console.log('  Team members created');

  // 9. Create activity logs
  await prisma.activityLog.create({ data: { userId: DEV_USER_ID, userName: 'Dev User', action: 'Started Profile', target: 'Amazon Buyer Account - 01', ip: '192.168.1.10', status: 'Success' } });
  await prisma.activityLog.create({ data: { userId: DEV_USER_ID, userName: 'Rahim Khan', action: 'Proxy Changed', target: 'Facebook Ads - Agency Client A', ip: '103.45.67.89', status: 'Success' } });
  await prisma.activityLog.create({ data: { userId: DEV_USER_ID, userName: 'Dev User', action: 'Created Profile', target: 'Google Ads Master Account', ip: '192.168.1.10', status: 'Success' } });
  console.log('  Activity logs created');

  console.log('Seeding complete!');
  console.log('  - 1 User');
  console.log('  - 1 License');
  console.log('  - 3 Proxies');
  console.log('  - 3 Profiles');
  console.log('  - 4 Extensions');
  console.log('  - 5 Profile-Extension assignments');
  console.log('  - 3 Team Members');
  console.log('  - 3 Activity Logs');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
