import type { ReportLogEntry } from './reportLog';

/**
 * Badge Definition Interface
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * Standard Canteen Crowd Badges Catalog
 */
export const BADGES: Badge[] = [
  {
    id: 'first-report',
    name: 'First report',
    description: 'Submit your first crowd report',
    icon: '🌱',
  },
  {
    id: 'regular',
    name: 'Regular',
    description: 'Submit at least 5 crowd reports',
    icon: '⭐',
  },
  {
    id: 'early-bird',
    name: 'Early bird',
    description: 'Report before 9:00 AM local time',
    icon: '🌅',
  },
  {
    id: 'lunch-hero',
    name: 'Lunch hero',
    description: 'Report between 12:00 and 14:00 local time',
    icon: '🍱',
  },
  {
    id: 'streak-3-days',
    name: '3-day streak',
    description: 'Report on 3 consecutive calendar days',
    icon: '🔥',
  },
];

/**
 * Returns the immutable list of all supported badges.
 */
export function getAllBadges(): Badge[] {
  return [...BADGES];
}

/**
 * Evaluates the report log and returns the IDs of all earned badges.
 * All time calculations are evaluated in the device's local timezone.
 */
export function getEarnedBadges(log: ReportLogEntry[], _now?: Date): string[] {
  if (!log || log.length === 0) {
    return [];
  }

  const earnedIds: string[] = [];

  // 1. "First report" - At least 1 report
  if (log.length >= 1) {
    earnedIds.push('first-report');
  }

  // 2. "Regular" - At least 5 reports
  if (log.length >= 5) {
    earnedIds.push('regular');
  }

  // 3. Time-of-day checks in local time
  let hasEarlyBird = false;
  let hasLunchHero = false;

  for (const entry of log) {
    const date = new Date(entry.timestamp);
    if (isNaN(date.getTime())) continue;

    const hours = date.getHours(); // 0 - 23 in local time

    // "Early bird": before 9:00 AM local time (hours 0 through 8)
    if (hours < 9) {
      hasEarlyBird = true;
    }

    // "Lunch hero": between 12:00 and 14:00 local time (hours 12 and 13)
    if (hours >= 12 && hours < 14) {
      hasLunchHero = true;
    }
  }

  if (hasEarlyBird) {
    earnedIds.push('early-bird');
  }

  if (hasLunchHero) {
    earnedIds.push('lunch-hero');
  }

  // 4. "3-day streak" - Reports on 3 consecutive local calendar days
  // Group by distinct local calendar dates (YYYY-MM-DD)
  const distinctDaysSet = new Set<string>();

  for (const entry of log) {
    const d = new Date(entry.timestamp);
    if (isNaN(d.getTime())) continue;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    distinctDaysSet.add(`${year}-${month}-${day}`);
  }

  // Convert to local midnight Date objects and sort chronologically
  const sortedDays = Array.from(distinctDaysSet)
    .map((dayStr) => {
      const [y, m, d] = dayStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    })
    .sort((a, b) => a.getTime() - b.getTime());

  let has3DayStreak = false;
  for (let i = 0; i <= sortedDays.length - 3; i++) {
    const day0 = sortedDays[i];
    const day1 = sortedDays[i + 1];
    const day2 = sortedDays[i + 2];

    // Calendar arithmetic handles month boundaries, leap years, and DST clock shifts
    const expectedDay1 = new Date(day0.getFullYear(), day0.getMonth(), day0.getDate() + 1);
    const expectedDay2 = new Date(day0.getFullYear(), day0.getMonth(), day0.getDate() + 2);

    if (
      day1.getFullYear() === expectedDay1.getFullYear() &&
      day1.getMonth() === expectedDay1.getMonth() &&
      day1.getDate() === expectedDay1.getDate() &&
      day2.getFullYear() === expectedDay2.getFullYear() &&
      day2.getMonth() === expectedDay2.getMonth() &&
      day2.getDate() === expectedDay2.getDate()
    ) {
      has3DayStreak = true;
      break;
    }
  }

  if (has3DayStreak) {
    earnedIds.push('streak-3-days');
  }

  return earnedIds;
}

/**
 * Compares two badge ID lists and returns the newly earned Badge definitions.
 */
export function diffBadges(beforeIds: string[], afterIds: string[]): Badge[] {
  const beforeSet = new Set(beforeIds);
  const newlyEarnedIds = afterIds.filter((id) => !beforeSet.has(id));
  const badgeMap = new Map(getAllBadges().map((b) => [b.id, b]));

  return newlyEarnedIds
    .map((id) => badgeMap.get(id))
    .filter((b): b is Badge => Boolean(b));
}

/*
 ==============================================================================
 EXAMPLE INPUTS AND EXPECTED OUTPUTS (EDGE CASES AUDIT)
 ==============================================================================

 1. Empty Log:
    Input: []
    Expected: [] (no badges earned)

 2. Single midday report:
    Input: [{ slug: 'main-canteen', timestamp: '2026-10-04T12:30:00Z' }] (assuming local 12:30)
    Expected: ['first-report', 'lunch-hero']

 3. Early Bird boundary check (08:59 vs 09:00 local time):
    Input A (08:59:59 local):
      [{ slug: 'main-canteen', timestamp: '2026-10-04T08:59:59' }]
      Expected: ['first-report', 'early-bird'] (hours = 8 < 9)
    Input B (09:00:00 local):
      [{ slug: 'main-canteen', timestamp: '2026-10-04T09:00:00' }]
      Expected: ['first-report'] (hours = 9, not < 9, so early-bird is NOT earned)

 4. Lunch Hero boundary check (11:59, 12:00, 13:59, 14:00 local):
    - 11:59:59 -> hours = 11 -> Not lunch-hero
    - 12:00:00 -> hours = 12 -> Lunch hero earned
    - 13:59:59 -> hours = 13 -> Lunch hero earned
    - 14:00:00 -> hours = 14 -> Not lunch-hero

 5. Streak broken by a missed calendar day:
    Input: [
      { slug: 'fruit-canteen', timestamp: '2026-10-01T13:00:00' },
      { slug: 'fruit-canteen', timestamp: '2026-10-02T13:00:00' },
      // 2026-10-03 is missed!
      { slug: 'fruit-canteen', timestamp: '2026-10-04T13:00:00' }
    ]
    Expected: ['first-report', 'lunch-hero'] (streak-3-days is NOT earned)

 6. Successful 3-day streak across month end:
    Input: [
      { slug: 'fruit-canteen', timestamp: '2026-10-30T10:00:00' },
      { slug: 'fruit-canteen', timestamp: '2026-10-31T10:00:00' },
      { slug: 'fruit-canteen', timestamp: '2026-11-01T10:00:00' }
    ]
    Expected: ['first-report', 'streak-3-days']

 7. Multiple reports on the same day:
    Input: [
      { slug: 'main-canteen', timestamp: '2026-10-01T08:00:00' },
      { slug: 'main-canteen', timestamp: '2026-10-01T12:15:00' },
      { slug: 'main-canteen', timestamp: '2026-10-01T13:00:00' },
      { slug: 'main-canteen', timestamp: '2026-10-02T12:00:00' },
      { slug: 'main-canteen', timestamp: '2026-10-03T12:00:00' }
    ]
    Expected: ['first-report', 'regular', 'early-bird', 'lunch-hero', 'streak-3-days']
 ==============================================================================
*/
