import React, { useEffect } from 'react';
import { PageShell } from '../components/PageShell';
import { BackButton } from '../components/BackButton';

/**
 * NotFound Page - 404 Fallback
 * Provides a clear recovery path back to the campus canteen directory.
 */
export const NotFound: React.FC = () => {
  useEffect(() => {
    document.title = 'Page Not Found | Canteen Crowd';
  }, []);

  return (
    <PageShell
      header={
        <div className="notfound-header">
          <h1 className="notfound-title" tabIndex={-1}>
            Page Not Found
          </h1>
          <p className="notfound-subtitle">We couldn't find the page you were looking for.</p>
        </div>
      }
      bottomSlot={<BackButton to="/" label="Go home" ariaLabel="Go home to all canteens" />}
    >
      <div className="notfound-content">
        <p className="notfound-desc">
          The link may be outdated or the canteen identifier was typed incorrectly.
        </p>
      </div>
    </PageShell>
  );
};
