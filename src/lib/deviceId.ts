const DEVICE_ID_KEY = 'canteen_crowd_device_id';
let inMemoryDeviceId: string | null = null;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID generator for older or constrained runtimes
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns an anonymous unique identifier for the current device.
 * Stored in localStorage across sessions, falling back to an in-memory ID
 * if storage is blocked (e.g. Safari Private Browsing or disabled cookies).
 */
export function getDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored && stored.length >= 8 && stored.length <= 64) {
      return stored;
    }
    const newId = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    if (!inMemoryDeviceId) {
      inMemoryDeviceId = generateUUID();
    }
    return inMemoryDeviceId;
  }
}
