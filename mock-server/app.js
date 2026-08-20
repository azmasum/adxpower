// app.ts / server.ts - FULLY CONNECTED
import express from 'express';
import cors from 'cors';
import billingRouter from './routes/billing.js';
import profilesRouter from './routes/profiles.js';
import proxiesRouter from './routes/proxies.js';
import licenseRouter from './routes/license.js';
import { licenseVerificationMiddleware } from './middleware/license-verification.js';

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Public routes - license check লাগবে না
app.use('/api/v1/license', licenseRouter);
app.use('/api/v1/billing', billingRouter); // Billing webhook public হতে পারে

// ✅ Protected routes - সব Profile/Proxy route এ license + hardware check
app.use('/api/v1/profiles', licenseVerificationMiddleware, profilesRouter);
app.use('/api/v1/proxies', licenseVerificationMiddleware, proxiesRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;
