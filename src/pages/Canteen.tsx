import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getCanteen, submitReport, type Canteen as CanteenType, type CrowdLevel } from '../lib/api';
import { useStatus } from '../hooks/useStatus';
import { PageShell } from '../components/PageShell';
import { StatusPill } from '../components/StatusPill';
import { ReportBar } from '../components/ReportBar';
import { BackButton } from '../components/BackButton';
import { useToast } from '../components/Toast';
import { recordReport, getReportLog } from '../lib/reportLog';
import { getEarnedBadges, diffBadges } from '../lib/badges';
import { timeAgo, formatCountdown } from '../lib/time';

const DEFAULT_COOLDOWN_SECONDS = 15 * 60; // 15-minute standard cooldown

/**
 * Canteen Page - Stage 5 with Badge and Toast integration
 * Shows real-time queue status, provides one-tap reporting, manages
 * cooldowns, celebrates newly earned badges, and announces live status changes.
 */
export const Canteen: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [canteen, setCanteen] = useState<CanteenType | null>(null);
  const [canteenLoading, setCanteenLoading] = useState<boolean>(true);
  const [canteenNotFound, setCanteenNotFound] = useState<boolean>(false);

  const [qrKey, setQrKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittingLevel, setSubmittingLevel] = useState<CrowdLevel | null>(null);

  // Status & Notification banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cooldown & Key restriction states
  const [badKeyNotice, setBadKeyNotice] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const { status, loading: statusLoading, error: statusError, refetch } = useStatus(slug);

  // Live status change announcer (only announces when level or count actually changes)
  const lastAnnouncedStatusRef = useRef<{ level: CrowdLevel | null; count: number } | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');

  // 1. Initial load & key resolution
  useEffect(() => {
    if (!slug) return;

    let isMounted = true;
    setCanteenLoading(true);
    setCanteenNotFound(false);
    setBadKeyNotice(null);
    setErrorMessage(null);

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
        document.title = 'Canteen Not Found | Canteen Crowd';
      } else {
        setCanteen(res);
        document.title = `${res.name} | Canteen Crowd`;
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

  // Announce live status updates politely to screen readers only when status level or report count changes
  useEffect(() => {
    if (!status) return;

    const prev = lastAnnouncedStatusRef.current;
    if (!prev) {
      lastAnnouncedStatusRef.current = { level: status.level, count: status.report_count };
      return;
    }

    if (prev.level !== status.level || prev.count !== status.report_count) {
      lastAnnouncedStatusRef.current = { level: status.level, count: status.report_count };
      const levelText =
        status.level === 1
          ? 'Under 5 min'
          : status.level === 2
            ? '5 to 15 min'
            : status.level === 3
              ? '15+ min'
              : 'Not enough recent reports';
      setStatusAnnouncement(
        `Status updated: ${canteen?.name ?? 'Canteen'} is now ${levelText}, with ${status.report_count} reports.`
      );
    }
  }, [status, canteen?.name]);

  // 3. One-tap reporting submission flow
  const handleReport = useCallback(
    async (level: CrowdLevel) => {
      if (!slug || !qrKey || submitting || cooldownSeconds > 0) return;

      setSubmitting(true);
      setSubmittingLevel(level);
      setErrorMessage(null);

      const result = await submitReport(slug, qrKey, level);
      setSubmitting(false);
      setSubmittingLevel(null);

      if (result.ok) {
        // Evaluate badges before and after storing this report
        const beforeBadges = getEarnedBadges(getReportLog());
        recordReport(slug);
        const afterBadges = getEarnedBadges(getReportLog());
        const newlyEarned = diffBadges(beforeBadges, afterBadges);

        toast.show('Thanks! Your report is live.', { kind: 'success' });
        newlyEarned.forEach((badge) => {
          toast.show(`New badge: ${badge.name}`, { kind: 'info' });
        });

        refetch();

        const cooldown = DEFAULT_COOLDOWN_SECONDS;
        setCooldownSeconds(cooldown);
        try {
          localStorage.setItem(`canteen_cooldown_${slug}`, (Date.now() + cooldown * 1000).toString());
        } catch {
          // Ignore
        }
        return;
      }

      if (result.reason === 'cooldown') {
        const remaining = result.retry_after_seconds;
        setCooldownSeconds(remaining);
        try {
          localStorage.setItem(`canteen_cooldown_${slug}`, (Date.now() + remaining * 1000).toString());
        } catch {
          // Ignore
        }
        toast.show('You recently reported. Please wait for cooldown.', { kind: 'info' });
        return;
      }

      if (result.reason === 'bad_key') {
        const badKeyMsg = 'That QR code did not work. Scan the QR code at the canteen again.';
        setBadKeyNotice(badKeyMsg);
        try {
          sessionStorage.removeItem(`canteen_qr_${slug}`);
        } catch {
          // Ignore
        }
        setQrKey(null);
        toast.show(badKeyMsg, { kind: 'error' });
        return;
      }

      const netErrMsg =
        result.reason === 'invalid_input'
          ? 'Invalid report submitted. Please try again.'
          : 'Network error submitting report. Please try again.';
      setErrorMessage(netErrMsg);
      toast.show(netErrMsg, { kind: 'error' });
    },
    [slug, qrKey, submitting, cooldownSeconds, refetch, toast]
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

  // Loading skeleton state
  if (canteenLoading) {
    return (
      <PageShell
        header={
          <div className="canteen-header">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-line-sm" />
          </div>
        }
      >
        <div className="status-card" aria-busy="true">
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-line" />
        </div>
      </PageShell>
    );
  }

  // Canteen not found error state
  if (canteenNotFound || !canteen) {
    return (
      <PageShell
        header={
          <div className="canteen-header">
            <h1 className="canteen-error-title" tabIndex={-1}>
              Canteen Not Found
            </h1>
            <p className="canteen-error-desc">
              The canteen you are looking for does not exist or has been moved.
            </p>
          </div>
        }
        bottomSlot={<BackButton to="/" label="Back to all canteens" />}
      >
        <div className="canteen-error-body">
          <p>Please check the link or return to the campus canteens directory.</p>
        </div>
      </PageShell>
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
    <PageShell
      className="canteen-page-shell"
      header={
        <div className="canteen-header">
          <h1 className="canteen-title" tabIndex={-1}>
            {canteen.name}
          </h1>
          <p className="canteen-subtitle">Live campus queue status</p>
        </div>
      }
      bottomSlot={
        <ReportBar
          disabled={isBarDisabled}
          disabledMessage={barDisabledMessage}
          onReport={handleReport}
          submitting={submitting}
          submittingLevel={submittingLevel}
        />
      }
    >
      <div className="canteen-body-area">
        {/* Dedicated screen-reader live region only announces when queue status changes */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {statusAnnouncement}
        </div>

        {/* Persistent error banner */}
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
        <section className="status-card">
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

        {/* Back navigation button placed in scrollable area with ample bottom clearance */}
        <div className="canteen-back-wrapper">
          <BackButton to="/" label="Back to all canteens" />
        </div>
      </div>
    </PageShell>
  );
};
