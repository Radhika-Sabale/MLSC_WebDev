import React from 'react';
import type { CrowdLevel } from '../lib/api';

export interface StatusPillProps {
  level: CrowdLevel | null;
  size?: 'sm' | 'md' | 'lg';
}

interface LevelConfig {
  label: string;
  symbol: string;
  className: string;
}

const LEVEL_CONFIGS: Record<CrowdLevel, LevelConfig> = {
  1: {
    label: 'Under 5 min',
    symbol: '●', // Filled Circle
    className: 'status-pill-low',
  },
  2: {
    label: '5 to 15 min',
    symbol: '■', // Filled Square
    className: 'status-pill-medium',
  },
  3: {
    label: '15+ min',
    symbol: '▲', // Filled Triangle
    className: 'status-pill-high',
  },
};

const EMPTY_CONFIG: LevelConfig = {
  label: 'Not enough recent reports',
  symbol: '○', // Outlined Circle
  className: 'status-pill-empty',
};

/**
 * StatusPill displays the current canteen crowd level.
 * In accordance with accessibility guidelines, status is never communicated by
 * color alone; distinct geometric symbols (●, ■, ▲, ○) and descriptive text
 * are always presented together.
 */
export const StatusPill: React.FC<StatusPillProps> = ({ level, size = 'md' }) => {
  const config = level !== null && LEVEL_CONFIGS[level] ? LEVEL_CONFIGS[level] : EMPTY_CONFIG;

  return (
    <div
      role="status"
      aria-label={`Queue status: ${config.label}`}
      className={`status-pill status-pill-${size} ${config.className}`}
    >
      <span className="status-pill-symbol" aria-hidden="true">
        {config.symbol}
      </span>
      <span className="status-pill-label">{config.label}</span>
    </div>
  );
};
