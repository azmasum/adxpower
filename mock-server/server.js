// server/src/server.js - FIXED V2 - Array format for profiles
import express from 'express';
import cors from 'cors';
import licenseRouter from './routes/license.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Mock DB - UI format এর সাথে মিল রেখে ---
let profiles = [
  {
    id: '1',
    name: 'Amazon Buyer Account - 01',
    group: 'E-commerce',
    proxy: 'socks5://185.220.101.4:1080',
    proxyStatus: 'active',
    os: 'Windows',
    browser: 'Chrome 120.0.3202',
    tags: ['Amazon', 'US'],
    status: 'Stopped',
    lastUsed: '2026-08-13 14:22'
  },
  {
    id: '2',
    name: 'Facebook Ads - Agency Client A',
    group: 'Social Media',
    proxy: 'Direct (No Proxy)',
    proxyStatus: 'none',
    os: 'Windows',
    browser: 'Chrome 121.0.6167',
    tags: ['Facebook', 'Ads'],
    status: 'Stopped',
    lastUsed: '2026-08-13 19:10'
  },
  {
    id: '3',
    name: 'Google Ads Master Account',
    group: 'Search Engine',
    proxy: 'Direct (No Proxy)',
    proxyStatus: 'none',
    os: 'Windows',
    browser: 'Chrome 120.0.3202',
    tags: ['Google', 'Critical'],
    status: 'Stopped',
    lastUsed: '2026-08-12 09:15'
  }
];

let systemSettings = {
  theme: "dark",
  language: "en",
  autoUpdate: true,
  general: {
    theme: "dark",
    language: "en"
  }
};

// --- License ---
app.use('/api/license', licenseRouter);

app.get('/', (req, res) => {
  res.send('✅ MultiLogin SaaS License Server Running - Patched v1.8.0 FIXED V2');
});

// ===============================
// ✅ FIX V2: Profiles API must return ARRAY directly
// useProfileStore expects: const data = await res.json(); data.map(...)
// ===============================
app.get('/api/v1/profiles', (req, res) => {
  console.log(`📥 GET /api/v1/profiles -> returning ${profiles.length} profiles as ARRAY`);
  // IMPORTANT: Return array directly, NOT {success:true, data:[]}
  res.json(profiles);
});

app.post('/api/v1/profiles', (req, res) => {
  console.log('📥 POST /api/v1/profiles', req.body);
  const newProfile = {
    id: Date.now().toString(),
    name: req.body.name || `Profile ${profiles.length + 1}`,
    group: req.body.group || 'General',
    proxy: req.body.proxy || 'Direct (No Proxy)',
    proxyStatus: req.body.proxyStatus || 'none',
    os: req.body.os || 'Windows',
    browser: req.body.browser || 'Chrome 120.0.3202',
    tags: req.body.tags || [],
    status: 'Stopped',
    lastUsed: new Date().toLocaleString(),
    ...req.body
  };
  profiles.push(newProfile);
  // Return the created profile (also array compatible? return object)
  res.json(newProfile);
});

app.get('/api/v1/profiles/:id', (req, res) => {
  const profile = profiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json(profile);
});

app.put('/api/v1/profiles/:id', (req, res) => {
  const index = profiles.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Not found' });
  profiles[index] = { ...profiles[index], ...req.body };
  res.json(profiles[index]);
});

app.delete('/api/v1/profiles/:id', (req, res) => {
  console.log(`🗑️ DELETE /api/v1/profiles/${req.params.id}`);
  profiles = profiles.filter(p => p.id !== req.params.id);
  res.json({ success: true });
});

app.post('/api/v1/profiles/:id/start', (req, res) => {
  console.log(`▶️ Starting profile ${req.params.id}`);
  const p = profiles.find(x => x.id === req.params.id);
  if (p) p.status = 'Running';
  res.json({ success: true, message: 'Profile started', data: p });
});

app.post('/api/v1/profiles/:id/stop', (req, res) => {
  console.log(`⏹️ Stopping profile ${req.params.id}`);
  const p = profiles.find(x => x.id === req.params.id);
  if (p) p.status = 'Stopped';
  res.json({ success: true, message: 'Profile stopped', data: p });
});

// ===============================
// FIX: Settings - General page was showing "Settings - settings"
// ===============================
app.get('/api/v1/settings', (req, res) => {
  res.json(systemSettings);
});

app.get('/api/v1/system/settings', (req, res) => {
  res.json(systemSettings);
});

app.get('/api/v1/system/general', (req, res) => {
  res.json(systemSettings.general);
});

app.get('/api/settings', (req, res) => {
  res.json(systemSettings);
});

app.put('/api/v1/settings', (req, res) => {
  systemSettings = { ...systemSettings, ...req.body };
  res.json(systemSettings);
});

// Mock for other modules to prevent 404
const mockArray = (req, res) => {
  console.log(`[MOCK] ${req.method} ${req.originalUrl} -> []`);
  res.json([]);
};
const mockObject = (req, res) => {
  console.log(`[MOCK] ${req.method} ${req.originalUrl} -> {}`);
  res.json({});
};

app.get('/api/v1/fingerprints', mockArray);
app.get('/api/v1/cookies', mockArray);
app.get('/api/v1/extensions', mockArray);
app.get('/api/v1/automation', mockArray);
app.get('/api/v1/synchronizer', mockArray);
app.get('/api/v1/rpa', mockArray);
app.get('/api/v1/team', mockArray);
app.get('/api/v1/logs', mockArray);
app.get('/api/v1/transfer', mockArray);
app.get('/api/v1/license', mockObject);
app.get('/api/v1/config', mockObject);

// Fallback - return empty array for any unknown /api/v1/* GET
app.use('/api/v1', (req, res) => {
  console.log(`[FALLBACK] ${req.method} ${req.originalUrl} -> []`);
  if (req.method === 'GET') return res.json([]);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 License API: http://localhost:${PORT}/api/license/generate`);
  console.log(`👤 Profiles API: http://localhost:${PORT}/api/v1/profiles -> ARRAY format FIXED`);
});
