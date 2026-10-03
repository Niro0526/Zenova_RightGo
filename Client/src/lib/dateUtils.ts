/**
 * Timezone and Date Utilities for RightGo Platform
 * Standard Timezone: Asia/Colombo (UTC+05:30)
 */

export const COLOMBO_TIMEZONE = 'Asia/Colombo';

/**
 * Returns the current date/time adjusted to Asia/Colombo
 */
export function getColomboNow(): Date {
  const now = new Date();
  // Format to Asia/Colombo ISO-like string and construct date
  const colomboStr = now.toLocaleString('en-US', { timeZone: COLOMBO_TIMEZONE });
  return new Date(colomboStr);
}

/**
 * Returns a Date object shifted by offsetDays in Colombo time
 */
export function getColomboDateWithOffset(offsetDays: number = 0): Date {
  const date = getColomboNow();
  date.setDate(date.getDate() + offsetDays);
  return date;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Formats a date as "Today, 2 Oct 2026" or "2 Oct 2026"
 */
export function formatColomboDate(offsetDays: number = 0, prefixToday: boolean = false): string {
  const d = getColomboDateWithOffset(offsetDays);
  const day = d.getDate();
  const month = MONTH_NAMES_SHORT[d.getMonth()];
  const year = d.getFullYear();

  if (offsetDays === 0 && prefixToday) {
    return `Today, ${day} ${month} ${year}`;
  }
  if (offsetDays === 1 && prefixToday) {
    return `Tomorrow, ${day} ${month} ${year}`;
  }
  return `${day} ${month} ${year}`;
}

/**
 * Formats short date e.g. "2 Oct", "3 Oct"
 */
export function formatShortDate(offsetDays: number = 0): string {
  const d = getColomboDateWithOffset(offsetDays);
  const day = d.getDate();
  const month = MONTH_NAMES_SHORT[d.getMonth()];
  return `${day} ${month}`;
}

/**
 * Formats ISO date string "YYYY-MM-DD" for HTML input elements in Asia/Colombo
 */
export function formatIsoDate(offsetDays: number = 0): string {
  const d = getColomboDateWithOffset(offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats time in Colombo time, e.g. "14:32" or "2 Oct, 14:32"
 */
export function formatTimeColombo(date?: Date, includeDate: boolean = false): string {
  const d = date || getColomboNow();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${mins}`;

  if (includeDate) {
    const day = d.getDate();
    const month = MONTH_NAMES_SHORT[d.getMonth()];
    return `${day} ${month}, ${timeStr}`;
  }
  return timeStr;
}

/**
 * Computes live seconds remaining until the 16:00 (4 PM) operational cutoff in Asia/Colombo.
 * If currently past 16:00, returns seconds remaining until tomorrow's 16:00 cutoff.
 */
export function getSecondsUntilCutoff(cutoffHour: number = 16, cutoffMinute: number = 0): {
  seconds: number;
  isPastToday: boolean;
} {
  const now = getColomboNow();
  const cutoffToday = new Date(now);
  cutoffToday.setHours(cutoffHour, cutoffMinute, 0, 0);

  let diffMs = cutoffToday.getTime() - now.getTime();
  let isPastToday = false;

  if (diffMs <= 0) {
    isPastToday = true;
    const cutoffTomorrow = new Date(cutoffToday);
    cutoffTomorrow.setDate(cutoffTomorrow.getDate() + 1);
    diffMs = cutoffTomorrow.getTime() - now.getTime();
  }

  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  return { seconds, isPastToday };
}
