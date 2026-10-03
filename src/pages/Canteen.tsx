import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getCanteen, submitReport, type Canteen as CanteenType, type CrowdLevel } from '../lib/api';
import { useStatus } from '../hooks/useStatus';
import { StatusPill } from '../components/StatusPill';
import { ReportBar } from '../components/ReportBar';
import { timeAgo, formatCountdown } from '../lib/time';

const DEFAULT_COOLDOWN_SECONDS = 15 * 60; // 15-minute standard cooldown

/**
 * Canteen Page - Stage 3 Canteen Display & Full Reporting Flow
 * Handles live status polling, anonymous reporting, cooldown countdown,
 * bad key invalidation, persistent local storage state, and error handling.
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

  // Status & Notification banners
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Specific reporting constraint states
  const [badKeyNotice, setBadKeyNotice] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const { status, loading: statusLoading, error: statusError, refetch } = useStatus(slug);

  // 1. Initial setup: resolve canteen details, QR key, and persistent cooldown
  useEffect(() => {
    if (!slug) return;

    let isMounted = true;
    setCanteenLoading(true);
    setCanteenNotFound(false);
    setBadKeyNotice(null);
    setErrorMessage(null);
    setConfirmationMessage(null);

    // Resolve QR key from URL or fallback to sessionStorage
    const keyFromUrl = searchParams.get('k');
    const sessionKey = `canteen_qr_${slug}`;

    if (keyFromUrl) {
      setQrKey(keyFromUrl);
      try {
        sessionStorage.setItem(sessionKey, keyFromUrl);
      } catch {
        // Storage access fallback
      }
    } else {
      try {
        const storedKey = sessionStorage.getItem(sessionKey);
        setQrKey(storedKey);
      } catch {
        setQrKey(null);
      }
    }

    // Check for existing cooldown from localStorage (convenience timer)
    try {
      const storedExpiry = localStorage.getItem(`canteen_cooldown_${slug}`);
      if (storedExpiry) {
        const remaining = Math.ceil((parseInt(storedExpiry, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setCooldownSeconds(remaining);
        } else {
          localStorage.removeItem(`canteen_cooldown_${slug}`);
          setCooldownSeconds(0);
        }
      } else {
        setCooldownSeconds(0);
      }
    } catch {
      setCooldownSeconds(0);
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

  // 2. Active live cooldown countdown ticker
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const intervalId = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          if (slug) {
            try {
              localStorage.removeItem(`canteen_cooldown_${slug}`);
            } catch {
              // Ignore
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [cooldownSeconds, slug]);

  // 3. One-tap reporting submission flow
  const handleReport = useCallback(
    async (level: CrowdLevel) => {
      if (!slug || !qrKey || submitting || cooldownSeconds > 0) return;

      setSubmitting(true);
      setSubmittingLevel(level);
      setConfirmationMessage(null);
      setErrorMessage(null);

      const result = await submitReport(slug, qrKey, level);
      setSubmitting(false);
      setSubmittingLevel(null);

      if (result.ok) {
        // A. Success: Show confirmation, refetch live status, and start 15-min cooldown
        setConfirmationMessage('Thanks! Your report is live.');
        refetch();

        const cooldown = DEFAULT_COOLDOWN_SECONDS;
        setCooldownSeconds(cooldown);
        try {
          localStorage.setItem(`canteen_cooldown_${slug}`, (Date.now() + cooldown * 1000).toString());
        } catch {
          // Ignore storage restrictions
        }
        return;
      }

      if (result.reason === 'cooldown') {
        // B. Cooldown triggered on server
        const remaining = result.retry_after_seconds;
        setCooldownSeconds(remaining);
        try {
          localStorage.setItem(`canteen_cooldown_${slug}`, (Date.now() + remaining * 1000).toString());
        } catch {
          // Ignore
        }
        return;
      }

      if (result.reason === 'bad_key') {
        // C. Bad key: disable reporting and advise rescanning
        setBadKeyNotice('That QR code did not work. Scan the QR code at the canteen again.');
        // Invalidate stored session key
        try {
          sessionStorage.removeItem(`canteen_qr_${slug}`);
        } catch {
          // Ignore
        }
        setQrKey(null);
        return;
      }

      // D. Invalid input or network error: show friendly error and allow immediate retry
      setErrorMessage(
        result.reason === 'invalid_input'
          ? 'Invalid report submitted. Please try again.'
          : 'Network error submitting report. Please try again.'
      );
    },
    [slug, qrKey, submitting, cooldownSeconds, refetch]
  );

  // Compute disabled state and descriptive message for ReportBar
  let isBarDisabled = false;
  let barDisabledMessage: string | undefined;

  if (badKeyNotice) {
    isBarDisabled = true;
    barDisabledMessage = badKeyNotice;
  } else if (!qrKey) {
    isBarDisabled = true;
    barDisabledMessage = 'Scan the QR code at the canteen to report';
  } else if (cooldownSeconds > 0) {
    isBarDisabled = true;
    barDisabledMessage = `You can report again in ${formatCountdown(cooldownSeconds)}`;
  } else if (submitting) {
    isBarDisabled = true;
  }

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
          <Link to="/" className="btn-secondary" aria-label="Return to all canteens">
            Back to Canteens
          </Link>
        </div>
      </main>
    );
  }

  const reportCount = status?.report_count ?? 0;
  const countLabel =
    reportCount === 0
      ? '0 people reported in the last 20 minutes'
      : reportCount === 1
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

      {/* Confirmation notification banner */}
      {confirmationMessage && (
        <div className="feedback-banner feedback-banner-success" aria-live="polite">
          <span>{confirmationMessage}</span>
          <button
            type="button"
            className="btn-dismiss"
            onClick={() => setConfirmationMessage(null)}
            aria-label="Dismiss confirmation message"
          >
            ×
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {errorMessage && (
        <div className="feedback-banner feedback-banner-error" aria-live="polite">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn-dismiss"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error message"
          >
            ×
          </button>
        </div>
      )}

      {/* Live queue status card */}
      <section className="status-card" aria-live="polite">
        {statusLoading ? (
          <>
            <div className="skeleton skeleton-pill" />
            <div className="skeleton skeleton-line" />
          </>
        ) : statusError ? (
          <div className="status-error-inline">
            <p>Unable to load live status.</p>
            <button
              type="button"
              className="btn-retry"
              onClick={() => refetch()}
              aria-label="Retry loading queue status"
            >
              Retry
            </button>
          </div>
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

      {/* Secondary Bottom Navigation linking back to directory */}
      <div className="bottom-nav-area">
        <Link to="/" className="btn-secondary" aria-label="Return to all canteens">
          ← Back to all canteens
        </Link>
      </div>

      {/* Fixed thumb-friendly reporting bar */}
      <ReportBar
        disabled={isBarDisabled}
        disabledMessage={barDisabledMessage}
        onReport={handleReport}
        submitting={submitting}
        submittingLevel={submittingLevel}
      />
    </main>
  );
};
