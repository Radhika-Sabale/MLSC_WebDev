import React, { useEffect } from 'react';
import { useCanteens } from '../hooks/useCanteens';
import { PageShell } from '../components/PageShell';
import { CanteenCard } from '../components/CanteenCard';
import { BadgeShelf } from '../components/BadgeShelf';

/**
 * Home Page - Main Campus Canteens Directory
 * Arranges canteen queue cards in the lower screen section for comfortable one-thumb usage.
 */
export const Home: React.FC = () => {
  const { canteens, statuses, loading, error, refetch } = useCanteens();

  useEffect(() => {
    document.title = 'Canteen Crowd';
  }, []);

  const header = (
    <div className="home-header">
      <h1 className="home-title" tabIndex={-1}>
        Canteen Crowd
      </h1>
      <p className="home-subtitle">How long is the queue right now?</p>
    </div>
  );

  if (error) {
    return (
      <PageShell
        header={header}
        bottomSlot={
          <button
            type="button"
            className="btn-retry-large"
            onClick={() => refetch()}
            aria-label="Retry loading canteens"
          >
            Retry Loading
          </button>
        }
      >
        <div className="home-error-state" role="alert">
          <p className="home-error-title">Unable to load canteens</p>
          <p className="home-error-desc">Please check your connection and tap retry.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell header={header}>
      <div className="home-thumb-container">
        <p className="home-qr-hint">
          <span className="home-qr-icon" aria-hidden="true">
            ⚲
          </span>
          <span>At a canteen? Scan its QR code to report.</span>
        </p>

        {loading ? (
          <ul className="canteen-list" aria-label="Loading campus canteens" aria-busy="true">
            {[1, 2, 3].map((item) => (
              <li key={item} className="canteen-list-item">
                <CanteenCard
                  canteen={{ id: `skel-${item}`, slug: `skel-${item}`, name: 'Loading Canteen' }}
                  loading={true}
                />
              </li>
            ))}
          </ul>
        ) : canteens.length === 0 ? (
          <div className="home-empty-state">
            <p>No canteens currently registered.</p>
          </div>
        ) : (
          <ul className="canteen-list" aria-label="Campus canteens list">
            {canteens.map((canteen) => (
              <li key={canteen.id} className="canteen-list-item">
                <CanteenCard
                  canteen={canteen}
                  status={statuses[canteen.slug]}
                  loading={false}
                />
              </li>
            ))}
          </ul>
        )}

        <BadgeShelf />
      </div>
    </PageShell>
  );
};
