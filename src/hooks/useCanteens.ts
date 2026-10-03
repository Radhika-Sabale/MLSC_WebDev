import { useState, useEffect, useCallback, useRef } from 'react';
import { getCanteens, getStatus, type Canteen, type CanteenStatus } from '../lib/api';

export type CanteenStatusMap = Record<string, CanteenStatus | 'unavailable'>;

export interface UseCanteensResult {
  canteens: Canteen[];
  statuses: CanteenStatusMap;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const POLL_INTERVAL_MS = 15000;

/**
 * useCanteens manages fetching the full directory of canteens along with their live statuses.
 * - Loads all canteens, then resolves each canteen's status in parallel.
 * - Handles individual canteen status failures gracefully without breaking the directory.
 * - Polls every 15 seconds while the document is visible.
 * - Refetches immediately when the document tab regains visibility.
 * - Cleans up active intervals and listeners on unmount, discarding stale responses.
 */
export function useCanteens(): UseCanteensResult {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [statuses, setStatuses] = useState<CanteenStatusMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef<boolean>(true);

  const fetchStatuses = useCallback(async (canteenList: Canteen[]) => {
    if (canteenList.length === 0) return;

    const statusPromises = canteenList.map(async (canteen) => {
      try {
        const status = await getStatus(canteen.slug);
        return { slug: canteen.slug, status };
      } catch {
        return { slug: canteen.slug, status: 'unavailable' as const };
      }
    });

    const results = await Promise.all(statusPromises);

    if (isMountedRef.current) {
      setStatuses((prev) => {
        const next = { ...prev };
        for (const item of results) {
          next[item.slug] = item.status;
        }
        return next;
      });
    }
  }, []);

  const loadData = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
      }

      try {
        const canteenList = await getCanteens();
        if (!isMountedRef.current) return;

        setCanteens(canteenList);
        setError(null);

        if (canteenList.length > 0) {
          await fetchStatuses(canteenList);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load canteens'));
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [fetchStatuses]
  );

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Initial fetch
    loadData(true);

    // 2. Poll statuses every 15 seconds
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setCanteens((currentCanteens) => {
          if (currentCanteens.length > 0) {
            fetchStatuses(currentCanteens);
          }
          return currentCanteens;
        });
      }
    }, POLL_INTERVAL_MS);

    // 3. Tab visibility listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setCanteens((currentCanteens) => {
          if (currentCanteens.length > 0) {
            fetchStatuses(currentCanteens);
          }
          return currentCanteens;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Cleanup
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData, fetchStatuses]);

  const refetch = useCallback(async () => {
    await loadData(false);
  }, [loadData]);

  return { canteens, statuses, loading, error, refetch };
}
