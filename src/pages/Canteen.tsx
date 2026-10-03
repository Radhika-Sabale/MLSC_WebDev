import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getCanteen, submitReport, type Canteen as CanteenType, type CrowdLevel } from '../lib/api';
import { useStatus } from '../hooks/useStatus';
import { StatusPill } from '../components/StatusPill';
import { ReportBar } from '../components/ReportBar';
import { timeAgo } from '../lib/time';

/**
 * Canteen Page - Baseline reporting flow
 */
export const Canteen: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const [canteen, setCanteen] = useState<CanteenType | null>(null);
  const [canteenLoading, setCanteenLoading] = useState<boolean>(true);
  const [canteenNotFound, setCanteenNotFound] = useState<boolean>(false);

  const [qrKey, setQrKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittingLevel, setSubmittingLevel] = useState<CrowdLevel | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const { status, loading: statusLoading, refetch } = useStatus(slug);

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;
    setCanteenLoading(true);
    setCanteenNotFound(false);

    const keyFromUrl = searchParams.get('k');
    const storageKey = `canteen_qr_${slug}`;

    if (keyFromUrl) {
      setQrKey(keyFromUrl);
      try {
        sessionStorage.setItem(storageKey, keyFromUrl);
      } catch {
        // Storage access fallback
      }
    } else {
      try {
        const storedKey = sessionStorage.getItem(storageKey);
        setQrKey(storedKey);
      } catch {
        setQrKey(null);
      }
    }

    getCanteen(slug).then((res) => {
      if (!isMounted) return;
      if (!res) {
        setCanteenNotFound(true);
      } else {
        setCanteen(res);
      }
      setCanteenLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [slug, searchParams]);

  const handleReport = useCallback(
    async (level: CrowdLevel) => {
      if (!slug || !qrKey) return;

      setSubmitting(true);
      setSubmittingLevel(level);

      const result = await submitReport(slug, qrKey, level);
      setSubmitting(false);
      setSubmittingLevel(null);

      if (result.ok) {
        setBannerMessage('Thanks! Your report is live.');
        refetch();
      }
    },
    [slug, qrKey, refetch]
  );

  if (canteenLoading) {
    return (
      <main className="canteen-page" aria-busy="true">
        <div className="skeleton skeleton-title" />
        <div className="status-card">
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-line" />
        </div>
      </main>
    );
  }

  if (canteenNotFound || !canteen) {
    return (
      <main className="canteen-page">
        <div className="canteen-error-view">
          <h1 className="canteen-error-title">Canteen Not Found</h1>
          <p className="canteen-error-desc">
            The canteen you are looking for does not exist or has been moved.
          </p>
          <Link to="/" className="btn-secondary">
            Back to Canteens
          </Link>
        </div>
      </main>
    );
  }

  const reportCount = status?.report_count ?? 0;
  const countLabel =
    reportCount === 1
      ? '1 person reported in the last 20 minutes'
      : `${reportCount} people reported in the last 20 minutes`;

  const updatedLabel = status?.last_report_at
    ? `Updated ${timeAgo(status.last_report_at)}`
    : null;

  return (
    <main className="canteen-page">
      <header className="canteen-header">
        <h1 className="canteen-title">{canteen.name}</h1>
        <p className="canteen-subtitle">Live campus queue status</p>
      </header>

      {bannerMessage && (
        <div className="feedback-banner feedback-banner-success" aria-live="polite">
          {bannerMessage}
        </div>
      )}

      <section className="status-card" aria-live="polite">
        {statusLoading ? (
          <>
            <div className="skeleton skeleton-pill" />
            <div className="skeleton skeleton-line" />
          </>
        ) : (
          <>
            <StatusPill level={status?.level ?? null} size="lg" />
            <div className="status-meta-group">
              <span className="status-reports-line">{countLabel}</span>
              {updatedLabel && <span className="status-time-line">{updatedLabel}</span>}
            </div>
          </>
        )}
      </section>

      <div className="bottom-nav-area">
        <Link to="/" className="btn-secondary">
          ← Back to all canteens
        </Link>
      </div>

      <ReportBar
        disabled={!qrKey || submitting}
        disabledMessage={!qrKey ? 'Scan the QR code at the canteen to report' : undefined}
        onReport={handleReport}
        submitting={submitting}
        submittingLevel={submittingLevel}
      />
    </main>
  );
};
