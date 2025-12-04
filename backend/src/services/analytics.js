import { supabaseAdmin } from '../utils/supabase.js';

/**
 * Service Analytics
 * Calcule et agrège les statistiques de prospection
 */

/**
 * Récupère les stats globales d'un utilisateur
 */
export async function getGlobalStats(userId) {
  // Stats prospects
  const { data: prospectsStats, error: prospErr } = await supabaseAdmin
    .from('prospects')
    .select('status')
    .eq('user_id', userId);

  if (prospErr) throw prospErr;

  // Stats messages (colonnes existantes seulement)
  const { data: messagesStats, error: msgErr } = await supabaseAdmin
    .from('messages')
    .select('id, created_at')
    .eq('user_id', userId);

  if (msgErr) throw msgErr;

  // Calculs
  const totalProspects = prospectsStats?.length || 0;
  const prospectsByStatus = prospectsStats?.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const totalMessages = messagesStats?.length || 0;
  // Colonnes envoye_at et repondu_at peuvent ne pas exister
  const messagesEnvoyes = totalMessages;
  const messagesRepondus = 0;

  const tauxReponse = 0;

  // Score moyen simplifié (colonne score_pertinence peut ne pas exister)
  const scoreMoyen = 0;

  return {
    prospects: {
      total: totalProspects,
      par_statut: {
        nouveau: prospectsByStatus.nouveau || 0,
        message_genere: prospectsByStatus.message_genere || 0,
        envoye: prospectsByStatus.envoye || 0,
        repondu: prospectsByStatus.repondu || 0,
        converti: prospectsByStatus.converti || 0,
        ignore: prospectsByStatus.ignore || 0,
      },
      score_moyen: scoreMoyen,
    },
    messages: {
      total: totalMessages,
      envoyes: messagesEnvoyes,
      repondus: messagesRepondus,
      taux_reponse: tauxReponse,
    },
    conversions: {
      total: prospectsByStatus.converti || 0,
      taux: totalProspects > 0 
        ? Math.round(((prospectsByStatus.converti || 0) / totalProspects) * 100)
        : 0,
    }
  };
}

/**
 * Récupère l'évolution sur une période
 */
export async function getEvolution(userId, periode = '30d') {
  const jours = periode === '7d' ? 7 : periode === '30d' ? 30 : 90;
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - jours);

  // Prospects créés par jour
  const { data: prospects, error: prospErr } = await supabaseAdmin
    .from('prospects')
    .select('created_at, status')
    .eq('user_id', userId)
    .gte('created_at', dateDebut.toISOString());

  if (prospErr) throw prospErr;

  // Messages par jour
  const { data: messages, error: msgErr } = await supabaseAdmin
    .from('messages')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', dateDebut.toISOString());

  if (msgErr) throw msgErr;

  // Agréger par jour
  const evolution = [];
  for (let i = jours - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const prospectsJour = prospects?.filter(p =>
      p.created_at?.startsWith(dateStr)
    )?.length || 0;

    const messagesJour = messages?.filter(m =>
      m.created_at?.startsWith(dateStr)
    )?.length || 0;

    evolution.push({
      date: dateStr,
      label: new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short'
      }),
      prospects: prospectsJour,
      messages: messagesJour,
      envoyes: messagesJour,
      repondus: 0,
    });
  }

  return evolution;
}

/**
 * Récupère les meilleurs hooks (fonctionnalité simplifiée - colonnes non disponibles)
 */
export async function getTopHooks(userId, limit = 10) {
  // La colonne hook_utilise n'existe pas dans la table messages
  // Retourner un tableau vide pour éviter les erreurs
  return [];
}

/**
 * Récupère les stats par recherche (simplifié - table searches peut ne pas exister)
 */
export async function getStatsBySearch(userId) {
  // La table searches peut ne pas exister ou avoir une structure différente
  // Retourner un tableau vide pour éviter les erreurs
  return [];
}

/**
 * Récupère les stats par plateforme
 */
export async function getStatsByPlatform(userId) {
  const { data: prospects, error } = await supabaseAdmin
    .from('prospects')
    .select('platform, status')
    .eq('user_id', userId);

  if (error) throw error;

  const platforms = { instagram: { total: 0, repondus: 0, convertis: 0 }, tiktok: { total: 0, repondus: 0, convertis: 0 } };

  prospects?.forEach(p => {
    const platform = p.platform || 'instagram';
    if (!platforms[platform]) {
      platforms[platform] = { total: 0, repondus: 0, convertis: 0 };
    }
    platforms[platform].total++;
    if (p.status === 'replied') platforms[platform].repondus++;
    if (p.status === 'converted') platforms[platform].convertis++;
  });

  return Object.entries(platforms).map(([platform, stats]) => ({
    plateforme: platform,
    ...stats,
    taux_reponse: stats.total > 0 ? Math.round((stats.repondus / stats.total) * 100) : 0,
    taux_conversion: stats.total > 0 ? Math.round((stats.convertis / stats.total) * 100) : 0,
  }));
}

/**
 * Sauvegarde les stats quotidiennes (appelé par un cron)
 */
export async function saveDailyStats(userId) {
  const stats = await getGlobalStats(userId);
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabaseAdmin
    .from('analytics_daily')
    .upsert({
      user_id: userId,
      date: today,
      prospects_analyses: stats.prospects.total,
      messages_generes: stats.messages.total,
      messages_envoyes: stats.messages.envoyes,
      reponses_recues: stats.messages.repondus,
      taux_reponse: stats.messages.taux_reponse,
      conversions: stats.conversions.total,
    }, {
      onConflict: 'user_id,date'
    });

  if (error) throw error;
  return { saved: true, date: today };
}

export default {
  getGlobalStats,
  getEvolution,
  getTopHooks,
  getStatsBySearch,
  getStatsByPlatform,
  saveDailyStats,
};
