import { supabase } from './supabase';
import { getDeviceId } from './deviceId';

export interface Canteen {
  id: string;
  slug: string;
  name: string;
}

export type CrowdLevel = 1 | 2 | 3;

export interface CanteenStatus {
  level: CrowdLevel | null;
  report_count: number;
  last_report_at: string | null;
}

export type SubmitReportResult =
  | { ok: true }
  | { ok: false; reason: 'cooldown'; retry_after_seconds: number }
  | { ok: false; reason: 'bad_key' }
  | { ok: false; reason: 'invalid_input' }
  | { ok: false; reason: 'network'; message?: string };

/**
 * Fetches basic metadata for a canteen by slug. Returns null if not found.
 */
export async function getCanteen(slug: string): Promise<Canteen | null> {
  try {
    const { data, error } = await supabase
      .from('canteens')
      .select('id, slug, name')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Canteen;
  } catch {
    return null;
  }
}

/**
 * Calls the get_status RPC to retrieve aggregate crowd metrics for a canteen.
 */
export async function getStatus(slug: string): Promise<CanteenStatus> {
  try {
    const { data, error } = await supabase.rpc('get_status', { p_slug: slug });

    if (error || !data || typeof data !== 'object') {
      return {
        level: null,
        report_count: 0,
        last_report_at: null,
      };
    }

    const res = data as Record<string, unknown>;
    return {
      level: (res.level === 1 || res.level === 2 || res.level === 3 ? res.level : null) as CrowdLevel | null,
      report_count: typeof res.report_count === 'number' ? res.report_count : 0,
      last_report_at: typeof res.last_report_at === 'string' ? res.last_report_at : null,
    };
  } catch {
    return {
      level: null,
      report_count: 0,
      last_report_at: null,
    };
  }
}

/**
 * Submits an anonymous one-tap crowd level report using the device ID and scanned QR key.
 * Expected failure conditions (cooldown, bad key, invalid input) are returned as typed values.
 */
export async function submitReport(
  slug: string,
  key: string,
  level: CrowdLevel
): Promise<SubmitReportResult> {
  try {
    const deviceId = getDeviceId();
    const { data, error } = await supabase.rpc('submit_report', {
      p_slug: slug,
      p_key: key,
      p_device: deviceId,
      p_level: level,
    });

    if (error) {
      return {
        ok: false,
        reason: 'network',
        message: error.message,
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        ok: false,
        reason: 'network',
        message: 'Invalid response received from server',
      };
    }

    const res = data as Record<string, unknown>;
    if (res.ok === true) {
      return { ok: true };
    }

    const reason = res.reason;
    if (reason === 'cooldown') {
      return {
        ok: false,
        reason: 'cooldown',
        retry_after_seconds: typeof res.retry_after_seconds === 'number' ? res.retry_after_seconds : 60,
      };
    }

    if (reason === 'bad_key') {
      return { ok: false, reason: 'bad_key' };
    }

    if (reason === 'invalid_input') {
      return { ok: false, reason: 'invalid_input' };
    }

    return {
      ok: false,
      reason: 'network',
      message: typeof res.reason === 'string' ? res.reason : 'Unexpected response',
    };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Network error',
    };
  }
}
