/**
 * Local Report Log - Stage 5
 * Stores a lightweight, privacy-preserving log of reports submitted from this device.
 * Only records canteen slug and timestamp (ISO string). No device ID or personal data.
 */

export interface ReportLogEntry {
  slug: string;
  timestamp: string; // ISO 8601 string
}

const STORAGE_KEY = 'canteen_crowd_report_log';
const MAX_ENTRIES = 200;

export const REPORTS_CHANGED_EVENT = 'canteen-crowd:reports-changed';

// In-memory fallback if localStorage is blocked (e.g. private browsing restrictions)
let inMemoryLog: ReportLogEntry[] = [];

/**
 * Retrieves the local report log from localStorage.
 * Automatically recovers and resets storage if corrupted JSON is encountered.
 */
export function getReportLog(): ReportLogEntry[] {
  if (typeof window === 'undefined') {
    return inMemoryLog;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return inMemoryLog;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      // Corrupted storage schema: reset safely
      localStorage.removeItem(STORAGE_KEY);
      inMemoryLog = [];
      return [];
    }

    // Validate entries shape
    const validEntries: ReportLogEntry[] = parsed.filter(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof entry.slug === 'string' &&
        typeof entry.timestamp === 'string'
    );

    inMemoryLog = validEntries;
    return validEntries;
  } catch {
    // Storage access blocked or parsing error
    return inMemoryLog;
  }
}

/**
 * Records a successful report submission.
 * Prepends the new entry, caps at the 200 most recent records,
 * and notifies listeners via a custom event.
 */
export function recordReport(slug: string): void {
  const newEntry: ReportLogEntry = {
    slug,
    timestamp: new Date().toISOString(),
  };

  const currentLog = getReportLog();
  const updatedLog = [newEntry, ...currentLog].slice(0, MAX_ENTRIES);

  inMemoryLog = updatedLog;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLog));
    } catch {
      // Storage quota exceeded or blocked; inMemoryLog retained
    }

    try {
      window.dispatchEvent(new CustomEvent(REPORTS_CHANGED_EVENT, { detail: newEntry }));
    } catch {
      // Ignore if event dispatch fails in restricted environments
    }
  }
}
