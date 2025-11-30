/**
 * Export PDF des analytics avec jsPDF
 */
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Génère un PDF de rapport analytics
 * @param {Object} data - Données analytics
 * @param {Object} data.stats - Statistiques globales
 * @param {Array} data.hooks - Top hooks
 * @param {Array} data.platforms - Stats par plateforme
 * @param {string} data.periode - Période sélectionnée
 */
export function generateAnalyticsPDF({ stats, hooks, platforms, periode }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Couleurs
  const brandColor = [79, 70, 229]; // brand-500 (indigo)
  const warmGray = [87, 83, 78]; // warm-600

  let yPosition = 20;

  // === HEADER ===
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Social Prospector', 20, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport Analytics', 20, 35);

  // Date et période
  doc.setFontSize(10);
  doc.text(`${today} • ${getPeriodeLabel(periode)}`, pageWidth - 20, 25, { align: 'right' });

  yPosition = 55;

  // === RÉSUMÉ EXÉCUTIF ===
  doc.setTextColor(...warmGray);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé exécutif', 20, yPosition);
  yPosition += 10;

  // KPIs principaux en grille
  const kpis = [
    { label: 'Prospects analysés', value: stats?.prospects?.total || 0 },
    { label: 'Messages générés', value: stats?.messages?.total || 0 },
    { label: 'Messages envoyés', value: stats?.messages?.envoyes || 0 },
    { label: 'Taux de réponse', value: `${stats?.messages?.taux_reponse || 0}%` },
  ];

  doc.autoTable({
    startY: yPosition,
    head: [kpis.map(k => k.label)],
    body: [kpis.map(k => k.value.toString())],
    theme: 'grid',
    headStyles: {
      fillColor: brandColor,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      halign: 'center',
      fontSize: 14,
      fontStyle: 'bold',
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 20;

  // === RÉPARTITION PAR STATUT ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Répartition par statut', 20, yPosition);
  yPosition += 10;

  const statusData = [
    ['Nouveaux', stats?.prospects?.par_statut?.nouveau || 0],
    ['Message généré', stats?.prospects?.par_statut?.message_genere || 0],
    ['Envoyés', stats?.prospects?.par_statut?.envoye || 0],
    ['Répondus', stats?.prospects?.par_statut?.repondu || 0],
    ['Convertis', stats?.prospects?.par_statut?.converti || 0],
    ['Ignorés', stats?.prospects?.par_statut?.ignore || 0],
  ];

  doc.autoTable({
    startY: yPosition,
    head: [['Statut', 'Nombre']],
    body: statusData,
    theme: 'striped',
    headStyles: {
      fillColor: brandColor,
      textColor: 255,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center' },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 20;

  // === FUNNEL DE CONVERSION ===
  if (stats?.messages) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Funnel de conversion', 20, yPosition);
    yPosition += 10;

    const funnelData = [
      ['Étape', 'Nombre', 'Taux'],
      ['Prospects', stats.prospects?.total || 0, '100%'],
      ['Messages générés', stats.messages.total || 0, calculateRate(stats.messages.total, stats.prospects?.total)],
      ['Messages envoyés', stats.messages.envoyes || 0, calculateRate(stats.messages.envoyes, stats.messages.total)],
      ['Réponses reçues', stats.messages.repondus || 0, calculateRate(stats.messages.repondus, stats.messages.envoyes)],
      ['Conversions', stats.conversions?.total || 0, calculateRate(stats.conversions?.total, stats.messages.repondus)],
    ];

    doc.autoTable({
      startY: yPosition,
      head: [funnelData[0]],
      body: funnelData.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: brandColor,
        textColor: 255,
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
      },
      margin: { left: 20, right: 20 },
    });

    yPosition = doc.lastAutoTable.finalY + 20;
  }

  // === TOP HOOKS (si disponibles) ===
  if (hooks && hooks.length > 0) {
    // Nouvelle page si nécessaire
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Hooks (par taux de réponse)', 20, yPosition);
    yPosition += 10;

    const hooksData = hooks.slice(0, 5).map((hook, i) => [
      `${i + 1}`,
      truncateText(hook.hook || hook.text, 60),
      `${hook.taux_reponse || hook.response_rate || 0}%`,
      hook.utilisation || hook.uses || 0,
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['#', 'Hook', 'Taux réponse', 'Utilisations']],
      body: hooksData,
      theme: 'striped',
      headStyles: {
        fillColor: brandColor,
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 100 },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
      },
      margin: { left: 20, right: 20 },
    });

    yPosition = doc.lastAutoTable.finalY + 20;
  }

  // === STATS PAR PLATEFORME ===
  if (platforms && platforms.length > 0) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance par plateforme', 20, yPosition);
    yPosition += 10;

    const platformsData = platforms.map(p => [
      p.platform || p.name,
      p.prospects || p.total || 0,
      `${p.taux_reponse || p.response_rate || 0}%`,
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Plateforme', 'Prospects', 'Taux réponse']],
      body: platformsData,
      theme: 'striped',
      headStyles: {
        fillColor: brandColor,
        textColor: 255,
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
      },
      margin: { left: 20, right: 20 },
    });
  }

  // === FOOTER ===
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Social Prospector • Rapport généré le ${today} • Page ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Télécharger le PDF
  const filename = `rapport-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return filename;
}

// Helpers
function getPeriodeLabel(periode) {
  const labels = {
    '7d': '7 derniers jours',
    '30d': '30 derniers jours',
    '90d': '90 derniers jours',
  };
  return labels[periode] || periode;
}

function calculateRate(value, total) {
  if (!total || total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Génère un PDF de rapport pour un client agence
 * @param {Object} data - Données du rapport
 * @param {Object} data.client - Infos du client
 * @param {Object} data.agencyStats - Stats globales agence
 * @param {Array} data.hooks - Top hooks
 * @param {Object} data.bestTimes - Meilleurs créneaux
 * @param {string} data.periode - Période sélectionnée
 */
export function generateAgencyClientPDF({ client, agencyStats, hooks, bestTimes, periode }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const brandColor = [79, 70, 229];
  const warmGray = [87, 83, 78];

  let yPosition = 20;

  // === HEADER ===
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport de Performance', 20, 25);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.name || 'Client', 20, 37);

  doc.setFontSize(10);
  doc.text(`${today} • ${getPeriodeLabel(periode)}`, pageWidth - 20, 30, { align: 'right' });

  yPosition = 60;

  // === KPIs du client ===
  doc.setTextColor(...warmGray);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance globale', 20, yPosition);
  yPosition += 10;

  const clientKPIs = [
    { label: 'Prospects', value: client?.prospects || 0 },
    { label: 'Messages envoyés', value: client?.messages_sent || 0 },
    { label: 'Réponses', value: client?.responses || 0 },
    { label: 'Taux de réponse', value: `${client?.response_rate || 0}%` },
    { label: 'Conversions', value: client?.conversions || 0 },
  ];

  doc.autoTable({
    startY: yPosition,
    head: [clientKPIs.map(k => k.label)],
    body: [clientKPIs.map(k => k.value.toString())],
    theme: 'grid',
    headStyles: {
      fillColor: brandColor,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    bodyStyles: {
      halign: 'center',
      fontSize: 12,
      fontStyle: 'bold',
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 20;

  // === Profil MA VOIX ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Profil MA VOIX', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Style de communication : ${client?.voice_style || 'Non défini'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Plateforme principale : ${client?.platform || 'Instagram'}`, 20, yPosition);
  yPosition += 15;

  // === Top Hooks ===
  if (hooks && hooks.length > 0) {
    doc.setTextColor(...warmGray);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Hooks les plus performants', 20, yPosition);
    yPosition += 10;

    const hooksData = hooks.slice(0, 4).map((hook, i) => [
      `${i + 1}`,
      truncateText(hook.pattern || hook.hook || hook.text, 50),
      `${hook.response_rate || 0}%`,
      `${hook.count || hook.uses || 0}`,
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['#', 'Hook', 'Taux', 'Utilisations']],
      body: hooksData,
      theme: 'striped',
      headStyles: {
        fillColor: brandColor,
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 100 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
      },
      margin: { left: 20, right: 20 },
    });

    yPosition = doc.lastAutoTable.finalY + 20;
  }

  // === Meilleurs créneaux ===
  if (bestTimes) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Meilleurs créneaux d\'envoi', 20, yPosition);
    yPosition += 10;

    const daysData = (bestTimes.days || []).map(day => [
      day.day,
      `${day.percent}%`,
      day.isBest ? 'Recommandé' : '',
    ]);

    if (daysData.length > 0) {
      doc.autoTable({
        startY: yPosition,
        head: [['Jour', 'Réponses', 'Recommandation']],
        body: daysData,
        theme: 'striped',
        headStyles: {
          fillColor: brandColor,
          textColor: 255,
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center', fontStyle: 'bold' },
        },
        margin: { left: 20, right: 20 },
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Meilleures heures
    if (bestTimes.hours) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Meilleures heures :', 20, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`• Matin : ${bestTimes.hours.morning?.label || '9h-11h'} (${bestTimes.hours.morning?.percent || 0}%)`, 25, yPosition);
      yPosition += 6;
      doc.text(`• Soir : ${bestTimes.hours.evening?.label || '18h-20h'} (${bestTimes.hours.evening?.percent || 0}%)`, 25, yPosition);
      yPosition += 15;
    }
  }

  // === Recommandations ===
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFillColor(245, 243, 255);
  doc.rect(15, yPosition - 5, pageWidth - 30, 45, 'F');

  doc.setTextColor(...brandColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommandations', 20, yPosition + 5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const recommendations = [
    'Privilégie les hooks qui citent un contenu spécifique du prospect',
    'Envoie tes DMs le mardi/mercredi matin pour maximiser les réponses',
    'Réponds rapidement aux prospects (dans les 6h idéalement)',
  ];

  recommendations.forEach((rec, i) => {
    doc.text(`${i + 1}. ${rec}`, 20, yPosition + 15 + i * 8);
  });

  // === FOOTER ===
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Social Prospector • Rapport ${client?.name || 'Client'} • ${today} • Page ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const filename = `rapport-${(client?.name || 'client').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return filename;
}

/**
 * Génère un rapport PDF global pour tous les clients d'une agence
 */
export function generateAgencyGlobalPDF({ clients, agencyStats, hooks, bestTimes, periode }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const brandColor = [79, 70, 229];
  const warmGray = [87, 83, 78];

  let yPosition = 20;

  // === HEADER ===
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport Agence', 20, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Vue globale de tous les clients', 20, 37);

  doc.setFontSize(10);
  doc.text(`${today} • ${getPeriodeLabel(periode)}`, pageWidth - 20, 30, { align: 'right' });

  yPosition = 60;

  // === KPIs globaux ===
  doc.setTextColor(...warmGray);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('KPIs globaux', 20, yPosition);
  yPosition += 10;

  const globalKPIs = [
    { label: 'Prospects', value: agencyStats?.total_prospects || 0 },
    { label: 'Messages', value: agencyStats?.total_messages || 0 },
    { label: 'Réponses', value: agencyStats?.total_responses || 0 },
    { label: 'Taux réponse', value: `${agencyStats?.response_rate || 0}%` },
    { label: 'Conversions', value: agencyStats?.total_conversions || 0 },
  ];

  doc.autoTable({
    startY: yPosition,
    head: [globalKPIs.map(k => k.label)],
    body: [globalKPIs.map(k => k.value.toString())],
    theme: 'grid',
    headStyles: {
      fillColor: brandColor,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    bodyStyles: {
      halign: 'center',
      fontSize: 12,
      fontStyle: 'bold',
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 20;

  // === Performance par client ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance par client', 20, yPosition);
  yPosition += 10;

  const clientsData = (clients || []).map(c => [
    c.name,
    c.prospects || 0,
    c.messages_sent || 0,
    c.responses || 0,
    `${c.response_rate || 0}%`,
    c.conversions || 0,
  ]);

  doc.autoTable({
    startY: yPosition,
    head: [['Client', 'Prospects', 'Envoyés', 'Réponses', 'Taux', 'Convertis']],
    body: clientsData,
    theme: 'striped',
    headStyles: {
      fillColor: brandColor,
      textColor: 255,
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
      5: { halign: 'center' },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 20;

  // === ROI ===
  if (agencyStats?.estimated_revenue) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(245, 243, 255);
    doc.rect(15, yPosition - 5, pageWidth - 30, 40, 'F');

    doc.setTextColor(...brandColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Valeur générée', 20, yPosition + 5);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Conversions : ${agencyStats.total_conversions} clients`, 20, yPosition + 18);
    doc.text(`Panier moyen : ${agencyStats.average_basket || 500}€`, 20, yPosition + 26);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandColor);
    doc.text(`Valeur estimée : ${agencyStats.estimated_revenue.toLocaleString()}€`, pageWidth - 20, yPosition + 22, { align: 'right' });
  }

  // === FOOTER ===
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Social Prospector • Rapport Agence • ${today} • Page ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const filename = `rapport-agence-global-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return filename;
}

export default { generateAnalyticsPDF, generateAgencyClientPDF, generateAgencyGlobalPDF };
