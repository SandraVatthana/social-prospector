/**
 * Routes pour l'Export Multi-Formats
 * Social Prospector - Export CSV, Markdown, JSON
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  exportProspectsCSV,
  exportCRMDashboardCSV,
  exportICPStatsCSV,
  exportProspectsMarkdown,
  exportCRMMarkdown,
  exportICPMarkdown,
  exportFullReportJSON
} from '../services/exportService.js';

const router = express.Router();

/**
 * GET /api/export/prospects/csv
 * Exporte les prospects en CSV
 */
router.get('/prospects/csv', requireAuth, async (req, res) => {
  try {
    const { status, platform, category, minIcpScore } = req.query;
    const filters = { status, platform, category, minIcpScore };

    const csv = await exportProspectsCSV(req.user.id, filters);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prospects_${formatFilename()}.csv"`);
    res.send('\ufeff' + csv); // BOM pour Excel
  } catch (error) {
    console.error('[Export] Error exporting prospects CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/prospects/markdown
 * Exporte les prospects en Markdown
 */
router.get('/prospects/markdown', requireAuth, async (req, res) => {
  try {
    const { status, platform, category, minIcpScore } = req.query;
    const filters = { status, platform, category, minIcpScore };

    const md = await exportProspectsMarkdown(req.user.id, filters);

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prospects_${formatFilename()}.md"`);
    res.send(md);
  } catch (error) {
    console.error('[Export] Error exporting prospects Markdown:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/crm/csv
 * Exporte le CRM Dashboard en CSV
 */
router.get('/crm/csv', requireAuth, async (req, res) => {
  try {
    const csv = await exportCRMDashboardCSV(req.user.id);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="crm_dashboard_${formatFilename()}.csv"`);
    res.send('\ufeff' + csv);
  } catch (error) {
    console.error('[Export] Error exporting CRM CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/crm/markdown
 * Exporte le CRM Dashboard en Markdown
 */
router.get('/crm/markdown', requireAuth, async (req, res) => {
  try {
    const md = await exportCRMMarkdown(req.user.id);

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="crm_dashboard_${formatFilename()}.md"`);
    res.send(md);
  } catch (error) {
    console.error('[Export] Error exporting CRM Markdown:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/icp/csv
 * Exporte les stats ICP en CSV
 */
router.get('/icp/csv', requireAuth, async (req, res) => {
  try {
    const csv = await exportICPStatsCSV(req.user.id);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="icp_scoring_${formatFilename()}.csv"`);
    res.send('\ufeff' + csv);
  } catch (error) {
    console.error('[Export] Error exporting ICP CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/icp/markdown
 * Exporte les stats ICP en Markdown
 */
router.get('/icp/markdown', requireAuth, async (req, res) => {
  try {
    const md = await exportICPMarkdown(req.user.id);

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="icp_report_${formatFilename()}.md"`);
    res.send(md);
  } catch (error) {
    console.error('[Export] Error exporting ICP Markdown:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/full/json
 * Exporte un rapport complet en JSON
 */
router.get('/full/json', requireAuth, async (req, res) => {
  try {
    const report = await exportFullReportJSON(req.user.id);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="full_report_${formatFilename()}.json"`);
    res.json(report);
  } catch (error) {
    console.error('[Export] Error exporting full report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/formats
 * Liste les formats d'export disponibles
 */
router.get('/formats', (req, res) => {
  res.json({
    success: true,
    formats: [
      {
        id: 'csv',
        name: 'CSV (Tableur)',
        description: 'Compatible Excel, Google Sheets',
        icon: 'table',
        endpoints: ['/prospects/csv', '/crm/csv', '/icp/csv']
      },
      {
        id: 'markdown',
        name: 'Markdown',
        description: 'Format texte structuré',
        icon: 'file-text',
        endpoints: ['/prospects/markdown', '/crm/markdown', '/icp/markdown']
      },
      {
        id: 'json',
        name: 'JSON (Données brutes)',
        description: 'Pour intégration ou backup',
        icon: 'code',
        endpoints: ['/full/json']
      }
    ]
  });
});

// Helper
function formatFilename() {
  return new Date().toISOString().split('T')[0];
}

export default router;
