import React, { useState, useEffect } from 'react';
import { getAllBadges, getEarnedBadges, type Badge } from '../lib/badges';
import { getReportLog, REPORTS_CHANGED_EVENT } from '../lib/reportLog';

/**
 * BadgeShelf presents the user's earned and locked badges in an accessible list.
 * Built with a native <details>/<summary> disclosure widget with a 56px+ tap target
 * so that canteen cards remain comfortably within the thumb reach zone on mobile screens.
 */
export const BadgeShelf: React.FC = () => {
  const [earnedIds, setEarnedIds] = useState<string[]>(() =>
    getEarnedBadges(getReportLog())
  );

  useEffect(() => {
    const handleReportsChanged = () => {
      setEarnedIds(getEarnedBadges(getReportLog()));
    };

    // Initialize state
    handleReportsChanged();

    // Listen for custom report events dispatched from recordReport()
    window.addEventListener(REPORTS_CHANGED_EVENT, handleReportsChanged);
    return () => {
      window.removeEventListener(REPORTS_CHANGED_EVENT, handleReportsChanged);
    };
  }, []);

  const allBadges: Badge[] = getAllBadges();
  const earnedSet = new Set(earnedIds);
  const earnedCount = allBadges.filter((b) => earnedSet.has(b.id)).length;

  return (
    <section className="badge-shelf-section" aria-label="Badges and Achievements">
      <details className="badge-shelf-details">
        <summary className="badge-shelf-summary">
          <div className="badge-shelf-summary-inner">
            <div className="badge-shelf-summary-title-group">
              <span className="badge-shelf-summary-icon" aria-hidden="true">
                🏆
              </span>
              <h2 className="badge-shelf-heading">Your badges</h2>
            </div>
            <div className="badge-shelf-summary-meta">
              <span className="badge-shelf-count">
                {earnedCount} of {allBadges.length} earned
              </span>
              <span className="badge-shelf-chevron" aria-hidden="true">
                ▾
              </span>
            </div>
          </div>
        </summary>

        <div className="badge-shelf-content">
          <ul className="badge-shelf-list">
            {allBadges.map((badge) => {
              const isEarned = earnedSet.has(badge.id);

              return (
                <li
                  key={badge.id}
                  className={`badge-item ${isEarned ? 'badge-item-earned' : 'badge-item-locked'}`}
                >
                  <div className="badge-item-left">
                    <span
                      className={`badge-icon-box ${isEarned ? 'badge-icon-earned' : 'badge-icon-locked'}`}
                      aria-hidden="true"
                    >
                      {badge.icon}
                    </span>
                    <div className="badge-item-text">
                      <div className="badge-item-title-row">
                        <span className="badge-item-name">{badge.name}</span>
                      </div>
                      <p className="badge-item-desc">{badge.description}</p>
                    </div>
                  </div>

                  <div className="badge-item-status">
                    {isEarned ? (
                      <span className="badge-pill badge-pill-earned">
                        <span aria-hidden="true">✓ </span>
                        <span>Earned</span>
                      </span>
                    ) : (
                      <span className="badge-pill badge-pill-locked">
                        <span aria-hidden="true">🔒 </span>
                        <span>Locked</span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </section>
  );
};
