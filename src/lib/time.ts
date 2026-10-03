/**
 * Returns a human-friendly relative time string such as "just now", "6 min ago", or "1 hr ago".
 */
export function timeAgo(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) {
    return 'just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hr ago' : `${diffHours} hrs ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

/**
 * Formats a remaining duration in seconds into a concise countdown text such as "9 min" or "45 sec".
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0 sec';
  if (seconds < 60) {
    return `${Math.ceil(seconds)} sec`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}
