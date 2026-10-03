import { useState, useEffect, useCallback, useRef } from 'react';
import { getStatus, type CanteenStatus } from '../lib/api';

export interface UseStatusResult {
  status: CanteenStatus | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const POLL_INTERVAL_MS = 15000;

/**
 * Custom hook to manage aggregate crowd status polling for a canteen.
 * - Fetches immediately upon mount or slug change.
 * - Polls automatically every 15 seconds.
 * - Refetches immediately when the document tab regains visibility.
 * - Discards out-of-order or stale responses if slug switches mid-flight.
 * - Thoroughly cleans up timers and visibility event listeners on unmount.
 */
export function useStatus(slug: string | undefined): UseStatusResult {
  const [status, setStatus] = useState<CanteenStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Tracks current slug to prevent stale asynchronous response overwrite
  const activeSlugRef = useRef<string | undefined>(slug);
  activeSlugRef.current = slug;

  const fetchStatus = useCallback(async (isInitial = false) => {
    if (!slug) {
      setStatus(null);
      setLoading(false);
      return;
    }

    if (isInitial) {
      setLoading(true);
    }

    try {
      const data = await getStatus(slug);
      if (activeSlugRef.current === slug) {
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      if (activeSlugRef.current === slug) {
        setError(err instanceof Error ? err : new Error('Failed to fetch status'));
      }
    } finally {
      if (activeSlugRef.current === slug) {
        setLoading(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setStatus(null);
      setLoading(false);
      return;
    }

    // 1. Initial immediate fetch
    fetchStatus(true);

    // 2. Poll every 15 seconds (only when document is currently visible)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatus(false);
      }
    }, POLL_INTERVAL_MS);

    // 3. Refetch when the tab becomes active/visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Cleanup timer and event listeners
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [slug, fetchStatus]);

  const refetch = useCallback(async () => {
    await fetchStatus(false);
  }, [fetchStatus]);

  return { status, loading, error, refetch };
}
