// ============================================
// Lead Scoring Configuration
// ============================================

import { Flame, Thermometer, Snowflake, Briefcase, MessageSquare, Users, MapPin, UserCheck } from 'lucide-react';

// Score badges configuration
export const SCORE_BADGES = {
  hot: {
    label: 'Chaud',
    color: 'bg-red-100 text-red-700 border-red-200',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    icon: Flame,
    minScore: 60,
    description: 'Prospect prioritaire - forte probabilité de conversion'
  },
  warm: {
    label: 'Tiede',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    icon: Thermometer,
    minScore: 30,
    description: 'Prospect interessant - a suivre de pres'
  },
  cold: {
    label: 'Froid',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    icon: Snowflake,
    minScore: 0,
    description: 'Prospect en nurturing - besoin de plus de signaux'
  }
};

// Signal types configuration
export const SIGNAL_TYPES = {
  newPosition: {
    key: 'newPosition',
    label: 'Poste recent',
    description: 'Nouveau poste ou lancement < 6 mois',
    icon: Briefcase,
    color: 'text-purple-600 bg-purple-100',
    defaultWeight: 25
  },
  painPost: {
    key: 'painPost',
    label: 'Douleur exprimee',
    description: 'A poste sur une problematique',
    icon: MessageSquare,
    color: 'text-red-600 bg-red-100',
    defaultWeight: 25
  },
  competitorEngagement: {
    key: 'competitorEngagement',
    label: 'Engage concurrent',
    description: 'A interagi avec un concurrent',
    icon: UserCheck,
    color: 'text-blue-600 bg-blue-100',
    defaultWeight: 20
  },
  smallAudience: {
    key: 'smallAudience',
    label: 'Petite audience',
    description: 'Moins de 1000 abonnes',
    icon: Users,
    color: 'text-green-600 bg-green-100',
    defaultWeight: 15
  },
  sameLocation: {
    key: 'sameLocation',
    label: 'Meme zone',
    description: 'Meme localisation que vous',
    icon: MapPin,
    color: 'text-amber-600 bg-amber-100',
    defaultWeight: 15
  }
};

// Get badge from score
export function getBadgeFromScore(score) {
  if (score >= SCORE_BADGES.hot.minScore) return 'hot';
  if (score >= SCORE_BADGES.warm.minScore) return 'warm';
  return 'cold';
}

// Get badge config
export function getBadgeConfig(badge) {
  return SCORE_BADGES[badge] || SCORE_BADGES.cold;
}

// Get signal config
export function getSignalConfig(signalType) {
  return SIGNAL_TYPES[signalType] || null;
}

// Default weights
export const DEFAULT_WEIGHTS = {
  newPosition: 25,
  painPost: 25,
  competitorEngagement: 20,
  smallAudience: 15,
  sameLocation: 15
};

// Score thresholds
export const SCORE_THRESHOLDS = {
  hot: 60,
  warm: 30,
  cold: 0
};
