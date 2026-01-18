/**
 * Service d'Export Multi-Formats
 * Génère des exports CSV, Markdown et JSON pour les données
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Exporte les prospects en CSV
 */
export async function exportProspectsCSV(userId, filters = {}) {
  const prospects = await getProspectsData(userId, filters);

  const headers = [
    'Username',
    'Nom complet',
    'Plateforme',
    'Bio',
    'Followers',
    'Engagement',
    'Statut',
    'Score ICP',
    'Recommandation ICP',
    'Catégorie réponse',
    'Dernière réponse',
    'Date ajout',
    'Dernier contact'
  ];

  const rows = prospects.map(p => [
    p.username || '',
    p.full_name || '',
    p.platform || '',
    (p.bio || '').replace(/"/g, '""').replace(/\n/g, ' '),
    p.followers || 0,
    p.engagement || 0,
    p.status || 'new',
    p.icp_score || '',
    p.icp_recommendation || '',
    p.response_category || '',
    (p.last_prospect_response || '').replace(/"/g, '""').replace(/\n/g, ' '),
    formatDate(p.created_at),
    formatDate(p.last_contacted_at)
  ]);

  return generateCSV(headers, rows);
}

/**
 * Exporte le CRM Dashboard en CSV
 */
export async function exportCRMDashboardCSV(userId, filters = {}) {
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('user_id', userId)
    .not('response_category', 'is', null);

  if (error) throw error;

  const headers = [
    'Username',
    'Nom',
    'Plateforme',
    'Catégorie',
    'Confiance',
    'Dernière réponse',
    'Date réponse',
    'Nécessite attention',
    'Raison attention'
  ];

  const rows = prospects.map(p => [
    p.username || '',
    p.full_name || '',
    p.platform || '',
    p.response_category || '',
    p.response_category_confidence || '',
    (p.last_prospect_response || '').replace(/"/g, '""').replace(/\n/g, ' '),
    formatDate(p.last_prospect_response_at),
    p.needs_attention ? 'Oui' : 'Non',
    p.attention_reason || ''
  ]);

  return generateCSV(headers, rows);
}

/**
 * Exporte les stats ICP en CSV
 */
export async function exportICPStatsCSV(userId) {
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('user_id', userId)
    .not('icp_score', 'is', null)
    .order('icp_score', { ascending: false });

  if (error) throw error;

  const headers = [
    'Username',
    'Nom',
    'Plateforme',
    'Score ICP',
    'Confiance',
    'Recommandation',
    'Points forts',
    'Points faibles',
    'Hooks personnalisation',
    'Statut',
    'Converti'
  ];

  const rows = prospects.map(p => [
    p.username || '',
    p.full_name || '',
    p.platform || '',
    p.icp_score || 0,
    p.icp_score_confidence || '',
    p.icp_recommendation || '',
    (p.icp_matches || []).join('; '),
    (p.icp_gaps || []).join('; '),
    (p.icp_personalization_hooks || []).join('; '),
    p.status || '',
    p.status === 'converted' ? 'Oui' : 'Non'
  ]);

  return generateCSV(headers, rows);
}

/**
 * Exporte les prospects en Markdown
 */
export async function exportProspectsMarkdown(userId, filters = {}) {
  const prospects = await getProspectsData(userId, filters);

  let md = `# Export Prospects\n\n`;
  md += `**Date d'export:** ${new Date().toLocaleDateString('fr-FR')}\n`;
  md += `**Total:** ${prospects.length} prospects\n\n`;
  md += `---\n\n`;

  // Stats rapides
  const stats = {
    new: prospects.filter(p => p.status === 'new').length,
    contacted: prospects.filter(p => p.status === 'contacted').length,
    replied: prospects.filter(p => p.status === 'replied').length,
    converted: prospects.filter(p => p.status === 'converted').length
  };

  md += `## Résumé\n\n`;
  md += `| Statut | Nombre |\n`;
  md += `|--------|--------|\n`;
  md += `| Nouveaux | ${stats.new} |\n`;
  md += `| Contactés | ${stats.contacted} |\n`;
  md += `| Ont répondu | ${stats.replied} |\n`;
  md += `| Convertis | ${stats.converted} |\n\n`;

  md += `---\n\n`;
  md += `## Liste des prospects\n\n`;

  prospects.forEach((p, i) => {
    md += `### ${i + 1}. @${p.username}\n\n`;
    md += `- **Nom:** ${p.full_name || 'N/A'}\n`;
    md += `- **Plateforme:** ${p.platform || 'instagram'}\n`;
    md += `- **Followers:** ${formatNumber(p.followers || 0)}\n`;
    md += `- **Statut:** ${p.status || 'new'}\n`;
    if (p.icp_score) md += `- **Score ICP:** ${p.icp_score}/100\n`;
    if (p.response_category) md += `- **Catégorie réponse:** ${p.response_category}\n`;
    if (p.bio) md += `- **Bio:** ${p.bio.substring(0, 200)}${p.bio.length > 200 ? '...' : ''}\n`;
    md += `\n`;
  });

  return md;
}

/**
 * Exporte le CRM Dashboard en Markdown
 */
export async function exportCRMMarkdown(userId) {
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('user_id', userId)
    .not('response_category', 'is', null)
    .order('response_categorized_at', { ascending: false });

  if (error) throw error;

  const categories = {};
  prospects.forEach(p => {
    if (!categories[p.response_category]) {
      categories[p.response_category] = [];
    }
    categories[p.response_category].push(p);
  });

  let md = `# CRM Dashboard Export\n\n`;
  md += `**Date d'export:** ${new Date().toLocaleDateString('fr-FR')}\n`;
  md += `**Total catégorisés:** ${prospects.length} prospects\n\n`;

  const categoryLabels = {
    hot_lead: '🔥 Leads chauds',
    meeting_request: '📅 Demandes RDV',
    warm_lead: '🟡 Leads tièdes',
    question: '❓ Questions',
    objection: '🛡️ Objections',
    not_interested: '🔴 Pas intéressés',
    negative: '🚫 Négatifs',
    neutral: '⚪ Neutres'
  };

  md += `## Résumé par catégorie\n\n`;
  md += `| Catégorie | Nombre |\n`;
  md += `|-----------|--------|\n`;
  Object.entries(categoryLabels).forEach(([key, label]) => {
    const count = categories[key]?.length || 0;
    md += `| ${label} | ${count} |\n`;
  });
  md += `\n---\n\n`;

  // Détail par catégorie
  Object.entries(categoryLabels).forEach(([key, label]) => {
    const catProspects = categories[key] || [];
    if (catProspects.length === 0) return;

    md += `## ${label}\n\n`;
    catProspects.forEach(p => {
      md += `### @${p.username}\n`;
      md += `- **Dernière réponse:** "${p.last_prospect_response || 'N/A'}"\n`;
      md += `- **Confiance:** ${Math.round((p.response_category_confidence || 0) * 100)}%\n`;
      if (p.needs_attention) md += `- ⚠️ **Nécessite attention:** ${p.attention_reason || 'Oui'}\n`;
      md += `\n`;
    });
  });

  return md;
}

/**
 * Exporte les stats ICP en Markdown
 */
export async function exportICPMarkdown(userId) {
  // Récupérer l'ICP
  const { data: user } = await supabase
    .from('users')
    .select('onboarding_data, icp_data')
    .eq('id', userId)
    .single();

  const icp = user?.icp_data || user?.onboarding_data || {};

  // Récupérer les prospects scorés
  const { data: prospects } = await supabase
    .from('prospects')
    .select('*')
    .eq('user_id', userId)
    .not('icp_score', 'is', null)
    .order('icp_score', { ascending: false });

  let md = `# ICP & Scoring Export\n\n`;
  md += `**Date d'export:** ${new Date().toLocaleDateString('fr-FR')}\n\n`;

  md += `## Mon ICP (Ideal Customer Profile)\n\n`;
  if (icp.cible_description || icp.description) {
    md += `**Description cible:** ${icp.cible_description || icp.description}\n\n`;
  }
  if (icp.cible_problemes || icp.problemes) {
    md += `**Problèmes résolus:** ${icp.cible_problemes || icp.problemes}\n\n`;
  }
  if (icp.keywords?.length) {
    md += `**Mots-clés:** ${icp.keywords.join(', ')}\n\n`;
  }
  if (icp.painPoints?.length) {
    md += `**Points de douleur:**\n`;
    icp.painPoints.forEach(pp => md += `- ${pp}\n`);
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## Statistiques de scoring\n\n`;

  const stats = {
    excellent: prospects?.filter(p => p.icp_score >= 80).length || 0,
    good: prospects?.filter(p => p.icp_score >= 60 && p.icp_score < 80).length || 0,
    average: prospects?.filter(p => p.icp_score >= 40 && p.icp_score < 60).length || 0,
    low: prospects?.filter(p => p.icp_score < 40).length || 0
  };

  md += `| Tier | Score | Nombre |\n`;
  md += `|------|-------|--------|\n`;
  md += `| 🌟 Excellent | 80-100 | ${stats.excellent} |\n`;
  md += `| ✅ Bon | 60-79 | ${stats.good} |\n`;
  md += `| 🟡 Moyen | 40-59 | ${stats.average} |\n`;
  md += `| 🔴 Faible | 0-39 | ${stats.low} |\n\n`;

  md += `---\n\n`;
  md += `## Top 10 Prospects (par score ICP)\n\n`;

  const top10 = prospects?.slice(0, 10) || [];
  top10.forEach((p, i) => {
    md += `### ${i + 1}. @${p.username} — Score: ${p.icp_score}/100\n`;
    md += `- **Nom:** ${p.full_name || 'N/A'}\n`;
    md += `- **Recommandation:** ${p.icp_recommendation || 'N/A'}\n`;
    if (p.icp_personalization_hooks?.length) {
      md += `- **Hooks:** ${p.icp_personalization_hooks.join(', ')}\n`;
    }
    md += `\n`;
  });

  return md;
}

/**
 * Génère un rapport JSON complet
 */
export async function exportFullReportJSON(userId) {
  const [prospects, user] = await Promise.all([
    getProspectsData(userId, {}),
    supabase.from('users').select('onboarding_data, icp_data').eq('id', userId).single()
  ]);

  const categorized = prospects.filter(p => p.response_category);
  const scored = prospects.filter(p => p.icp_score);

  return {
    exportDate: new Date().toISOString(),
    summary: {
      totalProspects: prospects.length,
      categorizedProspects: categorized.length,
      scoredProspects: scored.length,
      averageICPScore: scored.length > 0
        ? Math.round(scored.reduce((sum, p) => sum + p.icp_score, 0) / scored.length)
        : 0
    },
    icp: user.data?.icp_data || user.data?.onboarding_data || {},
    categoryBreakdown: getCategoryBreakdown(categorized),
    icpTierBreakdown: getICPTierBreakdown(scored),
    prospects: prospects.map(p => ({
      username: p.username,
      fullName: p.full_name,
      platform: p.platform,
      status: p.status,
      icpScore: p.icp_score,
      responseCategory: p.response_category,
      createdAt: p.created_at
    }))
  };
}

// === Helpers ===

async function getProspectsData(userId, filters) {
  let query = supabase
    .from('prospects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.platform) query = query.eq('platform', filters.platform);
  if (filters.category) query = query.eq('response_category', filters.category);
  if (filters.minIcpScore) query = query.gte('icp_score', filters.minIcpScore);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function generateCSV(headers, rows) {
  const headerLine = headers.map(h => `"${h}"`).join(',');
  const dataLines = rows.map(row =>
    row.map(cell => `"${cell}"`).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getCategoryBreakdown(prospects) {
  const breakdown = {};
  prospects.forEach(p => {
    const cat = p.response_category || 'unknown';
    breakdown[cat] = (breakdown[cat] || 0) + 1;
  });
  return breakdown;
}

function getICPTierBreakdown(prospects) {
  return {
    excellent: prospects.filter(p => p.icp_score >= 80).length,
    good: prospects.filter(p => p.icp_score >= 60 && p.icp_score < 80).length,
    average: prospects.filter(p => p.icp_score >= 40 && p.icp_score < 60).length,
    low: prospects.filter(p => p.icp_score < 40).length
  };
}

export default {
  exportProspectsCSV,
  exportCRMDashboardCSV,
  exportICPStatsCSV,
  exportProspectsMarkdown,
  exportCRMMarkdown,
  exportICPMarkdown,
  exportFullReportJSON
};
