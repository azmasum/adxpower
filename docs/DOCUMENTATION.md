# AdxPower v1.0 — Full Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Features](#features)
5. [User Guide](#user-guide)
6. [Admin Guide](#admin-guide)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 1. Overview

AdxPower is a self-hosted multi-login anti-detect browser management platform. It creates isolated browser profiles with unique fingerprints, manages proxies, automates browser tasks via RPA, and handles licensing with PayPal payment integration.

### Key Capabilities

- **Anti-Detect Browsers**: Launch isolated Chromium profiles with unique WebGL, canvas, audio, and font fingerprints
- **Proxy Management**: Scrape free proxies from multiple sources, validate connectivity, assign to profiles
- **RPA Automation**: Visual step builder for automating browser tasks (click, type, navigate, extract, etc.)
- **License System**: Hardware-locked license keys with online verification, offline activation, and free trial
- **Payment**: PayPal checkout for purchasing license plans (Starter, Professional, Agency, One-Time)
- **Team Collaboration**: Invite members, share profiles, track activity logs

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand |
| Desktop | Electron 27 |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL 15 (Docker) |
| Browser Engine | puppeteer-extra + stealth plugin |
| Payment | PayPal REST API |
| Styling | Dark theme, glass morphism, gradients |

---

## 2. Architecture

```
adxprower/
├── client/                     # React + Vite frontend + Electron shell
│   ├── electron/main.ts        # Electron BrowserWindow + IPC
│   ├── src/
│   │   ├── App.tsx             # Root layout + sidebar navigation
│   │   ├── config.ts           # Centralized API URLs
│   │   ├── store/              # Zustand state stores
│   │   └── components/         # UI components (14 total)
│   └── vite.config.ts
│
├── server/                     # NestJS backend
│   ├── src/
│   │   ├── main.ts             # Bootstrap + CORS + global prefix
│   │   ├── app.module.ts       # Root module + auto-expire cron
│   │   ├── guards/             # LicenseVerificationGuard
│   │   ├── profiles/           # Profile CRUD + browser launch
│   │   ├── proxies/            # Proxy CRUD + scraping + checking
│   │   ├── license/            # License + trial + offline activation
│   │   ├── payment/            # PayPal integration + orders
│   │   ├── browser/            # Puppeteer browser management
│   │   ├── rpa/                # RPA step execution
│   │   ├── extensions/         # Extension management
│   │   ├── team/               # Team member management
│   │   └── activity-log/       # Audit logging
│   └── prisma/schema.prisma   # Database schema (11 models)
│
└── docker-compose.yml          # PostgreSQL + Redis
```

### Request Flow

```
Browser/Electron → Vite Dev Server (5173) → React App
                                                ↓ fetch/axios
                                          NestJS API (3000)
                                                ↓ Prisma
                                          PostgreSQL (5433)
```

### Authentication

All protected endpoints require the `x-hardware-id` header. The `LicenseVerificationGuard` validates this header against the License table. No user login/password flow — authentication is hardware-based.

---

## 3. Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL)
- npm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd multilogin-saas

# Install dependencies
npm install

# Start database
docker-compose up -d

# Set up environment
cp server/.env.example server/.env
# Edit server/.env with your PayPal credentials

# Generate Prisma client
cd server
npx prisma generate
npx prisma db push

# Seed development data
npx prisma db seed

# Start backend (Terminal 1)
cd server
npm run start:dev

# Start frontend (Terminal 2)
cd client
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/multilogin?schema=public"

# PayPal (https://developer.paypal.com/dashboard/applications)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_MODE=sandbox  # or "live"

# App URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:5173

# Security
ADMIN_API_KEY=your_admin_secret
OFFLINE_SECRET=your_offline_activation_secret

# Ports
PORT=3000
```

### Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Admin Panel**: Use `ADMIN_API_KEY` header for admin endpoints

---

## 4. Features

### 4.1 Browser Profiles

Create isolated Chromium profiles with unique fingerprints. Each profile gets:

- Custom OS and browser version (15 OS options, 25 browser versions)
- WebGL/WebGL2 vendor and renderer spoofing
- Canvas fingerprint noise injection
- AudioContext fingerprint noise
- WebRTC IP leak prevention
- Font enumeration defense
- Timezone and locale spoofing
- Deterministic PRNG for consistent fingerprints

**Supported OS Options**: Windows 10, Windows 11, Windows Server 2022, macOS Sonoma, macOS Ventura, macOS Monterey, Ubuntu 22.04, Ubuntu 24.04, Debian 12, Fedora 39, Linux Mint 21, Arch Linux, ChromeOS, Android 14, iOS 17

**Supported Browsers**: Chrome (8 versions), Firefox (5 versions), Safari (4 versions), Edge (3 versions), Brave (2 versions), Opera (2 versions), Vivaldi, Waterfox

### 4.2 Proxy Management

- **Manual Entry**: Add proxies with host, port, protocol (HTTP/HTTPS/SOCKS4/SOCKS5), username, password
- **Free Proxy Scraping**: Fetches from ProxyScrape API, GeoNode API, and GitHub iplocate repository
- **Connection Check**: Validates proxies via ipapi.co — detects IP, country, latency
- **Scoring System**: Rates proxies by latency, uptime, country tier, anonymity level, protocol
- **Country Filter**: Scrape proxies from 10 Tier-1 countries (US, GB, DE, FR, CA, JP, AU, NL, SG, KR)
- **Assignment**: Assign proxies to profiles; auto-assign available proxy to new profiles

### 4.3 RPA Automation

12 action types available:

| Action | Description |
|--------|-------------|
| NAVIGATE | Go to a URL |
| CLICK | Click an element (CSS selector) |
| DOUBLE_CLICK | Double-click an element |
| RIGHT_CLICK | Right-click an element |
| TYPE | Type text into an input |
| WAIT | Wait for a duration (ms) |
| SCROLL | Scroll the page |
| HOVER | Hover over an element |
| SELECT | Select dropdown option |
| SCREENSHOT | Take a screenshot |
| PRESS_KEY | Press keyboard key |
| EXTRACT_TEXT | Extract text from element |

Steps are configured in a visual flow builder and executed sequentially on the profile's browser page.

### 4.4 Synchronizer (Master-Slave)

Control multiple profiles simultaneously from a master profile:

- Select a master profile
- All other profiles become slaves
- 12 sync options: clicks, typing, scroll, navigation, form fill, dropdowns, mouse move, right click, file upload, drag-drop, hotkeys, zoom

### 4.5 Cookie Robot

- **Import**: Paste cookies in JSON or Netscape format, or upload a file
- **Generate**: Create realistic cookies for 8 major platforms (Google, YouTube, Facebook, Amazon, Twitter, LinkedIn, Instagram, TikTok)
- **Warmup Bot**: Launches profile browser, visits selected sites, simulates scrolling and timing to age the profile
- **Export**: Download cookies from a running profile

### 4.6 Extensions Store

- 4 built-in extensions: MetaMask, AdBlock Plus, Grammarly, Proxy SwitchyOmega
- Custom extension upload (.crx/.zip files)
- Assign/unassign extensions to profiles
- Enable/disable toggle per extension per profile
- Auto-loads assigned extensions when profile browser starts

### 4.7 License & Payment

**License Plans**:

| Plan | Price | Duration | Max Profiles |
|------|-------|----------|--------------|
| Starter | $5/mo | 30 days | 10 |
| Professional | $25/mo | 30 days | 50 |
| Agency | $99/mo | 30 days | 200 |
| One-Time | $199 | Lifetime | 200 |

**Activation Flow**:
1. Purchase a plan via PayPal checkout
2. Receive a license key (format: `XXXX-XXXX-XXXX-XXXX`)
3. Enter key in License Manager
4. Key is bound to your hardware ID
5. License validates on each app launch

**Trial**: 1-day free trial with 3 max profiles. One trial per hardware ID.

**Offline Activation**: Generate an offline activation key using HMAC-SHA256 when internet is unavailable.

**License Transfer**: Deactivate on current machine, then activate on a new machine with the same key.

### 4.8 Team Collaboration

- Invite team members with Admin or Member roles
- Track shared profile counts
- Activity logs with CSV export
- Profile transfer between team members

### 4.9 System Settings

- Chromium binary path (browse via file picker)
- Browser version selection
- CDP (Chrome DevTools Protocol) port configuration
- RPA action delay between steps
- Execution logging toggle

---

## 5. User Guide

### Creating a Profile

1. Navigate to **Profiles** in the sidebar
2. Click **New Profile**
3. Enter a profile name (e.g., "Amazon Buyer Account - 02")
4. Select a group (E-commerce, Social Media, Ads)
5. Choose an OS (e.g., Windows 11)
6. Select a browser fingerprint (e.g., Chrome 122.0.6261)
7. Optionally assign a proxy
8. Add tags (comma-separated)
9. Click **Create Profile**

### Starting a Profile

1. Click the **Open** button on any stopped profile
2. A Chromium browser window launches with the profile's fingerprint
3. The profile status changes to "Running"

### Managing Proxies

1. Go to **Proxies** → **My Proxies**
2. Click **Add Proxy** to manually add, or **Scrape Proxies** to fetch free ones
3. Click **Check** to validate a proxy's connectivity
4. Assign a proxy to a profile via the profile's edit modal

### Running RPA Automation

1. Go to **Automation** → **RPA Robot**
2. Select a target profile
3. Add steps from the action palette (left panel)
4. Configure each step (URL, selector, text, duration, etc.)
5. Click **Run Flow**
6. Monitor execution in the log panel (right)

### Purchasing a License

1. Go to **Store** (shopping cart icon in sidebar)
2. Select a plan (Starter, Professional, Agency, or One-Time)
3. Enter your email address
4. Click **Pay** — redirected to PayPal
5. Complete payment on PayPal
6. Return to the app — license key is displayed
7. Copy the key and activate in **License Manager**

### Activating a License

1. Go to **License Manager**
2. Paste your license key
3. Click **Activate**
4. Your license is now bound to this machine

### Using Cookie Robot

1. Go to **Cookie Robot**
2. Paste cookies or upload a cookie file
3. Select a target profile
4. Choose warmup sites (Google, YouTube, Facebook, etc.)
5. Click **Start Warmup**
6. Monitor progress in the live log

---

## 6. Admin Guide

### Generating License Keys

1. Go to **License Manager** → **Admin Panel**
2. Enter your admin API key
3. Set the number of keys to generate (1-100)
4. Select a plan
5. Click **Generate**
6. Copy generated keys from the list

### Viewing All Licenses

1. In the Admin Panel, click **Load All**
2. View all licenses with status, hardware ID, plan, and expiry
3. Export or copy keys as needed

### Manually Expire Licenses

```bash
curl -X POST http://localhost:3000/api/license/expire-check \
  -H "x-admin-key: your_admin_key"
```

### Environment Security

- `ADMIN_API_KEY` — Required for admin operations (generate, list, expire-check)
- `OFFLINE_SECRET` — Required for offline activation HMAC generation
- `CORS_ORIGINS` — Comma-separated allowed origins (default: `http://localhost:5173`)

---

## 7. API Reference

### Base URL

```
http://localhost:3000/api
```

### Authentication Headers

| Header | Required For | Description |
|--------|-------------|-------------|
| `x-hardware-id` | All protected endpoints | Machine hardware ID |
| `x-admin-key` | Admin endpoints | Admin API key |

### License Endpoints

All at `/api/license` and `/api/v1/license` (both work).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/license/verify` | HWID | Verify and bind license to hardware |
| POST | `/license/unbind` | HWID | Unbind license from hardware |
| POST | `/license/trial/start` | HWID | Start 1-day free trial |
| GET | `/license/trial/status` | HWID | Get trial status |
| POST | `/license/offline/generate` | HWID | Generate offline activation key |
| POST | `/license/offline/verify` | HWID | Verify offline activation |
| GET | `/license/list` | Admin | List all licenses |
| POST | `/license/generate` | Admin | Generate license keys |
| POST | `/license/expire-check` | Admin | Manually expire licenses |

**Verify License**
```json
POST /api/license/verify
Body: { "licenseKey": "XXXX-XXXX-XXXX-XXXX", "hardwareId": "abc123" }
Response: { "valid": true, "maxProfiles": 50, "plan": "professional", "expiresAt": "2026-09-20T00:00:00Z" }
```

**Start Trial**
```json
POST /api/license/trial/start
Body: { "hardwareId": "abc123" }
Response: { "success": true, "expiresAt": "2026-08-21T12:00:00Z" }
```

**Generate Keys (Admin)**
```json
POST /api/license/generate
Headers: { "x-admin-key": "your_secret" }
Body: { "count": 10, "plan": "professional", "durationDays": 30 }
Response: { "keys": ["XXXX-XXXX-XXXX-XXXX", ...] }
```

### Profile Endpoints

All at `/api/v1/profiles`. Require `x-hardware-id` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profiles` | List all profiles |
| POST | `/profiles` | Create a profile |
| GET | `/profiles/:id` | Get a profile |
| PATCH | `/profiles/:id` | Update a profile |
| DELETE | `/profiles/:id` | Delete a profile |
| POST | `/profiles/:id/start` | Start browser for profile |
| POST | `/profiles/:id/stop` | Stop profile browser |
| POST | `/profiles/:id/assign-proxy/:proxyId` | Assign proxy |
| POST | `/profiles/:id/unassign-proxy` | Remove proxy |

**Create Profile**
```json
POST /api/v1/profiles
Headers: { "x-hardware-id": "abc123" }
Body: {
  "name": "Amazon Buyer",
  "group": "E-commerce",
  "os": "Windows 11",
  "browser": "Chrome 122.0.6261",
  "tags": ["Amazon", "US"]
}
Response: { "id": "...", "name": "Amazon Buyer", "status": "stopped", ... }
```

### Proxy Endpoints

All at `/api/v1/proxies`. Require `x-hardware-id` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/proxies` | List all proxies |
| POST | `/proxies` | Add a proxy |
| GET | `/proxies/:id` | Get a proxy |
| PATCH | `/proxies/:id` | Update a proxy |
| DELETE | `/proxies/:id` | Delete a proxy |
| POST | `/proxies/:id/check` | Check proxy connectivity |
| POST | `/proxies/scrape` | Scrape free proxies |
| POST | `/proxies/:id/assign/:profileId` | Assign to profile |
| POST | `/proxies/:id/unassign` | Unassign from profile |

**Scrape Proxies**
```json
POST /api/v1/proxies/scrape
Headers: { "x-hardware-id": "abc123" }
Body: { "country": "US", "protocol": "socks5" }
Response: { "proxies": [...], "count": 25 }
```

### Payment Endpoints

All at `/api/v1/payment`. No authentication required.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payment/plans` | List pricing plans |
| GET | `/payment/demo-mode` | Check demo mode status |
| POST | `/payment/create-order` | Create a payment order |
| POST | `/payment/capture-paypal` | Capture PayPal payment |
| POST | `/payment/order/:orderId/status` | Check order status |
| POST | `/payment/orders` | List all orders |
| POST | `/payment/webhook/paypal` | PayPal webhook |

**Create Order**
```json
POST /api/v1/payment/create-order
Body: { "email": "user@example.com", "planId": "professional", "paymentMethod": "paypal" }
Response: { "orderId": "...", "paypalOrderId": "...", "approveUrl": "https://paypal.com/...", ... }
```

### RPA Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rpa/run` | Execute RPA flow |

**Run RPA Flow**
```json
POST /api/v1/rpa/run
Headers: { "x-hardware-id": "abc123" }
Body: {
  "profileId": "profile-id",
  "steps": [
    { "type": "NAVIGATE", "config": { "url": "https://google.com" } },
    { "type": "CLICK", "config": { "selector": "input[name='q']" } },
    { "type": "TYPE", "config": { "selector": "input[name='q']", "text": "hello world" } }
  ]
}
Response: { "success": true, "logs": [...] }
```

### Extension Endpoints

All at `/api/v1/extensions`. Require `x-hardware-id` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/extensions` | List all extensions |
| GET | `/extensions/profile/:profileId` | Get extensions for a profile |
| POST | `/extensions` | Install/create extension |
| POST | `/extensions/assign` | Assign extension to profile |
| DELETE | `/extensions/assign` | Unassign extension from profile |
| PATCH | `/extensions/toggle` | Enable/disable extension |
| DELETE | `/extensions/:extId` | Delete extension |

### Team Endpoints

All at `/api/v1/team`. Require `x-hardware-id` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/team` | List team members |
| GET | `/team/count` | Get member count |
| GET | `/team/:id` | Get a member |
| POST | `/team` | Invite a member |
| PATCH | `/team/:id` | Update a member |
| DELETE | `/team/:id` | Remove a member |

### Activity Log Endpoints

All at `/api/v1/activity-logs`. Require `x-hardware-id` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activity-logs` | List logs (?limit=N) |
| GET | `/activity-logs/user/:userId` | Logs for a user |
| DELETE | `/activity-logs` | Clear all logs |

---

## 8. Database Schema

### User
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| email | String | Unique |
| password | String | Hashed or "social-auth" |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### License
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| userId | String | Unique, references User |
| licenseKey | String | Unique, format `XXXX-XXXX-XXXX-XXXX` |
| hardwareId | String? | Bound machine ID |
| status | String | "active", "expired", "disabled" |
| maxProfiles | Int | Default 2 |
| isTrial | Boolean | Default false |
| expiresAt | DateTime? | Null for lifetime |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Order
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| userId | String | References User |
| customerEmail | String | Indexed |
| plan | String | "starter", "professional", "agency", "onetime" |
| amount | Int | Price in cents |
| currency | String | Default "USD" |
| paymentMethod | String | "paypal" |
| paymentId | String? | PayPal capture ID, indexed |
| status | String | "pending", "completed", "failed" |
| licenseKey | String? | Generated after completion |
| metadata | Json? | PayPal order ID, etc. |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### TrialTracker
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| hardwareId | String | Unique |
| activatedAt | DateTime | Auto |
| expiresAt | DateTime | 24h after activation |
| status | String | "active", "expired" |

### Profile
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| userId | String | References User |
| name | String | Profile display name |
| group | String | Default "Default" |
| proxyId | String? | References Proxy |
| status | String | "stopped", "Running" |
| os | String? | Default "Windows" |
| browser | String? | Default "Chrome 120.0" |
| tags | String[] | Default [] |
| fingerprint | Json? | Generated fingerprint data |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Proxy
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| userId | String? | References User |
| host | String | Proxy hostname/IP |
| port | Int | Proxy port |
| username | String? | Auth username |
| password | String? | Auth password |
| protocol | String | "http", "https", "socks4", "socks5" |
| status | String | "active", "dead", "untested" |
| ip | String? | Detected IP |
| country | String? | Country code |
| countryName | String? | Full country name |
| latency | Int? | Response time in ms |
| lastChecked | DateTime? | Last check timestamp |
| isActive | Boolean | Default true |
| assignedProfileId | String? | Assigned profile |

### Extension
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| name | String | Display name |
| extId | String | Unique extension ID |
| description | String | Default "" |
| icon | String | Default "package" emoji |
| version | String | Default "1.0.0" |
| size | String | Default "0 MB" |
| isCustom | Boolean | Default false |
| filePath | String? | Custom upload path |

### ProfileExtension
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| profileId | String | References Profile |
| extensionId | String | References Extension |
| enabled | Boolean | Default true |
| | | Composite unique: [profileId, extensionId] |

### TeamMember
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| userId | String | Owner user ID |
| name | String | Member name |
| email | String | Member email |
| role | String | "Admin", "Member" |
| sharedProfileCount | Int | Default 0 |
| status | String | "Active", "Inactive" |

### ActivityLog
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| userId | String? | User who performed action |
| userName | String | Default "System" |
| action | String | Action description |
| target | String | Default "" |
| details | Json? | Additional data |
| ip | String? | IP address |
| status | String | "Success", "Failed" |

---

## 9. Deployment

### Docker Setup

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    ports: ["5433:5432"]
    environment:
      POSTGRES_DB: multilogin
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### Production Build

```bash
# Build server
cd server
npm run build

# Build client
cd client
npm run build

# Run server
cd server
node dist/main.js
```

### Production Environment

```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=live
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
ADMIN_API_KEY=strong_random_secret
OFFLINE_SECRET=strong_random_secret
PORT=3000
```

### Security Checklist

- [ ] Set strong `ADMIN_API_KEY` (minimum 32 characters)
- [ ] Set strong `OFFLINE_SECRET` (minimum 32 characters)
- [ ] Configure `CORS_ORIGINS` to your production domain only
- [ ] Use `PAYPAL_MODE=live` with production PayPal credentials
- [ ] Enable HTTPS in production (reverse proxy with nginx/caddy)
- [ ] PostgreSQL should not be exposed to public internet
- [ ] Use environment-specific database credentials

---

## 10. Troubleshooting

### Backend won't start

**Port already in use (EADDRINUSE)**
```bash
# Find and kill the process using port 3000
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

**Database connection failed**
- Verify Docker containers are running: `docker ps`
- Check DATABASE_URL in `.env`
- Ensure port 5433 maps to PostgreSQL 5432

### Frontend shows "Failed to fetch"

- Ensure backend is running on port 3000
- Check CORS_ORIGINS in `.env` includes `http://localhost:5173`
- Verify `x-hardware-id` header is sent with requests

### PayPal 401 Error

- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` must be different values
- Verify credentials at https://developer.paypal.com/dashboard/applications
- For development, use sandbox mode: `PAYPAL_MODE=sandbox`
- Sandbox credentials are different from live credentials

### License activation fails

- Ensure `x-hardware-id` header matches between activation and usage
- Check if license key is already bound to a different hardware ID
- Use "Deactivate" to unbind before transferring to a new machine

### Profile browser won't start

- Verify Chromium binary path in System Settings
- Check that `C:\Users\<user>\.cache\puppeteer\chrome\...` exists
- Ensure no other process is using the CDP port

### RPA steps not executing

- Profile must be "Running" (RPA auto-starts if stopped)
- CSS selectors must be valid
- Check RPA execution log for specific errors
- Increase RPA delay in System Settings if steps are too fast

---

## License

Proprietary software. All rights reserved.
