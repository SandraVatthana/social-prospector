// Load environment variables FIRST - SOS Prospection Backend v2
import 'dotenv/config';

// Validate required environment variables at startup
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('ERROR: Missing required environment variables:');
  missingVars.forEach(v => console.error(`  - ${v}`));
  console.error('\nPlease check your .env file.');
  process.exit(1);
}

// Warn about optional but recommended variables
const optionalVars = ['ANTHROPIC_API_KEY', 'APIFY_API_TOKEN', 'FRONTEND_URL'];
const missingOptional = optionalVars.filter(v => !process.env[v]);
if (missingOptional.length > 0) {
  console.warn('WARNING: Some optional environment variables are not set:');
  missingOptional.forEach(v => console.warn(`  - ${v}`));
  console.warn('Some features may not work correctly.\n');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import searchRoutes from './routes/search.js';
import messagesRoutes from './routes/messages.js';
import billingRoutes from './routes/billing.js';
import voiceRoutes from './routes/voice.js';
import prospectsRoutes from './routes/prospects.js';
import onboardingRoutes from './routes/onboarding.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import optoutRoutes from './routes/optout.js';
import conversationsRoutes from './routes/conversations.js';
import clientsRoutes from './routes/clients.js';
import sequenceRoutes from './routes/sequence.js';
import userRoutes from './routes/user.js';
import categorizationRoutes from './routes/categorization.js';
import icpRoutes from './routes/icp.js';
import exportRoutes from './routes/export.js';
import campaignsRoutes from './routes/campaigns.js';
import followupsRoutes from './routes/followups.js';
import scoringRoutes from './routes/scoring.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration - explicit origins only (no wildcard)
const allowedOrigins = [
  'https://sosprospection.com',
  'https://www.sosprospection.com',
  'https://sosprospection.netlify.app',
  process.env.FRONTEND_URL,
  // Development origins
  'http://localhost:5173',
  'http://localhost:5178',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));

// Rate limiting - general
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes' },
});

// Rate limiting - strict pour auth (prévention brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
});

// Rate limiting - modéré pour search (opérations coûteuses)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 recherches par minute
  message: { error: 'Trop de recherches, attendez une minute' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/search', searchLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/prospects', prospectsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/opt-out', optoutRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/sequence', sequenceRoutes);
app.use('/api/user', userRoutes);
app.use('/api/categorization', categorizationRoutes);
app.use('/api/icp', icpRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/scoring', scoringRoutes);

// Image proxy pour contourner les restrictions CORS d'Instagram
app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    // Valider que c'est une URL Instagram ou CDN autorisé
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'URL invalide' });
    }

    // Vérifier le protocole (HTTPS uniquement)
    if (parsedUrl.protocol !== 'https:') {
      return res.status(403).json({ error: 'Protocole non autorisé' });
    }

    // Liste des domaines autorisés (vérification stricte du hostname)
    const allowedDomains = [
      'instagram.com',
      'cdninstagram.com',
      'fbcdn.net',
      'scontent.cdninstagram.com',
    ];

    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowed = allowedDomains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
    if (!isAllowed) {
      return res.status(403).json({ error: 'Domaine non autorisé' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erreur de récupération' });
    }

    const contentType = response.headers.get('content-type');

    // Headers CORS explicites pour éviter ERR_BLOCKED_BY_RESPONSE
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[ImageProxy] Error:', error.message);
    res.status(500).json({ error: 'Erreur proxy' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur',
    code: err.code || 'SERVER_ERROR',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
