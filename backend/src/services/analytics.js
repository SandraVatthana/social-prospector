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
    .select('statut, score_pertinence')
    .eq('user_id', userId);

  if (prospErr) throw prospErr;

  // Stats messages
  const { data: messagesStats, error: msgErr } = await supabaseAdmin
    .from('messages')
    .select('id, envoye_at, repondu_at, hook_utilise, created_at')
    .eq('user_id', userId);

  if (msgErr) throw msgErr;

  // Calculs
  const totalProspects = prospectsStats?.length || 0;
  const prospectsByStatus = prospectsStats?.reduce((acc, p) => {
    acc[p.statut] = (acc[p.statut] || 0) + 1;
    return acc;
  }, {}) || {};

  const totalMessages = messagesStats?.length || 0;
  const messagesEnvoyes = messagesStats?.filter(m => m.envoye_at)?.length || 0;
  const messagesRepondus = messagesStats?.filter(m => m.repondu_at)?.length || 0;
  
  const tauxReponse = messagesEnvoyes > 0 
    ? Math.round((messagesRepondus / messagesEnvoyes) * 100) 
    : 0;

  // Score moyen de pertinence
  const scoresValides = prospectsStats?.filter(p => p.score_pertinence > 0) || [];
  const scoreMoyen = scoresValides.length > 0
    ? Math.round(scoresValides.reduce((sum, p) => sum + p.score_pertinence, 0) / scoresValides.length)
    : 0;

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
    .select('created_at, statut')
    .eq('user_id', userId)
    .gte('created_at', dateDebut.toISOString());

  if (prospErr) throw prospErr;

  // Messages par jour
  const { data: messages, error: msgErr } = await supabaseAdmin
    .from('messages')
    .select('created_at, envoye_at, repondu_at')
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

    const envoyesJour = messages?.filter(m => 
      m.envoye_at?.startsWith(dateStr)
    )?.length || 0;

    const repondusJour = messages?.filter(m => 
      m.repondu_at?.startsWith(dateStr)
    )?.length || 0;

    evolution.push({
      date: dateStr,
      label: new Date(date).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short' 
      }),
      prospects: prospectsJour,
      messages: messagesJour,
      envoyes: envoyesJour,
      repondus: repondusJour,
    });
  }

  return evolution;
}

/**
 * Récupère les meilleurs hooks (ceux qui génèrent le plus de réponses)
 */
export async function getTopHooks(userId, limit = 10) {
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('hook_utilise, envoye_at, repondu_at')
    .eq('user_id', userId)
    .not('hook_utilise', 'is', null);

  if (error) throw error;

  // Grouper par hook
  const hookStats = {};
  messages?.forEach(m => {
    if (!m.hook_utilise) return;
    
    if (!hookStats[m.hook_utilise]) {
      hookStats[m.hook_utilise] = {
        hook: m.hook_utilise,
        total: 0,
        envoyes: 0,
        repondus: 0,
      };
    }
    
    hookStats[m.hook_utilise].total++;
    if (m.envoye_at) hookStats[m.hook_utilise].envoyes++;
    if (m.repondu_at) hookStats[m.hook_utilise].repondus++;
  });

  // Calculer taux et trier
  const hooks = Object.values(hookStats)
    .map(h => ({
      ...h,
      taux_reponse: h.envoyes > 0 
        ? Math.round((h.repondus / h.envoyes) * 100) 
        : 0,
    }))
    .sort((a, b) => {
      // Trier par taux de réponse, puis par nombre de réponses
      if (b.taux_reponse !== a.taux_reponse) {
        return b.taux_reponse - a.taux_reponse;
      }
      return b.repondus - a.repondus;
    })
    .slice(0, limit);

  return hooks;
}

/**
 * Récupère les stats par recherche
 */
export async function getStatsBySearch(userId) {
  const { data: searches, error: searchErr } = await supabaseAdmin
    .from('searches')
    .select(`
      id,
      nom,
      plateforme,
      mode,
      created_at,
      prospects:prospects(statut)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (searchErr) throw searchErr;

  return searches?.map(s => {
    const prospects = s.prospects || [];
    const total = prospects.length;
    const repondus = prospects.filter(p => p.statut === 'repondu').length;
    const convertis = prospects.filter(p => p.statut === 'converti').length;

    return {
      id: s.id,
      nom: s.nom || `Recherche ${s.plateforme}`,
      plateforme: s.plateforme,
      mode: s.mode,
      date: s.created_at,
      stats: {
        total,
        repondus,
        convertis,
        taux_reponse: total > 0 ? Math.round((repondus / total) * 100) : 0,
        taux_conversion: total > 0 ? Math.round((convertis / total) * 100) : 0,
      }
    };
  }) || [];
}

/**
 * Récupère les stats par plateforme
 */
export async function getStatsByPlatform(userId) {
  const { data: prospects, error } = await supabaseAdmin
    .from('prospects')
    .select('plateforme, statut')
    .eq('user_id', userId);

  if (error) throw error;

  const platforms = { instagram: { total: 0, repondus: 0, convertis: 0 }, tiktok: { total: 0, repondus: 0, convertis: 0 } };
  
  prospects?.forEach(p => {
    if (!platforms[p.plateforme]) {
      platforms[p.plateforme] = { total: 0, repondus: 0, convertis: 0 };
    }
    platforms[p.plateforme].total++;
    if (p.statut === 'repondu') platforms[p.plateforme].repondus++;
    if (p.statut === 'converti') platforms[p.plateforme].convertis++;
  });

  return Object.entries(platforms).map(([plateforme, stats]) => ({
    plateforme,
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
