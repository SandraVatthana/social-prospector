import {
  Send,
  Link2,
  MessageSquare,
  RefreshCw,
  Flame,
  Thermometer,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const PIPELINE_STATUS = {
  demande_envoyee: {
    label: 'Demande envoyée',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: Send,
    order: 1,
  },
  connecte: {
    label: 'Connecté',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: Link2,
    order: 2,
  },
  message_1: {
    label: 'Message 1 envoyé',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: MessageSquare,
    order: 3,
  },
  relance_1: {
    label: 'Relance 1 envoyée',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: RefreshCw,
    order: 4,
  },
  relance_2: {
    label: 'Relance 2 envoyée',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: RefreshCw,
    order: 5,
  },
  repondu_chaud: {
    label: 'Répondu (chaud)',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: Flame,
    order: 6,
  },
  repondu_froid: {
    label: 'Répondu (froid)',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    icon: Thermometer,
    order: 7,
  },
  rdv_pris: {
    label: 'RDV pris',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    icon: Calendar,
    order: 8,
  },
  converti: {
    label: 'Converti',
    color: 'text-green-800',
    bgColor: 'bg-green-200',
    icon: CheckCircle,
    order: 9,
  },
  ignore: {
    label: 'Ignoré',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: XCircle,
    order: 10,
  },
};

// Ordre du funnel (excluant "ignore")
export const FUNNEL_ORDER = [
  'demande_envoyee',
  'connecte',
  'message_1',
  'relance_1',
  'relance_2',
  'repondu_chaud',
  'repondu_froid',
  'rdv_pris',
  'converti',
];

// Statuts positifs (réponses)
export const POSITIVE_STATUSES = ['repondu_chaud', 'rdv_pris', 'converti'];

// Statuts terminaux
export const TERMINAL_STATUSES = ['converti', 'ignore'];

// Calcul automatique de next_action_date selon le statut
export function getNextActionDate(status) {
  const daysMap = {
    demande_envoyee: 3,
    connecte: 0,
    message_1: 3,
    relance_1: 4,
    relance_2: 7,
  };

  const days = daysMap[status];
  if (days === undefined) {
    return null;
  }

  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Obtenir le prochain statut logique
export function getNextStatus(currentStatus) {
  const statusFlow = {
    demande_envoyee: 'connecte',
    connecte: 'message_1',
    message_1: 'relance_1',
    relance_1: 'relance_2',
    relance_2: 'repondu_froid',
  };

  return statusFlow[currentStatus] || null;
}

// Compter les prospects par statut
export function countByStatus(prospects) {
  const counts = {};

  for (const status of Object.keys(PIPELINE_STATUS)) {
    counts[status] = 0;
  }

  for (const prospect of prospects) {
    const status = prospect.pipeline_status || 'demande_envoyee';
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  }

  return counts;
}

// Calculer les statistiques du funnel
export function calculateFunnelStats(stats) {
  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
  const connected = stats.connecte || 0;
  const responded = (stats.repondu_chaud || 0) + (stats.repondu_froid || 0);
  const meetings = stats.rdv_pris || 0;
  const converted = stats.converti || 0;

  return {
    total,
    connectionRate: total > 0 ? ((connected + responded + meetings + converted) / total) * 100 : 0,
    responseRate: total > 0 ? ((responded + meetings + converted) / total) * 100 : 0,
    meetingRate: total > 0 ? ((meetings + converted) / total) * 100 : 0,
    conversionRate: total > 0 ? (converted / total) * 100 : 0,
  };
}

// Obtenir la couleur du badge de statut de campagne
export function getCampaignStatusColor(status) {
  const colors = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
    active: { bg: 'bg-green-100', text: 'text-green-700' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  };
  return colors[status] || colors.draft;
}

export const CAMPAIGN_STATUS_LABELS = {
  draft: 'Brouillon',
  active: 'Active',
  paused: 'En pause',
  completed: 'Terminée',
};
