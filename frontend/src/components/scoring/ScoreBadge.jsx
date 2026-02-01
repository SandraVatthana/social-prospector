import React from 'react';
import { getBadgeConfig } from '../../config/scoringConfig';

/**
 * ScoreBadge - Displays a prospect's score badge (hot/warm/cold)
 *
 * @param {string} badge - 'hot', 'warm', or 'cold'
 * @param {number} score - The numeric score (0-100)
 * @param {string} size - 'sm', 'md', or 'lg'
 * @param {boolean} showScore - Whether to show the numeric score
 */
export default function ScoreBadge({ badge = 'cold', score = 0, size = 'md', showScore = false }) {
  const config = getBadgeConfig(badge);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
      title={config.description}
    >
      <Icon size={iconSizes[size]} />
      <span>{config.label}</span>
      {showScore && (
        <span className="font-bold ml-0.5">({score})</span>
      )}
    </span>
  );
}
