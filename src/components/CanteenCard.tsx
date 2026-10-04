import React from 'react';
import { Link } from 'react-router-dom';
import type { Canteen, CanteenStatus } from '../lib/api';
import { StatusPill } from './StatusPill';
import { timeAgo } from '../lib/time';

export interface CanteenCardProps {
  canteen: Canteen;
  status?: CanteenStatus | 'unavailable';
  loading?: boolean;
}

/**
 * CanteenCard presents a single campus canteen as an accessible, 72px+ touch target.
 * Displays the canteen title, crowd StatusPill, recent report tally, and last updated time.
 * Provides a screen-reader friendly accessible name consolidating all status attributes.
 */
export const CanteenCard: React.FC<CanteenCardProps> = ({
  canteen,
  status,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="canteen-card canteen-card-skeleton" aria-busy="true">
        <div className="canteen-card-skeleton-main">
          <div className="skeleton skeleton-card-title" />
          <div className="skeleton skeleton-card-subtitle" />
        </div>
        <div className="skeleton skeleton-card-pill" />
      </div>
    );
  }

  const isUnavailable = status === 'unavailable';
  const hasStatusData = status && status !== 'unavailable';

  const reportCount = hasStatusData ? status.report_count : 0;
  const countLabel =
    reportCount === 1
      ? '1 report'
      : `${reportCount} reports`;

  const updatedTime = hasStatusData && status.last_report_at
    ? timeAgo(status.last_report_at)
    : null;

  const levelLabel = hasStatusData
    ? status.level === 1
      ? 'Under 5 min'
      : status.level === 2
        ? '5 to 15 min'
        : status.level === 3
          ? '15+ min'
          : 'Not enough recent reports'
    : 'Status unavailable';

  const accessibleName = isUnavailable
    ? `${canteen.name}, Status unavailable`
    : `${canteen.name}, ${levelLabel}, ${countLabel}${updatedTime ? `, updated ${updatedTime}` : ''}`;

  return (
    <Link
      to={`/c/${canteen.slug}`}
      className="canteen-card"
      aria-label={accessibleName}
    >
      <div className="canteen-card-main">
        <h2 className="canteen-card-name">{canteen.name}</h2>
        <div className="canteen-card-meta">
          {isUnavailable ? (
            <span className="canteen-card-unavailable">Status unavailable</span>
          ) : (
            <>
              <span className="canteen-card-count">{countLabel}</span>
              {updatedTime && (
                <>
                  <span className="canteen-card-bullet" aria-hidden="true">
                    •
                  </span>
                  <span className="canteen-card-updated">{updatedTime}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="canteen-card-status">
        {isUnavailable ? (
          <span className="status-pill status-pill-sm status-pill-empty" role="status">
            <span className="status-pill-symbol" aria-hidden="true">
              ?
            </span>
            <span className="status-pill-label">Unavailable</span>
          </span>
        ) : (
          <StatusPill level={hasStatusData ? status.level : null} size="sm" />
        )}
        <span className="canteen-card-arrow" aria-hidden="true">
          ›
        </span>
      </div>
    </Link>
  );
};
