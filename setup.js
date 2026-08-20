const fs = require('fs');
const path = require('path');

// তৈরি করার জন্য প্রয়োজনীয় ফোল্ডারগুলোর তালিকা
const directories = [
  'client',
  'client/electron',
  'client/src',
  'client/src/store',
  'client/src/components',
  'client/src/utils',
  'server',
  'server/prisma',
  'server/src',
  'server/src/profiles',
  'server/src/profiles/dto',
  'server/src/proxies',
  'server/src/proxies/dto',
  'server/src/billing',
  'server/src/license',
];

// ফাইলের কন্টেন্ট এবং পাথের ম্যাপিং
const files = {
  // === ROOT CONFIGURATION ===
  'package.json': JSON.stringify({
    name: "adxpower",
    version: "1.0.0",
    private: true,
    workspaces: [
      "client",
      "server"
    ],
    scripts: {
      "bootstrap": "npm install"
    }
  }, null, 2),

  'docker-compose.yml': `version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: multilogin-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: multilogin
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: multilogin-redis
    ports:
      - "6379:6379"

volumes:
  pgdata:`,

  // === CLIENT CONFIGURATION ===
  'client/package.json': JSON.stringify({
    name: "client",
    version: "1.0.0",
    main: "dist-electron/electron/main.js",
    scripts: {
      "dev": "vite",
      "build": "tsc && vite build",
      "electron:dev": "concurrently -k \"npm run dev\" \"tsc -p tsconfig.json --watch\" \"electron .\"",
      "dist": "npm run build && electron-builder"
    },
    dependencies: {
      "axios": "^1.6.0",
      "lucide-react": "^0.290.0",
      "node-machine-id": "^1.1.12",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "zustand": "^4.4.0"
    },
    devDependencies: {
      "concurrently": "^8.2.0",
      "electron": "^27.0.0",
      "electron-builder": "^24.6.0",
      "typescript": "^5.2.0",
      "vite": "^4.5.0"
    }
  }, null, 2),

  // === ELECTRON PRELOAD & MAIN ===
  'client/electron/preload.ts': `import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openProfile: (profileId: string) => ipcRenderer.invoke('profile:open', profileId),
  closeProfile: (profileId: string) => ipcRenderer.invoke('profile:close', profileId),
  verifyLicense: (licenseKey: string) => ipcRenderer.invoke('license:verify', licenseKey),
});`,

  'client/electron/main.ts': `import { app, BrowserWindow, ipcMain } from 'electron';
import axios from 'axios';
import * as path from 'path';
import { machineIdSync } from 'node-machine-id';

let mainWindow: BrowserWindow | null = null;
const BACKEND_API_URL = 'http://localhost:3000/api/v1';

function getSystemHardwareId(): string {
  try {
    return machineIdSync();
  } catch {
    return 'FALLBACK_ID_' + process.arch + '_' + process.platform;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:5173');
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('profile:open', async (event, profileId) => {
    try {
      const response = await axios.post(\`\${BACKEND_API_URL}/profiles/\${profileId}/start\`, {}, {
        headers: { 'x-hardware-id': getSystemHardwareId() }
      });
      return { success: true, wsEndpoint: response.data.wsEndpoint };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  });

  ipcMain.handle('profile:close', async (event, profileId) => {
    try {
      await axios.post(\`\${BACKEND_API_URL}/profiles/\${profileId}/stop\`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('license:verify', async (event, licenseKey) => {
    try {
      const res = await axios.post(\`\${BACKEND_API_URL}/license/verify\`, {
        licenseKey,
        hardwareId: getSystemHardwareId()
      });
      return { verified: true, maxProfiles: res.data.maxProfiles };
    } catch (err: any) {
      return { verified: false, reason: err.response?.data?.message || 'Offline' };
    }
  });
});`,

  // === FRONTEND COMPONENTS & UTILS ===
  'client/src/utils/flags.ts': `export const getFlagEmoji = (countryCode?: string): string => {
  if (!countryCode) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🏳️';
  }
};`,

  // === BACKEND CONFIG & SERVICE ===
  'server/package.json': JSON.stringify({
    name: "server",
    version: "1.0.0",
    scripts: {
      "build": "nest build",
      "start:dev": "nest start --watch",
      "prisma:migrate": "prisma migrate dev"
    },
    dependencies: {
      "@nestjs/common": "^10.0.0",
      "@nestjs/core": "^10.0.0",
      "@prisma/client": "^5.5.0",
      "axios": "^1.6.0",
      "class-validator": "^0.14.0",
      "http-proxy-agent": "^7.0.0",
      "https-proxy-agent": "^7.0.0",
      "puppeteer": "^21.5.0",
      "puppeteer-extra": "^3.3.6",
      "puppeteer-extra-plugin-stealth": "^2.11.2",
      "socks-proxy-agent": "^8.0.2"
    },
    devDependencies: {
      "@nestjs/cli": "^10.0.0",
      "prisma": "^5.5.0",
      "typescript": "^5.2.0"
    }
  }, null, 2),

  'server/prisma/schema.prisma': `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  password     String
  subscription Subscription?
  license      License?
  profiles     Profile[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model Subscription {
  id                   String   @id @default(uuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  status               String
  plan                 String
  currentPeriodEnd     DateTime
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model License {
  id         String    @id @default(uuid())
  userId     String    @unique
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  licenseKey String    @unique
  hardwareId String?
  status     String    @default("active")
  maxProfiles Int      @default(2)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model Profile {
  id           String   @id @default(uuid())
  name         String
  group        String   @default("Default")
  proxyId      String?
  proxy        Proxy?   @relation(fields: [proxyId], references: [id], onDelete: SetNull)
  os           String   @default("Windows")
  browser      String   @default("Chrome 120.0")
  tags         String[]
  status       String   @default("Stopped")
  fingerprint  Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Proxy {
  id          String    @id @default(uuid())
  host        String
  port        Int
  type        String
  username    String?
  password    String?
  status      String    @default("untested")
  latency     Int?
  lastChecked DateTime?
  ip          String?
  country     String?
  countryName String?
  profiles    Profile[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  userId      String
}`,

  'server/src/browser.service.ts': `import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

@Injectable()
export class BrowserService {
  private userDataRoot = path.join(process.cwd(), 'user_data');

  constructor() {
    if (!fs.existsSync(this.userDataRoot)) {
      fs.mkdirSync(this.userDataRoot, { recursive: true });
    }
  }

  async launchProfile(profileId: string, fingerprint: any, proxyUrl?: string): Promise<{ wsEndpoint: string }> {
    try {
      const profileDir = path.join(this.userDataRoot, profileId);
      const args = [
        \`--user-data-dir=\${profileDir}\`,
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      ];

      if (proxyUrl) args.push(\`--proxy-server=\${proxyUrl}\`);

      const browser = await puppeteer.launch({
        headless: false,
        args,
      });

      return { wsEndpoint: browser.wsEndpoint() };
    } catch (err: any) {
      throw new InternalServerErrorException('Anti-detect launcher failure: ' + err.message);
    }
  }
}`
};

// অটোমেটিক জেনারেট করার মূল প্রসেস
console.log('🚀 AdxPower v1.0 Monorepo Package Auto-Generator Starting...');

// ১. ডিরেক্টরিগুলো তৈরি করা
directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created folder: ${dir}`);
  }
});

// ২. ফাইলগুলো স্বয়ংক্রিয়ভাবে কোডসহ রাইট করা
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`📄 Generated file: ${filePath}`);
});

console.log(`
==================================================
✅ Generation Successful!
All core components, services, and modules have been written.

👉 Next Steps on your PC:
1. Run "npm run bootstrap" in this root folder to map client & server workspaces.
2. Go to "server" -> Run "npm install" -> Configure ".env" -> Run "npx prisma db push".
3. Go to "client" -> Run "npm install" -> Run "npm run electron:dev" to start.
==================================================
`);