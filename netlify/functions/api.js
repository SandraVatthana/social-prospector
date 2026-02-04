import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import routes from copied src directory
import authRoutes from './src/routes/auth.js';
import searchRoutes from './src/routes/search.js';
import messagesRoutes from './src/routes/messages.js';
import billingRoutes from './src/routes/billing.js';
import voiceRoutes from './src/routes/voice.js';
import prospectsRoutes from './src/routes/prospects.js';
import onboardingRoutes from './src/routes/onboarding.js';
import analyticsRoutes from './src/routes/analytics.js';
import adminRoutes from './src/routes/admin.js';
import optoutRoutes from './src/routes/optout.js';
import conversationsRoutes from './src/routes/conversations.js';
import clientsRoutes from './src/routes/clients.js';
import sequenceRoutes from './src/routes/sequence.js';
import userRoutes from './src/routes/user.js';
import categorizationRoutes from './src/routes/categorization.js';
import exportRoutes from './src/routes/export.js';
import icpRoutes from './src/routes/icp.js';
import campaignsRoutes from './src/routes/campaigns.js';
import followupsRoutes from './src/routes/followups.js';
import scoringRoutes from './src/routes/scoring.js';
import commentsRoutes from './src/routes/comments.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

app.use(cors({
  origin: true, // Allow all origins for Netlify Functions
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'netlify',
    version: '2.1.0',
    routes: ['auth', 'comments', 'campaigns', 'prospects', 'voice']
  });
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
app.use('/api/export', exportRoutes);
app.use('/api/icp', icpRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/comments', commentsRoutes);

// Image proxy pour contourner les restrictions CORS d'Instagram
app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    const allowedDomains = ['instagram.com', 'cdninstagram.com', 'fbcdn.net', 'scontent'];
    const isAllowed = allowedDomains.some(domain => url.includes(domain));

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[ImageProxy] Error:', error.message);
    res.status(500).json({ error: 'Erreur proxy' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur',
    code: err.code || 'SERVER_ERROR',
  });
});

// Export the serverless handler
export const handler = serverless(app);
